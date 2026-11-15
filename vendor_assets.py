#!/usr/bin/env python3
"""Cache EMCraft's pinned browser dependencies under ./vendor/.

The HTML apps load their libraries from CDNs. This helper downloads those
exact, version-pinned files into ./vendor so the project can run without a
network connection. It is idempotent: files already present are left alone.

Usage:
    python3 vendor_assets.py             # download anything missing
    python3 vendor_assets.py --offline   # also rewrite HTML to use ./vendor
    python3 vendor_assets.py --check     # only verify files are present

Standard library only (Python 3.8+).
"""

from __future__ import annotations

import argparse
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENDOR = ROOT / "vendor"

# (source URL, path under ./vendor)
ASSETS = [
    ("https://unpkg.com/three@0.160.0/build/three.module.js",
     "three/three.module.js"),
    ("https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js",
     "three/addons/controls/OrbitControls.js"),
    ("https://cdnjs.cloudflare.com/ajax/libs/mathjs/13.0.0/math.min.js",
     "mathjs/math.min.js"),
    ("https://cdn.plot.ly/plotly-2.32.0.min.js",
     "plotly/plotly.min.js"),
    ("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
     "katex/katex.min.js"),
    ("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
     "katex/katex.min.css"),
]

# Stylesheets that reference additional files (KaTeX web fonts).
CSS_ASSETS = {
    "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css":
        "katex/katex.min.css",
}

# CDN URL -> local URL used by --offline.
REWRITES = [
    ("https://unpkg.com/three@0.160.0/build/three.module.js",
     "./vendor/three/three.module.js"),
    ("https://unpkg.com/three@0.160.0/examples/jsm/",
     "./vendor/three/addons/"),
    ("https://cdnjs.cloudflare.com/ajax/libs/mathjs/13.0.0/math.min.js",
     "./vendor/mathjs/math.min.js"),
    ("https://cdn.plot.ly/plotly-2.32.0.min.js",
     "./vendor/plotly/plotly.min.js"),
    ("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
     "./vendor/katex/katex.min.js"),
    ("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
     "./vendor/katex/katex.min.css"),
]

URL_RE = re.compile(r"""url\(\s*(['"]?)([^)'"]+)\1\s*\)""")


def fetch(url: str, dest: Path, retries: int = 3) -> None:
    """Download url to dest unless a non-empty file already exists."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    rel = dest.relative_to(ROOT)
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  cached  {rel}")
        return

    tmp = dest.with_name(dest.name + ".part")
    req = urllib.request.Request(
        url, headers={"User-Agent": "EMCraft-setup/1.0"}
    )
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read()
            if not data:
                raise ValueError("empty response")
            tmp.write_bytes(data)
            tmp.replace(dest)
            print(f"  fetched {rel} ({len(data):,} bytes)")
            return
        except Exception as exc:  # noqa: BLE001 - report and retry
            last_error = exc
            if tmp.exists():
                tmp.unlink()
            print(f"  retry {attempt}/{retries} {url}: {exc}", file=sys.stderr)
    raise SystemExit(f"Failed to download {url}: {last_error}")


def vendor_css_fonts(css_url: str, css_path: Path) -> None:
    """Download relative url(...) targets referenced by a vendored CSS file."""
    if not css_path.exists():
        return
    text = css_path.read_text(encoding="utf-8", errors="replace")
    base = urllib.parse.urljoin(css_url, ".")
    for match in URL_RE.finditer(text):
        ref = match.group(2).strip()
        if not ref or ref.startswith(("data:", "http://", "https://", "//")):
            continue
        rel = Path(ref)
        if rel.is_absolute() or ".." in rel.parts:
            continue
        fetch(urllib.parse.urljoin(base, ref), css_path.parent / rel)


def download_all() -> None:
    for url, rel in ASSETS:
        dest = VENDOR / rel
        fetch(url, dest)
        if url in CSS_ASSETS:
            vendor_css_fonts(url, dest)


def check_all() -> int:
    missing = [
        VENDOR / rel for _, rel in ASSETS
        if not (VENDOR / rel).is_file() or (VENDOR / rel).stat().st_size == 0
    ]
    if missing:
        print("Missing vendored assets:", file=sys.stderr)
        for path in missing:
            print(f"  {path.relative_to(ROOT)}", file=sys.stderr)
        return 1
    print("All vendored assets are present.")
    return 0


def patch_html() -> None:
    changed = 0
    for html in sorted(ROOT.glob("*.html")):
        original = html.read_text(encoding="utf-8")
        updated = original
        for old, new in REWRITES:
            updated = updated.replace(old, new)
        if updated != original:
            html.write_text(updated, encoding="utf-8")
            changed += 1
            print(f"  rewrote {html.name}")
    if changed == 0:
        print("  HTML already references local vendor assets")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Cache EMCraft's pinned browser dependencies under ./vendor/.",
    )
    parser.add_argument(
        "--offline", action="store_true",
        help="rewrite HTML to load the vendored copies instead of CDNs",
    )
    parser.add_argument(
        "--check", action="store_true",
        help="verify that all vendored files exist and exit",
    )
    args = parser.parse_args()

    if args.check:
        return check_all()

    download_all()

    if args.offline:
        print("Rewriting HTML to use local assets:")
        patch_html()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
