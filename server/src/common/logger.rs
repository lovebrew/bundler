use std::sync::{Arc, RwLock};

#[derive(Clone)]
pub struct MemoryLogger {
    pub logs: Arc<RwLock<Vec<String>>>,
}

impl MemoryLogger {
    pub fn new() -> Self {
        Self {
            logs: Arc::new(RwLock::new(Vec::new())),
        }
    }
}

impl MemoryLogger {
    fn log(&self, level: &str, message: &str) {
        let timestamp = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string();

        if let Ok(mut logs) = self.logs.write() {
            logs.push(format!("{} [{}] {}", timestamp, level, message));
        }
    }

    pub fn info(&self, message: &str) {
        self.log("INFO", message);
    }

    pub fn error(&self, message: &str) {
        self.log("ERR", message);
    }

    pub fn get_logs(&self) -> String {
        if let Ok(logs) = self.logs.read() {
            logs.join("\n")
        } else {
            String::new()
        }
    }
}
