import shutil
from pathlib import Path

from lovebrew.command import Command
from lovebrew.config import Config
from lovebrew.console import Console
from lovebrew.error import Error


class Cafe(Console):
    Elf2Rpl = 'elf2rpl "{elf}" "{output}.rpx"'
    BinTool = 'wuhbtool "{rpx}" "{output}.wuhb" --content="{romfs}" --name="{short_name}" --short-name="{short_name}" --author="{author}" --icon="{icon}"'

    def __init__(self) -> None:
        super().__init__("cafe")

    def build(self, build_dir: Path, metadata: Config) -> str | Error:
        icon_data = self.icon_file()
        if (value := metadata.get_icon(build_dir, self.type)) is not None:
            icon_data = value

        args = {
            "elf": self.binary_path(),
            "output": build_dir / metadata.get_title(),
        }

        if (value := Command.execute(Cafe.Elf2Rpl, args)) != Error.NONE:
            return value

        args = {
            "rpx": build_dir / f"{metadata.get_title()}.rpx",
            "output": build_dir / metadata.get_title(),
            "romfs": self.path_to("content"),
            "name": metadata.get_title(),
            "short_name": metadata.get_title(),
            "author": metadata.get_author(),
            "icon": icon_data,
        }

        if (value := Command.execute(Cafe.BinTool, args)) != Error.NONE:
            return value

        return Error.NONE

    def binary_extension(self) -> str:
        return "wuhb"

    def icon_extension(self) -> str:
        return "png"
