use axum::{
    Error, Router,
    extract::DefaultBodyLimit,
    routing::{get, post},
};

use axum_embed::ServeEmbed;
use crypto::ring;
use log::{debug, error, info};
use rust_embed::RustEmbed;
use rustls::crypto;
use tokio::{net::TcpListener, signal};
use tower_http::cors::CorsLayer;

mod common;
mod controllers;
mod enums;
mod modules;
mod traits;
mod types;

#[derive(RustEmbed, Clone)]
#[folder = "static/"]
struct Assets;

const LOGGING_CONFIG: &str = include_str!("log4rs.yml");

async fn run_server(
    listener: TcpListener,
    app: Router,
    config: common::config::AppConfig,
) -> Result<(), Box<dyn std::error::Error>> {
    debug!("Server is starting on {}", config.get_address());
    let server = axum::serve(listener, app).with_graceful_shutdown(shutdown_signal());
    server.await?;
    debug!("Server has stopped gracefully");
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = serde_yaml::from_str(LOGGING_CONFIG)?;
    log4rs::init_raw_config(config)?;

    modules::environment::check_environment()?;

    match ring::default_provider().install_default() {
        Ok(_) => debug!("Crypto provider initialized successfully"),
        Err(_) => {
            debug!("Crypto provider initialization failed");
            return Ok(());
        }
    }

    let config = common::config::AppConfig::from_env()?;

    modules::github_assets::sync_assets().await?;

    let address = config.get_address();
    let assets = ServeEmbed::<Assets>::new();

    let app = Router::new()
        .nest_service("/", assets)
        .route("/convert", post(controllers::convert::convert_handler))
        .route("/compile", post(controllers::compile::compile_handler))
        .layer(DefaultBodyLimit::max(config.max_body_size.as_u64() as usize))
        .layer(CorsLayer::new().allow_origin(config.cors_header_value()?))
        .route("/info", get(controllers::info::info_handler))
        .layer(CorsLayer::permissive());

    match TcpListener::bind(&address).await {
        Ok(listener) => run_server(listener, app, config).await?,
        Err(e) => error!("Failed to bind to address {}: {}", address, e),
    }

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
    info!("Shutdown signal received");
}
