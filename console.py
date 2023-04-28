import subprocess
from pathlib import Path


class Console:
    BIN_PATH = Path().cwd() / "bin"

    def __init__(self, mode: str, metadata: dict) -> None:
        for key, value in metadata.items():
            self.__dict__.update({key: value})

        self.type = mode

    def run_command(self, command: str, args: dict) -> str:
        try:
            completed_process = subprocess.run(command.format(**args))

            if completed_process.returncode != 0:
                return completed_process.stderr
        except Exception as e:
            return str(e)

        return str()

    def build(self, build_dir: Path) -> None:
        if self.icon:
            extension = self.icon_extension()
            self.icon_path = build_dir / f"icon.{extension}"

            self.icon.save(self.icon_path)

        self.game_zip = build_dir / f"{self.title}.zip"
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
            raise FileNotFoundError

        return path

    def path_to(self, item) -> Path:
        path = f"{Console.BIN_PATH}/{self.type}/{item}"

        if not Path(path).exists():
            raise FileNotFoundError

        return path
