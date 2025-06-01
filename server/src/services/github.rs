use anyhow::Result;
use chrono::{DateTime, Utc};
use log::info;
use octocrab::{Octocrab, models::repos::Asset};
use reqwest::{Client, Url};
use rocket::tokio;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Cursor;
use std::path::PathBuf;
use zip::ZipArchive;

use std::collections::HashMap;
use std::default::Default;

#[derive(Serialize, Deserialize, Default, Clone)]
struct AssetCache {
    downloaded_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

pub struct GithubService {
    crab: Octocrab,
    client: Client,
    cache: HashMap<String, AssetCache>,
}

const REPOSITORY_OWNER: &str = "lovebrew";
const RESOURCES_DIRECTORY: &str = "resources";
const CACHE_FILENAME: &str = ".cache";

impl GithubService {
    async fn load_cache() -> Result<HashMap<String, AssetCache>> {
        if tokio::fs::try_exists(CACHE_FILENAME).await? {
            let contents = tokio::fs::read_to_string(CACHE_FILENAME).await?;
            let cache = serde_json::from_str::<HashMap<String, AssetCache>>(&contents)?;
            return Ok(cache);
        }
        Ok(HashMap::new())
    }

    async fn save_cache(&self) -> Result<()> {
        let contents = serde_json::to_string_pretty(&self.cache)?;
        tokio::fs::write(CACHE_FILENAME, contents).await?;
        Ok(())
    }

    async fn new() -> Result<Self> {
        let crab = Octocrab::builder().build()?;
        let client = Client::new();
        let cache = Self::load_cache().await?;

        Ok(Self {
            crab,
            client,
            cache,
        })
    }

    fn is_asset_up_to_date(&self, asset_name: &str, updated_at: DateTime<Utc>) -> bool {
        if let Some(cache) = self.cache.get(asset_name) {
            return cache.downloaded_at > updated_at;
        }
        false
    }

    fn update_asset_cache(
        &mut self,
        asset_name: &String,
        downloaded_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) {
        self.cache.insert(
            asset_name.to_string(),
            AssetCache {
                downloaded_at,
                updated_at,
            },
        );
    }

    pub async fn sync() -> Result<()> {
        info!("Starting GitHub assets sync...");
        let mut service = Self::new().await?;
        let repos = vec![("bundler", None), ("lovepotion", Some(".elf"))];

        for (repo, filter) in repos {
            let assets = service.get_release_assets(repo).await?;

            for asset in assets {
                if service.is_asset_up_to_date(&asset.name, asset.updated_at) {
                    info!("Skipping {} as it is already up-to-date.", asset.name);
                    continue;
                }

                let bytes = service.download_asset(asset.browser_download_url).await?;
                service.extract_zip(&asset.name, &bytes, filter).await?;
                info!("Downloaded and extracted asset: {}", asset.name);
                service.update_asset_cache(&asset.name, Utc::now(), asset.updated_at);
            }
        }
        service.save_cache().await?;
        info!("GitHub assets sync completed successfully.");
        Ok(())
    }

    async fn get_release_assets(&self, repo: &str) -> Result<Vec<Asset>> {
        info!("Fetching latest release assets for repository: {}", repo);
        let release = self
            .crab
            .repos(REPOSITORY_OWNER, repo)
            .releases()
            .get_latest()
            .await?;

        Ok(release.assets)
    }

    async fn download_asset(&self, asset_url: Url) -> Result<Vec<u8>> {
        info!("Downloading asset from URL: {}", asset_url);
        let response = self.client.get(asset_url).send().await?;
        let bytes = response.error_for_status()?.bytes().await?;
        Ok(bytes.to_vec())
    }

    async fn extract_zip(
        &self,
        zip_name: &str,
        zip_data: &[u8],
        filter: Option<&str>,
    ) -> Result<()> {
        let mut archive = ZipArchive::new(Cursor::new(zip_data))?;
        let resources_dir = PathBuf::from(RESOURCES_DIRECTORY);

        fs::create_dir_all(&resources_dir)?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let mut outpath = resources_dir.join(file.name());

            if !file.is_file() {
                continue;
            }

            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent)?;
            }

            if let Some(filter) = filter {
                if !file.name().ends_with(filter) {
                    continue; // Skip files that do not match the filter
                }

                let folder = match zip_name {
                    x if x.contains("3DS") => "ctr",
                    y if y.contains("Switch") => "hac",
                    _ => "cafe",
                };
                outpath = resources_dir.join(folder).join(file.name());
            }

            let mut outfile = fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
        info!("Extracted {} to {}", zip_name, resources_dir.display());
        Ok(())
    }
}
