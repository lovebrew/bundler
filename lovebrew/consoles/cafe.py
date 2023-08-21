import shutil
from pathlib import Path

from lovebrew.console import Console
from lovebrew.error import Error


class Cafe(Console):
    Elf2Rpl = 'elf2rpl "{elf}" "{output}.rpx"'
    BinTool = 'wuhbtool "{rpx}" "{output}.wuhb" --content="{romfs}" --name="{short_name}" --short-name="{short_name}" --author="{author}" --icon="{icon}"'

    def __init__(self, metadata: dict) -> None:
        super().__init__(metadata)

    def build(self, build_dir: Path) -> str | Error:
        shutil.copy(self.game_zip, self.path_to("content"))

        args = {
            "elf": self.binary_path(),
            "output": build_dir / self.title,
        }

        if (value := self.run_command(Cafe.Elf2Rpl, args)) != Error.NONE:
            return value

        args = {
            "rpx": build_dir / f"{self.title}.rpx",
            "output": build_dir / self.title,
            "romfs": self.path_to("content"),
            "name": self.title,
            "short_name": self.title,
            "author": self.author,
            "icon": self.icon_file(),
        }

        if (value := self.run_command(Cafe.BinTool, args)) != Error.NONE:
            return value

        Path(self.path_to("content/game.zip")).unlink()

        return Error.NONE

    def binary_extension(self) -> str:
        return "wuhb"

    def icon_extension(self) -> str:
        return "png"
