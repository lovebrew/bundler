from pathlib import Path

from console import Console


class Hac(Console):
    BinTool = 'elf2nro "{elf}" "{output}.nro" --nacp="{nacp}" --icon="{icon}" --romfsdir="{romfs}"'
    NacpTool = 'nacptool --create "{name}" "{author}" "{version}" "{out}.nacp"'

    def __init__(self, type: str, metadata: dict) -> None:
        super().__init__(type, metadata)

    def build(self, build_dir: Path) -> str:
        super().build(build_dir)

        args = {
            "name": self.title,
            "author": self.author,
            "version": self.version,
            "out": build_dir / self.title,
        }

        error = self.run_command(Hac.NacpTool, args)

        if error != "":
            return error

        args = {
            "nacp": build_dir / f"{self.title}.nacp",
            "icon": self.icon_file(),
            "romfs": self.path_to("shaders"),
            "elf": self.binary_path(),
            "output": build_dir / self.title,
        }

        error = self.run_command(Hac.BinTool, args)

        if error != "":
            return error

        with open(self.final_binary_path(build_dir), "ab") as executable:
            executable.write(self.game_zip.read_bytes())

        return str()

    def binary_extension(self) -> str:
        return "nro"

    def icon_extension(self) -> str:
        return "jpg"
