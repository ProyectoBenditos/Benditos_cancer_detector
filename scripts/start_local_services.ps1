param()
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$apiDirectory = Join-Path $projectDirectory 'apps/api'
$webDirectory = Join-Path $projectDirectory 'apps/web'
$logDirectory = Join-Path $apiDirectory '.cache/service-logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$serviceRun = Get-Date -Format 'yyyyMMdd-HHmmss'
$env:HF_API_BASE_URL = 'http://127.0.0.1:8001'
$env:LOCAL_ML_URL = 'http://127.0.0.1:8001'
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:8000'

function Start-OncoScanService {
    param([string]$Name, [int]$Port, [string]$Executable, [string[]]$ServiceArguments, [string]$Directory)
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($listener) {
        Write-Output "$Name already listening on port $Port (PID $($listener[0].OwningProcess))"
        return
    }
    if (-not (Test-Path -LiteralPath $Executable)) {
        throw "Missing executable: $Executable"
    }
    $stdout = Join-Path $logDirectory "$Name-$serviceRun.out.log"
    $stderr = Join-Path $logDirectory "$Name-$serviceRun.err.log"
    $serviceChild = Start-Process -FilePath $Executable -ArgumentList $ServiceArguments -WorkingDirectory $Directory -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    Write-Output "$Name started on port $Port (PID $($serviceChild.Id)); logs: $logDirectory"
}

Start-OncoScanService -Name 'ml' -Port 8001 -Executable (Join-Path $apiDirectory '.venv-ml/Scripts/python.exe') -ServiceArguments @('-u', 'local_ml_server.py') -Directory $apiDirectory
Start-OncoScanService -Name 'api' -Port 8000 -Executable (Join-Path $apiDirectory '.venv/Scripts/python.exe') -ServiceArguments @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload') -Directory $apiDirectory
$nextEntry = Join-Path $webDirectory 'node_modules/next/dist/bin/next'
Start-OncoScanService -Name 'web' -Port 3000 -Executable (Get-Command node.exe).Source -ServiceArguments @(('"' + $nextEntry + '"'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3000') -Directory $webDirectory
