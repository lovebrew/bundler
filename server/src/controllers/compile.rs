use rocket::form::Form;
use rocket::fs::TempFile;
use rocket::futures::future::join_all;
use rocket::http::Status;

use std::path::{Path, PathBuf};

use crate::logging::message::Message;
use crate::logging::tracefile::Tracefile;
use crate::models::query::CompileOptions;
use crate::models::response::Response;
use crate::models::target::Target;
use crate::services::resource::{RESOURCES, ResourceType};
use crate::traits::binary::Binary;
use crate::types::apierror::AppError;
use crate::types::binary::ctr::CtrBinary;
use crate::types::icon::Icon;
use crate::types::zipfile::ZipFile;
use crate::utilities::form;

#[derive(Debug, FromForm)]
pub struct IconData<'r> {
    pub icon: TempFile<'r>,
}

async fn fetch_icon_for_target(
    target: &Target,
    temp_dir: &Path,
    icon: Option<Vec<u8>>,
) -> Result<PathBuf, AppError> {
    let bytes = match icon {
        Some(bytes) => bytes,
        None => return Ok(RESOURCES.fetch(target, ResourceType::Icon)),
    };

    let name = format!("{}.bin", target);
    let path = temp_dir.join(&name);

    let icon = Icon::from_bytes(target, &bytes)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|_| AppError::Internal)?;
    }

    icon.create(&path)?;
    Ok(path)
}

#[post("/compile?<options..>", data = "<form>")]
pub async fn compile(
    options: CompileOptions,
    form: Option<Form<IconData<'_>>>,
) -> Result<Response, AppError> {
    let mut targets = options.target.clone();
    targets.dedup();

    let directory = tempfile::tempdir().expect("Failed to create temp directory");
    let dir_path = directory.path().to_owned();

    let base_name = dir_path.join(&options.metadata.title);

    let trace_file = Tracefile::new();
    let mut zip_file = ZipFile::new();

    let icon = match form {
        Some(value) => match form::read_file(&value.icon).await {
            Ok(bytes) => Some(bytes),
            Err(e) => {
                error!("Failed to read icon: {e}");
                None
            }
        },
        None => None,
    };

    let tasks = targets.into_iter().map(|target| {
        let dir_path = dir_path.clone();
        let icon = icon.clone();
        let trace_file = trace_file.clone();
        let base_name = base_name.clone();
        let options = options.clone();

        async move {
            trace_file.info(Message::Compiling(target.clone())).await;

            let icon_path = if icon.is_some() {
                match fetch_icon_for_target(&target, &dir_path, icon).await {
                    Ok(path) => path,
                    Err(_) => {
                        trace_file.error(Message::UsingDefaultIcon).await;
                        RESOURCES.fetch(&target, ResourceType::Icon)
                    }
                }
            } else {
                trace_file.info(Message::NoIconProvided).await;
                RESOURCES.fetch(&target, ResourceType::Icon)
            };
            let platform = match target {
                Target::Ctr => Box::new(CtrBinary::new(&base_name, icon_path)),
                _ => return None,
            };
            let bytes = match platform.process(&options.metadata) {
                Ok(bytes) => bytes,
                Err(e) => {
                    trace_file.error(Message::FailedToCompile(target, e)).await;
                    return None;
                }
            };
            let filename = match platform.path().strip_prefix(&dir_path) {
                Ok(path) => path.to_string_lossy().to_string(),
                Err(_) => return None,
            };
            trace_file.info(Message::Compiled(target)).await;
            Some((filename, bytes))
        }
    });

    let results: Vec<Option<(String, Vec<u8>)>> = join_all(tasks).await;

    let (oks, errs): (Vec<_>, Vec<_>) = results.into_iter().partition(|res| res.is_some());
    let (is_partial, count) = (!errs.is_empty(), errs.len());

    if is_partial {
        trace_file.info(Message::FinishedWithErrors(count)).await;
    }

    for (out_file, bytes) in oks.into_iter().flatten() {
        zip_file.try_add_file(&out_file, &bytes)?;
    }

    let status = if is_partial {
        Status::PartialContent
    } else {
        Status::Ok
    };

    if let Ok(bytes) = trace_file.bytes().await {
        zip_file.try_add_file("compile.log", &bytes)?;
    }

    Ok(Response::with_status(zip_file, status))
}
