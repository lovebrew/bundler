import io
import base64

from dataclasses import dataclass
from pathlib import Path

from flask import session

from bundler.error import BundlerError, BundlerException
from bundler.logger import ERROR, INFO
from bundler.services.command import Command

import magic


@dataclass
class ConversionRequest:
    FONT_TYPES = [
        "font/sfnt",
        "application/font-sfnt",
        "application/vnd.ms-opentype",
    ]
    FontCommand = "mkbcfnt '{file}' -o '{out}'"

    IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"]
    TextureCommand = "tex3ds -f rgba8888 -z auto '{file}' -o '{out}'"

    name: str
    data: io.BytesIO

    def output(self) -> str:
        """
        Get the filename of the converted file.

        Returns:
            str: The filename of the converted file.
        """

        suffix = ".bcfnt" if self.is_font else ".t3x"
        return Path(self.name).with_suffix(suffix).as_posix()

    def __get_files(self, temp_dir: Path) -> tuple[str]:
        """
        Get the input and output files for the conversion.
        The input is relative to the game directory, no leading slash.

        Example: "graphics/texture.png"

        If the filename has a leading or trailing slash, it will be removed.

        Examples:
            "/graphics/texture.png"  -> "graphics/texture.png"
            "graphics/texture.png/"  -> "graphics/texture.png"
            "/graphics/texture.png/" -> "graphics/texture.png"

        If the filename has parent folders, they will be created in the temporary directory.

        Args:
            temp_dir (Path): The temporary directory to use

        Returns:
            tuple[str]: The input and output filepaths for the conversion.
        """

        self.name = self.name.strip("/")

        input_path = temp_dir / self.name
        input_path.parent.mkdir(parents=True, exist_ok=True)

        self.data.save(input_path)

        self.mime_type = magic.from_file(input_path.as_posix(), mime=True)
        self.is_font = self.mime_type in self.FONT_TYPES
        print(self.name, self.mime_type)
        output = temp_dir / self.output()

        return (input_path, output)

    def convert(self, temp_dir: str) -> dict[str, str]:
        """
        Convert the file to a different format.

        Returns:
            dict: {filename: base64 encoded data}
        """

        temp_dir = Path(temp_dir)
        input, output = self.__get_files(temp_dir)

        if not self.mime_type in self.FONT_TYPES + self.IMAGE_TYPES:
            ERROR(session["convert_ctx"], f"Invalid file type: {self.mime_type}")
            raise BundlerException(BundlerError.INVALID_FILE_TYPE)

        command = (
            self.TextureCommand
            if self.mime_type in self.IMAGE_TYPES
            else self.FontCommand
        )

        args = {"file": input, "out": output}

        if Command.execute(command, args):
            file_name = self.output()
            INFO(session["convert_ctx"], f"Converted {self.name} to {file_name}")

            data = Path(output).read_bytes()
            return {self.output(): base64.b64encode(data).decode()}

        ERROR(session["convert_ctx"], f"Failed to convert {self.name}")
        raise BundlerException(BundlerError.CANNOT_PROCESS_FILE)
