from multiprocessing import Value
from pathlib import Path

import tomllib

from flask import app


class Config:
    CompatibleVersions = ["0.8.0"]

    Metadata = [("title", str), ("author", str), ("description", str), ("version", str)]
    Build = [("source", str), ("targets", list), ("app_version", int)]
    Debug = [("version", str), ("logging", bool)]

    ValidTargets = ["ctr", "hac", "cafe"]

    Error_Key_Type = "[{0}] key not found: '{1}'"
    Error_Key_Value_Type = "Invalid [{0}] key: {1} ({2} expected, got {3})"

    def _validate_metadata(self, user_metadata: dict):
        self._validate_main("metadata", Config.Metadata, user_metadata)

        # icons may or may not exist
        if not "icons" in user_metadata:
            return

        for target in Config.ValidTargets:
            # check if an icon is available
            if target in user_metadata["icons"]:
                user_value_type = type(user_metadata["icons"][target])

                message = Config.Error_Key_Value_Type.format(
                    "metadata", target, str, user_value_type
                )

                # make sure icon value is a str
                if not user_value_type is str:
                    raise ValueError(message)

    def _validate_build(self, user_build: dict):
        self._validate_main("build", Config.Build, user_build)

        if not user_build["source"]:
            raise ValueError("Game content name not set.")

        if len(user_build["targets"]) == 0:
            raise ValueError("No targets were selected.")

        if not user_build["app_version"] in range(2, 4):
            raise ValueError(f"Invalid app version: {user_build['app_version']}.")

    def _validate_debug(self, user_debug: dict):
        self._validate_main("debug", Config.Debug, user_debug)

        if not user_debug["version"]:
            raise ValueError("Debug version is missing.")

    def _validate_main(self, section: str, validation: list[tuple], user_data: dict):
        for tuple_item in validation:
            key, value_type = tuple_item
            if not key in user_data.keys():
                raise KeyError(Config.Error_Key_Type.format(section, key))

            user_value_type = type(user_data[key])
            message = Config.Error_Key_Value_Type.format(
                section, key, str(value_type), str(user_value_type)
            )

            if not user_value_type is value_type:
                raise ValueError(message)

    def __init__(self, file_data: str) -> None:
        self.data = dict()

        user_data = tomllib.loads(str(file_data))

        if "metadata" not in user_data:
            raise KeyError("No [metadata] section present.")
        self._validate_metadata(user_data["metadata"])

        if "build" not in user_data:
            raise KeyError("No [build] section present.")
        self._validate_build(user_data["build"])

        # make sure only one of each valid target exists
        user_data["build"]["targets"] = list(set(user_data["build"]["targets"]))

        if "debug" not in user_data:
            raise KeyError("No [debug] section present.")
        self._validate_debug(user_data["debug"])

        dict.update(self.data, user_data)

    def __getitem__(self, item) -> any:
        return self.data[item]

    def title(self) -> str:
        return self.data["metadata"]["title"]

    def description(self) -> str:
        return self.data["metadata"]["description"]

    def author(self) -> str:
        return self.data["metadata"]["author"]

    def version(self) -> str:
        return self.data["metadata"]["version"]

    def has_icons(self) -> bool:
        return len(self.data["metadata"]["icons"].keys()) > 0

    def icons(self) -> dict:
        return self.data["metadata"]["icons"]

    def icon(self, console: str) -> str:
        return self.data["metadata"]["icons"][console]

    def source(self) -> str:
        return self.data["build"]["source"]

    def targets(self) -> list:
        return self.data["build"]["targets"]

    def app_version(self) -> int:
        return self.data["build"]["app_version"]

    def version(self) -> str:
        return self.data["debug"]["version"]

    def logging(self) -> bool:
        return self.data["debug"]["logging"]
