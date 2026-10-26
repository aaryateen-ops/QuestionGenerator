param(
    [ValidateSet('both', 'app', 'guide', 'check')][string]$Mode = 'both',
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$GuidePath = Join-Path $ProjectRoot 'PROJECT_GUIDE.html'
$ApplicationUrl = 'http://localhost:5173/'

function Check-Project {
    $health = Invoke-RestMethod 'http://127.0.0.1:8000/health' -TimeoutSec 5
    if ($health.status -ne 'healthy') { throw 'Backend health check did not pass.' }
    $page = Invoke-WebRequest $ApplicationUrl -UseBasicParsing -TimeoutSec 5
    if ($page.Content -notmatch '/@vite/client') { throw 'The frontend on port 5173 is not this development application.' }
    $config = Invoke-RestMethod ($ApplicationUrl + 'api/v1/auth/config') -TimeoutSec 5
    Write-Host 'Backend: healthy | Frontend: ready | API connection: working' -ForegroundColor Green
    if ($config.demo_mode) { Write-Host 'Local demo mode is enabled. Use an explicit demo sign-in; do not deploy demo accounts.' -ForegroundColor Yellow }
}

try {
    Write-Host ''
    Write-Host '  QUESTION PAPER GENERATOR' -ForegroundColor Cyan
    Write-Host '  Application + browser explanation guide'
    Write-Host ''
    if ($Mode -in @('both', 'guide') -and !(Test-Path -LiteralPath $GuidePath)) {
        throw 'PROJECT_GUIDE.html is missing. Keep the launcher inside the original project folder.'
    }
    if ($Mode -in @('both', 'app')) {
        & (Join-Path $PSScriptRoot 'start.ps1') -Target all
        if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) { throw 'Startup failed. Check the messages and .logs folder.' }
        Check-Project
    } elseif ($Mode -eq 'check') {
        Check-Project
    }
    if (!$NoBrowser) {
        if ($Mode -in @('both', 'app')) { Start-Process $ApplicationUrl }
        if ($Mode -in @('both', 'guide')) {
            $guideUri = [System.Uri]::new($GuidePath).AbsoluteUri
            Start-Process $guideUri
        }
    }
    Write-Host ''
    if ($Mode -in @('both', 'app')) { Write-Host "Application: $ApplicationUrl" }
    if ($Mode -in @('both', 'guide')) { Write-Host "Explanation guide: $GuidePath" }
    Write-Host 'Next time: double-click START_PROJECT.bat. For the guide alone: OPEN_PROJECT_GUIDE.bat.'
    exit 0
} catch {
    Write-Host "Unable to continue: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host 'Startup instructions: docs\operations.md | Server logs: .logs'
    exit 1
}
