use std::sync::{Arc, RwLock};

use flexi_logger::{Age, Cleanup, Criterion, FileSpec, Naming};

pub fn init_file() {
    if let Ok(logger) = flexi_logger::Logger::try_with_str("info") {
        let result = logger
            .log_to_file(
                FileSpec::default()
                    .directory("logs")
                    .basename("bundler")
                    .suffix("log"),
            )
            .format_for_files(|w, now, record| {
                writeln!(
                    w,
                    "{} [{}] - {}",
                    now.format("%Y-%m-%dT%H:%M:%S"),
                    record.level(),
                    record.args()
                )
            })
            .rotate(
                Criterion::Age(Age::Day),
                Naming::Timestamps,
                Cleanup::KeepLogFiles(7),
            );

        if let Err(e) = result.start() {
            eprintln!("Failed to start logger: {}", e);
        }
    }
}

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
