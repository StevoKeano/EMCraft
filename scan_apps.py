#!/usr/bin/env python3
"""
scan_apps.py — scan the current directory for HTML apps and write apps.json.

Standard library only. Extracts <title> and <meta name="description"> from
every .html file (and subdirectory index.html), excluding the launcher itself.
If no meta description exists, it derives a short summary from the visible
page text (first meaningful paragraph / heading).

Usage:
    python3 scan_apps.py            # writes apps.json
    python3 scan_apps.py --pretty   # pretty-printed JSON
"""

import json
import os
import re
import sys
from html.parser import HTMLParser

EXCLUDE = {"index.html", "em-launchcraft.html", "apps.json"}


class PageParser(HTMLParser):
    """Collects <title>, meta description, and visible text."""

    SKIP = {"script", "style", "noscript", "svg", "head"}

    def __init__(self):
        super().__init__()
        self.title = ""
        self.description = ""
        self.text_parts = []
        self._in_title = False
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip_depth += 1
        if tag == "title":
            self._in_title = True
        elif tag == "meta":
            d = dict(attrs)
            if d.get("name", "").lower() == "description" and not self.description:
                self.description = (d.get("content") or "").strip()

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip_depth > 0:
            self._skip_depth -= 1
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif self._skip_depth == 0:
            self.text_parts.append(data)


def clean_title(raw):
    if not raw:
        return ""
    t = re.split(r"[—–|·]", raw)[0].strip()
    return re.sub(r"\s+", " ", t)


def title_from_filename(path):
    base = os.path.basename(path)
    base = re.sub(r"\.html?$", "", base, flags=re.I)
    if base.lower() == "index":
        base = os.path.basename(os.path.dirname(path)) or "index"
    base = re.sub(r"[-_]+", " ", base).strip()
    return base.title()


def derive_description(text, title):
    """Pick the first sentence-ish chunk of visible text that isn't the title."""
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return ""
    # Drop a leading repetition of the title
    if text.lower().startswith(title.lower()):
        text = text[len(title):].strip()
    # Strip leading decorative symbols / UI noise
    text = re.sub(r"^[^A-Za-z0-9]+", "", text)
    # Split into sentences and take the first reasonably sized one
    for chunk in re.split(r"(?<=[.!?])\s+", text):
        chunk = chunk.strip()
        if len(chunk) >= 25:
            return chunk[:160].rstrip() + ("…" if len(chunk) > 160 else "")
    return text[:160].rstrip()


def infer_category(path, title):
    s = (path + " " + title).lower()
    if re.search(r"maxwell|field|physics|simulat|solenoid|dipole", s):
        return "Simulation"
    if re.search(r"calculus|vector|reference|cheat|integral", s):
        return "Reference"
    if re.search(r"surface|plot|graph|chart|visual|3d", s):
        return "Visualization"
    if re.search(r"editor|craft|studio|canvas|paint", s):
        return "Editor"
    if re.search(r"dashboard|admin|panel|stats", s):
        return "Dashboard"
    if re.search(r"game|play|arcade", s):
        return "Game"
    if re.search(r"tool|util|calc|convert", s):
        return "Utility"
    return "App"


def scan(root="."):
    apps = []
    for dirpath, _dirnames, filenames in os.walk(root):
        for name in sorted(filenames):
            if not re.search(r"\.html?$", name, flags=re.I):
                continue
            if name in EXCLUDE:
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace(os.sep, "/")

            parser = PageParser()
            try:
                with open(full, encoding="utf-8", errors="replace") as fh:
                    parser.feed(fh.read())
            except OSError:
                continue

            title = clean_title(parser.title) or title_from_filename(rel)
            desc = parser.description or derive_description(" ".join(parser.text_parts), title)
            apps.append({
                "file": rel,
                "title": title,
                "category": infer_category(rel, title),
                "description": desc or "Local HTML application in this workspace.",
            })
    return apps


def main():
    pretty = "--pretty" in sys.argv
    apps = scan(".")
    out = os.path.join(".", "apps.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(apps, fh, indent=2 if pretty else None, ensure_ascii=False)
    print(f"Wrote {out} with {len(apps)} app(s):")
    for a in apps:
        print(f"  {a['file']:<32} {a['title']}  [{a['category']}]")
        print(f"    {a['description']}")


if __name__ == "__main__":
    main()
