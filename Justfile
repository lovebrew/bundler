release_dir := "./release"

set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
binary_suffix := if os_family() == "windows"{ ".exe" } else { "" }

[working-directory: "client"]
build-assets:
  bun run build

[working-directory: "server"]
build-for target:
  mkdir -p {{release_dir}}
  cross build --release --target {{target}}
  cp ./target/{{target}}/release/bundler{{binary_suffix}} {{justfile_directory()}}/{{release_dir}}

[working-directory: "server"]
build: build-assets
  cargo build --release
  cp ./target/release/bundler{{binary_suffix}} {{justfile_directory()}}/{{release_dir}}
    
build-linux: build-assets
  build-for x86_64-unknown-linux-gnu

build-windows: build-assets
  build-for x86_64-pc-windows-msvc

build-pi: build-assets
  build-for aarch64-unknown-linux-gnu
