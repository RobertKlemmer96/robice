$ports = @(5173, 3001)
$killed = @()

foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  if (-not $conns) { continue }
  $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    if ($pid -le 0) { continue }
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    $killed += $pid
  }
}

if ($killed.Count -eq 0) {
  Write-Output "Kein Dev-Server auf Port 5173/3001 gefunden."
} else {
  Write-Output "Gestoppt (PIDs: $($killed -join ', '))."
}
