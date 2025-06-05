#[macro_use]
extern crate rocket;

use anyhow::Result;

mod controllers;
mod cors;
mod models;
mod services;
mod tools;
mod traits;
mod types;
mod utilities;

use controllers::{compile::compile, convert::convert, health::health_check};
use cors::Cors;
use services::github::GithubService;

const LOGGING_CONFIG: &str = include_str!("log4rs.yml");

#[rocket::main]
async fn main() -> Result<()> {
    let config = serde_yaml::from_str(LOGGING_CONFIG)?;
    log4rs::init_raw_config(config)?;

    tools::check_environment()?;
    GithubService::sync().await?;

    let _ = rocket::build()
        .mount("/", routes![convert, compile, health_check])
        .attach(Cors)
        .launch()
        .await?;

    Ok(())
}
