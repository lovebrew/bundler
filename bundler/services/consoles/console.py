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

    def build(self) -> bytes | None:
        """
        Builds the target console.

        Returns:
            bytes | None: If an error occurred, None is returned. Otherwise, the compiled data is returned.
        """

        raise NotImplementedError

    def filepath(self) -> Path:
        return self.directory / self.title

    def filename(self) -> str:
        suffix = Console.EXTENSIONS[self.__class__.__name__]
        return self.filepath().with_suffix(suffix).name

    def content(self) -> bytes:
        return (self.directory / self.filename()).read_bytes()
