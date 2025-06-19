use rocket::http::Status;
use rocket::response::{Responder, Result as RocketResult};
use rocket::serde::json::json;

use serde::Serialize;
use std::io::Cursor;
use thiserror::Error;

use crate::models::target::Target;

#[derive(Debug, Error)]
pub enum TextureError {
    #[error("Corrupted texture data")]
    CorruptedData,
    #[error("Texture dimensions out of bounds: {width}x{height}")]
    OutOfBounds { width: u32, height: u32 },
}

#[derive(Debug, Error)]
pub enum FontError {
    #[error("Corrupted font data")]
    CorruptedData,
}

#[derive(Debug, Error)]
pub enum IconError {
    #[error("Corrupted icon data")]
    CorruptedData,
    #[error("Could not create icon: {message}")]
    CouldNotCreate { message: String },
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Texture error: {0}")]
    Texture(#[from] TextureError),
    #[error("Font error: {0}")]
    Font(#[from] FontError),
    #[error("Icon error: {0}")]
    Icon(#[from] IconError),
    #[error("Invalid format: {0}")]
    InvalidFormat(&'static str),
    #[error("Internal server error")]
    Internal,
    #[error("Failed to execute {0}")]
    FailedToExecute(&'static str),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    message: String,
}

impl<'r> Responder<'r, 'static> for AppError {
    fn respond_to(self, _: &'r rocket::Request<'_>) -> RocketResult<'static> {
        let status = match self {
            AppError::Internal => Status::InternalServerError,
            AppError::Texture(_) => Status::UnprocessableEntity,
            AppError::Font(_) => Status::UnprocessableEntity,
            AppError::Icon(_) => Status::UnprocessableEntity,
            AppError::InvalidFormat(_) => Status::UnsupportedMediaType,
            AppError::FailedToExecute(_) => Status::UnprocessableEntity,
        };

        let body = json!(ErrorResponse {
            error: format!("{:?}", self),
            message: self.to_string(),
        });

        rocket::Response::build()
            .status(status)
            .header(rocket::http::ContentType::JSON)
            .sized_body(body.to_string().len(), Cursor::new(body.to_string()))
            .ok()
    }
}
