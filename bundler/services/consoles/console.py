from dataclasses import dataclass
from pathlib import Path


@dataclass
class Console:
    icon_path: Path
    directory: Path
    binary: Path
    romfs: Path

    title: str
    author: str
    description: str
    version: str

    EXTENSIONS = {"Ctr": ".3dsx", "Hac": ".nro", "Cafe": ".wuhb"}

    @staticmethod
    def icon_size() -> tuple[int, int]:
        raise NotImplementedError

    def build(self) -> str:
        raise NotImplementedError

    def filepath(self) -> Path:
        return self.directory / self.title

    def filename(self) -> str:
        suffix = Console.EXTENSIONS[self.__class__.__name__]
        return self.filepath().with_suffix(suffix).name
