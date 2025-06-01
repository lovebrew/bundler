use octocrab::models::App;
use rocket::http::Status;
use rocket::response::{Responder, Result as RocketResult};

use serde::Serialize;
use serde_json::json;
use std::io::Cursor;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TextureError {
    #[error("Unsupported texture format")]
    UnsupportedFormat,
    #[error("Corrupted texture data")]
    CorruptedData,
    #[error("Failed to parse texture")]
    ParseFailure,
    #[error("Texture dimensions out of bounds: {width}x{height}")]
    OutOfBounds { width: u32, height: u32 },
}

#[derive(Debug, Error)]
pub enum FontError {
    #[error("Unsupported font format")]
    UnsupportedFormat,
    #[error("Corrupted font data")]
    CorruptedData,
    #[error("Failed to parse font")]
    ParseFailure,
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Texture error: {0}")]
    Texture(#[from] TextureError),
    #[error("Missing field: {0}")]
    MissingField(&'static str),
    #[error("Invalid format: {0}")]
    InvalidFormat(&'static str),
    #[error("Internal server error")]
    Internal,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    message: String,
}

impl<'r> Responder<'r, 'static> for AppError {
    fn respond_to(self, _: &'r rocket::Request<'_>) -> RocketResult<'static> {
        let status = match self {
            AppError::MissingField(_) | AppError::InvalidFormat(_) => Status::BadRequest,
            AppError::Internal => Status::InternalServerError,
            AppError::Texture(_) => Status::UnprocessableEntity,
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
