use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::PathBuf;
use std::sync::LazyLock;

use chrono::{DateTime, Duration, Utc};
use octocrab::{Octocrab, models::repos::Asset};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use zip::ZipArchive;

use log::info;

const GITHUB_OWNER: &str = "lovebrew";

static RESOURCES_DIR: LazyLock<PathBuf> = LazyLock::new(|| {
    let cwd = std::env::current_dir().unwrap();
    cwd.join("resources")
});

static CACHE_FILEPATH: LazyLock<PathBuf> = LazyLock::new(|| {
    let cwd = std::env::current_dir().unwrap();
    cwd.join(".cache")
});

#[derive(Serialize, Deserialize, Default)]
struct CacheInfo {
    last_updated: DateTime<Utc>,
    releases_ids: HashMap<String, String>,
    timestamps: HashMap<String, String>,
}

impl CacheInfo {
    fn load() -> Self {
        let path = PathBuf::from(CACHE_FILEPATH.as_path());

        if !path.exists() {
            return Self::default();
        }

        let content = match std::fs::read_to_string(path) {
            Ok(content) => content,
            Err(_) => return Self::default(),
        };

        serde_json::from_str::<CacheInfo>(&content).unwrap_or_default()
    }

    fn check_for_update(&self, repo: &str, id: &str) -> bool {
        let current_time = Utc::now();
        let diff = current_time - self.last_updated;

        if !self.releases_ids.contains_key(repo) {
            return true;
        }

        diff > Duration::days(1) || self.releases_ids[repo] != id
    }

    async fn save(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        self.last_updated = Utc::now();

        let content = serde_json::to_string_pretty(self)?;
        tokio::fs::write(CACHE_FILEPATH.as_path(), content).await?;
        Ok(())
    }
}

async fn fetch_latest_release_assets(
    repo: &str,
) -> Result<(Vec<Asset>, String), Box<dyn std::error::Error>> {
    info!("Fetching latest release assets for {}...", repo);

    let octocrab = Octocrab::builder().build()?;

    let release = octocrab
        .repos(GITHUB_OWNER, repo)
        .releases()
        .get_latest()
        .await?;

    let mut assets = Vec::new();

    for asset in release.assets {
        assets.push(asset);
    }

    Ok((assets, release.id.to_string()))
}

async fn download_files(assets: &Vec<Asset>) -> Result<Vec<PathBuf>, Box<dyn std::error::Error>> {
    let client = Client::new();

    let mut files = Vec::new();
    let cwd = std::env::current_dir()?;

    for asset in assets {
        let response = client
            .get(asset.browser_download_url.clone())
            .send()
            .await?;

        let bytes = response.bytes().await?;

        let path = cwd.join(asset.name.clone());
        tokio::fs::write(&path, bytes).await?;

        files.push(path);
    }

    Ok(files)
}

async fn unzip_files(
    files: &Vec<PathBuf>,
    filters: Option<Vec<&str>>,
    cache: &mut CacheInfo,
) -> Result<(), Box<dyn std::error::Error>> {
    info!("Unzipping files...");

    for archive_path in files {
        let zip_file: File = File::open(archive_path)?;
        let mut archive = ZipArchive::new(zip_file)?;

        if let Some(ref filter) = filters {
            for i in 0..archive.len() {
                let mut archive_file = archive.by_index(i)?;

                let file_name = match archive_path.file_name() {
                    Some(file_name) => file_name.to_str().unwrap(),
                    None => continue,
                };

                let folder = if file_name.contains("3DS") {
                    "ctr"
                } else if file_name.contains("Switch") {
                    "hac"
                } else {
                    "cafe"
                };

                let file_path = RESOURCES_DIR.join(folder).join(archive_file.name());

                if filter.contains(&archive_file.name()) {
                    let mut file_bytes = Vec::new();
                    archive_file.read_to_end(&mut file_bytes)?;

                    tokio::fs::write(&file_path, file_bytes).await?;

                    let date_time = match archive_file.last_modified() {
                        Some(date_time) => date_time,
                        None => continue,
                    };

                    let timestamp = date_time.to_string();
                    cache.timestamps.insert(folder.to_string(), timestamp);
                }
            }
        } else {
            archive.extract(RESOURCES_DIR.as_path())?;
        }

        tokio::fs::remove_file(archive_path).await?;
    }

    info!("Done.");
    Ok(())
}

pub fn get_timestamps() -> HashMap<String, String> {
    let cache = CacheInfo::load();
    cache.timestamps
}

pub async fn sync_assets() -> Result<(), Box<dyn std::error::Error>> {
    info!("Starting assets sync...");
    let mut cache = CacheInfo::load();
    info!("Cache loaded, last updated: {}", cache.last_updated);

    let data = [
        ("bundler", None),
        ("lovepotion", Some(vec!["lovepotion.elf"])),
    ];

    let mut updated = false;

    for (repo, filters) in data {
        info!("Checking repository {}...", repo);
        let (assets, id) = fetch_latest_release_assets(repo).await?;
        cache.releases_ids.insert(repo.to_string(), id.clone());

        if !cache.check_for_update(repo, &id) {
            info!("Cache is up to date for {}", repo);
            continue;
        }

        if !RESOURCES_DIR.exists() {
            std::fs::create_dir_all(RESOURCES_DIR.as_path())?;
        }

        info!("Downloading {} files for {}...", assets.len(), repo);
        let files = download_files(&assets).await?;
        unzip_files(&files, filters, &mut cache).await?;
        updated = true;
    }

    if updated {
        cache.save().await?;
    }

    info!("Assets sync completed.");
    Ok(())
}
