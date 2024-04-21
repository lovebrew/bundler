from dataclasses import dataclass

from io import BufferedReader
from struct import unpack


@dataclass
class ApplicationTitle:

    short_desc: str
    long_desc: str
    publisher: str

    @staticmethod
    def unpack(file: BufferedReader):
        values = unpack(APP_TITLE_STRUCT, file.read(APP_TITLE_SIZE))
        values = [value.decode("utf-16").strip("\x00") for value in values]

        return ApplicationTitle(*values)


APP_TITLE_STRUCT = "<128s256s128s"
APP_TITLE_SIZE = 0x200


@dataclass
class SMDH:
    magic: str
    version: int
    zero: int
    titles: list[ApplicationTitle]

    # settings: ApplicationSettings (0x30 bytes)
    # reserved: int (0x02 bytes)

    @staticmethod
    def unpack(file: BufferedReader):
        magic, version, zero = unpack(SMDH_STRUCT, file.read(8))

        if magic != b"SMDH":
            raise ValueError(f"Invalid SMDH magic: {magic}")

        titles = [ApplicationTitle.unpack(file) for _ in range(16)]
        return SMDH(magic, version, zero, titles)


SMDH_STRUCT = "<4sHH"
