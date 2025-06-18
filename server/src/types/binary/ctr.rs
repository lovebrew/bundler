use std::path::PathBuf;
use std::process::Command;

use anyhow::{Result, anyhow};

use crate::models::query::Metadata;
use crate::models::target::Target;
use crate::services::resource::{RESOURCES, ResourceType};
use crate::traits::binary::Binary;

pub struct CtrBinary {
    filepath: PathBuf,
    metadata: PathBuf,
    icon: PathBuf,
}

impl CtrBinary {
    pub fn new(filepath: &PathBuf, icon: PathBuf) -> Self {
        let filepath = filepath.with_extension("3dsx");
        let metadata = filepath.with_extension("smdh");
        Self {
            filepath,
            metadata,
            icon,
        }
    }

    pub fn path(&self) -> &PathBuf {
        &self.filepath
    }
}

const METADATA_BINARY: &str = "smdhtool";
const COMPILE_BINARY: &str = "3dsxtool";

impl Binary for CtrBinary {
    fn create_metadata(&self, metadata: &Metadata) -> Result<()> {
        if metadata.title.encode_utf16().count() > 0x40 {
            return Err(anyhow!("Title is too long."));
        }

        let description = format!("{} - {}", metadata.description, metadata.version);
        if description.encode_utf16().count() > 0x80 {
            return Err(anyhow!("Description is too long."));
        }

        if metadata.author.encode_utf16().count() > 0x40 {
            return Err(anyhow!("Author is too long."));
        }

        let mut command = Command::new(METADATA_BINARY);

        command
            .arg("--create")
            .args([&metadata.title, &description, &metadata.author])
            .arg(&self.icon)
            .arg(&self.metadata);

        match command.output() {
            Ok(_) => Ok(()),
            Err(_) => return Err(anyhow!("Failed to create SMDH.")),
        }
    }

    fn process(&self, metadata: &Metadata) -> Result<Vec<u8>> {
        self.create_metadata(metadata)?;

        let romfs_path = RESOURCES.fetch(&Target::Ctr, ResourceType::RomFS);
        let elf_path = RESOURCES.fetch(&Target::Ctr, ResourceType::Binary);

        let mut command = Command::new(COMPILE_BINARY);
        command
            .arg(elf_path)
            .arg(&self.filepath)
            .arg(format!("--smdh={}", self.metadata.to_string_lossy()))
            .arg(format!("--romfs={}", romfs_path.to_string_lossy()));

        match command.output() {
            Ok(output) => {
                if !output.status.success() {
                    return Err(anyhow!("Failed to create 3DSX."));
                }
                let bytes = std::fs::read(&self.filepath)?;
                Ok(bytes)
            }
            Err(_) => return Err(anyhow!("Failed to create 3DSX.")),
        }
    }
}
