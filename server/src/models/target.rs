use rocket::form::FromFormField;
use std::str::FromStr;

#[derive(Debug, FromFormField, Clone, PartialEq)]
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
