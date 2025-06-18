use std::fmt;

use anyhow::Error;

use crate::{models::target::Target, types::apierror::AppError};

pub enum Message<'a> {
    Processing(&'a str),
    FailedToProcess(&'a str, AppError),
    CannotConvert(&'a str),
    Converted(&'a str, &'a str),
    Compiling(Target),
    UsingDefaultIcon,
    NoIconProvided,
    FailedToCompile(Target, Error),
    Compiled(Target),
    FinishedWithErrors(usize),
}

impl fmt::Display for Message<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Message::Processing(name) => write!(f, "Processing file '{name}'..."),
            Message::FailedToProcess(name, reason) => {
                write!(f, "Failed to process '{name}': {reason}.")
            }
            Message::CannotConvert(name) => {
                write!(f, "Failed to convert '{name}'.")
            }
            Message::Converted(name, out) => {
                write!(f, "Converted '{name}' to '{out}'.")
            }
            Message::FinishedWithErrors(count) => {
                write!(f, "Finished with {count} errors.")
            }
            Message::Compiling(target) => {
                write!(f, "Compiling for {target}...")
            }
            Message::FailedToCompile(target, reason) => {
                write!(f, "Failed to compile for {target}: {reason}")
            }
            Message::Compiled(target) => write!(f, "Compiled for {target} successfully."),
            Message::NoIconProvided => write!(f, "No icon provided. Using default."),
            Message::UsingDefaultIcon => write!(f, "Error with custom icon. Using default."),
        }
    }
}
