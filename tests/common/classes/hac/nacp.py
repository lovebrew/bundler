from dataclasses import dataclass
from io import BufferedReader
from struct import unpack


@dataclass
class AppTitle:
    name: str
    author: str

    @staticmethod
    def unpack(file: BufferedReader):
        values = unpack(APP_TITLE_STRUCT, file.read(APP_TITLE_SIZE))
        values = [value.decode("utf-8").strip("\x00") for value in values]

        return AppTitle(*values)


APP_TITLE_STRUCT = "<512s256s"
APP_TITLE_SIZE = 0x300
