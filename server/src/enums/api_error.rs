use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use std::fmt;

#[derive(Debug)]
pub enum ApiError {
    BadRequest(String),
    ConversionError(String),
    UnsupportedMediaType(String),
    ValidationError { field: String, message: String },
    ServerError(String),
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub status: u16,
    pub error: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl ApiError {
    pub fn error_response(&self) -> ErrorResponse {
        let (status, error, message, details) = match self {
            Self::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                "Bad Request".to_string(),
                msg.clone(),
                None,
            ),
            Self::ConversionError(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Conversion Error".to_string(),
                msg.clone(),
                None,
            ),
            Self::UnsupportedMediaType(msg) => (
                StatusCode::UNSUPPORTED_MEDIA_TYPE,
                "Unsupported Media Type".to_string(),
                msg.clone(),
                None,
            ),
            Self::ValidationError { field, message } => (
                StatusCode::BAD_REQUEST,
                "Validation Error".to_string(),
                "One or more fields failed validation".to_string(),
                Some(serde_json::json!({
                    "field": field,
                    "message": message,
                })),
            ),
            Self::ServerError(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error".to_string(),
                msg.clone(),
                None,
            ),
        };

        ErrorResponse {
            status: status.as_u16(),
            error,
            message,
            details,
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let status = match &self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::ConversionError(_) => StatusCode::UNPROCESSABLE_ENTITY,
            Self::UnsupportedMediaType(_) => StatusCode::UNSUPPORTED_MEDIA_TYPE,
            Self::ValidationError { .. } => StatusCode::BAD_REQUEST,
            Self::ServerError(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        (status, Json(self.error_response())).into_response()
    }
}

// Helper methods for creating errors
impl ApiError {
    pub fn validation_error<T: Into<String>, U: Into<String>>(field: T, message: U) -> Self {
        Self::ValidationError {
            field: field.into(),
            message: message.into(),
        }
    }

    pub fn server_error<T: Into<String>>(message: T) -> Self {
        Self::ServerError(message.into())
    }
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl std::error::Error for ApiError {}
