from pathlib import Path

from lovebrew.command import Command
from lovebrew.config import Config

from lovebrew.console import Console
from lovebrew.error import Error


class Hac(Console):
    BinTool = 'elf2nro "{elf}" "{output}.nro" --nacp="{nacp}" --icon="{icon}" --romfs="{romfs}"'
    NacpTool = 'nacptool --create "{name}" "{author}" "{version}" "{out}.nacp"'

    def __init__(self) -> None:
        super().__init__("hac")

    def build(self, build_dir: Path, metadata: Config) -> str | Error:
        icon_path = self.icon_file()
        if (value := metadata.get_icon(build_dir, self.type)) is not None:
            icon_path = value

        if (value := self.validate_icon(icon_path)) != Error.NONE:
            return value

        args = {
            "name": metadata.get_title(),
            "author": metadata.get_author(),
            "version": metadata.get_version(),
            "out": build_dir / metadata.get_title(),
        }

        if (value := Command.execute(Hac.NacpTool, args)) != Error.NONE:
            return value

        args = {
            "nacp": build_dir / f"{metadata.get_title()}.nacp",
            "icon": icon_data,
            "romfs": self.path_to("files.romfs"),
            "elf": self.binary_path(),
            "output": build_dir / metadata.get_title(),
        }

        if (value := Command.execute(Hac.BinTool, args)) != Error.NONE:
            return value

        return Error.NONE

    def binary_extension(self) -> str:
        return "nro"

    def icon_extension(self) -> str:
        return "jpg"

    def icon_size(self) -> tuple[int, int]:
        return (256, 256)
