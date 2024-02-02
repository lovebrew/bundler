from flask import session
from bundler.logger import ERROR, INFO
from bundler.services.consoles.console import Console
from bundler.services.command import Command


class Hac(Console):
    NacpTool = "nacptool --create '{name}' '{author}' '{version}' '{out}.nacp'"
    BinTool = "elf2nro '{elf}' '{output}.nro' --nacp='{nacp}.nacp' --icon='{icon}' --romfs='{romfs}'"

    def build(self) -> bytes | None:
        args = {
            "name": self.title,
            "author": self.author,
            "version": self.version,
            "out": self.filepath(),
        }

        if not Command.execute(Hac.NacpTool, args):
            ERROR(session["compile_ctx"], "Failed to create NACP")
            return

        INFO(session["compile_ctx"], "NACP created successfully")

        args = {
            "elf": self.binary,
            "output": self.filepath(),
            "nacp": self.filepath(),
            "icon": self.icon_path,
            "romfs": self.romfs,
        }

        if not Command.execute(Hac.BinTool, args):
            ERROR(session["compile_ctx"], "Failed to create binary")
            return

        INFO(session["compile_ctx"], "Binary created successfully")

        return self.content()

    @staticmethod
    def icon_size() -> tuple[int, int]:
        return (256, 256)
