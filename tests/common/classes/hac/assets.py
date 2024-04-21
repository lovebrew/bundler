from dataclasses import dataclass
from io import BufferedReader
from struct import unpack


@dataclass
class AssetSection:
    offset: int
    size: int

    @staticmethod
    def unpack(file: BufferedReader):
        values = unpack(ASSET_SECTION_STRUCT, file.read(ASSET_SECTION_SIZE))
        return AssetSection(*values)


ASSET_SECTION_STRUCT = "<QQ"
ASSET_SECTION_SIZE = 0x10


@dataclass
class AssetHeader:

    magic: str
    version: int
    iconSection: AssetSection
    nacpSection: AssetSection
    romfsSection: AssetSection

    @staticmethod
    def unpack(file: BufferedReader):
        magic, version = unpack(ASSET_HEADER_STRUCT, file.read(ASSET_HEADER_SIZE))

        iconSection = AssetSection.unpack(file)
        nacpSection = AssetSection.unpack(file)
        romfsSection = AssetSection.unpack(file)

        return AssetHeader(magic, version, iconSection, nacpSection, romfsSection)


ASSET_HEADER_STRUCT = "<4sI"
ASSET_HEADER_SIZE = 0x08
