from io import BufferedReader

from struct import unpack

from dataclasses import dataclass

from ctr.smdh import SMDH


@dataclass
class Header:

    magic: str
    size: int
    relocation_header_size: int
    format_version: int
    flags: int
    code_segment_size: int
    rodata_segment_size: int
    data_segment_size: int
    bss_size: int

    @staticmethod
    def unpack(file: BufferedReader):
        return Header(*unpack(HEADER_STRUCT, file.read(HEADER_SIZE)))


HEADER_STRUCT = "<4sHHIIIIII"
HEADER_SIZE = 0x20


@dataclass
class ExtHeader:

    smdh_offset: int
    smdh_size: int
    romfs_offset: int

    @staticmethod
    def unpack(file: BufferedReader):
        return ExtHeader(*unpack(EXT_HEADER_STRUCT, file.read(EXT_HEADER_SIZE)))


EXT_HEADER_STRUCT = "<III"
EXT_HEADER_SIZE = 0x0C


class CtrBinary:

    def __init__(self, file: BufferedReader) -> None:
        self.header = Header.unpack(file)

        if self.header.magic != b"3DSX":
            raise ValueError(f"Invalid 3DSX magic: {self.header.magic}")

        if self.header.size <= 0x20:
            print("No extended header")
            return

        self.ext_header = ExtHeader.unpack(file)
        file.seek(self.ext_header.smdh_offset)

        self.smdh = SMDH.unpack(file)
        print(self.smdh)
