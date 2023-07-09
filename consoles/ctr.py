import zipfile
from pathlib import Path
import zipfile


from console import Console
from error import Error


class Ctr(Console):
    SmdhTool = 'smdhtool --create "{name}" "{desc}" "{author}" "{icon}" "{out}.smdh"'
    BinTool = '3dsxtool "{elf}" "{output}.3dsx" --smdh="{smdh}.smdh"'
    TexTool = 'tex3ds -f rgba8888 -z auto "{file}" -o "{out}.t3x"'
    FontTool = 'mkbcfnt "{file}" -o "{out}.bcfnt"'

    Textures = [".png", ".jpg", ".jpeg"]
    Fonts = [".ttf", ".otf"]

    def __init__(self, metadata: dict) -> None:
        super().__init__(metadata)

    def convert_files(self, build_path: Path) -> str | Error:
        # extract the game zip file first
        source_path = build_path / "source"
        with zipfile.ZipFile(str(self.game_zip), "r") as zip:
            zip.extractall(source_path)

        self.game_zip.unlink()

        # walk through the source directory now

        file_info = dict()
        for filepath in source_path.rglob("*"):
            no_suffix = filepath.with_suffix("")

            error = Error.NONE
            if filepath.suffix in [*Ctr.Textures, *Ctr.Fonts]:
                file_info = {"file": filepath, "out": no_suffix}

            if filepath.suffix in Ctr.Textures:
                error = self.run_command(Ctr.TexTool, file_info)
            elif filepath.suffix in Ctr.Fonts:
                error = self.run_command(Ctr.FontTool, file_info)

            if error != Error.NONE:
                return error

        with zipfile.ZipFile(str(self.game_zip), "w") as zip:
            for filepath in source_path.rglob("*"):
                zip.write(filepath, filepath.relative_to(source_path))

        return Error.NONE

    def build(self, build_dir: Path) -> str | Error:
        args = {
            "name": self.title,
            "desc": f"{self.description} • {self.version}",
            "author": self.author,
            "icon": self.icon_file(),
            "out": build_dir / self.title,
        }

        # make the SMDH for metadata
        if (value := self.run_command(Ctr.SmdhTool, args)) != Error.NONE:
            return value

        args = {
            "elf": self.binary_path(),
            "output": build_dir / self.title,
            "smdh": f"{build_dir / self.title}",
        }

        command = Ctr.BinTool
        if int(self.app_version) < 3:
            command += ' --romfs="{romfs}"'
            args["romfs"] = self.path_to("files.romfs")

        # make the 3dsx binary
        if (value := self.run_command(command, args)) != Error.NONE:
            return value

        # convert any files that need it
        if (value := self.convert_files(build_dir)) != Error.NONE:
            return value

        # append our new converted and zipped files to the 3dsx
        with open(self.final_binary_path(build_dir), "ab") as executable:
            executable.write(self.game_zip.read_bytes())

        return Error.NONE

    def binary_extension(self) -> str:
        return "3dsx"

    def icon_extension(self) -> str:
        return "png"
