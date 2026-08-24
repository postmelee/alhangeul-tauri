mod bundled_pdf_fonts;
mod commands;
mod font_catalog;
#[cfg(target_os = "linux")]
mod linux_runtime;
mod pdf_export;
mod pdf_font_fallbacks;
mod pdf_jobs;
mod pdf_temp_cleanup;
mod pdf_text_audit;
mod pending_open;
mod recent_documents;
mod state;
mod window_geometry;
mod windows;

use std::path::{Path, PathBuf};
use std::{env, ffi::OsStr};
use tauri::{AppHandle, Emitter, Manager};

use commands::{
    abort_pdf_export, append_pdf_page, begin_pdf_export, check_external_modification,
    clear_recent_documents, close_document, commit_pdf_export, commit_staged_document_save,
    create_document, create_editor_window, desktop_platform, destroy_current_window,
    list_local_fonts, list_recent_documents, mark_document_dirty, mutate_document,
    open_document_tracking, prepare_document_open, prepare_staged_document_save, query_document,
    read_local_font, record_recent_document, remove_recent_document, render_document_preview,
    render_page_svg, reveal_in_folder, take_pending_open_paths,
};
use state::AppState;

pub fn run() {
    #[cfg(target_os = "linux")]
    linux_runtime::apply_linux_runtime_fixes();

    let app = tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let paths = document_paths_from_args(&args, &cwd);
            if paths.is_empty() {
                return;
            }
            let app = app.clone();
            tauri::async_runtime::spawn_blocking(move || {
                open_paths_in_new_windows(&app, paths);
            });
        }))
        .setup(|app| {
            if let Err(error) = pdf_temp_cleanup::cleanup_orphan_pdf_temp_dirs() {
                eprintln!("[pdf] 오래된 임시 디렉터리 정리를 건너뜁니다: {error}");
            }
            let pdf_jobs = app.state::<AppState>().pdf_jobs.clone();
            pdf_temp_cleanup::spawn_pdf_job_reaper(std::sync::Arc::downgrade(&pdf_jobs))?;
            app.set_menu(tauri::menu::Menu::new(app)?)?;
            queue_open_paths(app.handle(), startup_document_paths());
            if let Some(window) = app.get_webview_window("main") {
                windows::install_editor_window_minimum(&window);
                windows::attach_document_drop_handler(app.handle(), &window);
                windows::attach_window_cleanup(app.handle(), &window);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_document,
            create_editor_window,
            close_document,
            mark_document_dirty,
            render_page_svg,
            query_document,
            mutate_document,
            begin_pdf_export,
            append_pdf_page,
            commit_pdf_export,
            abort_pdf_export,
            destroy_current_window,
            desktop_platform,
            list_local_fonts,
            read_local_font,
            prepare_document_open,
            open_document_tracking,
            prepare_staged_document_save,
            commit_staged_document_save,
            check_external_modification,
            take_pending_open_paths,
            reveal_in_folder,
            list_recent_documents,
            clear_recent_documents,
            record_recent_document,
            remove_recent_document,
            render_document_preview,
        ])
        .build(tauri::generate_context!())
        .expect("failed to build Alhangeul desktop app");

    app.run(|_, _| {});
}

fn queue_open_paths(app: &AppHandle, paths: Vec<String>) {
    if paths.is_empty() {
        return;
    }

    app.state::<AppState>()
        .pending_open_paths
        .queue_global(paths.iter().cloned());

    let payload = serde_json::json!({ "paths": paths });
    if let Some(label) = crate::windows::target_window_label(app) {
        let _ = app.emit_to(label, "alhangeul-open-paths", payload);
    } else {
        let _ = app.emit("alhangeul-open-paths", payload);
    }
}

fn open_paths_in_new_windows(app: &AppHandle, paths: Vec<String>) {
    for path in paths {
        if let Err(error) = open_path_in_new_window(app, path) {
            eprintln!("[open] 새 창 파일 열기 준비 실패: {}", error);
        }
    }
}

