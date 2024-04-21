from pathlib import Path


def transform_files(files: set[str]) -> set:
    result = list()

    for filepath in files:
        path = Path(filepath)
        suffix = path.suffix

        if suffix in [".jpg", ".png", ".jpeg"]:
            path = path.with_suffix(".t3x")
        elif suffix in [".otf", ".ttf"]:
            path = path.with_suffix(".bcfnt")

        result.append(path.as_posix())

    return set(result)
