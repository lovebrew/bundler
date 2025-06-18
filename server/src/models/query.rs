use crate::models::target::Target;
use rocket::form::FromForm;

#[derive(Debug, FromForm, Clone)]
pub struct Metadata {
    pub title: String,
    pub author: String,
    pub description: String,
    pub version: String,
}

#[derive(Debug, FromForm, Clone)]
pub struct CompileOptions {
    pub metadata: Metadata,
    pub target: Vec<Target>,
}
