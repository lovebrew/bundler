use std::collections::HashMap;

use axum::response::{IntoResponse, Json, Response};
use chrono::Utc;
use serde::Serialize;
use std::sync::OnceLock;

use crate::{enums::api_error::ApiError, modules::github_assets};

static INFO_CACHE: OnceLock<InfoCache> = OnceLock::new();

#[derive(Debug, Clone)]
struct InfoCache {
    deployed: String,
    timestamps: HashMap<String, String>,
    version: String,
}

#[derive(Debug, Serialize)]
struct Info {
    #[serde(rename = "Deployed")]
    deployed: String,
    #[serde(rename = "Last Updated")]
    timestamps: HashMap<String, String>,
    #[serde(rename = "Server Time")]
    server_time: String,
    #[serde(rename = "Version")]
    version: String,
}

impl Info {
    pub async fn new() -> Self {
        let cache = INFO_CACHE.get_or_init(|| InfoCache {
            deployed: Utc::now().format("%c").to_string(),
            timestamps: github_assets::get_timestamps(),
            version: env!("CARGO_PKG_VERSION").to_string(),
        });

        Self {
            deployed: cache.deployed.clone(),
            server_time: Utc::now().format("%c").to_string(),
            version: cache.version.clone(),
            timestamps: cache.timestamps.clone(),
        }
    }
}

pub async fn info_handler() -> Result<Response, ApiError> {
    Ok(Json(Info::new().await).into_response())
}
