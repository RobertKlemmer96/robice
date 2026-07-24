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
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `NODE_ENV=production npm run start` |

**Hinweis:** `NODE_ENV=production` darf nicht als Build-Env gesetzt sein — sonst installiert npm keine `devDependencies` (Vite fehlt → `vite: not found`).

Render setzt `PORT` automatisch; `NODE_ENV=production` nur im **Start Command**.

## Persistente Daten (SQLite + Mandanten-Assets)

Auf dem **Free Plan** ist das Dateisystem **flüchtig** — `data/app.db` **und** die hochgeladenen Logos unter `data/tenants/` gehen bei jedem Deploy/Neustart verloren.

Lösung: eine **persistente Disk** mounten. Alle persistenten Daten liegen unter `DATA_DIR`.

### Per Blueprint (`render.yaml`) — bereits konfiguriert
```yaml
disk:
  name: quotavo-data
  mountPath: /var/data
  sizeGB: 1
envVars:
  - key: DATA_DIR
    value: /var/data
```

### Manuell im Dashboard (bestehender Service)
1. Service → **Settings → Disks → Add Disk**
   - **Name:** `quotavo-data`
   - **Mount Path:** `/var/data`
   - **Size:** 1 GB (reicht anfangs locker)
2. Service → **Environment** → Variable `DATA_DIR` = `/var/data`
3. **Save** → Service startet neu. Ab jetzt bleiben DB + Logos über Deploys erhalten.

**Wichtig:**
- Disks gibt es **nur auf bezahlten Instanzen** (ab Starter), nicht im Free Plan.
- Mit Disk läuft der Service auf **genau 1 Instanz** (kein Zero-Downtime-Deploy) — für diese App völlig ok.
- Die Disk startet **leer**. Bestehende Daten auf dem flüchtigen FS sind eh weg; ein Migrations-Upload lohnt sich nur, wenn aktuell etwas Wichtiges live ist.
- Backup: `npm run db:backup` legt eine Kopie neben der DB an (also ebenfalls auf der Disk). Für echte Sicherheit die Datei zusätzlich extern sichern.

Alternative für später: auf PostgreSQL umstellen (siehe `docs/OPS.md`).

## E-Mail-Versand (Brevo auf Render)

Render blockiert ausgehendes **SMTP** (Port 587/465). Deshalb auf Render **`BREVO_API_KEY`** setzen statt SMTP:

1. [Brevo](https://app.brevo.com) → **SMTP & API** → **API Keys** → neuen **v3-Key** erstellen (`xkeysib-…`)
2. Absender-Adresse in Brevo unter **Senders** verifizieren (gleiche E-Mail wie `SMTP_FROM`)
3. Render → **Environment**:
   - `BREVO_API_KEY` = der v3-Key
   - `SMTP_FROM` = `"Quotavo" <ihre@verifizierte-email.de>`
4. Service neu starten

Lokal kann weiterhin SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) genutzt werden — `BREVO_API_KEY` hat Vorrang, wenn gesetzt.

## Blueprint

Im Repo liegt `render.yaml`. Bei Neuanlage über Blueprint wird `SESSION_SECRET` automatisch generiert.
