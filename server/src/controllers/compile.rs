use std::borrow::Borrow;
use std::collections::HashMap;
use std::path::Path;
use std::sync::LazyLock;

use axum::extract::{Multipart, Query};
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use tempfile::tempdir;

use crate::enums::api_error::ApiError;
use crate::enums::console::Console;
use crate::traits::binary::Binary;
use crate::types::bundler_query::BundlerQuery;
use crate::types::console::{cafe::Cafe, ctr::Ctr, hac::Hac};
use crate::types::icon::Icon;

static EXPECTED_ICONS: LazyLock<HashMap<&str, Console>> = LazyLock::new(|| {
    HashMap::from([
        ("icon-ctr", Console::Ctr),
        ("icon-hac", Console::Hac),
        ("icon-cafe", Console::Cafe),
    ])
});

async fn save_icons(
    multipart: &mut Multipart,
    directory: &Path,
) -> Result<HashMap<Console, Icon>, ApiError> {
    let mut icons = HashMap::<Console, Icon>::new();

    // Iterate over fields in the multipart form
    while let Ok(Some(field)) = multipart.next_field().await {
        // Extract the name and validate
        let filename = match &field.name() {
            Some(name) if EXPECTED_ICONS.contains_key(&name.borrow()) => String::from(*name),
            Some(_) | None => continue,
        };

        // Read file contents
        let contents = field
            .bytes()
            .await
            .map_err(|e| ApiError::BadRequest(e.to_string()))?;

        if contents.is_empty() {
            continue; // Skip empty files
        }

        let console = EXPECTED_ICONS[&filename.as_str()];
        let filepath = directory.join(&filename);

        let icon = Icon::new(console, &contents, &filepath).await;

        if let Ok(icon_result) = icon {
            icons.insert(console, icon_result);

            // Save file to the given directory
            if let Err(e) = tokio::fs::write(&filepath, &contents).await {
                return Err(ApiError::ServerError(format!(
                    "Failed to save file {}: {}",
                    filename, e
                )));
            }
        } else {
            return Err(ApiError::BadRequest(format!(
                "Failed to parse icon file: {}",
                filename
            )));
        }
    }

    Ok(icons)
}

pub async fn compile_handler(
    query: Query<BundlerQuery>,
    multipart: Option<Multipart>,
) -> Result<Response, ApiError> {
    let directory = tempdir().map_err(|e| ApiError::server_error(e.to_string()))?;
    let save_directory = directory.path();

    let mut icons = HashMap::<Console, Icon>::new();
    if let Some(mut files) = multipart {
        icons = save_icons(&mut files, save_directory).await?;
    }

    let mut compiled_files = HashMap::<&str, String>::new();

    for target in &query.targets {
        let mut icon_path = target.get_icon();
        if icons.contains_key(target) {
            icon_path = icons[target].get_filepath();
        }

        let basepath = save_directory.join(&query.metadata.title);

        let data = match target {
            Console::Ctr => Ctr::compile(&basepath, &query.metadata, &icon_path).await?,
            Console::Hac => Hac::compile(&basepath, &query.metadata, &icon_path).await?,
            Console::Cafe => Cafe::compile(&basepath, &query.metadata, &icon_path).await?,
        };

        let name = target.get_name();
        compiled_files.insert(name, data);
    }

    let status = if compiled_files.len() != query.targets.len() {
        StatusCode::PARTIAL_CONTENT
    } else {
        StatusCode::OK
    };

    Ok((status, axum::Json(compiled_files)).into_response())
}
