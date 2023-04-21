from console import Console
from modes import Mode


class Hac(Console):
    BinTool = 'elf2nro "{elf}" "{output}.nro" --nacp="{nacp}" --icon="{icon}" --romfsdir="{romfs}"'
    NacpTool = 'nacptool --create "{name}" "{author}" "{version}" "{out}.nacp"'

    def __init__(self, type: Mode, metadata: dict) -> None:
        super().__init__(type, metadata)

    def build(self) -> str:
        args = {
            "name": self.title,
            "author": self.author,
            "version": self.version,
            "out": self.build_path / self.title,
        }

        error = self.run_command(Hac.NacpTool, args)

        if error != "":
            return error

        args = {
            "nacp": self.build_path / f"{self.title}.nacp",
            "icon": self.icon_file(),
            "romfs": self.path_to("shaders"),
            "elf": self.binary_path(),
            "output": self.build_path / self.title,
        }

        error = self.run_command(Hac.BinTool, args)

        if error != "":
            return error

        with open(self.final_binary_path(), "ab") as executable:
            executable.write(self.game_zip.read_bytes())

        return str()

    def binary_extension(self) -> str:
        return "nro"

    def icon_extension(self) -> str:
        return "jpg"
