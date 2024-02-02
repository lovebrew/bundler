import base64
import io

from dataclasses import dataclass
from enum import Enum
from tempfile import TemporaryDirectory, gettempdir
from pathlib import Path

from bundler.services.consoles.cafe import Cafe
from bundler.services.consoles.ctr import Ctr
from bundler.services.consoles.hac import Hac

from bundler.logger import ERROR

from get_image_size import get_image_size_from_bytesio

from flask import session


class Console(Enum):
    CTR = Ctr
    HAC = Hac
    CAFE = Cafe


@dataclass
class CompilationRequest:
    title: str
    author: str
    description: str
    version: str

    def __save_icon(self, icon: io.BytesIO, directory: str) -> io.BytesIO:
        """
        Saves the (custom) icon to the directory.

        Args:
            icon (io.BytesIO): The icon to save.
            directory (str): The directory to save the icon to.
        """

        with open(f"{directory}/icon.bin", "wb") as file:
            file.write(icon.read())

        icon.seek(0)

        return Path(f"{directory}/icon.bin")

    def __validate_icon(self, size: tuple[int, int], icon: io.BytesIO) -> bool:
        """
        Validates the icon size.

        Args:
            size (tuple[int, int]): The size of the icon.
            icon (io.BytesIO): The icon to validate.
        """

        icon_byte_len = icon.getbuffer().nbytes
        icon_size = get_image_size_from_bytesio(icon, icon_byte_len)
        icon.seek(0)

        if size != icon_size:
            ERROR(session["compile_ctx"], f"Invalid icon size: {icon_size} != {size}")
            return False

        return True

    def compile(
        self, target: str, icon: io.BytesIO, data: dict[str, io.BytesIO]
    ) -> dict[str, str]:
        """
        Compiles the application for the target console.

        Args:
            target (str): The target console
            icon (io.BytesIO): The icon to use
            data (dict[str, io.BytesIO]): The data for compilation (binary, romfs, etc.)

        Returns:
            dict[str, str]: {filename: base64 data}
        """

        console_class = Console[target.upper()].value

        if not self.__validate_icon(console_class.icon_size(), icon):
            return None

        with TemporaryDirectory(dir=gettempdir()) as directory:
            icon_path = self.__save_icon(icon, directory)
            console = console_class(
                icon_path,
                Path(directory),
                data["BINARY"],
                data["ROMFS"],
                **self.__dict__,
            )

            _build_data = console.build()

            if not _build_data:
                return None

            return {console.filename(): base64.b64encode(_build_data).decode()}
