# Sets local user.name / user.email before each commit (LeaseTogether = Precious Paws only).
# Skip: $env:SKIP_COMMIT_ACCOUNT_PROMPT = "1"
# Edit: scripts/git-commit-accounts.json (add more "accounts" only if you need a menu again)

param(
  [string]$MsgFile,
  [string]$CommitSource
)

$ErrorActionPreference = 'Stop'

if ($env:SKIP_COMMIT_ACCOUNT_PROMPT -eq '1') { exit 0 }
if ($env:CI -eq 'true') { exit 0 }
if ($CommitSource -eq 'merge' -or $CommitSource -eq 'squash') { exit 0 }

$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) { exit 0 }

$configPath = Resolve-Path -LiteralPath (Join-Path (Join-Path $PSScriptRoot '..') 'git-commit-accounts.json') -ErrorAction SilentlyContinue
if (-not $configPath) { exit 0 }

$data = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
$accounts = @($data.accounts)
if ($accounts.Count -eq 0) { exit 0 }

$prefFile = Join-Path (Join-Path $repoRoot '.git') 'commit-account-preference'
function Read-Preference {
  if (Test-Path -LiteralPath $prefFile) {
    return (Get-Content -LiteralPath $prefFile -Raw -Encoding UTF8).Trim()
  }
  return $null
}
function Write-Preference([string]$id) {
  $dir = Split-Path -Parent $prefFile
  if (-not (Test-Path -LiteralPath $dir)) { return }
  Set-Content -LiteralPath $prefFile -Value $id -Encoding UTF8 -NoNewline
}

function Test-CanPrompt {
  if (-not [Environment]::UserInteractive) { return $false }
  try { return -not [Console]::IsInputRedirected } catch { return $false }
}

$acc = $null
if ($accounts.Count -eq 1) {
  $acc = $accounts[0]
} elseif (Test-CanPrompt) {
  Write-Host ''
  Write-Host '--- Commit identity (this repo only) ---' -ForegroundColor Cyan
  for ($i = 0; $i -lt $accounts.Count; $i++) {
    Write-Host ("  [{0}] {1}" -f ($i + 1), $accounts[$i].label)
  }
  Write-Host ''
  $raw = Read-Host 'Choose account number (Enter = use last choice)'
  $choiceId = $null
  if ([string]::IsNullOrWhiteSpace($raw)) {
    $choiceId = Read-Preference
    if (-not $choiceId) {
      Write-Host 'No saved choice — type a number.' -ForegroundColor Yellow
      exit 1
    }
  } else {
    $n = 0
    if (-not [int]::TryParse($raw.Trim(), [ref]$n) -or $n -lt 1 -or $n -gt $accounts.Count) {
      Write-Host 'Invalid choice.' -ForegroundColor Red
      exit 1
    }
    $choiceId = $accounts[$n - 1].id
  }
  $acc = $accounts | Where-Object { $_.id -eq $choiceId } | Select-Object -First 1
} else {
  $choiceId = Read-Preference
  $acc = $accounts | Where-Object { $_.id -eq $choiceId } | Select-Object -First 1
  if (-not $acc) { $acc = $accounts[0] }
}

if (-not $acc) { $acc = $accounts[0] }

Push-Location $repoRoot
try {
  git config --local user.name $acc.userName
  git config --local user.email $acc.userEmail
  Write-Host ("Commit as: {0} <{1}>" -f $acc.userName, $acc.userEmail) -ForegroundColor DarkGreen
} finally {
  Pop-Location
}

Write-Preference $acc.id
exit 0
