#!/usr/bin/env python
"""
Build a full {"County": ["ZIP", ...], ...} map for all 58 California
counties from the CA Volunteers ZIP‑county table.
"""
import json, requests, re
from collections import defaultdict
from bs4 import BeautifulSoup          # pip install beautifulsoup4

URL = "https://www.californiavolunteers.ca.gov/look-up-your-county-by-zip-code/"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; county-zip-bot/1.0)"}

html = requests.get(URL, headers=HEADERS, timeout=30).text
soup = BeautifulSoup(html, "html.parser")
text = soup.get_text(" ")              # replace tags with spaces

# 5 digits, some city token, then county token (no spaces in either)
row_re = re.compile(r"\b(\d{5})\s+[A-Za-z0-9]+\s+([A-Za-z]+)\b")

counties = defaultdict(set)
for zip_code, county in row_re.findall(text):
    counties[county].add(zip_code)

# turn the sets into sorted lists and alpha‑sort the counties
ca_county_zip = {c: sorted(list(z)) for c, z in sorted(counties.items())}

with open("ca_county_zip_map.json", "w", encoding="utf‑8") as f:
    json.dump(ca_county_zip, f, indent=2)

print(f"Done. Wrote {len(ca_county_zip)} counties and "
      f"{sum(len(z) for z in ca_county_zip.values())} ZIPs.")
