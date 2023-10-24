from pathlib import Path

import PIL
import magic


class Config:
    ValidTargets = ["ctr", "hac", "cafe"]

    def __init__(self, arguments: dict, files: dict) -> None:
        match arguments:
            case {
                "targets": str(),
            }:
                pass
            case e:
                raise ValueError(f"Invalid arguments {e}")

        targets = list(set(arguments["targets"].split(",")))

        if len(targets) == 0:
            raise ValueError("No targets specified")

        for target in targets:
            if target not in Config.ValidTargets:
                raise ValueError(f"Invalid target {target}")

        self.targets = targets

        self.title = arguments.get("title", "Untitled")
        self.author = arguments.get("author", "Unknown")
        self.description = arguments.get("description", "No description")
        self.version = arguments.get("version", "0.0.0")

        self.files = files

    def get_targets(self) -> list[str]:
        return self.targets

    def get_title(self) -> str:
        return self.title

    def get_author(self) -> str:
        return self.author

    def get_description(self) -> str:
        return self.description

    def get_version(self) -> str:
        return self.version

    def get_app_version(self) -> int:
        return self.app_version

    def get_icon(self, directory: Path, type: str) -> Path:
        """Gets a custom icon for the specified target

        Args:
            directory (Path): Temporary directory to store the icon
            type (str): The target to get the icon for

        Returns:
            Path: The path to the icon
            None: If no icon is found (uses default)
        """

        assert type in Config.ValidTargets

        if f"icon-{type}" not in self.files:
            return None

        icon_data = directory / f"icon-{type}"
        self.files[f"icon-{type}"].save(icon_data)

        icon_mime = "image/jpeg" if type == "hac" else "image/png"
        if not magic.from_buffer(icon_data.read_bytes(), mime=True) == icon_mime:
            return None

        return icon_data.as_posix()
