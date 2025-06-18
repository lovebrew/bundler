use crate::types::apierror::AppError;

use rocket::{fs::TempFile, tokio::io::AsyncReadExt};

pub async fn read_file(file: &TempFile<'_>) -> Result<Vec<u8>, AppError> {
    let mut buffer = vec![];
    let name = match &file.name() {
        Some(name) => name.to_string(),
        None => return Err(AppError::Internal),
    };
    let mut file = file.open().await.map_err(|e| {
        error!("Failed to open file: {name} ({e:?})");
        AppError::Internal
    })?;
    file.read_to_end(&mut buffer).await.map_err(|e| {
        error!("Failed to read file: {name} ({e:?})");
        AppError::Internal
    })?;
    Ok(buffer)
}
