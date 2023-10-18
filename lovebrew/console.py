import errno
import os
from pathlib import Path

from lovebrew.error import Error


class Console:
    BIN_PATH = Path(__file__).parent / "bin"

    def __init__(self, type: str) -> None:
        self.icon_path = None
        self.type = type

    def build(self, _: Path) -> str | Error:
        raise NotImplementedError

    def game_data(self) -> Path:
        return self.game_zip

    def icon_extension(self) -> str:
        raise NotImplementedError

    def binary_extension(self) -> str:
        raise NotImplementedError

    def icon_file(self) -> Path:
        extension = self.icon_extension()
        return self.path_to(f"icon.{extension}")

    def binary_path(self) -> Path:
        return self.path_to(f"lovepotion.elf")

    def final_binary_path(self, build_dir: Path, title: str) -> Path:
        """
        Gets the final output binary path
        from the build directory.
        """

        extension = self.binary_extension()
        path = build_dir / f"{title}.{extension}"

        if not path.exists():
            raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), path)

        return path

    def path_to(self, item) -> Path:
        """
        Gets the path to a file in the bin directory relative
        to the console type.
        """

        path = f"{Console.BIN_PATH}/{self.type}/{item}"

        if not Path(path).exists():
            raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), path)

        return path
