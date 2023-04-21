from console import Console
from modes import Mode


class Cafe(Console):
    Elf2Rpl = 'elf2rpl "{elf}" "{output}.rpx"'
    BinTool = 'wuhbtool "{rpx}" "{output}.wuhb" --content="{romfs}" --name="{name}" --short-name="{short_name}" --author="{author}" --icon="{icon}"'

    def __init__(self, type: Mode, metadata: dict) -> None:
        super().__init__(type, metadata)

    def build(self) -> str:
        args = {
            "elf": self.binary_path(),
            "output": self.build_path / self.title,
        }

        error = self.run_command(Cafe.Elf2Rpl, args)

        if error != "":
            return error

        args = {
            "rpx": self.build_path / f"{self.title}.rpx",
            "output": self.build_path / self.title,
            "romfs": self.path_to("shaders"),
            "name": self.description,
            "short_name": self.title,
            "author": self.author,
            "icon": self.icon_file(),
        }

        error = self.run_command(Cafe.BinTool, args)

        if error != "":
            return error

        with open(self.final_binary_path(), "ab") as executable:
            executable.write(self.game_zip.read_bytes())

        return str()

    def binary_extension(self) -> str:
        return "wuhb"

    def icon_extension(self) -> str:
        return "png"
