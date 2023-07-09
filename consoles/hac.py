from pathlib import Path

from console import Console
from error import Error


class Hac(Console):
    BinTool = 'elf2nro "{elf}" "{output}.nro" --nacp="{nacp}" --icon="{icon}" --romfs="{romfs}"'
    NacpTool = 'nacptool --create "{name}" "{author}" "{version}" "{out}.nacp"'

    def __init__(self, metadata: dict) -> None:
        super().__init__(metadata)

    def build(self, build_dir: Path) -> str | Error:
        args = {
            "name": self.title,
            "author": self.author,
            "version": self.version,
            "out": build_dir / self.title,
        }

        if (value := self.run_command(Hac.NacpTool, args)) != Error.NONE:
            return value

        args = {
            "nacp": build_dir / f"{self.title}.nacp",
            "icon": self.icon_file(),
            "romfs": self.path_to("files.romfs"),
            "elf": self.binary_path(),
            "output": build_dir / self.title,
        }

        if (value := self.run_command(Hac.BinTool, args)) != Error.NONE:
            return value

        with open(self.final_binary_path(build_dir), "ab") as executable:
            executable.write(self.game_zip.read_bytes())

        return Error.NONE

    def binary_extension(self) -> str:
        return "nro"

    def icon_extension(self) -> str:
        return "jpg"
