use crate::pdf_export::{self, PdfExportResult};
use crate::pdf_font_fallbacks::add_font_fallbacks;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tempfile::{Builder, TempDir};
use uuid::Uuid;

struct PdfExportJob {
    owner_label: String,
    target_path: PathBuf,
    temp_dir: TempDir,
    page_count: u32,
    page_paths: Vec<PathBuf>,
}

#[derive(Default)]
pub struct PdfExportJobs {
    jobs: HashMap<String, PdfExportJob>,
}

impl PdfExportJobs {
    pub fn begin(
        &mut self,
        owner_label: &str,
        target_path: PathBuf,
        page_count: u32,
    ) -> Result<String, String> {
        if page_count == 0 {
            return Err("PDF로 저장할 페이지가 없습니다".to_string());
        }
        pdf_export::ensure_pdf_path(&target_path)?;
        target_parent(&target_path)?;
        if self
            .jobs
            .values()
            .any(|job| same_target_path(&job.target_path, &target_path))
        {
            return Err(format!(
                "같은 PDF 대상 경로의 저장 작업이 이미 진행 중입니다: {}",
                target_path.display()
            ));
        }
        let temp_dir = Builder::new()
            .prefix(".alhangeul-pdf-")
            .tempdir()
            .map_err(|e| format!("PDF 임시 디렉터리 생성 실패: {}", e))?;
        let job_id = Uuid::new_v4().to_string();
        self.jobs.insert(
            job_id.clone(),
            PdfExportJob {
                owner_label: owner_label.to_string(),
                target_path,
                temp_dir,
                page_count,
                page_paths: Vec::with_capacity(page_count as usize),
            },
        );
        Ok(job_id)
    }

    pub fn append_page(
        &mut self,
        owner_label: &str,
        job_id: &str,
        page_index: u32,
        svg: &str,
    ) -> Result<(), String> {
        let job = self.job_mut(owner_label, job_id)?;
        let expected_index = job.page_paths.len() as u32;
        if page_index != expected_index || page_index >= job.page_count {
            return Err(format!(
                "PDF 페이지 순서가 올바르지 않습니다: expected {}, got {}",
                expected_index, page_index
            ));
        }
        let path = job
            .temp_dir
            .path()
            .join(format!("page-{page_index:08}.svg"));
        std::fs::write(&path, add_font_fallbacks(svg)).map_err(|e| {
            format!(
                "PDF 페이지 {} 임시 저장 실패: {} ({})",
                page_index + 1,
                path.display(),
                e
            )
        })?;
        job.page_paths.push(path);
        Ok(())
    }

    pub fn commit(&mut self, owner_label: &str, job_id: &str) -> Result<PdfExportResult, String> {
        self.ensure_owner(owner_label, job_id)?;
        let job = self
            .jobs
            .remove(job_id)
            .ok_or_else(|| format!("PDF 작업을 찾을 수 없습니다: {}", job_id))?;
        if job.page_paths.len() != job.page_count as usize {
            return Err(format!(
                "PDF 페이지가 모두 준비되지 않았습니다: {} / {}",
                job.page_paths.len(),
                job.page_count
            ));
        }
        pdf_export::export_svg_pages_to_pdf(&job.page_paths, &job.target_path)
    }

    pub fn abort(&mut self, owner_label: &str, job_id: &str) -> Result<(), String> {
        self.ensure_owner(owner_label, job_id)?;
        self.jobs.remove(job_id);
        Ok(())
    }

    pub fn discard_for_window(&mut self, owner_label: &str) -> usize {
        let before = self.jobs.len();
        self.jobs
            .retain(|_, job| job.owner_label.as_str() != owner_label);
        before - self.jobs.len()
    }

