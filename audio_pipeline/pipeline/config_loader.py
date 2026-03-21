from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml


def _read_text(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    return path.read_text(encoding="utf-8")


def load_json_or_yaml(path: str | Path) -> dict[str, Any]:
    file_path = Path(path)
    raw = _read_text(file_path)
    suffix = file_path.suffix.lower()

    if suffix in {".yaml", ".yml"}:
        data = yaml.safe_load(raw)
    elif suffix == ".json":
        data = json.loads(raw)
    else:
        raise ValueError(
            f"Unsupported config extension '{suffix}'. Use JSON or YAML for {file_path}."
        )

    if not isinstance(data, dict):
        raise ValueError(f"Top-level config must be an object: {file_path}")
    return data


def load_pipeline_config(path: str | Path) -> dict[str, Any]:
    return load_json_or_yaml(path)


def load_prompt_library(path: str | Path) -> dict[str, Any]:
    data = load_json_or_yaml(path)
    if "categories" not in data:
        raise ValueError(
            "Prompt library must include 'categories' at top level."
        )
    return data


def ensure_directory(path: str | Path) -> Path:
    dir_path = Path(path)
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path


def slugify(value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() else "-" for ch in value.lower())
    return "-".join(filter(None, cleaned.split("-")))

