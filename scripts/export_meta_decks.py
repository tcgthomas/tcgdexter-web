#!/usr/bin/env python3
"""
Scrape Limitless TCG for reference deck lists for the top 30 meta archetypes.
Outputs data/meta-decks.json.
"""

import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
META_FILE = ROOT / "data" / "meta-archetypes.json"
OUT_FILE = ROOT / "data" / "meta-decks.json"

HEADERS = {"User-Agent": "TCGDexter-MetaDeckScraper/1.0 (educational)"}
DELAY = 0.5  # seconds between requests


def fetch(url: str) -> str:
    """Fetch a URL and return the response body as text."""
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8")


def find_archetype_ids(keyword: str) -> list[int]:
    """Search Limitless TCG decks page and extract archetype IDs."""
    url = f"https://limitlesstcg.com/decks?q={urllib.request.quote(keyword)}&game=PTCG"
    html = fetch(url)
    return [int(m) for m in re.findall(r'href="/decks/(\d+)"', html)]


def find_list_ids(archetype_id: int) -> list[int]:
    """From an archetype page, extract deck list IDs."""
    url = f"https://limitlesstcg.com/decks/{archetype_id}"
    html = fetch(url)
    return [int(m) for m in re.findall(r'href="/decks/list/(\d+)"', html)]


def parse_deck_list(html: str) -> list[dict]:
    """Parse a Limitless deck list page into card objects.

    HTML structure:
      <div class="decklist-column-heading">Pokémon (14)</div>
      <div class="decklist-card" data-set="UPR" data-number="66" ...>
        <a class="card-link" ...>
          <span class="card-count">3</span>
          <span class="card-name">Riolu</span>
        </a>
      </div>
    """
    cards: list[dict] = []
    current_category = "pokemon"

    cat_map = {"pokémon": "pokemon", "pokemon": "pokemon", "trainer": "trainer", "energy": "energy"}

    # Split into lines and walk through
    for line in html.split("\n"):
        line_stripped = line.strip()

        # Detect category headers like: decklist-column-heading">Pokémon (14)</div>
        heading_m = re.search(r'decklist-column-heading[^>]*>([^<]+)', line_stripped)
        if heading_m:
            heading_text = heading_m.group(1).lower()
            for key, cat in cat_map.items():
                if key in heading_text:
                    current_category = cat
                    break
            continue

        # Parse card entries from data attributes + spans
        card_m = re.search(r'decklist-card[^>]*data-set="([^"]*)"[^>]*data-number="([^"]*)"', line_stripped)
        if card_m:
            set_code = card_m.group(1)
            number = card_m.group(2)
            # Extract count and name from subsequent spans (may be on same or following lines)
            # Store partial match to complete when we see spans
            cards.append({
                "qty": 0,
                "name": "",
                "setCode": set_code,
                "number": number,
                "category": current_category,
                "_partial": True,
            })
            continue

        # Fill in count
        count_m = re.search(r'card-count[^>]*>(\d+)<', line_stripped)
        if count_m and cards and cards[-1].get("_partial"):
            cards[-1]["qty"] = int(count_m.group(1))
            continue

        # Fill in name
        name_m = re.search(r'card-name[^>]*>([^<]+)<', line_stripped)
        if name_m and cards and cards[-1].get("_partial"):
            raw = name_m.group(1).strip()
            # Decode HTML entities
            raw = raw.replace("&#039;", "'").replace("&amp;", "&").replace("&quot;", '"')
            cards[-1]["name"] = raw
            del cards[-1]["_partial"]
            continue

    # Remove any incomplete partial entries
    cards = [c for c in cards if not c.get("_partial")]
    return cards


def scrape_deck_for_archetype(name: str) -> list[dict]:
    """Try to find and parse a deck list for a given archetype name."""
    keyword = name.split()[0]
    print(f"  Searching for '{keyword}'...")

    try:
        arch_ids = find_archetype_ids(keyword)
    except Exception as e:
        print(f"  ⚠ Search failed: {e}")
        return []

    if not arch_ids:
        print(f"  ⚠ No archetype IDs found")
        return []

    time.sleep(DELAY)

    # Try the first archetype
    arch_id = arch_ids[0]
    try:
        list_ids = find_list_ids(arch_id)
    except Exception as e:
        print(f"  ⚠ Archetype page failed: {e}")
        return []

    if not list_ids:
        print(f"  ⚠ No list IDs found for archetype {arch_id}")
        return []

    time.sleep(DELAY)

    # Fetch the first deck list
    list_id = list_ids[0]
    try:
        html = fetch(f"https://limitlesstcg.com/decks/list/{list_id}")
    except Exception as e:
        print(f"  ⚠ Deck list page failed: {e}")
        return []

    cards = parse_deck_list(html)
    if cards:
        total = sum(c["qty"] for c in cards)
        print(f"  ✓ Found {len(cards)} unique cards ({total} total)")
    else:
        print(f"  ⚠ Could not parse any cards from list {list_id}")

    return cards


def main() -> None:
    with open(META_FILE) as f:
        archetypes = json.load(f)

    # Sort by total_entries descending, take top 30
    top30 = sorted(archetypes, key=lambda a: a["total_entries"], reverse=True)[:30]

    results: list[dict] = []

    for i, arch in enumerate(top30, 1):
        print(f"[{i}/30] {arch['name']} (id={arch['id']}, entries={arch['total_entries']})")
        cards = scrape_deck_for_archetype(arch["name"])
        results.append({
            "id": arch["id"],
            "name": arch["name"],
            "cards": cards,
        })
        if i < len(top30):
            time.sleep(DELAY)

    with open(OUT_FILE, "w") as f:
        json.dump(results, f, indent=2)

    found = sum(1 for r in results if r["cards"])
    print(f"\nDone! {found}/30 decks scraped. Saved to {OUT_FILE}")


if __name__ == "__main__":
    main()
