from dataclasses import dataclass
from io import BufferedReader
from struct import unpack

from hac.assets import AssetHeader
from hac.nacp import AppTitle


@dataclass
class Start:
    unused: int
    modOffset: int
    padding: list[int]  # 8 elements

    @staticmethod
    def unpack(file: BufferedReader):
        _, offset = unpack("<II", file.read(8))
        padding = unpack("<8B", file.read(8))

        return Start(_, offset, list(padding))


START_STRUCT = "<II8I"
START_SIZE = 0x20


@dataclass
class SegmentHeader:
    offset: int
    size: int

    @staticmethod
    def unpack(file: BufferedReader):
        values = unpack(SEGMENT_HEADER_STRUCT, file.read(SEGMENT_HEADER_SIZE))
        return SegmentHeader(*values)


SEGMENT_HEADER_STRUCT = "<II"
SEGMENT_HEADER_SIZE = 0x08


@dataclass
class Header:
    magic: str
    version: int
    size: int
    flags: int
    segmentHeaders: list[SegmentHeader]  # 3 elements
    bssSize: int
    reserved: int
    moduleId: int  # 20 bytes
    dsoOffset: int
    reserved2: int
    segmentHeaders2: list[SegmentHeader]  # 3 elements

    @staticmethod
    def unpack(file: BufferedReader):
        magic, version, size, flags = unpack(HEADER_STRUCT, file.read(HEADER_SIZE))
        segmentHeaders = [SegmentHeader.unpack(file) for _ in range(3)]

        values = unpack(HEADER_STRUCT2, file.read(HEADER_SIZE2))
        values = (*values, [SegmentHeader.unpack(file) for _ in range(3)])

        return Header(magic, version, size, flags, segmentHeaders, *values)


class HacBinary:

    def __init__(self, file: BufferedReader) -> None:
        self.start = Start.unpack(file)
        self.header = Header.unpack(file)

        if self.header.magic != b"NRO0":
            raise ValueError(f"Invalid NRO magic: {self.header.magic}")

        file.seek(0)
        file.read(self.header.size)

        self.assets = AssetHeader.unpack(file)

        if self.assets.magic != b"ASET":
            raise ValueError(f"Invalid ASET magic: {self.assets.magic}")

        if self.assets.iconSection.size != 0:
            self.get_icon(file)

        if self.assets.nacpSection.size != 0:
            self.get_titles(file)

    def get_icon(self, file: BufferedReader):
        file.seek(self.header.size + self.assets.iconSection.offset)
        self.icon = file.read(self.assets.iconSection.size)

    def get_titles(self, file: BufferedReader):
        file.seek(self.header.size + self.assets.nacpSection.offset)
        self.titles = [AppTitle.unpack(file) for _ in range(0x0C)]


HEADER_STRUCT = "<4sIII"
HEADER_SIZE = 0x10

HEADER_STRUCT2 = "<II20sII"
HEADER_SIZE2 = 0x24
