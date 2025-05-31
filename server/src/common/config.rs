use axum::http::HeaderValue;
use bytesize::ByteSize;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct AppConfig {
    pub host: String,
    pub port: String,
    #[serde(with = "bytesize_serde")]
    pub max_body_size: ByteSize,
    pub cors: String,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        dotenvy::dotenv()?;
        let config = envy::from_env::<Self>()?;
        Ok(config)
    }

    pub fn get_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    pub fn cors_header_value(&self) -> Result<HeaderValue, axum::http::Error> {
        Ok(HeaderValue::from_str(&self.cors)?)
    }
}
