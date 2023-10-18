from enum import Enum, auto


class Error(Enum):
    # Invalid console type
    TARGET_NOT_VALID = auto()
    # Command argument key invalid
    COMMAND_ARGUMENT_NOT_FOUND = auto()
    # Command failure
    COMMAND_FAILED = auto()
    # EXE not found
    COMMAND_EXE_NOT_FOUND = auto()
    # Config version is mismatched
    CONFIG_VERSION_MISMATCH = auto()
    # No error
    NONE = auto()

    def __str__(self):
        return self.name
