use serde::{Deserialize, Serialize};
use serde_with::{formats::CommaSeparator, serde_as, StringWithSeparator};

use crate::enums::console::Console;

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct Metadata {
    pub title: String,
    pub author: String,
    pub description: String,
    pub version: String,
}

#[serde_as]
#[derive(Debug, Deserialize, PartialEq)]
pub struct BundlerQuery {
    #[serde(flatten)]
    pub metadata: Metadata,
    #[serde_as(as = "StringWithSeparator::<CommaSeparator, Console>")]
    pub targets: Vec<Console>,
}
