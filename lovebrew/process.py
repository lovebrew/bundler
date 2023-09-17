import tempfile
import traceback
import pkg_resources

from pathlib import Path

import filetype
from semver import Version

from lovebrew.logfile import LogFile
from lovebrew.modes import Mode
from lovebrew.config import Config
from lovebrew.error import Error

__SERVER_VERSION__ = "0.8.0"


def build_target(target: str, data: list, metadata: dict) -> tuple[str, int]:
    with tempfile.TemporaryDirectory(dir=tempfile.gettempdir()) as dir:
        build_dir = Path(dir)

        try:
            LogFile.info(f"Building {target}...")

            if metadata["app_version"] < 3 and target == "CAFE":
                return f"{Error.CAFE_INVALID_ON_APP_VERSION_2.name}", 400

            console = Mode[target].value(metadata)
            error = console.pre_build(build_dir, data[0], data[1]).build(build_dir)

            if error != Error.NONE:
                return f"Error building {target}: {error}", 400

            output_file = console.final_binary_path(build_dir)
            with open(str(output_file), "rb") as file:
                return file.read(), 200

        except KeyError as e:
            return f"{Error.TARGET_NOT_VALID.name} ({target}) {e}", 400
        except Exception:
            return f"An exception occurred: {traceback.format_exc()}", 400


def validate_version(version) -> Error:
    try:
        config_version = Version.parse(version)
        for compatible in Config.CompatibleVersions:
            compatible_version = Version.parse(compatible)
            if config_version < compatible_version:
                return f"{Error.OUTDATED_CONFIG.name} ({version} < {compatible})"
            elif config_version > Version.parse(__SERVER_VERSION__):
                return f"{Error.CONFIG_VERSION_MISMATCH.name} {config_version}"

    except KeyError as e:
        return f"{Error.INVALID_CONFIG_DATA.name} ({e})"

    return Error.NONE


def validate_input_file(file: bytes) -> str | Error:
    # the file should always exist and be a **VALID** zip file
    file_type = filetype.guess(file)
    if file_type is None or file_type.mime != "application/zip":
        return Error.CONTENT_NON_ZIP_FILE.name

    return Error.NONE
