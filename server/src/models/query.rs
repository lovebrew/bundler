use crate::models::target::Target;
use rocket::form::FromForm;

#[derive(Debug, FromForm)]
pub struct CompileOptions {
    pub title: String,
    pub author: String,
    pub description: String,
    pub version: String,
    pub target: Vec<Target>,
}
