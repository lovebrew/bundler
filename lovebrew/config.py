from ast import arg
from pathlib import Path


class Config:
    CompatibleVersions = ["0.8.1"]

    ValidTargets = ["ctr", "hac", "cafe"]

    ValidArguments = {
        "title": str(),
        "author": str(),
        "description": str(),
        "version": str(),
        "targets": str(),
    }

    def __init__(self, arguments: dict, files: dict) -> None:
        match arguments:
            case {
                "title": str(),
                "author": str(),
                "description": str(),
                "version": str(),
                "target": str(),
            }:
                pass
            case e:
                raise ValueError(f"Invalid arguments {e}")

        if not arguments["target"] in Config.ValidTargets:
            raise ValueError(f"Invalid target '{arguments['target']}'")

        self.target = arguments["target"]

        self.title = arguments["title"]
        self.author = arguments["author"]
        self.description = arguments["description"]
        self.version = arguments["version"]

        self.files = files

    def get_target(self) -> str:
        return self.target

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
        assert type in Config.ValidTargets

        icon_data = (directory / f"icon-{type}").as_posix()
        self.files[f"icon-{type}"].save(icon_data)

        return icon_data
