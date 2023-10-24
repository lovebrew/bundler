import magic

from werkzeug.datastructures import FileStorage
from PIL import Image

from pathlib import Path

from lovebrew.command import Command
from lovebrew.error import Error


class Media:
    TextureMimeTypes = ["image/png", "image/jpeg", "image/jpg"]
    TextureCommand = "tex3ds -f rgba8888 -z auto '{file}' -o '{out}'"

    FontMimeTypes = ["application/font-sfnt", "application/vnd.ms-opentype"]
    FontCommand = "mkbcfnt '{file}' -o '{out}'"

    def __init__(self, temp_dir: str, file_name: str, storage: FileStorage) -> None:
        self.file_name = Path(file_name).name

        self.temp_file = (Path(temp_dir) / self.file_name).as_posix()
        storage.save(self.temp_file)

        self.mime_type = magic.from_file(self.temp_file, mime=True)

    def is_texture(self) -> bool:
        """Returns whether or not the file is a texture

        Returns:
            bool: True if texture, False if not
        """

        return self.mime_type in Media.TextureMimeTypes

    def is_font(self) -> bool:
        """Returns whether or not the file is a font

        Returns:
            bool: True if font, False if not
        """

        return self.mime_type in Media.FontMimeTypes

    def is_valid_size(self) -> bool:
        """Returns whether or not the file is valid

        Returns:
            bool: True if valid, False if not
        """

        return Path(self.temp_file).stat().st_size > 0

    def is_valid_texture(self) -> Error:
        """Returns whether or not the file is a valid texture
        If this is not a texture, returns Error.NONE

        Returns:
            Error: Error code
        """

        if not self.is_texture():
            return Error.NONE

        size = None

        try:
            image = Image.open(self.temp_file)
            size = image.size

            image.verify()
        except Exception:
            return Error.INVALID_FILE_TYPE

        if size[0] > 1024 and size[1] > 1024:
            return Error.DIMENSIONS_TOO_LARGE

        if size[0] > 1024:
            return Error.WIDTH_TOO_LARGE
        elif size[1] > 1024:
            return Error.HEIGHT_TOO_LARGE

        return Error.NONE

    def is_valid(self) -> bool:
        """Returns whether or not the file is valid

        Returns:
            bool: True if valid, False if not
        """

        return self.is_valid_size() and (self.is_font() or self.is_texture())

    def get_filepath(self) -> str:
        """Returns the filepath of the file

        Returns:
            str: Filepath
        """

        suffix = ".t3x" if self.is_texture() else ".bcfnt"
        return Path(self.temp_file).with_suffix(suffix).as_posix()

    def convert(self) -> bytes | str:
        """Converts a file to a given format

        Returns:
            bytes | str: Bytes if successful, error message if not
        """

        command = Media.TextureCommand if self.is_texture() else Media.FontCommand
        args = {"file": self.temp_file, "out": self.get_filepath()}

        if (value := Command.execute(command, args)) != Error.NONE:
            return value

        return Path(self.get_filepath()).read_bytes()
