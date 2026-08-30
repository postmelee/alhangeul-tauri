use alhangeul_document_preview::limits::{MAX_INPUT_BYTES, MAX_REQUESTED_EDGE};
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};

pub const INTERNAL_WORKER_FLAG: &str = "--alhangeul-private-worker";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Request {
    pub input: PathBuf,
    pub output: PathBuf,
    pub edge: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Invocation {
    Supervisor(Request),
    Worker(Request),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CliError {
    Arguments,
    Input,
    Output,
    Edge,
}

pub fn parse(args: impl IntoIterator<Item = OsString>) -> Result<Invocation, CliError> {
    let args = args.into_iter().collect::<Vec<_>>();
    let (worker, values) = match args.as_slice() {
        [flag, input, output, edge] if flag == INTERNAL_WORKER_FLAG => {
            (true, [input, output, edge])
        }
        [input, output, edge] => (false, [input, output, edge]),
        _ => return Err(CliError::Arguments),
    };
    let edge = values[2]
        .to_str()
        .ok_or(CliError::Edge)?
        .parse::<u32>()
        .map_err(|_| CliError::Edge)?;
    let request = validate_request(PathBuf::from(values[0]), PathBuf::from(values[1]), edge)?;
    Ok(if worker {
        Invocation::Worker(request)
    } else {
        Invocation::Supervisor(request)
    })
}

fn validate_request(input: PathBuf, output: PathBuf, edge: u32) -> Result<Request, CliError> {
    if !(1..=MAX_REQUESTED_EDGE).contains(&edge) {
        return Err(CliError::Edge);
    }
    validate_input(&input)?;
    validate_output(&input, &output)?;
    Ok(Request {
        input,
        output,
        edge,
    })
}

fn validate_input(input: &Path) -> Result<(), CliError> {
    if !input.is_absolute() {
        return Err(CliError::Input);
    }
    let metadata = fs::symlink_metadata(input).map_err(|_| CliError::Input)?;
    if metadata.file_type().is_symlink()
        || !metadata.is_file()
        || metadata.len() > MAX_INPUT_BYTES as u64
    {
        return Err(CliError::Input);
    }
    if fs::canonicalize(input).map_err(|_| CliError::Input)? != input {
        return Err(CliError::Input);
    }
    Ok(())
}

fn validate_output(input: &Path, output: &Path) -> Result<(), CliError> {
    if !output.is_absolute() || output.file_name().is_none() || input == output {
        return Err(CliError::Output);
    }
    let parent = output.parent().ok_or(CliError::Output)?;
    let metadata = fs::symlink_metadata(parent).map_err(|_| CliError::Output)?;
    if metadata.file_type().is_symlink()
        || !metadata.is_dir()
        || fs::canonicalize(parent).map_err(|_| CliError::Output)? != parent
    {
        return Err(CliError::Output);
    }
    match fs::symlink_metadata(output) {
        Ok(metadata) => {
            if metadata.file_type().is_symlink()
                || !metadata.is_file()
                || fs::canonicalize(output).map_err(|_| CliError::Output)? != output
            {
                return Err(CliError::Output);
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(_) => return Err(CliError::Output),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use tempfile::tempdir;

    #[test]
    fn public_and_worker_invocations_are_distinct() {
        let directory = tempdir().unwrap();
        let input = directory.path().join("input.hwp");
        File::create(&input).unwrap();
        let output = directory.path().join("output.png");
        let public = parse([input.clone().into(), output.clone().into(), "64".into()]).unwrap();
        let worker = parse([
            INTERNAL_WORKER_FLAG.into(),
            input.clone().into(),
            output.clone().into(),
            "64".into(),
        ])
        .unwrap();
        assert_eq!(public, Invocation::Supervisor(request(&input, &output, 64)));
        assert_eq!(worker, Invocation::Worker(request(&input, &output, 64)));
    }

    #[test]
    fn edge_and_argument_contracts_fail_closed() {
        assert_eq!(parse(Vec::<OsString>::new()), Err(CliError::Arguments));
        assert_eq!(
            parse(["a".into(), "b".into(), "0".into()]),
            Err(CliError::Edge)
        );
        assert_eq!(
            parse(["a".into(), "b".into(), "1025".into()]),
            Err(CliError::Edge)
        );
    }

    fn request(input: &Path, output: &Path, edge: u32) -> Request {
        Request {
            input: input.to_path_buf(),
            output: output.to_path_buf(),
            edge,
        }
    }
}
