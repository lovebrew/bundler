from enum import Enum, auto

from http import HTTPStatus


class Error(Enum):
    # No error
    NONE = auto()

    # Invalid console type
    TARGET_NOT_VALID = auto()
    # Command argument key invalid
    COMMAND_ARGUMENT_NOT_FOUND = auto()
    # Command failure
    COMMAND_FAILED = auto()
    # EXE not found
    COMMAND_EXE_NOT_FOUND = auto()
    # Description for metadata too long
    DESCRIPTION_TOO_LONG = auto()
    # Invalid file type
    INVALID_FILE_TYPE = auto()
    # Width too large
    WIDTH_TOO_LARGE = auto()
    # Height too large
    HEIGHT_TOO_LARGE = auto()
    # Dimensions too large
    DIMENSIONS_TOO_LARGE = auto()
    # Invalid icon dimensions
    ICON_TOO_LARGE = auto()
    # Nothing uploaded
    NO_FILE_UPLOADED = auto()
    # No query parameters
    NO_PARAMETERS_SUPPLIED = auto()
    # File is empty
    EMPTY_FILE = auto()


def create_error(
    message: str | Error,
    code: int = HTTPStatus.OK,
    content_type: str = "html/text",
) -> tuple[str, int, dict[str, str]]:
    """Creates an error response"""

    if isinstance(message, Error):
        message = message.name

    return (message, code, {"Content-Type": content_type})
