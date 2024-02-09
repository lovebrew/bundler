from typing import Self
from zipfile import ZipFile
from pathlib import Path

from conftest import get_resource, logger


class Bundle(ZipFile):

    def __init__(self, filepath: str, mode: str = "r", source_dir="game"):
        super().__init__(filepath, mode)

        self._path = Path(filepath)
        self._source = source_dir

    def filepath(self) -> str:
        _resolved = self._path.resolve()

        return str(_resolved)

    def content(self):
        return self._path.read_bytes()

    def write_game_file(self, filename: str, relative_path="") -> Self:
        """
        Write a game file to the bundle.

        Args:
            filename (str): The filename from the resources directory
            relative_path (str, optional): Relative path to override in the archive. Defaults to "".
        """

        resource = get_resource(filename)
        filepath = str(Path(f"{self._source}/{relative_path}/{filename}"))

        logger().info(f"Writing {filepath} to bundle.")
        self.writestr(filepath, resource.bytes())

        return self

    def write_game_files(self, files: list[tuple[str, str]]) -> Self:
        for file in files:
            self.write_game_file(*file)

        return self

    def write(self, filename: str, data: bytes) -> Self:
        self.writestr(filename, data)

        return self
