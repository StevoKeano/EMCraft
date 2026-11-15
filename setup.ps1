# EMCraft setup for native Windows (PowerShell 5.1+ / PowerShell 7+).
# Idempotent: safe to run repeatedly.
#
# From a checkout:
#   powershell -ExecutionPolicy Bypass -File setup.ps1
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -Offline
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -NoVendor
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -Check
#
# One command from anywhere (clones into %USERPROFILE%\EMCraft):
#   irm https://raw.githubusercontent.com/StevoKeano/EMCraft/main/setup.ps1 | iex
param(
    [switch]$Offline,
    [switch]$NoVendor,
    [switch]$Check
)

$ErrorActionPreference = "Stop"

$MinMajor = 3
$MinMinor = 8
$RepoUrl = if ($env:EMCRAFT_REPO) { $env:EMCRAFT_REPO } else { "https://github.com/StevoKeano/EMCraft.git" }
$ZipUrl = if ($env:EMCRAFT_ZIP) { $env:EMCRAFT_ZIP } else { "https://github.com/StevoKeano/EMCraft/archive/refs/heads/main.zip" }

function Info($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Warn($msg) { Write-Host "!!  $msg" -ForegroundColor Yellow }
function Die($msg)  { Write-Host "ERROR: $msg" -ForegroundColor Red; throw $msg }

function Test-ProjectDir([string]$path) {
    if ([string]::IsNullOrWhiteSpace($path)) { return $false }
    if (-not (Test-Path -LiteralPath $path -PathType Container)) { return $false }
    return (Test-Path -LiteralPath (Join-Path $path "index.html")) -and
           (Test-Path -LiteralPath (Join-Path $path "vendor_assets.py")) -and
           (Test-Path -LiteralPath (Join-Path $path "setup.ps1"))
}

# ------------------------------------------------------------- bootstrap ----
# When run via `irm ... | iex`, $PSScriptRoot is empty and there is no
# checkout yet, so clone or download one before doing anything else.
$scriptDir = $PSScriptRoot
if (Test-ProjectDir $scriptDir) {
    $target = $scriptDir
} elseif (Test-ProjectDir (Get-Location).Path) {
    $target = (Get-Location).Path
} else {
    $target = if ($env:EMCRAFT_DIR) { $env:EMCRAFT_DIR } else { Join-Path $HOME "EMCraft" }
}

if (-not (Test-ProjectDir $target)) {
    if ((Test-Path -LiteralPath $target) -and (Get-ChildItem -LiteralPath $target -Force | Select-Object -First 1)) {
        Die "Target '$target' exists but is not an EMCraft checkout. Set EMCRAFT_DIR to another path."
    }
    $parent = Split-Path -Parent $target
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Info "Cloning EMCraft into $target"
        & git clone --depth 1 $RepoUrl $target
        if ($LASTEXITCODE -ne 0) { Die "git clone failed" }
    } else {
        Info "git not found; downloading EMCraft archive"
        $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("emcraft-" + [guid]::NewGuid().ToString("N"))
        New-Item -ItemType Directory -Path $tmp -Force | Out-Null
        try {
            $zip = Join-Path $tmp "emcraft.zip"
            Invoke-WebRequest -Uri $ZipUrl -OutFile $zip -UseBasicParsing
            Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
            New-Item -ItemType Directory -Path $target -Force | Out-Null
            Copy-Item -Path (Join-Path (Join-Path $tmp "EMCraft-main") "*") -Destination $target -Recurse -Force
        } finally {
            Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}
Set-Location -LiteralPath $target
Info "Project: $target"

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

$venv = Join-Path $target ".venv"
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
    return
}

Info "Upgrading pip"
& $vpy -m pip install --quiet --upgrade pip setuptools wheel
if ($LASTEXITCODE -ne 0) { Warn "Could not upgrade pip (offline or restricted network); continuing" }

$requirements = Join-Path $target "requirements.txt"
if (Test-Path -LiteralPath $requirements) {
    Info "Installing Python dependencies from requirements.txt"
    & $vpy -m pip install --quiet -r $requirements
    if ($LASTEXITCODE -ne 0) { Die "pip install failed" }
} else {
    Info "No requirements.txt found; standard library only"
}

$pyproject = Join-Path $target "pyproject.toml"
if (Test-Path -LiteralPath $pyproject) {
    Info "Installing project defined in pyproject.toml"
    & $vpy -m pip install --quiet -e .
    if ($LASTEXITCODE -ne 0) { Die "pip install -e . failed" }
}

$packageJson = Join-Path $target "package.json"
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
Write-Host ""
Write-Host "Project directory: $target"
if ($Offline) {
    Write-Host "HTML now points at .\vendor. Serve over HTTP (file:// blocks ES modules)."
}
