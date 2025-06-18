use rocket::form::FromFormField;

use std::fmt::{self, Display, Formatter};
use std::str::FromStr;

#[derive(Debug, FromFormField, Clone, PartialEq, Eq)]
pub enum Target {
    Ctr,
    Hac,
    Cafe,
}

impl FromStr for Target {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "ctr" => Ok(Target::Ctr),
            "hac" => Ok(Target::Hac),
            "cafe" => Ok(Target::Cafe),
            _ => Err(format!("Unknown target: {s}")),
        }
    }
}

impl Display for Target {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        match self {
            Target::Ctr => write!(f, "ctr"),
            Target::Hac => write!(f, "hac"),
            Target::Cafe => write!(f, "cafe"),
        }
    }
}
