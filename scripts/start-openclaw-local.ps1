$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot '.run-logs\local-dev'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Stop-PortProcess {
  param(
    [int]$Port
  )

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($connection in $connections) {
    $procId = $connection.OwningProcess
    $process = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -eq 'node') {
      Stop-Process -Id $procId -Force
    }
  }
}

function Start-LoggedProcess {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$StdOutLog,
    [string]$StdErrLog
  )

  Start-Process `
    -FilePath $FilePath `
    -ArgumentList $ArgumentList `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $StdOutLog `
    -RedirectStandardError $StdErrLog | Out-Null
}

function Wait-HttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  return $false
}

Write-Host '[openclaw-startup] Recycling local dev ports (3000, 3001, 8787)...'
Stop-PortProcess -Port 3000
Stop-PortProcess -Port 3001
Stop-PortProcess -Port 8787
Start-Sleep -Seconds 1

$webLog = Join-Path $logDir 'web.log'
$webErrLog = Join-Path $logDir 'web.err.log'
$adminLog = Join-Path $logDir 'admin.log'
$adminErrLog = Join-Path $logDir 'admin.err.log'
$apiLog = Join-Path $logDir 'api.log'
$apiErrLog = Join-Path $logDir 'api.err.log'

Write-Host '[openclaw-startup] Starting API on :8787...'
Start-LoggedProcess `
  -FilePath 'corepack.cmd' `
  -ArgumentList @('pnpm', '--filter', '@myhorrorstory/api', 'dev') `
  -StdOutLog $apiLog `
  -StdErrLog $apiErrLog

Write-Host '[openclaw-startup] Starting web on :3000 (OpenClaw bridge via apps/web/.env.local)...'
Start-LoggedProcess `
  -FilePath 'corepack.cmd' `
  -ArgumentList @('pnpm', '--filter', '@myhorrorstory/web', 'dev') `
  -StdOutLog $webLog `
  -StdErrLog $webErrLog

Write-Host '[openclaw-startup] Starting admin on :3001...'
Start-LoggedProcess `
  -FilePath 'corepack.cmd' `
  -ArgumentList @('pnpm', '--filter', '@myhorrorstory/admin', 'dev') `
  -StdOutLog $adminLog `
  -StdErrLog $adminErrLog

$checks = @(
  @{ name = 'web'; url = 'http://127.0.0.1:3000' },
  @{ name = 'admin'; url = 'http://127.0.0.1:3001' },
  @{ name = 'api'; url = 'http://127.0.0.1:8787/api/v1/health' },
  @{ name = 'codex-config'; url = 'http://127.0.0.1:3000/api/codex/config' }
)

$failed = @()
foreach ($check in $checks) {
  if (Wait-HttpOk -Url $check.url) {
    Write-Host ("[openclaw-startup] OK {0}: {1}" -f $check.name, $check.url)
  } else {
    $failed += $check
    Write-Host ("[openclaw-startup] FAIL {0}: {1}" -f $check.name, $check.url)
  }
}

Write-Host ("[openclaw-startup] Logs: {0}" -f $logDir)

if ($failed.Count -gt 0) {
  throw ('One or more services failed health checks.')
}

Write-Host '[openclaw-startup] Local stack is up.'
