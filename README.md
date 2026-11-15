<h1 align="center"><a href="https://stevokeano.github.io/EMCraft/">EMCraft — Open the live app</a></h1>

<h2 align="center"><a href="https://stevokeano.github.io/EMCraft/">https://stevokeano.github.io/EMCraft/</a></h2>

**Electromagnetics, visualized.** A zero-build collection of interactive 3D demos for electromagnetics and vector calculus, plus a fast local launcher that indexes every tool in the folder.

> **Prefer the hosted app:** [https://stevokeano.github.io/EMCraft/](https://stevokeano.github.io/EMCraft/) — no install needed.

![status](https://img.shields.io/badge/build-none-brightgreen) ![stack](https://img.shields.io/badge/stack-HTML%20%2B%20Three.js-blue) ![license](https://img.shields.io/badge/license-not%20specified-lightgrey)

## What's inside

| App | Category | Description |
| --- | --- | --- |
| [EM Vector Calculus](EM-VECTOR-CALCULUS.html) | Reference | Six-part lab: coordinate conventions, point vs. vector, two-point projections, line integrals, surfaces & flux, and triple integrals. |
| [Maxwell 3D](maxwell3d.html) | Simulation | Interactive explorer for Maxwell's equations with charge, capacitor, dipole, and solenoid presets, field arrows, and flux surfaces. |
| [3D Surface Plotter](3D-SURFACES.html) | Visualization | Plot `z = f(x, y)` in the browser with presets, domain controls, colorscales, and contour lines. |
| [EM-LaunchCraft](index.html) | Launcher | Discovers the apps in this directory and presents them in one searchable, category-filtered interface. |

## Setup

**Prerequisites**

- Python **3.8 or newer** (`python3 --version`)
- A modern browser with WebGL enabled
- Internet access during setup to fetch the pinned browser libraries (unless you already have `vendor/`)

The setup script is idempotent — run it as often as you like. It will:

1. Verify the Python version.
2. Create `.venv/` (reusing it if it already exists).
3. Upgrade `pip` and install `requirements.txt` / `pyproject.toml` / `package.json` dependencies when present.
4. Download the exact, version-pinned browser libraries into `vendor/` if they are missing.
5. Verify the result.

### macOS and Linux

```bash
chmod +x setup.sh
./setup.sh
```

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

### Windows (Git Bash, MSYS2, or WSL)

```bash
bash setup.sh
```

### Setup options

| Option | `setup.sh` | `setup.ps1` | Effect |
| --- | --- | --- | --- |
| Offline HTML | `--offline` | `-Offline` | Rewrite the HTML to load the cached `vendor/` copies instead of CDNs. |
| Skip downloads | `--no-vendor` | `-NoVendor` | Do not download browser libraries. |
| Verify only | `--check` | `-Check` | Check Python, `.venv`, and cached assets without changing anything. |

By default the apps keep using the pinned CDNs, and `vendor/` is a local cache. Run setup with the offline option to make the site fully self-contained; serve it over HTTP afterward, since browsers block ES modules on `file://`.

## Run it

Serving over HTTP is required for the launcher (it fetches `apps.json`) and for the offline vendor mode.

```bash
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
python -m http.server 8000
# open http://localhost:8000
```

You can also open an individual app directly (for example `EM-VECTOR-CALCULUS.html`), but an internet connection is needed for its CDN libraries unless you used the offline setup option.

## Regenerating the app index

`apps.json` is generated from the HTML files in this directory:

```bash
python scan_apps.py           # write apps.json
python scan_apps.py --pretty  # pretty-printed output
```

The scanner pulls `<title>` and `<meta name="description">` (falling back to visible page text) from every `.html` file, excluding the launcher.

## Project structure

```
.
├── index.html               # EM-LaunchCraft launcher
├── EM-VECTOR-CALCULUS.html  # six-module vector calculus lab
├── maxwell3d.html           # Maxwell's equations explorer
├── 3D-SURFACES.html         # z = f(x, y) surface plotter
├── apps.json                # generated app index
├── scan_apps.py             # regenerates apps.json
├── setup.sh                 # idempotent setup for macOS / Linux / Git Bash / WSL
├── setup.ps1                # idempotent setup for native Windows
├── vendor_assets.py         # downloads/checks the pinned browser libraries
├── requirements.txt         # no third-party Python packages (stdlib only)
└── vendor/                  # generated cache of pinned browser libraries
```

## Dependencies

- **Python:** standard library only — no third-party packages.
- **Browser, loaded from pinned CDNs (or `vendor/`):**
  - [Three.js](https://threejs.org/) `0.160.0` and `OrbitControls`
  - [Plotly](https://plotly.com/javascript/) `2.32.0`
  - [KaTeX](https://katex.org/) `0.16.9` (JS, CSS, and web fonts)
  - [math.js](https://mathjs.org/) `13.0.0`
- **Everything else:** plain HTML, CSS, and vanilla JavaScript — no bundler, no build step, no framework.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Could not create .venv` on Debian/Ubuntu | `sudo apt install python3-venv` |
| `python3` is missing on macOS | `brew install python` (or install from python.org) |
| PowerShell refuses to run `setup.ps1` | Use `powershell -ExecutionPolicy Bypass -File setup.ps1` |
| Buttons do nothing / launcher is empty | Serve over HTTP instead of opening `file://`; check the browser console for blocked modules or CDN errors. |
| Offline mode assets 404 | Run `python vendor_assets.py --check`, then re-run setup with `--offline`. |

## Contributing

Add or edit an HTML app, run `python scan_apps.py` to refresh `apps.json`, and open a pull request. Keep apps self-contained and dependency-pinned.
