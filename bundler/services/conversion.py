import io
import base64

from dataclasses import dataclass
from pathlib import Path

from flask import session

from bundler.error import BundlerError, BundlerException
from bundler.logger import ERROR, INFO
from bundler.services.command import Command


@dataclass
class ConversionRequest:
    FONT_TYPES = [
        "font/sfnt",
        "font/otf",
        "font/ttf",
        "application/font-sfnt",
        "application/vnd.ms-opentype",
    ]
    FontCommand = "mkbcfnt '{file}' -o '{out}'"

    IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"]
    TextureCommand = "tex3ds -f rgba8888 -z auto '{file}' -o '{out}'"

    name: str
    data: io.BytesIO

    def __is_font(self):
        return self.data.mimetype in ConversionRequest.FONT_TYPES

    def __is_image(self):
        return self.data.mimetype in ConversionRequest.IMAGE_TYPES

    def __validate(self):
        if not self.__is_font() and not self.__is_image():
            raise BundlerException(BundlerError.INVALID_FILE_TYPE)

    def filename(self) -> str:
        """
        Get the filename of the converted file.

        Returns:
            str: The filename of the converted file.
        """

        suffix = ".bcfnt" if self.__is_font() else ".t3x"
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

        input = temp_dir / self.name
        input.parent.mkdir(parents=True, exist_ok=True)

        output = temp_dir / self.filename()

        return (input, output)

    def convert(self, temp_dir: str) -> dict[str, str]:
        """
        Convert the file to a different format.

        Returns:
            dict: {filename: base64 encoded data}
        """

        self.__validate()

        temp_dir = Path(temp_dir)
        command = self.FontCommand if self.__is_font() else self.TextureCommand

        input, output = self.__get_files(temp_dir)
        self.data.save(input)

        args = {"file": input, "out": output}

        if Command.execute(command, args):
            INFO(session["convert_ctx"], f"Converted {self.name} to {self.filename()}")

            data = Path(output).read_bytes()
            return {self.filename(): base64.b64encode(data).decode()}

        ERROR(session["convert_ctx"], f"Failed to convert {self.name}")
        raise BundlerException(BundlerError.CANNOT_PROCESS_FILE)
