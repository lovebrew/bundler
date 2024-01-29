from enum import Enum
from http import HTTPStatus


def content_type(file_type: str = "html/text") -> str:
    return {"Content-Type": f"application/{file_type}"}


class BundlerError(tuple, Enum):
    INVALID_FILE_TYPE = (HTTPStatus.BAD_REQUEST, content_type())
    INVALID_IMAGE_SIZE = (HTTPStatus.BAD_REQUEST, content_type())


class BundlerException(Exception):
    def __init__(self, error: BundlerError) -> None:
        self.error = (error.name, *error.value)
