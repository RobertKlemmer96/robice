---
name: start
description: >-
  Starts or stops the webapp dev stack when the user sends /start or /stop (or
  asks to start/stop the site, Angebot-App, localhost). Runs Vite on 5173 and
  Express API on 3001 via npm run dev.
disable-model-invocation: false
---

# /start und /stop

Projektroot: Workspace-Root (`webapp`). Dev-Befehl: `npm run dev` (concurrently: API 3001 + Vite 5173).

## `/start`

1. Terminals-Ordner prüfen, ob bereits `npm run dev` läuft und Ports 5173/3001 lauschen.
2. Wenn nicht aktiv:
   - **Bevorzugt:** Dev-Server im Hintergrund starten:
     ```powershell
     Set-Location "<workspace-root>"
     npm run dev
     ```
     Shell-Tool mit `block_until_ms: 0` (Hintergrund).
   - Alternativ einmalig prüfen: `powershell -File scripts/dev-start.ps1` (blockiert — nur wenn du keinen Hintergrund-Job nutzen kannst).
3. Kurz warten, dann prüfen ob `http://localhost:5173` erreichbar ist (z. B. `Invoke-WebRequest` oder Browser).
4. Dem User mitteilen:
   - App: http://localhost:5173/
   - API: http://localhost:3001/

## `/stop`

1. Dev-Server beenden:
   ```powershell
   Set-Location "<workspace-root>"
   powershell -ExecutionPolicy Bypass -File scripts/dev-stop.ps1
   ```
2. Oder gleichwertig: Prozesse auf **5173** und **3001** beenden (`Get-NetTCPConnection -LocalPort …`).
3. Bestätigen, dass die Ports frei sind.

## Hinweise

- Kein zweites `npm run dev`, wenn 5173 und 3001 schon belegt sind — nur Status melden.
- Nach Code-Änderungen am Server ggf. `/stop` dann `/start` für sauberen Neustart.
- Produktion: `npm run build` + `npm run start` (nur Port 3001) — **nicht** bei `/start` unless der User das explizit will.
