use std::{path::PathBuf, sync::LazyLock};
use toml;

use serde::{self, Deserialize, Deserializer};

use crate::models::target::Target;

const CONTENTS: &str = include_str!("../resources.toml");
const DIRECTORY: &str = "resources/";

#[derive(Debug, Deserialize)]
pub struct PlatformResources {
    pub icon: String,
    pub romfs: String,
    pub binary: String,
}

#[derive(Debug, Deserialize)]
pub struct ResourceManifest {
    pub ctr: PlatformResources,
    pub hac: PlatformResources,
    pub cafe: PlatformResources,
}

pub enum ResourceType {
    Icon,
    Binary,
    RomFS,
}

impl ResourceManifest {
    fn new() -> Self {
        toml::from_str(CONTENTS).expect("Failed to parse resources.toml")
    }

    pub fn fetch(&self, target: &Target, which: ResourceType) -> PathBuf {
        let resources = match target {
            Target::Ctr => &self.ctr,
            Target::Hac => &self.hac,
            Target::Cafe => &self.cafe,
        };
        let item = match which {
            ResourceType::Binary => &resources.binary,
            ResourceType::Icon => &resources.icon,
            ResourceType::RomFS => &resources.romfs,
        };
        PathBuf::from(DIRECTORY)
            .join(format!("{target}/"))
            .join(item)
    }
}

pub static RESOURCES: LazyLock<ResourceManifest> = LazyLock::new(|| ResourceManifest::new());
