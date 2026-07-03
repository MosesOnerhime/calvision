param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $BackendDir "venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
    throw "Backend virtual environment not found at $Python. Create it and install dependencies first."
}

$Ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $Ngrok) {
    throw "ngrok is not installed or not on PATH. Install it from https://ngrok.com/download, then run this script again."
}

Write-Host "Starting CalVision backend on http://localhost:$Port ..."
Write-Host "Starting ngrok tunnel. Copy the HTTPS Forwarding URL into Vercel as VITE_API_URL."
Write-Host ""

$BackendProcess = Start-Process `
    -WindowStyle Hidden `
    -FilePath $Python `
    -ArgumentList "manage.py", "runserver", "0.0.0.0:$Port" `
    -WorkingDirectory $BackendDir `
    -PassThru

try {
    & $Ngrok.Source http $Port
}
finally {
    if ($BackendProcess -and -not $BackendProcess.HasExited) {
        Stop-Process -Id $BackendProcess.Id -Force
    }
}
