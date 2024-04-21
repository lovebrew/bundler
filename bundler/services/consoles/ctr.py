from flask import session

from bundler.services.consoles.console import Console
from bundler.services.command import Command

from bundler.logger import ERROR, INFO


class Ctr(Console):
    SmdhTool = 'smdhtool --create "{name}" "{desc}" "{author}" "{icon}" "{out}.smdh"'
    BinTool = '3dsxtool "{elf}" "{output}.3dsx" --smdh="{smdh}.smdh" --romfs="{romfs}"'

    def build(self) -> bytes | None:
        args = {
            "name": self.title,
            "desc": self.description,
            "author": self.author,
            "icon": self.icon_path,
            "out": self.filepath(),
        }

        if not Command.execute(Ctr.SmdhTool, args):
            ERROR(session["compile_ctx"], "Failed to create SMDH")
            return

        INFO(session["compile_ctx"], "SMDH created successfully")

        args = {
            "elf": self.binary,
            "output": self.filepath(),
            "smdh": self.filepath(),
            "romfs": self.romfs,
        }

        if not Command.execute(Ctr.BinTool, args):
            ERROR(session["compile_ctx"], "Failed to create binary")
            return

        INFO(session["compile_ctx"], "Binary created successfully")

        return self.content()

    @staticmethod
    def icon_size() -> tuple[int, int]:
        return (48, 48)
