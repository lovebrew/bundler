use anyhow::Result;
use chrono::Local;
use rocket::tokio::sync::RwLock;

use std::io::{Cursor, Write};
use std::sync::Arc;

use crate::logging::message::Message;

#[derive(Debug, Clone)]
pub struct Tracefile {
    inner: Arc<RwLock<Cursor<Vec<u8>>>>,
}

#[derive(Debug)]
pub enum Level {
    Info,
    Error,
}

impl Level {
    fn as_str(&self) -> &'static str {
        match self {
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

    async fn log(&self, level: Level, message: Message<'_>) -> Result<()> {
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let mut cursor = self.inner.write().await;

        writeln!(&mut *cursor, "[{timestamp} {}] {}", level.as_str(), message)?;
        Ok(())
    }

    pub async fn info(&self, message: Message<'_>) {
        let _ = self.log(Level::Info, message).await;
    }

    pub async fn error(&self, message: Message<'_>) {
        let _ = self.log(Level::Error, message).await;
    }

    pub async fn bytes(&self) -> Result<Vec<u8>> {
        let cursor = self.inner.read().await;
        Ok(cursor.get_ref().clone())
    }
}
