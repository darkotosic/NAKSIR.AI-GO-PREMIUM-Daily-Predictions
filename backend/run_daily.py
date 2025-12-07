from typing import Any, Dict, List

from .api_football import get_fixtures_today
from .match_full import build_full_match
from .ai_analysis import run_ai_analysis
from .cache_utils import write_json


def main() -> None:
    fixtures = get_fixtures_today()

    index_rows: List[Dict[str, Any]] = []

    for fx in fixtures:
        fixture_id = fx["fixture"]["id"]
        full_match = build_full_match(fx)
        ai = run_ai_analysis(full_match)

        write_json(f"{fixture_id}.json", full_match)
        write_json(f"{fixture_id}.ai.json", ai)

        index_rows.append(
            {
                "fixture_id": fixture_id,
                "league": full_match["fixture"]["league"],
                "teams": full_match["teams"],
                "date": full_match["fixture"]["date"],
            }
        )

    write_json("index.json", {"fixtures": index_rows})


if __name__ == "__main__":
    main()
