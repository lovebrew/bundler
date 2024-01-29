import shlex
import subprocess


class Command:
    @staticmethod
    def execute(command: str, args: dict) -> bool:
        """
        Execute a command and return the output.

        Args:
            command (str): command to execute
            args (dict): arguments to pass to the command

        Returns:
            bool: if command was successful
        """

        try:
            command = shlex.split(command.format(**args))
            subprocess.run(command, check=True, capture_output=True)

            return True
        except subprocess.CalledProcessError as e:
            print(f"Exception: {e.stderr.decode()}")

        return False
