# Betrieb & Sicherheit

## Daten

- **SQLite-Datei:** `data/app.db` (WAL-Modus, Node.js `node:sqlite`)
- **Mandanten-Assets:** `data/tenants/{tenantId}/assets/` (PDF-Logo/Banner)
- Legacy-JSON unter `data/*.json` wird **einmalig** beim ersten Start in den Default-Mandanten importiert, wenn die DB leer ist.

## Backup

```bash
npm run db:backup
```

Kopiert `data/app.db` nach `data/app-backup-<timestamp>.db`.

**Produktion:** Zusätzlich volume-basierte Snapshots (Hosting-Provider) und regelmäßige Offsite-Backups. Vor Updates immer Backup.

## Secrets

- `SESSION_SECRET` in Produktion setzen (siehe `.env.example`)
- Keine Passwörter im Frontend; Login nur über `/api/auth/*`
- `ADMIN_PASSWORD` nach Erstsetup ändern oder Registrierung nutzen

## HTTPS

- Entwicklung: HTTP auf localhost ist OK
- Produktion: Reverse Proxy (Caddy/nginx) mit TLS; `NODE_ENV=production` setzt `secure`-Cookies

## PostgreSQL ( später )

Das Schema ist mandantenfähig (`tenant_id`). Für SaaS-Skalierung Postgres nutzen und `DATABASE_URL` anbinden — SQLite bleibt für lokale Entwicklung.

## DSGVO

- Mandant = Kundenorganisation; Löschung eines Mandanten sollte alle verknüpften Datensätze entfernen (CASCADE in Schema)
- Export: API-Listen pro Mandant als JSON exportierbar (Feature optional)
