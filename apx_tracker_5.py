"""
APX Logistics Shipment Tracker
================================
Calls https://smartcargo-apx.pk:8080/gettracking directly.
No browser required — just requests.
"""

import sys
import json
import requests
import urllib3
from html.parser import HTMLParser

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://smartcargo-apx.pk:8080"
API_ENDPOINT = f"{BASE_URL}/gettracking"
DEFAULT_NUMBER = "1350215374"


def _get_token(session: requests.Session) -> str:
    home = session.get(BASE_URL, verify=False, timeout=15)
    home.raise_for_status()
    token = ""
    class TokenParser(HTMLParser):
        def handle_starttag(self, tag, attrs):
            nonlocal token
            if tag == "input":
                d = dict(attrs)
                if d.get("name") == "_token":
                    token = d.get("value", "")
    TokenParser().feed(home.text)
    return token


def track(tracking_number: str = DEFAULT_NUMBER) -> dict:
    """
    Fetch tracking data for *tracking_number*.
    """
    session = requests.Session()
    token = _get_token(session)

    resp = session.post(
        API_ENDPOINT,
        data={"_token": token, "refno": tracking_number},
        headers={
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": BASE_URL,
            "Accept": "*/*",
        },
        verify=False,
        timeout=15,
    )
    resp.raise_for_status()
    raw = resp.json()

    if not raw.get("success"):
        return {"tracking_number": tracking_number, "success": False, "raw": raw}

    d = raw["data"]

    history = [
        {
            "date":     e["statusDate"],
            "time":     e["statusTime"] or "N/A",
            "status":   e["status"],
            "location": e["location"],
        }
        for e in d.get("trackingStatus", [])
    ]

    return {
        "tracking_number": tracking_number,
        "success": True,
        "shipper": {
            "name":    d.get("shipperName"),
            "city":    d.get("shipperCity"),
            "country": d.get("shipperCountry"),
        },
        "consignee": {
            "name":    d.get("consgineeName"),
            "city":    d.get("consgineeCity"),
            "country": d.get("consgineeCountry"),
            "zip":     d.get("consigneeZipCode"),
        },
        "shipment": {
            "date":        d.get("cnDate"),
            "pieces":      d.get("pkgs"),
            "weight":      d.get("weight"),
            "unit":        d.get("pkgsUnit"),
            "service":     d.get("serviceName"),
            "tracking_no": d.get("trackingNo"),
        },
        "latest_status": history[-1] if history else None,
        "history":       history,
        "raw":           raw,
    }


if __name__ == "__main__":
    number = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_NUMBER
    data = track(number)
    print(json.dumps(data, indent=2, ensure_ascii=False))