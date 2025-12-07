import json
import os
from typing import Any, Dict

from .config import PUBLIC_DIR


def write_json(filename: str, payload: Dict[str, Any]) -> None:
    path = os.path.join(PUBLIC_DIR, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
