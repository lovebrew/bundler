from bundler.services.consoles.console import Console
from bundler.services.command import Command


class Hac(Console):

    def build(self) -> str:
        return

    @staticmethod
    def icon_size() -> tuple[int, int]:
        return (128, 128)
