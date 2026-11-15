# EMCraft setup for native Windows (PowerShell 5.1+ / PowerShell 7+).
# Idempotent: safe to run repeatedly.
#
#   powershell -ExecutionPolicy Bypass -File setup.ps1
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -Offline
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -NoVendor
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -Check
param(
    [switch]$Offline,
    [switch]$NoVendor,
    [switch]$Check
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$MinMajor = 3
$MinMinor = 8

function Info($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Warn($msg) { Write-Host "!!  $msg" -ForegroundColor Yellow }
function Die($msg)  { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

function Find-Python {
    foreach ($candidate in @("py", "python", "python3")) {
        if (-not (Get-Command $candidate -ErrorAction SilentlyContinue)) { continue }
        & $candidate -c "import sys; raise SystemExit(0 if sys.version_info >= ($MinMajor, $MinMinor) else 1)" 2>$null
        if ($LASTEXITCODE -eq 0) { return $candidate }
    }
    return $null
}

$py = Find-Python
if (-not $py) {
    Die "Python $MinMajor.$MinMinor+ not found. Install it from https://www.python.org/downloads/ and enable 'Add python.exe to PATH'."
}
$pyVersion = (& $py -c "import sys; print('%d.%d.%d' % sys.version_info[:3])").Trim()
Info "Python: $pyVersion ($py)"

$venv = Join-Path $PSScriptRoot ".venv"
$vpy = Join-Path $venv "Scripts\python.exe"

if (-not (Test-Path -LiteralPath $vpy)) {
    if (Test-Path -LiteralPath $venv) {
        Warn "Removing incomplete virtual environment at .venv"
        Remove-Item -LiteralPath $venv -Recurse -Force
    }
    Info "Creating virtual environment (.venv)"
    & $py -m venv $venv
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $vpy)) {
        Die "Could not create .venv"
    }
}
Info "Virtual environment: $vpy"

if ($Check) {
    Info "Environment looks good."
    & $vpy vendor_assets.py --check
    if ($LASTEXITCODE -ne 0) { Warn "Some browser assets are not cached (run setup.ps1)" }
    exit 0
}

Info "Upgrading pip"
& $vpy -m pip install --quiet --upgrade pip setuptools wheel
if ($LASTEXITCODE -ne 0) { Warn "Could not upgrade pip (offline or restricted network); continuing" }

$requirements = Join-Path $PSScriptRoot "requirements.txt"
if (Test-Path -LiteralPath $requirements) {
    Info "Installing Python dependencies from requirements.txt"
    & $vpy -m pip install --quiet -r $requirements
    if ($LASTEXITCODE -ne 0) { Die "pip install failed" }
} else {
    Info "No requirements.txt found; standard library only"
}

$pyproject = Join-Path $PSScriptRoot "pyproject.toml"
if (Test-Path -LiteralPath $pyproject) {
    Info "Installing project defined in pyproject.toml"
    & $vpy -m pip install --quiet -e .
    if ($LASTEXITCODE -ne 0) { Die "pip install -e . failed" }
}

$packageJson = Join-Path $PSScriptRoot "package.json"
if (Test-Path -LiteralPath $packageJson) {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Info "Installing Node.js dependencies from package.json"
        npm install --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { Warn "npm install failed; continuing" }
    } else {
        Warn "package.json found but npm is not installed; skipping"
    }
}

if ($NoVendor) {
    Info "Skipping browser library download (-NoVendor)"
} else {
    Info "Caching pinned browser libraries in .\vendor"
    if ($Offline) {
        & $vpy vendor_assets.py --offline
    } else {
        & $vpy vendor_assets.py
    }
    if ($LASTEXITCODE -ne 0) { Die "Asset download failed" }
}

Info "Setup complete."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  .\.venv\Scripts\Activate.ps1"
Write-Host "  python -m http.server 8000     # then open http://localhost:8000"
if ($Offline) {
    Write-Host ""
    Write-Host "HTML now points at .\vendor. Serve over HTTP (file:// blocks ES modules)."
}
