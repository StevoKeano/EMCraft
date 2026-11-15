# EMCraft

**Electromagnetics, visualized.** A zero-build collection of interactive 3D demos for electromagnetics and vector calculus, plus a fast local launcher that indexes every tool in the folder.

![status](https://img.shields.io/badge/build-none-brightgreen) ![stack](https://img.shields.io/badge/stack-HTML%20%2B%20Three.js-blue) ![license](https://img.shields.io/badge/license-not%20specified-lightgrey)

## What's inside

| App | Category | Description |
| --- | --- | --- |
| [EM Vector Calculus](EM-VECTOR-CALCULUS.html) | Reference | Six-part lab: coordinate conventions, point vs. vector, two-point projections, line integrals, surfaces & flux, and triple integrals. |
| [Maxwell 3D](maxwell3d.html) | Simulation | Interactive explorer for Maxwell's equations with charge, capacitor, dipole, and solenoid presets, field arrows, and flux surfaces. |
| [3D Surface Plotter](3D-SURFACES.html) | Visualization | Plot `z = f(x, y)` in the browser with presets, domain controls, colorscales, and contour lines. |
| [EM-LaunchCraft](index.html) | Launcher | Discovers the apps in this directory and presents them in one searchable, category-filtered interface. |

## Quick start

The launcher reads `apps.json` with `fetch`, so browsers will block it under `file://`. Serve the folder instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or open any individual app directly, e.g. `EM-VECTOR-CALCULUS.html`. An internet connection is required the first time each page loads its CDN dependencies (Three.js, Plotly, KaTeX, math.js).

## Regenerating the app index

`apps.json` is generated from the HTML files in this directory:

```bash
python3 scan_apps.py           # write apps.json
python3 scan_apps.py --pretty  # pretty-printed output
```

The scanner pulls `<title>` and `<meta name="description">` (falling back to visible page text) from every `.html` file, excluding the launcher.

## Tech stack

- **Rendering:** [Three.js](https://threejs.org/) (WebGL), Plotly for 2D/3D charts
- **Math typesetting:** KaTeX
- **Expression parsing:** math.js
- **Everything else:** plain HTML, CSS, and vanilla JavaScript — no bundler, no build step, no framework

## Project structure

```
.
├── index.html               # EM-LaunchCraft launcher
├── EM-VECTOR-CALCULUS.html  # six-module vector calculus lab
├── maxwell3d.html           # Maxwell's equations explorer
├── 3D-SURFACES.html         # z = f(x, y) surface plotter
├── apps.json                # generated app index
└── scan_apps.py             # regenerates apps.json
```

## Requirements

- A modern browser with WebGL enabled
- Internet access for CDN-hosted libraries (unless vendored locally)
- Python 3 (only for the local server and `scan_apps.py`)
