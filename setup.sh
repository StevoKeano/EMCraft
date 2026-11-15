#!/usr/bin/env bash
# EMCraft setup — idempotent, cross-platform (Linux, macOS, Windows via
# Git Bash / MSYS2 / WSL). Native Windows PowerShell users can run setup.ps1.
#
#   ./setup.sh              create .venv, install deps, cache browser libs
#   ./setup.sh --offline    ...and rewrite HTML to use the cached local copies
#   ./setup.sh --no-vendor  skip downloading the pinned browser libraries
#   ./setup.sh --check      verify the environment without changing anything
set -euo pipefail

MIN_MAJOR=3
MIN_MINOR=8
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

OFFLINE=0
NO_VENDOR=0
CHECK=0

usage() {
  sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
}

for arg in "$@"; do
  case "$arg" in
    --offline)   OFFLINE=1 ;;
    --no-vendor) NO_VENDOR=1 ;;
    --check)     CHECK=1 ;;
    -h|--help)   usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

if [ -t 1 ]; then
  B=$'\033[1;34m'; Y=$'\033[1;33m'; R=$'\033[1;31m'; N=$'\033[0m'
else
  B=""; Y=""; R=""; N=""
fi
info() { printf '%s==>%s %s\n' "$B" "$N" "$*"; }
warn() { printf '%s!!%s %s\n' "$Y" "$N" "$*" >&2; }
die()  { printf '%sERROR:%s %s\n' "$R" "$N" "$*" >&2; exit 1; }

OS="$(uname -s 2>/dev/null || echo unknown)"
case "$OS" in
  Linux*)                            PLATFORM="Linux" ;;
  Darwin*)                           PLATFORM="macOS" ;;
  MINGW*|MSYS*|CYGWIN*)              PLATFORM="Windows (Git Bash/MSYS)" ;;
  *)                                 PLATFORM="$OS" ;;
esac
info "Platform: $PLATFORM"

# ---------------------------------------------------------------- Python ----
find_python() {
  local cand
  for cand in python3 python py; do
    command -v "$cand" >/dev/null 2>&1 || continue
    if "$cand" -c "import sys; raise SystemExit(0 if sys.version_info >= ($MIN_MAJOR, $MIN_MINOR) else 1)" >/dev/null 2>&1; then
      printf '%s' "$cand"
      return 0
    fi
  done
  return 1
}

PY_BIN="$(find_python)" || die "Python ${MIN_MAJOR}.${MIN_MINOR}+ not found.
Install it from https://www.python.org/downloads/ (Windows: check 'Add python.exe to PATH')."
PY_VERSION="$("$PY_BIN" -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])')"
info "Python: $PY_VERSION ($PY_BIN)"
"$PY_BIN" -c "import sys; raise SystemExit(0 if sys.version_info >= ($MIN_MAJOR, $MIN_MINOR) else 1)" \
  || die "Python ${MIN_MAJOR}.${MIN_MINOR}+ required, found $PY_VERSION"

# --------------------------------------------------------------- venv ----
VENV="$ROOT/.venv"
venv_python() {
  if [ -x "$VENV/bin/python" ]; then
    printf '%s' "$VENV/bin/python"
  elif [ -x "$VENV/Scripts/python.exe" ]; then
    printf '%s' "$VENV/Scripts/python.exe"
  else
    return 1
  fi
}

if ! VPY="$(venv_python)"; then
  if [ -e "$VENV" ]; then
    warn "Removing incomplete virtual environment at .venv"
    rm -rf "$VENV"
  fi
  info "Creating virtual environment (.venv)"
  "$PY_BIN" -m venv "$VENV" || die "Could not create .venv.
Debian/Ubuntu: sudo apt install python3-venv
Fedora: sudo dnf install python3"
  VPY="$(venv_python)" || die "Virtual environment was created but has no Python interpreter"
fi
info "Virtual environment: $("$VPY" -c 'import sys; print(sys.executable)')"

if [ "$CHECK" -eq 1 ]; then
  info "Environment looks good."
  "$VPY" vendor_assets.py --check || warn "Some browser assets are not cached (run ./setup.sh)"
  exit 0
fi

# --------------------------------------------------------- dependencies ----
info "Upgrading pip"
"$VPY" -m pip install --quiet --upgrade pip setuptools wheel \
  || warn "Could not upgrade pip (offline or restricted network); continuing"

if [ -f requirements.txt ]; then
  info "Installing Python dependencies from requirements.txt"
  "$VPY" -m pip install --quiet -r requirements.txt || die "pip install failed"
else
  info "No requirements.txt found; standard library only"
fi

if [ -f pyproject.toml ]; then
  info "Installing project defined in pyproject.toml"
  "$VPY" -m pip install --quiet -e . || die "pip install -e . failed"
fi

if [ -f package.json ]; then
  if command -v npm >/dev/null 2>&1; then
    info "Installing Node.js dependencies from package.json"
    npm install --no-audit --no-fund || warn "npm install failed; continuing"
  else
    warn "package.json found but npm is not installed; skipping"
  fi
fi

# ------------------------------------------------- external browser libs ----
if [ "$NO_VENDOR" -eq 1 ]; then
  info "Skipping browser library download (--no-vendor)"
else
  info "Caching pinned browser libraries in ./vendor"
  if [ "$OFFLINE" -eq 1 ]; then
    "$VPY" vendor_assets.py --offline || die "Asset download failed"
  else
    "$VPY" vendor_assets.py || die "Asset download failed"
  fi
fi

# ---------------------------------------------------------------- done ----
info "Setup complete."
printf '\nNext steps:\n'
printf '  source .venv/bin/activate        # Windows Git Bash: source .venv/Scripts/activate\n'
printf '  python -m http.server 8000       # then open http://localhost:8000\n'
if [ "$OFFLINE" -eq 1 ]; then
  printf '\nHTML now points at ./vendor. Serve over HTTP (file:// blocks ES modules).\n'
fi
