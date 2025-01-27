use axum::{
    extract::DefaultBodyLimit,
    routing::{get, post},
    Router,
};

use log::{error, info};
use tokio::signal;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

mod common;
mod controllers;
mod enums;
mod modules;
mod traits;
mod types;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    common::logger::init_file();
    modules::environment::check_environment()?;

    if let Ok(config) = common::config::AppConfig::from_env() {
        // Download and unzip assets
        modules::github_assets::sync_assets().await?;

        let address = config.get_address();

        let app = Router::new()
            .nest_service("/", ServeDir::new("static"))
            .route("/convert", post(controllers::convert::convert_handler))
            .route("/compile", post(controllers::compile::compile_handler))
            .layer(DefaultBodyLimit::max(config.max_body_size.as_u64() as usize))
            .route("/info", get(controllers::info::info_handler))
            .layer(CorsLayer::permissive());

        if let Ok(listener) = tokio::net::TcpListener::bind(&address).await {
            info!("Server is running on http://{}", address);
            let _ = axum::serve(listener, app.into_make_service())
                .with_graceful_shutdown(shutdown_signal())
                .await;
        } else {
            error!("Failed to bind to port {}", config.port);
        }
    } else {
        error!("Failed to load app config");
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
