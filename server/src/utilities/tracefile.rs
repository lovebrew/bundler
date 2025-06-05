use chrono::Local;

use std::io::{Cursor, Error, ErrorKind, Result, Write};
use std::sync::{Arc, RwLock};

#[derive(Clone)]
pub struct Tracefile {
    inner: Arc<RwLock<Cursor<Vec<u8>>>>,
}

#[derive(Debug)]
pub enum Level {
    Debug,
    Info,
    Error,
}

impl Level {
    fn as_str(&self) -> &'static str {
        match self {
            Level::Debug => "DEBUG",
            Level::Info => "INFO",
            Level::Error => "ERROR",
        }
    }
}

impl Tracefile {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(Cursor::new(Vec::new()))),
        }
    }

    fn log<S: AsRef<str>>(&self, level: Level, message: S) -> Result<()> {
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let mut cursor = self
            .inner
            .write()
            .map_err(|_| Error::other("Failed to acquire lock on Tracefile."))?;

        writeln!(
            &mut *cursor,
            "[{timestamp} {}] {}",
            level.as_str(),
            message.as_ref()
        )
    }

    pub fn debug<S: AsRef<str>>(&self, message: S) {
        let _ = self.log(Level::Debug, message);
    }

    pub fn info<S: AsRef<str>>(&self, message: S) {
        let _ = self.log(Level::Info, message);
    }

    pub fn error<S: AsRef<str>>(&self, message: S) {
        let _ = self.log(Level::Error, message);
    }

    pub fn bytes(&self) -> Result<Vec<u8>> {
        let cursor = self
            .inner
            .read()
            .map_err(|_| Error::other("Failed to acquire lock on Tracefile."))?;

        Ok(cursor.get_ref().clone())
    }
}
