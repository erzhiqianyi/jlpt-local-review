#!/usr/bin/env python3
"""Merge JSONL review captures into public/data/review-data.json."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

JST = timezone(timedelta(hours=9))


def read_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        try:
            row = json.loads(stripped)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"{path}:{line_number}: invalid JSON: {exc}") from exc
        rows.append(row)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, required=True, help="Directory containing YYYY-MM-DD.jsonl capture files.")
    parser.add_argument("--output", type=Path, default=Path("public/data/review-data.json"))
    args = parser.parse_args()

    items: list[dict] = []
    for path in sorted(args.raw_dir.glob("*.jsonl")):
        items.extend(read_jsonl(path))

    items.sort(key=lambda item: (item.get("date", ""), item.get("id", "")), reverse=True)
    output = {
        "generated_at": datetime.now(JST).isoformat(timespec="seconds"),
        "items": items,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} items to {args.output}")


if __name__ == "__main__":
    main()
