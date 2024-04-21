from datetime import datetime


class Logger:
    """
    Logger class for the bundler.
    """

    FORMAT = "[{}] {} - {}"

    def __init__(self) -> None:
        self._buffer = {"log": list()}

    def buffer(self) -> dict[str, list[str]]:
        """
        Returns the log buffer.

        Returns:
            dict[str, list[str]]: The log buffer.
        """

        return self._buffer

    def __write(self, level: str, message: str) -> None:
        """
        Writes a message to the log buffer.

        Args:
            level (str): The log level.
            message (str): The message to log.
        """

        timestamp = datetime.now().isoformat(sep=" ", timespec="milliseconds")
        format = Logger.FORMAT.format(timestamp, level, message)
        self._buffer["log"].append(format)

    def write(self, message: str) -> None:
        """
        Logs a message.

        Args:
            message (str): The message to log.
        """

        self._buffer["log"].append(message)

    def info(self, message: str) -> None:
        """
        Logs an info message.

        Args:
            message (str): The message to log.
        """

        self.__write("INFO", message)

    def warn(self, message: str) -> None:
        """
        Logs a warning message.

        Args:
            message (str): The message to log.
        """

        self.__write("WARN", message)

    def error(self, message: str) -> None:
        """
        Logs an error message.

        Args:
            message (str): The message to log.
        """

        self.__write("ERROR", message)


LOGGING = dict()


def __get_logger(request_id: str) -> Logger:
    """
    Returns a logger for a specific request.

    Args:
        request_id (str): The request ID.

    Returns:
        Logger: The logger for the request.
    """

    if not request_id in LOGGING:
        LOGGING[request_id] = Logger()

    return LOGGING[request_id]


def get_logs(request_id: str) -> str:
    """
    Returns the logs for a specific request.

    Args:
        request_id (str): The request ID.

    Returns:
        list[str]: The logs for the request.
    """

    _buffer = __get_logger(request_id).buffer()["log"]
    return "\n".join(_buffer)


def WRITE(request_id: str, message: str) -> None:
    """
    Logs a message.

    Args:
        request_id (str): The request ID.
        message (str): The message to log.
    """

    __get_logger(request_id).write(message)


def INFO(request_id: str, message: str) -> None:
    """
    Logs an info message.

    Args:
        request_id (str): The request ID.
        message (str): The message to log.
    """

    __get_logger(request_id).info(message)


def ERROR(request_id: str, message: str) -> None:
    """
    Logs an error message.

    Args:
        request_id (str): The request ID.
        message (str): The message to log.
    """

    __get_logger(request_id).error(message)
