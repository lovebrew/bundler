use bytesize::ByteSize;
use serde::Deserialize;
use std::collections::HashMap;

use log::info;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub struct AppConfig {
    pub host: String,
    pub port: String,
    #[serde(with = "bytesize_serde")]
    pub max_body_size: ByteSize,
}

impl AppConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        info!("Loading environment variables...");
        dotenv::dotenv()?;

        let vars: HashMap<String, String> = dotenv::vars().collect();
        let config = serde_json::from_value(serde_json::to_value(vars)?)?;

        info!("{:?}", config);
        Ok(config)
    }

    pub fn get_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
