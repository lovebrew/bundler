import errno
import os
import shlex
import subprocess
from pathlib import Path


class Console:
    BIN_PATH = Path().cwd() / "bin"

    def __init__(self, metadata: dict) -> None:
        for key, value in metadata.items():
            self.__dict__.update({key: value})

        self.type = metadata["mode"]

    def run_command(self, command: str, args: dict) -> str:
        try:
            __args = shlex.split(command.format(**args))
            subprocess.run(__args, check=True)
        except KeyError as e:
            return f"run_command: failed to lookup arg for '{e}'"
        except subprocess.CalledProcessError as e:
            return f"run_command: {e} ({e.stderr.decode('UTF-8').strip()})"
        except FileNotFoundError as e:
            return f"run_command: {e}"
        except Exception as e:
            return f"run_command: {e}"

        return str()

    def build(self, build_dir: Path) -> None:
        if self.icon:
            extension = self.icon_extension()
            self.icon_path = build_dir / f"icon.{extension}"

            self.icon.save(self.icon_path)

        self.game_zip = build_dir / "game.zip"
        self.game.save(self.game_zip)

    def game_data(self) -> Path:
        return self.game_zip

    def icon_extension(self) -> str:
        raise NotImplementedError

    def binary_extension(self) -> str:
        raise NotImplementedError

    def icon_file(self) -> Path:
        if self.icon:
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
