# Deploy auf Render

## Schnellfix bei `SESSION_SECRET muss in Produktion gesetzt sein`

1. [Render Dashboard](https://dashboard.render.com) → dein Web Service → **Environment**
2. Variable hinzufügen:
   - **Key:** `SESSION_SECRET`
   - **Value:** langer Zufallsstring (z. B. mit „Generate“ in Render oder lokal: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
3. Optional, empfohlen:
   - `ADMIN_PASSWORD` — starkes Passwort (nicht `nimda` lassen)
4. **Save Changes** → Service startet neu

## Build & Start (manuell)

| Feld | Wert |
|------|------|
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start` |

Render setzt `PORT` automatisch; `NODE_ENV=production` setzt `npm run start`.

## Persistente Daten (SQLite)

Auf dem **Free Plan** ist das Dateisystem **flüchtig** — `data/app.db` geht bei Deploy/Neustart verloren.

Für echte Nutzung:
- **Persistent Disk** am Service mounten (z. B. `/opt/render/project/src/data`) und `DATABASE_PATH` setzen, oder
- später auf PostgreSQL umstellen (siehe `docs/OPS.md`)

## Blueprint

Im Repo liegt `render.yaml`. Bei Neuanlage über Blueprint wird `SESSION_SECRET` automatisch generiert.
