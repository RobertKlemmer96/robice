# Klemdesk

Web-App für Angebote und Rechnungen mit PDF-Export, **Multi-Tenant-fähiger** Speicherung (jede Firma/Mandant hat eigene Daten).

## Starten

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:3001 (über Vite-Proxy `/api`)

Optional: `.env` aus `.env.example` anlegen.

## Anmeldung

- **Neu:** Tab „Registrieren“ → Firmenname, E-Mail, Passwort (min. 8 Zeichen) → eigener Mandant mit getrennten Daten.
- **Legacy / Dev:** E-Mail `admin@local` (oder Benutzername `admin`) mit Passwort aus `ADMIN_PASSWORD` (Standard: `nimda`), sofern noch kein Konto existiert.

Session läuft über **HttpOnly-Cookie** (serverseitig); alle `/api/*`-Daten-Endpunkte erfordern Login.

## Speicherung

| Was | Wo |
|-----|-----|
| Kunden, Angebote, Rechnungen, PDF-Vorlage | SQLite `data/app.db`, pro Mandant (`tenant_id`) |
| Logo/Banner | `data/tenants/<tenantId>/assets/` |
| Legacy-JSON | Einmal-Import aus `data/*.json` in den Default-Mandanten, wenn DB leer |

Details: [docs/OPS.md](docs/OPS.md)

## Produktion

```bash
npm run build
SESSION_SECRET=<lang> NODE_ENV=production npm run start
```

HTTPS über Reverse Proxy empfohlen.

## Backup

```bash
npm run db:backup
```

## Anpassen

- Posten-Katalog: `src/data.js`
- MwSt.: `src/pdf.js` (`MWST_SATZ`)
- Kunden-Roadmap: [docs/KUNDEN-ROADMAP.md](docs/KUNDEN-ROADMAP.md)