fn open_path_in_new_window(app: &AppHandle, path: String) -> Result<(), String> {
    let label = crate::windows::new_editor_window_label();
    app.state::<AppState>()
        .pending_open_paths
        .queue_for_window(&label, [path]);
    if let Err(error) = crate::windows::create_editor_window_with_label(app, &label) {
        app.state::<AppState>()
            .pending_open_paths
            .discard_for_window(&label);
        return Err(error);
    }
    Ok(())
}

fn document_paths_from_args(args: &[String], cwd: &str) -> Vec<String> {
    let cwd = Path::new(cwd);
    args.iter()
        .skip(1)
        .filter_map(|arg| document_path_from_os_arg(OsStr::new(arg), Some(cwd)))
        .collect()
}

fn startup_document_paths() -> Vec<String> {
    let cwd = env::current_dir().ok();
    env::args_os()
        .skip(1)
        .filter_map(|arg| document_path_from_os_arg(&arg, cwd.as_deref()))
        .collect()
}

fn document_path_from_os_arg(arg: &OsStr, cwd: Option<&Path>) -> Option<String> {
    if let Some(arg) = arg.to_str() {
        if let Ok(url) = tauri::Url::parse(arg) {
            if let Ok(path) = url.to_file_path() {
                return document_path_from_path(path);
            }
        }
    }

    let path = PathBuf::from(arg);
    let resolved = match cwd {
        Some(cwd) if !path.is_absolute() => cwd.join(path),
        _ => path,
    };
    document_path_from_path(resolved)
}

pub(crate) fn document_path_from_path(path: impl AsRef<Path>) -> Option<String> {
    let path = path.as_ref();
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    if ext != "hwp" && ext != "hwpx" {
        return None;
    }
    Some(path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn document_path_from_path_accepts_hwp_and_hwpx_case_insensitively() {
        assert!(document_path_from_path(PathBuf::from("/tmp/doc.hwp")).is_some());
        assert!(document_path_from_path(PathBuf::from("/tmp/doc.HWPX")).is_some());
    }

    #[test]
    fn document_path_from_path_rejects_other_extensions() {
        assert!(document_path_from_path(PathBuf::from("/tmp/doc.pdf")).is_none());
        assert!(document_path_from_path(PathBuf::from("/tmp/doc")).is_none());
    }

    #[test]
    fn document_path_from_arg_resolves_relative_paths_against_cwd() {
        let dir = tempfile::tempdir().unwrap();
        let cwd = dir.path();
        let expected = dir.path().join("docs/sample.hwp");

        assert_eq!(
            document_path_from_os_arg(OsStr::new("docs/sample.hwp"), Some(cwd)),
            Some(expected.to_string_lossy().to_string())
        );
    }

    #[test]
    fn document_path_from_arg_accepts_file_urls() {
        let path = std::env::temp_dir().join("sample.hwpx");
        let url = tauri::Url::from_file_path(&path).unwrap().to_string();

        assert_eq!(
            document_path_from_os_arg(OsStr::new(&url), Some(Path::new("/ignored"))),
            Some(path.to_string_lossy().to_string())
        );
    }

    #[test]
    fn document_paths_from_args_skip_executable_and_filter_unsupported_args() {
        let dir = tempfile::tempdir().unwrap();
        let cwd = dir.path().to_string_lossy();
        let paths = document_paths_from_args(
            &[
                dir.path()
                    .join("Alhangeul.exe")
                    .to_string_lossy()
                    .to_string(),
                "first.hwp".to_string(),
                "notes.txt".to_string(),
                "second.HWPX".to_string(),
            ],
            &cwd,
        );

        assert_eq!(
            paths,
            vec![
                dir.path().join("first.hwp").to_string_lossy().to_string(),
                dir.path().join("second.HWPX").to_string_lossy().to_string()
            ]
        );
    }

    #[test]
    fn startup_like_args_skip_the_executable_path() {
        let dir = tempfile::tempdir().unwrap();
        let cwd = dir.path();
        let executable = dir.path().join("sample.hwp");
        let document = dir.path().join("opened.hwpx");
        let args = [executable.as_os_str(), document.as_os_str()];

        let paths = args
            .iter()
            .skip(1)
            .filter_map(|arg| document_path_from_os_arg(arg, Some(cwd)))
            .collect::<Vec<_>>();

        assert_eq!(paths, vec![document.to_string_lossy().to_string()]);
    }
}
