from http import HTTPStatus

from aenum import Enum, NoAlias


def content_type(file_type: str = "html/text") -> str:
    return {"Content-Type": f"application/{file_type}"}


class BundlerError(Enum):
    _settings_ = NoAlias

    INVALID_FILE_TYPE = (HTTPStatus.UNSUPPORTED_MEDIA_TYPE, content_type())
    INVALID_IMAGE_SIZE = (HTTPStatus.BAD_REQUEST, content_type())
    NO_FILES_PROVIDED = (HTTPStatus.BAD_REQUEST, content_type())
    CANNOT_PROCESS_FILE = (HTTPStatus.UNPROCESSABLE_ENTITY, content_type())
    NO_ARGUMENTS_PROVIDED = (HTTPStatus.BAD_REQUEST, content_type())
    INVALID_ICON_SIZE = (HTTPStatus.UNPROCESSABLE_ENTITY, content_type())
    INVALID_TARGET_NAME = (HTTPStatus.BAD_REQUEST, content_type())


def error(error: BundlerError) -> tuple[str, int, dict]:
    return (error.name, *error.value)


class BundlerException(Exception):
    def __init__(self, error: BundlerError, extra: str = None) -> None:
        self.error = (f"{error.name}{self.get_extra(extra)}", *error.value)

    def get_extra(self, extra: str) -> str:
        return f": {extra}" if extra else ""
