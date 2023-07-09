import shutil
from pathlib import Path

from console import Console


class Cafe(Console):
    Elf2Rpl = 'elf2rpl "{elf}" "{output}.rpx"'
    BinTool = 'wuhbtool "{rpx}" "{output}.wuhb" --content="{romfs}" --name="{short_name}" --short-name="{short_name}" --author="{author}" --icon="{icon}"'

    def __init__(self, metadata: dict) -> None:
        super().__init__(metadata)

    def build(self, build_dir: Path) -> str:
        shutil.copy(self.game_zip, self.path_to("content"))

        args = {
            "elf": self.binary_path(),
            "output": build_dir / self.title,
        }

        error = self.run_command(Cafe.Elf2Rpl, args)

        if error != "":
            return error

        args = {
            "rpx": build_dir / f"{self.title}.rpx",
            "output": build_dir / self.title,
            "romfs": self.path_to("content"),
            "name": self.title,
            "short_name": self.title,
            "author": self.author,
            "icon": self.icon_file(),
        }

        error = self.run_command(Cafe.BinTool, args)

        if error != "":
            return error

        Path(self.path_to("content/game.zip")).unlink()

        return str()

    def binary_extension(self) -> str:
        return "wuhb"

    def icon_extension(self) -> str:
        return "png"
