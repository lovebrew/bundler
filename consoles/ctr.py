import shutil
import zipfile

from console import Console
from modes import Mode


class Ctr(Console):
    SmdhTool = 'smdhtool --create "{name}" "{desc}" "{author}" "{icon}" "{out}.smdh"'
    BinTool = '3dsxtool "{elf}" "{output}.3dsx" --smdh="{smdh}.smdh"'
    TexTool = 'tex3ds -f rgba8888 -z auto "{file}" -o "{out}.t3x"'
    FontTool = 'mkbcfnt "{file}" -o "{out}.bcfnt"'

    Textures = [".png", ".jpg", ".jpeg"]
    Fonts = [".ttf", ".otf"]

    def __init__(self, type: Mode, metadata: dict) -> None:
        super().__init__(type, metadata)

    def convert_files(self) -> str:
        # extract the game zip file first
        source_path = self.build_path / "source"
        with zipfile.ZipFile(self.game_zip, "r") as zip:
            zip.extractall(source_path)

        self.game_zip.unlink()

        # walk through the source directory now
        for filepath in source_path.rglob("*"):
            no_suffix = filepath.with_suffix("")
            error = None

            if filepath.suffix in Ctr.Textures:
                error = self.run_command(
                    Ctr.TexTool, {"file": filepath, "out": no_suffix}
                )
            elif filepath.suffix in Ctr.Fonts:
                error = self.run_command(
                    Ctr.FontTool, {"file": filepath, "out": no_suffix}
                )

            if error:
                return error

        shutil.make_archive(self.game_zip.with_suffix(""), "zip", source_path)
        shutil.rmtree(source_path)

        return str()

    def build(self) -> str:
        args = {
            "name": self.title,
            "desc": f"{self.description} • {self.version}",
            "author": self.author,
            "icon": self.icon_file(),
            "out": self.build_path / self.title,
        }

        error = self.run_command(Ctr.SmdhTool, args)

        if error != "":
            return error

        args = {
            "elf": self.binary_path(),
            "output": self.build_path / self.title,
            "smdh": f"{self.build_path / self.title}",
        }

        error = self.run_command(Ctr.BinTool, args)

        if error != "":
            return error

        error = self.convert_files()

        if error != "":
            return error

        with open(self.final_binary_path(), "ab") as executable:
            executable.write(self.game_zip.read_bytes())

        return str()

    def binary_extension(self) -> str:
        return "3dsx"

    def icon_extension(self) -> str:
        return "png"
