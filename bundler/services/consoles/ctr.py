from bundler.services.consoles.console import Console
from bundler.services.command import Command


class Ctr(Console):
    SmdhTool = 'smdhtool --create "{name}" "{desc}" "{author}" "{icon}" "{out}.smdh"'
    BinTool = '3dsxtool "{elf}" "{output}.3dsx" --smdh="{smdh}.smdh" --romfs="{romfs}"'

    def build(self) -> str:
        args = {
            "name": self.title,
            "desc": self.description,
            "author": self.author,
            "icon": self.icon_path,
            "out": self.filepath(),
        }

        if (_ := Command.execute(Ctr.SmdhTool, args)) is False:
            return "Failed to create SMDH"

        args = {
            "elf": self.binary,
            "output": self.filepath(),
            "smdh": self.filepath(),
            "romfs": self.romfs,
        }

        if (_ := Command.execute(Ctr.BinTool, args)) is False:
            return "Failed to create 3DSX"

        return self.filepath().with_suffix(".3dsx").read_bytes()

    @staticmethod
    def icon_size() -> tuple[int, int]:
        return (48, 48)
