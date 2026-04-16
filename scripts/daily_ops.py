#!/usr/bin/env python3
"""
daily_ops.py — Single coordinator for all Dexter daily operations.

Runs each script in dependency order, logs results, and continues on failure
so one broken step doesn't block the rest. Exit code reflects overall health.

Sends a summary email to hello@tcgdexter.com on completion.

Dependency chain:
  1. meta_snapshot.py            (Limitless → meta-decks.db)
  2. export_meta_archetypes.py   (meta-decks.db → JSON → git push → Vercel)
  3. export_meta_decks.py        (Limitless → meta-decks.json → git push → Vercel)
  4. pokemon_price_sync.py       (tcgcsv.com → prices.db)
  5. export_cards_standard.py    (cards.db + prices.db → cards-standard.json → git push)
  6. check_alerts.py             (prices.db → iMessage alerts)
  7. daily_buy_list.py           (meta-decks.db + prices.db → eBay → email)
  8. pokemon_deals.py            (prices.db → eBay → Slack #radar)
  9. export_shop_listings.py     (eBay → shop-listings.json → git push → Vercel)

Usage:
    python3 daily_ops.py                # run all steps
    python3 daily_ops.py --only 1 3 5   # run specific steps by number
    python3 daily_ops.py --skip 8 9     # skip specific steps
    python3 daily_ops.py --dry-run      # print plan without executing
    python3 daily_ops.py --no-email     # skip the summary email
"""

import argparse
import smtplib
import subprocess
import sys
import time
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent

# ─── Pipeline definition ─────────────────────────────────────────────────────
# Each step: (number, name, script, description)

PIPELINE = [
    (1, "meta-snapshot",       "meta_snapshot.py",            "Fetch Limitless tournaments → meta-decks.db"),
    (2, "meta-export",         "export_meta_archetypes.py",   "Export archetypes JSON → git push → Vercel"),
    (3, "meta-decks",          "export_meta_decks.py",        "Scrape Standard-legal deck lists → git push → Vercel"),
    (4, "price-sync",          "pokemon_price_sync.py",       "Sync TCGPlayer prices → prices.db"),
    (5, "cards-export",        "export_cards_standard.py",    "Export cards-standard.json → git push → Vercel"),
    (6, "alert-check",         "check_alerts.py",             "Check deck price alerts → iMessage"),
    (7, "buy-list",            "daily_buy_list.py",           "Meta signals + eBay deals → email"),
    (8, "deal-scan",           "pokemon_deals.py",            "eBay deal scanner → Slack #radar"),
    (9, "shop-listings",       "export_shop_listings.py",     "eBay shop listings → git push → Vercel"),
]

# ─── Email config ─────────────────────────────────────────────────────────────

REPORT_TO    = "hello@tcgdexter.com"
REPORT_FROM  = "ops@tcgdexter.com"
# Uses local sendmail by default. Set SMTP_HOST env var to override.
# For macOS with postfix configured, localhost:25 works out of the box.

# ─── Logging ──────────────────────────────────────────────────────────────────

LOG_LINES: list[str] = []

def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[daily_ops {ts}] {msg}"
    print(line)
    LOG_LINES.append(line)

# ─── Runner ───────────────────────────────────────────────────────────────────

def run_step(number: int, name: str, script: str, description: str) -> bool:
    """Run a single pipeline step. Returns True on success."""
    script_path = SCRIPT_DIR / script
    if not script_path.exists():
        log(f"  SKIP #{number} {name} — {script} not found")
        return False

    log(f"  START #{number} {name} — {description}")
    start = time.time()

    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=str(SCRIPT_DIR),
            capture_output=True,
            text=True,
            timeout=600,  # 10 min max per step
        )
        elapsed = time.time() - start

        if result.returncode == 0:
            log(f"  ✓ #{number} {name} ({elapsed:.1f}s)")
            if result.stdout.strip():
                for line in result.stdout.strip().splitlines()[-3:]:
                    log(f"    {line}")
            return True
        else:
            log(f"  ✗ #{number} {name} — exit code {result.returncode} ({elapsed:.1f}s)")
            if result.stderr.strip():
                for line in result.stderr.strip().splitlines()[-5:]:
                    log(f"    ERR: {line}")
            return False

    except subprocess.TimeoutExpired:
        log(f"  ✗ #{number} {name} — timed out after 600s")
        return False
    except Exception as e:
        log(f"  ✗ #{number} {name} — {e}")
        return False

# ─── Email report ─────────────────────────────────────────────────────────────

def send_report(results: dict[str, bool], total_elapsed: float):
    """Send a minimal summary email."""
    passed = sum(1 for v in results.values() if v)
    failed = sum(1 for v in results.values() if not v)
    status = "✓ ALL PASSED" if failed == 0 else f"✗ {failed} FAILED"
    today = datetime.now().strftime("%Y-%m-%d")

    # Subject line gives immediate signal
    subject = f"Dexter Ops {today}: {status}"

    # Body: compact summary + failures + timing
    lines = [
        f"Daily ops completed at {datetime.now().strftime('%H:%M:%S')}",
        f"Total time: {total_elapsed:.0f}s",
        f"Steps: {passed} passed, {failed} failed",
        "",
    ]

    if failed:
        lines.append("Failed steps:")
        for name, ok in results.items():
            if not ok:
                lines.append(f"  ✗ {name}")
        lines.append("")

    # Append condensed log
    lines.append("--- Log ---")
    lines.extend(LOG_LINES)

    body = "\n".join(lines)

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = REPORT_FROM
    msg["To"] = REPORT_TO
    msg.set_content(body)

    import os
    smtp_host = os.environ.get("SMTP_HOST", "localhost")
    smtp_port = int(os.environ.get("SMTP_PORT", "25"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.send_message(msg)
        log(f"  📧 Report sent to {REPORT_TO}")
    except Exception as e:
        log(f"  ⚠ Failed to send email report: {e}")
        # Don't fail the pipeline over email issues

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Dexter daily ops coordinator")
    parser.add_argument("--only", nargs="+", type=int, help="Run only these step numbers")
    parser.add_argument("--skip", nargs="+", type=int, help="Skip these step numbers")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without executing")
    parser.add_argument("--no-email", action="store_true", help="Skip sending summary email")
    args = parser.parse_args()

    # Determine which steps to run
    steps = PIPELINE[:]
    if args.only:
        steps = [s for s in steps if s[0] in args.only]
    if args.skip:
        steps = [s for s in steps if s[0] not in args.skip]

    log(f"Daily ops — {len(steps)} steps queued")
    log("")

    if args.dry_run:
        for number, name, script, description in steps:
            exists = (SCRIPT_DIR / script).exists()
            status = "ready" if exists else "MISSING"
            log(f"  #{number} {name:<18} {script:<32} [{status}]")
        log("")
        log("Dry run — nothing executed.")
        return

    # Run pipeline
    pipeline_start = time.time()
    results = {}
    for step in steps:
        number, name, script, description = step
        success = run_step(number, name, script, description)
        results[name] = success
        log("")

    total_elapsed = time.time() - pipeline_start

    # Summary
    passed = sum(1 for v in results.values() if v)
    failed = sum(1 for v in results.values() if not v)

    log("─" * 50)
    log(f"Done: {passed} passed, {failed} failed ({total_elapsed:.0f}s)")
    if failed:
        for name, ok in results.items():
            if not ok:
                log(f"  FAILED: {name}")

    # Send email report
    if not args.no_email:
        send_report(results, total_elapsed)

    if failed:
        sys.exit(1)
    else:
        log("All steps completed successfully.")


if __name__ == "__main__":
    main()
