"""
RapidEx Shipment Tracker
=========================
Scrapes https://www.rapidexpress.pk/tracking?trackingId=<id>

Requirements:
    pip install requests beautifulsoup4 --break-system-packages

Usage (CLI):
    python rapidex_tracker.py
    python rapidex_tracker.py RPX2059UCG81597

Usage (library):
    from rapidex_tracker import track
    data = track("RPX2059UCG81597")
"""

import sys
import json
import re
import requests
from bs4 import BeautifulSoup

BASE_URL       = "https://www.rapidexpress.pk"
TRACKING_URL   = f"{BASE_URL}/tracking"
DEFAULT_NUMBER = "RPX2059UCG81597"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
}

# Matches: 2026-09-08   or   29-08-2026
DATE_PAT = re.compile(r"\b(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})\b")


def _text(tag) -> str:
    return tag.get_text(strip=True) if tag else ""


def track(tracking_number: str = DEFAULT_NUMBER) -> dict:
    """
    Returns:
        tracking_number, success, carrier, destination, quantity, weight,
        forwarding_no, forwarding_url, latest_status, milestones, history
    """
    resp = requests.get(
        TRACKING_URL,
        params={"trackingId": tracking_number},
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    # ── Forwarding carrier link ────────────────────────────────────────────
    fwd_tag = soup.find("a", href=re.compile(r"track", re.I))
    forwarding_no  = _text(fwd_tag)
    forwarding_url = fwd_tag["href"] if fwd_tag else ""

    # ── Shipping Info: regex on raw page text ─────────────────────────────
    page_text = soup.get_text(separator="\n")
    info_block = re.search(r"Shipping Info.*?Delivery Status", page_text, re.S | re.I)
    block = info_block.group() if info_block else page_text

    def extract(label: str) -> str:
        m = re.search(rf"{re.escape(label)}\s*\n\s*(.+)", block, re.I)
        return m.group(1).strip() if m else ""

    info = {
        "carrier":     extract("Carrier"),
        "destination": extract("Destination"),
        "quantity":    extract("Quantity"),
        "weight":      extract("Weight"),
    }

    # ── Delivery Status history ────────────────────────────────────────────
    # Strategy: collect ALL text nodes that look like dates, then use them
    # as anchors to extract the (status, location) that follow.
    #
    # From the raw HTML fetch we already know the full text is:
    #   "2026-09-08\nDelivered\nPakistan\n2026-08-31\n..."
    # So we pull the text of the whole page and split on date boundaries.

    # Find the delivery status section by looking for its heading
    status_heading = soup.find(string=re.compile(r"Delivery Status", re.I))
    container = None
    if status_heading:
        node = status_heading.find_parent()
        # Walk up until we find a container with lots of text
        for _ in range(8):
            if node and len(node.get_text(strip=True)) > 100:
                container = node
                break
            if node:
                node = node.find_parent()

    raw_text = container.get_text(separator="\n") if container else soup.get_text(separator="\n")

    # Split the block by date markers; each chunk = one event
    # Pattern: DATE \n STATUS \n LOCATION
    chunks = DATE_PAT.split(raw_text)
    # DATE_PAT.split returns: [pre, date1, rest1, date2, rest2, ...]
    history = []
    seen = set()
    i = 1  # skip pre-text
    while i < len(chunks) - 1:
        date = chunks[i].strip()
        rest = chunks[i + 1].strip() if i + 1 < len(chunks) else ""
        lines = [l.strip() for l in rest.splitlines() if l.strip()]
        # First non-empty line = status, second = location (often)
        status   = lines[0] if len(lines) > 0 else ""
        location = lines[1] if len(lines) > 1 else ""
        # Skip if status bleeds into the next date or is empty
        if DATE_PAT.match(status):
            status = ""
        if DATE_PAT.match(location):
            location = ""
        key = (date, status)
        if key not in seen and status:
            history.append({"date": date, "status": status, "location": location})
            seen.add(key)
        i += 2

    latest = history[0] if history else {}

    # ── Milestones ─────────────────────────────────────────────────────────
    milestones = {}
    for label in ["Accepted", "Departed", "Arrived", "Handed Over"]:
        tag = soup.find(string=re.compile(rf"\b{label}\b", re.I))
        if tag:
            parent = tag.find_parent()
            m = DATE_PAT.search(parent.get_text() if parent else "")
            milestones[label.lower().replace(" ", "_")] = m.group() if m else "✓"

    return {
        "tracking_number": tracking_number,
        "success":         True,
        "carrier":         info.get("carrier", ""),
        "destination":     info.get("destination", ""),
        "quantity":        info.get("quantity", ""),
        "weight":          info.get("weight", ""),
        "forwarding_no":   forwarding_no,
        "forwarding_url":  forwarding_url,
        "latest_status":   latest,
        "milestones":      milestones,
        "history":         history,
    }




if __name__ == "__main__":
    import sys
    number = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_NUMBER
    data = track(number)
    print(json.dumps(data, indent=2, ensure_ascii=False))
