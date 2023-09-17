import tempfile
from datetime import datetime
import io


class Logger:
    TimeStampFormat = "%H:%M"

    def __new__(cls):
        if not hasattr(cls, "instance"):
            cls.instance = super(Logger, cls).__new__(cls)
        return cls.instance

    def __init__(self) -> None:
        self.file = tempfile.NamedTemporaryFile("w+", delete=False)

    def __del__(self) -> None:
        self.file.close()

    def get_content(self) -> str:
        self.file.seek(0)
        content = self.file.read()
        self.file.seek(0, io.SEEK_END)

        return content

    def __write__(self, message) -> None:
        buffer = f"{datetime.now().strftime(Logger.TimeStampFormat)} {message}\n"
        self.file.write(buffer)

    def info(self, message: str):
        self.__write__(f"[INFO] {message}")

    def warn(self, message: str):
        self.__write__(f"[WARN] {message}")

    def crit(self, message: str):
        self.__write__(f"[CRIT] {message}")


LogFile = Logger()
