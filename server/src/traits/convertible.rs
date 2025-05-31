use crate::enums::api_error::ApiError;

pub trait Convertible {
    async fn convert(&self) -> Result<(String, String), ApiError>;
}
