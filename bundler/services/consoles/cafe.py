from flask import session
from bundler.logger import ERROR, INFO
from bundler.services.consoles.console import Console
from bundler.services.command import Command


class Cafe(Console):
    Elf2Rpl = 'elf2rpl "{elf}" "{output}.rpx"'
    BinTool = 'wuhbtool "{rpx}.rpx" "{output}.wuhb" --content="{romfs}" --name="{short_name}" --short-name="{short_name}" --author="{author}" --icon="{icon}"'

    def build(self) -> bytes | None:
        args = {
            "elf": self.binary,
            "output": self.filepath(),
        }

        if not Command.execute(Cafe.Elf2Rpl, args):
            ERROR(session["compile_ctx"], "Failed to create RPX")
            return

        INFO(session["compile_ctx"], "RPX created successfully")

        args = {
            "rpx": self.filepath(),
            "output": self.filepath(),
            "romfs": self.romfs,
            "short_name": self.title,
            "author": self.author,
            "icon": self.icon_path,
        }

        if not Command.execute(Cafe.BinTool, args):
            ERROR(session["compile_ctx"], "Failed to create binary")
            return

        INFO(session["compile_ctx"], "Binary created successfully")

        return self.content()

    @staticmethod
    def icon_size() -> tuple[int, int]:
        return (128, 128)
