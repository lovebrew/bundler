import errno
import os
import shlex
import subprocess
from pathlib import Path

from lovebrew.error import Error


class Console:
    BIN_PATH = Path(__file__).parent / "bin"

    def __init__(self, metadata: dict) -> None:
        for key, value in metadata.items():
            self.__dict__.update({key: value})

        self.icon_path = None
        self.type = metadata["mode"].lower()

    def run_command(self, command: str, args: dict) -> str:
        try:
            __args = shlex.split(command.format(**args))
            completed_process = subprocess.run(__args, check=True, capture_output=True)

            if completed_process.returncode != 0:
                return f"{Error.COMMAND_FAILED.name} {command}"
        except KeyError as e:
            return f"{Error.COMMAND_ARGUMENT_NOT_FOUND.name} ('{e}')"
        except subprocess.CalledProcessError as e:
            return f"{Error.COMMAND_FAILED.name} ({e.stderr.decode('UTF-8').strip()})"
        except FileNotFoundError as e:
            return f"{Error.COMMAND_EXE_NOT_FOUND.name} ('{e}')"

        return Error.NONE

    def pre_build(self, path: Path, game_data: bytes, icon_data: dict[str, bytes]):
        # save the icon
        if self.type in icon_data:
            self.icon_path = path / f"icon.{self.icon_extension()}"
            self.icon_path.write_bytes(icon_data[self.type])

        # save the game zip file
        self.game_zip = path / "game.zip"
        self.game_zip.write_bytes(game_data)

        return self

    def build(self, build_dir: Path) -> str | Error:
        raise NotImplementedError

    def game_data(self) -> Path:
        return self.game_zip

    def icon_extension(self) -> str:
        raise NotImplementedError

    def binary_extension(self) -> str:
        raise NotImplementedError

    def icon_file(self) -> Path:
        if self.icon_path:
            return self.icon_path

        extension = self.icon_extension()
        return self.path_to(f"icon.{extension}")

    def binary_path(self) -> Path:
        return self.path_to(f"lovepotion_v{self.app_version}.elf")

    def final_binary_path(self, build_dir: Path) -> Path:
        extension = self.binary_extension()

        path = build_dir / f"{self.title}.{extension}"

        if not path.exists():
            raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), path)

        return path

    def path_to(self, item) -> Path:
        path = f"{Console.BIN_PATH}/{self.type}/{item}"

        if not Path(path).exists():
            raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), path)

        return path
