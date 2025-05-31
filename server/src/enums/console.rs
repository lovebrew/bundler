use std::{
    fmt::{self, Display, Formatter},
    str::FromStr,
};

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Hash, Clone, Copy)]
pub enum Console {
    Ctr,
    Hac,
    Cafe,
}

impl FromStr for Console {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_uppercase().as_str() {
            "CTR" => Ok(Console::Ctr),
            "HAC" => Ok(Console::Hac),
            "CAFE" => Ok(Console::Cafe),
            _ => Err(format!("Unknown console: {}", s)),
        }
    }
}

impl Display for Console {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        write!(f, "{}", self.get_name())
    }
}

impl Console {
    pub fn get_name(&self) -> &str {
        match self {
            Console::Ctr => "ctr",
            Console::Hac => "hac",
            Console::Cafe => "cafe",
        }
    }

    pub fn full_name(&self) -> String {
        let name = match self {
            Console::Ctr => "3DS",
            Console::Hac => "Switch",
            Console::Cafe => "Wii U",
        };

        format!("Nintendo {}", name)
    }

    fn make_resource_path(folder: &str, name: &str) -> String {
        if let Ok(cwd) = std::env::current_dir() {
            cwd.join(format!("resources/{}/{}", folder, name))
                .to_string_lossy()
                .to_string()
                .replace("\\", "/")
        } else {
            format!("resources/{}/{}", folder, name)
        }
    }

    pub fn get_icon(&self) -> String {
        let folder = self.get_name();

        let icon = match self {
            Console::Ctr => "icon.png",
            Console::Hac => "icon.jpg",
            Console::Cafe => "icon.png",
        };

        Console::make_resource_path(folder, icon)
    }

    pub fn get_romfs(&self) -> String {
        let folder = self.get_name();

        let romfs = match self {
            Console::Ctr => "files.romfs",
            Console::Hac => "files.romfs",
            Console::Cafe => "content",
        };

        Console::make_resource_path(folder, romfs)
    }

    pub fn get_binary(&self) -> String {
        let folder = self.get_name();
        Console::make_resource_path(folder, "lovepotion.elf")
    }
}
