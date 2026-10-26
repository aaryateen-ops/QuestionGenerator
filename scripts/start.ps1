param([ValidateSet('all','backend','frontend','setup')][string]$Target = 'all')
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'
$Python = Join-Path $Backend '.venv\Scripts\python.exe'
$Logs = Join-Path $Root '.logs'
New-Item -ItemType Directory -Force $Logs | Out-Null
function Test-Backend {
    try {
        $health = Invoke-RestMethod 'http://127.0.0.1:8000/health' -TimeoutSec 2
        $identity = Invoke-RestMethod 'http://127.0.0.1:8000/' -TimeoutSec 2
        return $health.status -eq 'healthy' -and $identity.docs_url -eq '/docs' -and $identity.status -eq 'operational'
    } catch { return $false }
}
function Test-Port([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { return $client.ConnectAsync('127.0.0.1', $Port).Wait(500) -and $client.Connected }
    catch { return $false }
    finally { $client.Dispose() }
}
function Setup-Backend {
    if (!(Test-Path $Python)) {
        & py -3.11 -m venv (Join-Path $Backend '.venv')
        if ($LASTEXITCODE -ne 0) { throw 'Install Python 3.11 with the Python launcher, then rerun.' }
    }
    $requirements = Join-Path $Backend 'requirements.lock.txt'
    if (!(Test-Path $requirements)) { $requirements = Join-Path $Backend 'requirements.txt' }
    $stamp = Join-Path $Backend '.venv\requirements.sha256'
    $hash = (Get-FileHash $requirements -Algorithm SHA256).Hash
    $installed = if (Test-Path $stamp) { (Get-Content $stamp -Raw).Trim() } else { '' }
    if ($installed -ne $hash) {
        & $Python -m pip install -r $requirements
        if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check pip output and rerun.' }
        Set-Content $stamp $hash
    }
    Push-Location $Backend
    try {
        & $Python -c 'import fastapi, uvicorn, sqlalchemy, pydantic, multipart, PIL, pillow_heif, docx, pypdf, reportlab; import app.main'
        if ($LASTEXITCODE -ne 0) {
            Remove-Item $stamp -ErrorAction SilentlyContinue
            throw 'Backend import preflight failed. Fix the error above; rerun to reinstall dependencies.'
        }
    } finally { Pop-Location }
}
function Start-Backend {
    if (Test-Backend) { Write-Host 'Backend already healthy at http://127.0.0.1:8000'; return }
    if (Test-Port 8000) { throw 'Port 8000 is occupied by an unhealthy or unrecognized service. Review it manually.' }
    Setup-Backend
    $process = Start-Process -FilePath $Python -ArgumentList '-m uvicorn app.main:app --host 127.0.0.1 --port 8000' -WorkingDirectory $Backend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $Logs 'backend.out.log') -RedirectStandardError (Join-Path $Logs 'backend.err.log') -PassThru
    $deadline = (Get-Date).AddSeconds(60)
    do {
        if (Test-Backend) { Write-Host "Backend ready (PID $($process.Id))."; return }
        $process.Refresh()
        if ($process.HasExited) { throw "Backend exited. See $Logs\backend.err.log" }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    throw "Backend readiness timed out. See $Logs\backend.err.log. Frontend was not started."
}
function Start-Frontend {
    foreach ($address in @('http://localhost:5173/', 'http://127.0.0.1:5173/')) {
        try {
            $page = Invoke-WebRequest $address -UseBasicParsing -TimeoutSec 3
            if ($page.Content -match '/@vite/client') { Write-Host "Frontend already running at $address"; return }
        } catch {}
    }
    if (Test-Port 5173) {
        try {
            $page = Invoke-WebRequest 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 3
            if ($page.Content -match '/@vite/client') { Write-Host 'Frontend already running at http://localhost:5173'; return }
        } catch {}
        throw 'Port 5173 is occupied by an unrecognized service.'
    }
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    if (!(Test-Path (Join-Path $Frontend 'node_modules\.bin\vite.cmd'))) {
        Push-Location $Frontend
        try {
            & $npm ci
            if ($LASTEXITCODE -ne 0) { throw 'npm ci failed. Check the output above.' }
        } finally { Pop-Location }
    }
    $process = Start-Process -FilePath $env:ComSpec -ArgumentList '/d /c npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort' -WorkingDirectory $Frontend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $Logs 'frontend.out.log') -RedirectStandardError (Join-Path $Logs 'frontend.err.log') -PassThru
    $deadline = (Get-Date).AddSeconds(45)
    do {
        try {
            $page = Invoke-WebRequest 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 2
            if ($page.Content -match '/@vite/client') { Write-Host 'Frontend ready at http://localhost:5173'; return }
        } catch {}
        $process.Refresh()
        if ($process.HasExited) { throw "Frontend exited. See $Logs\frontend.err.log" }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    throw "Frontend readiness timed out. See $Logs\frontend.err.log"
}
$lock = New-Object System.Threading.Mutex($false, 'Local\QPStudioStartup')
$acquired = $false
try {
    $acquired = $lock.WaitOne(0)
    if (!$acquired) { throw 'Another launcher is running. Wait for it to finish.' }
    if ($Target -eq 'setup') { Setup-Backend }
    if ($Target -in @('all','backend','frontend')) { Start-Backend }
    if ($Target -in @('all','frontend')) { Start-Frontend }
} catch {
    Write-Host "Startup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if ($acquired) { $lock.ReleaseMutex() }
    $lock.Dispose()
}
