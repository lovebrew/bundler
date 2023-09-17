from multiprocessing import Value
from pathlib import Path

import tomllib


class Config:
    CompatibleVersions = ["0.8.0"]

    Metadata = [("title", str), ("author", str), ("description", str), ("version", str)]
    Build = [("source", str), ("targets", list[str]), ("app_version", int)]
    Debug = [("version", str), ("logging", bool)]

    ValidTargets = ["ctr", "hac", "cafe"]

    Error_Key_Type = "[{0}] key not found: '{1}'"
    Error_Key_Value_Type = "Invalid [{0}] key: {1} ({2} expected, got {3})"

    def validate_metadata(self, user_metadata: dict):
        for item in Config.Metadata:
            key, value_type = item
            # make sure required key exists
            if key not in user_metadata.keys():
                raise KeyError(Config.Error_Key_Type.format("metadata", key))

                # make sure key is a str
            user_value_type = type(user_metadata[key])
            message = Config.Error_Key_Type.format(
                "metadata", key, value_type, user_value_type
            )

            if not value_type is str:
                raise ValueError(message)

        # icons may or may not exist
        if not "icons" in user_metadata:
            return

        for target in Config.ValidTargets:
            # check if an icon is available
            if target in user_metadata["icons"]:
                user_value_type = type(user_metadata["icons"][target])

                message = Config.Error_Key_Type.format(
                    "metadata", key, str, user_value_type
                )

                # make sure icon value is a str
                if not value_type is str:
                    raise ValueError(message)

    def validate_build(self, user_build: dict):
        for item in Config.Build:
            key, value_type = item
            # make sure required key exists
            if key not in user_build.keys():
                raise KeyError(Config.Error_Key_Type.format("build", key))

            # make sure key is a str
            user_value_type = type(user_build[key])
            message = Config.Error_Key_Type.format(
                "build", key, value_type, user_value_type
            )

            if not value_type is str:
                raise ValueError(message)

        if not user_build["source"]:
            raise ValueError("Game content name not set.")

        if len(user_build["targets"]) == 0:
            raise ValueError("No targets were selected.")

        if not user_build["app_version"] in range(2, 4):
            raise ValueError(f"Invalid app version: {user_build['app_version']}.")

    def validate_debug(self, user_debug: dict):
        for item in Config.Debug:
            key, value_type = item
            if not key in user_debug.keys():
                raise KeyError(Config.Error_Key_Type.format("debug", key))

            user_value_type = type(user_debug[key])
            message = Config.Error_Key_Type.format(
                "debug", key, value_type, user_value_type
            )

            if not user_value_type is value_type:
                raise ValueError(message)

    def __init__(self, file_data: str) -> None:
        self.data = dict()

        user_data = tomllib.loads(str(file_data))

        if "metadata" not in user_data:
            raise KeyError("No [metadata] section present.")
        self.validate_metadata(user_data["metadata"])

        if "build" not in user_data:
            raise KeyError("No [build] section present.")
        self.validate_build(user_data["build"])

        # make sure only one of each valid target exists
        print("FUCK")
        user_data["build"]["targets"] = list(set(user_data["build"]["targets"]))

        if "debug" not in user_data:
            raise KeyError("No [debug] section present.")
        self.validate_debug(user_data["debug"])

        for func_tuple_data in [*Config.Metadata, *Config.Build, *Config.Debug]:
            func_name, _ = func_tuple_data
            print(func_name)

        dict.update(self.data, user_data)

    def __getitem__(self, item) -> any:
        return self.data[item]
