import shlex
import subprocess

from lovebrew.error import Error


class Command:
    @staticmethod
    def execute(command: str, args: dict) -> Error | str:
        try:
            __args = shlex.split(command.format(**args))
            completed_process = subprocess.run(__args, check=True, capture_output=True)

            if completed_process.returncode != 0:
                return f"{Error.COMMAND_FAILED.name}: {command}"
        except KeyError as e:
            return f"{Error.COMMAND_ARGUMENT_NOT_FOUND.name} ('{e}')"
        except subprocess.CalledProcessError as e:
            return f"{Error.COMMAND_FAILED.name}: {e} ({e.stderr}))"
        except FileNotFoundError as e:
            return f"{Error.COMMAND_EXE_NOT_FOUND.name} ('{__args[0]}')"

        return Error.NONE
