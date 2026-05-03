# Optional helper — normal `git commit` already runs the hook.
# Usage: pwsh -File scripts/commit-as.ps1 -Message "msg"

param([string]$Message)

$root = git rev-parse --show-toplevel 2>$null
if (-not $root) { Write-Error "Run from inside client/ (git repo)."; exit 1 }

$hook = Join-Path (Join-Path $PSScriptRoot 'githooks') 'prepare-commit-msg.ps1'
$dummy = [System.IO.Path]::GetTempFileName()
Set-Content -LiteralPath $dummy -Value "" -Encoding UTF8
try { & $hook $dummy "message" } finally { Remove-Item -LiteralPath $dummy -Force -ErrorAction SilentlyContinue }

if ($Message) { git commit -m $Message } else { git commit }
