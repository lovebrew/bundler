#[macro_use]
extern crate rocket;

use anyhow::Result;

mod controllers;
mod services;
mod tools;
mod types;

use controllers::convert::convert;
use services::github::GithubService;

const LOGGING_CONFIG: &str = include_str!("log4rs.yml");

#[rocket::main]
async fn main() -> Result<()> {
    let config = serde_yaml::from_str(LOGGING_CONFIG)?;
    log4rs::init_raw_config(config)?;

    tools::check_environment()?;
    GithubService::sync().await?;

    let _ = rocket::build()
        .mount("/", routes![convert])
        .launch()
        .await?;

    Ok(())
}
