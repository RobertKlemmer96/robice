$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$on5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
$on3001 = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue

if ($on5173 -and $on3001) {
  Write-Output "Dev-Server laeuft bereits."
  Write-Output "App:  http://localhost:5173/"
  Write-Output "API:  http://localhost:3001/"
  exit 0
}

Write-Output "Starte npm run dev …"
npm run dev
