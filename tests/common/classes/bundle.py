import logging

from typing import Self
from zipfile import ZipFile
from pathlib import Path

from data import get_resource


class Bundle(ZipFile):
    """
    A write-only ZipFile that represents the bundle to send to the server.
    """

    def __init__(self, filepath: str, source_dir="game"):
        super().__init__(filepath, "x")

        self._path = Path(filepath)
        self._source = source_dir

    def filepath(self) -> str:
        _resolved = self._path.resolve()

        return str(_resolved)

    def content(self):
        return self._path.read_bytes()

    def write_game_file(self, filepath: str) -> Self:
        """
        Write a game file to the bundle.

        Args:
            filename (str): The filename from the resources directory
            relative_path (str, optional): Relative path to override in the archive. Defaults to "".
        """
        _path = Path(filepath)

        resource = get_resource(_path.name)
        filepath = str(Path(f"{self._source}/{filepath}"))

        logging.info(f"Writing {filepath} to bundle.")
        self.writestr(filepath, resource.bytes())

        return self

    def write_game_files(self, files: set[str]) -> Self:
        for file in files:
            self.write_game_file(file)

        return self
