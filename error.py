from enum import Enum


class Error(Enum):
    # No valid package data sent
    NO_CONTENT_PACKAGE = 0
    # Packaged content is not a zip file
    CONTENT_NON_ZIP_FILE = 1
    # Could not find 'lovebrew.toml' in the package
    MISSING_CONFIG_FILE = 2
    # Could not find 'game.zip' in the package
    MISSING_GAME_CONTENT = 3
    # Target is not valid
    TARGET_NOT_VALID = 4

    def __str__(self):
        return self.name