    fn job_mut(&mut self, owner_label: &str, job_id: &str) -> Result<&mut PdfExportJob, String> {
        let job = self
            .jobs
            .get_mut(job_id)
            .ok_or_else(|| format!("PDF 작업을 찾을 수 없습니다: {}", job_id))?;
        if job.owner_label != owner_label {
            return Err(format!(
                "다른 창의 PDF 작업에는 접근할 수 없습니다: {}",
                job_id
            ));
        }
        Ok(job)
    }

    fn ensure_owner(&self, owner_label: &str, job_id: &str) -> Result<(), String> {
        let job = self
            .jobs
            .get(job_id)
            .ok_or_else(|| format!("PDF 작업을 찾을 수 없습니다: {}", job_id))?;
        if job.owner_label != owner_label {
            return Err(format!(
                "다른 창의 PDF 작업에는 접근할 수 없습니다: {}",
                job_id
            ));
        }
        Ok(())
    }
}

fn same_target_path(left: &Path, right: &Path) -> bool {
    if cfg!(windows) {
        left.to_string_lossy()
            .eq_ignore_ascii_case(&right.to_string_lossy())
    } else {
        left == right
    }
}

fn target_parent(path: &Path) -> Result<&Path, String> {
    let parent = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .ok_or_else(|| {
            format!(
                "PDF 경로의 상위 디렉터리를 찾을 수 없습니다: {}",
                path.display()
            )
        })?;
    if !parent.is_dir() {
        return Err(format!(
            "PDF 경로의 상위 디렉터리가 유효하지 않습니다: {}",
            parent.display()
        ));
    }
    Ok(parent)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn job_requires_sequential_pages_and_abort_cleans_temp_files() {
        let dir = tempfile::tempdir().unwrap();
        let mut jobs = PdfExportJobs::default();
        let job_id = jobs.begin("main", dir.path().join("out.pdf"), 2).unwrap();

        assert!(jobs.append_page("main", &job_id, 1, "<svg/>").is_err());
        jobs.append_page(
            "main",
            &job_id,
            0,
            r#"<svg><text font-family="HY헤드라인M">A</text></svg>"#,
        )
        .unwrap();
        let page_path = jobs.jobs[&job_id].page_paths[0].clone();
        let saved = std::fs::read_to_string(&page_path).unwrap();
        assert!(!saved.contains("HY헤드라인M"));
        assert!(saved.contains("함초롬돋움"));

        jobs.abort("main", &job_id).unwrap();
        assert!(!page_path.exists());
    }

    #[test]
    fn incomplete_commit_removes_the_job_and_preserves_target() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("out.pdf");
        std::fs::write(&target, b"existing").unwrap();
        let mut jobs = PdfExportJobs::default();
        let job_id = jobs.begin("main", target.clone(), 2).unwrap();
        jobs.append_page("main", &job_id, 0, "<svg/>").unwrap();

        assert!(jobs.commit("main", &job_id).is_err());
        assert_eq!(std::fs::read(&target).unwrap(), b"existing");
        assert!(!jobs.jobs.contains_key(&job_id));
    }

    #[test]
    fn job_uses_os_temp_and_locks_the_target_across_windows() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("out.pdf");
        let mut jobs = PdfExportJobs::default();
        let job_id = jobs.begin("main", target.clone(), 1).unwrap();

        assert!(!jobs.jobs[&job_id].temp_dir.path().starts_with(dir.path()));
        assert!(jobs.begin("main2", target, 1).is_err());
    }

    #[test]
    fn owner_checks_and_window_cleanup_release_jobs() {
        let dir = tempfile::tempdir().unwrap();
        let mut jobs = PdfExportJobs::default();
        let first = jobs.begin("main", dir.path().join("first.pdf"), 1).unwrap();
        let second = jobs
            .begin("main2", dir.path().join("second.pdf"), 1)
            .unwrap();

        assert!(jobs.append_page("main2", &first, 0, "<svg/>").is_err());
        assert_eq!(jobs.discard_for_window("main"), 1);
        assert!(!jobs.jobs.contains_key(&first));
        assert!(jobs.jobs.contains_key(&second));
    }
}
