use anyhow::Result;
use log::{error, info};
use which;

const BINARIES: &[(&str, &[&str; 2])] = &[
    ("tex3ds", &["tex3ds", "mkbcfnt"]),
    ("3dstools", &["3dsxtool", "smdhtool"]),
    ("switch-tools", &["nacptool", "elf2nro"]),
    ("wut-tools", &["elf2rpl", "wuhbtool"]),
];

fn check_binary(binary: &str) -> bool {
    if which::which(binary).is_err() {
        error!("✘ {} is not installed.", binary);
        return false;
    }
    info!("✓ Found binary {}", binary);
    true
}

pub fn check_environment() -> Result<()> {
    info!("Starting environment check for required programs...");

    let mut valid = true;
    for &(group, binaries) in BINARIES {
        info!("Checking programs for group: '{}'", group);
        for binary in binaries {
            if !check_binary(binary) {
                valid = false;
            }
        }
    }

    if valid {
        info!("All required programs are installed.");
    } else {
        error!("Some required programs are missing");
    }

    Ok(())
}
