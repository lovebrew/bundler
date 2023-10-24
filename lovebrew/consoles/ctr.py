from pathlib import Path

from lovebrew.command import Command
from lovebrew.config import Config

from lovebrew.console import Console
from lovebrew.error import Error


class Ctr(Console):
    SmdhTool = 'smdhtool --create "{name}" "{desc}" "{author}" "{icon}" "{out}.smdh"'
    BinTool = '3dsxtool "{elf}" "{output}.3dsx" --smdh="{smdh}.smdh" --romfs="{romfs}"'

    def __init__(self) -> None:
        super().__init__("ctr")

    def build(self, build_dir: Path, metadata: Config) -> str | Error:
        icon_data = self.icon_file()
        if (value := metadata.get_icon(build_dir, self.type)) is not None:
            icon_data = value

        if (len(metadata.get_description()) + len(metadata.get_version())) > 256:
            return Error.DESCRIPTION_TOO_LONG.name

        args = {
            "name": metadata.get_title(),
            "desc": f"{metadata.get_description()} • {metadata.get_version()}",
            "author": metadata.get_author(),
            "icon": icon_data,
            "out": build_dir / metadata.get_title(),
        }

        # make the SMDH for metadata
        if (value := Command.execute(Ctr.SmdhTool, args)) != Error.NONE:
            return value

        args = {
            "elf": self.binary_path(),
            "output": build_dir / metadata.get_title(),
            "smdh": build_dir / metadata.get_title(),
            "romfs": self.path_to(f"files.romfs"),
        }

        # make the 3dsx binary
        if (value := Command.execute(Ctr.BinTool, args)) != Error.NONE:
            return value

        return Error.NONE

    def binary_extension(self) -> str:
        return "3dsx"

    def icon_extension(self) -> str:
        return "png"
