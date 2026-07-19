export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

CREATE TABLE IF NOT EXISTS kunden (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  adresse TEXT NOT NULL DEFAULT '',
  strasse TEXT NOT NULL DEFAULT '',
  plz_ort TEXT NOT NULL DEFAULT '',
  telefon TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  notiz TEXT NOT NULL DEFAULT '',
  erstellt_am TEXT NOT NULL,
  aktualisiert_am TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kunden_tenant ON kunden(tenant_id);

CREATE TABLE IF NOT EXISTS kunden_objekte (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kunde_id TEXT NOT NULL REFERENCES kunden(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  adresse TEXT NOT NULL DEFAULT '',
  strasse TEXT NOT NULL DEFAULT '',
  plz_ort TEXT NOT NULL DEFAULT '',
  typ TEXT NOT NULL DEFAULT 'einsatz',
  erstellt_am TEXT NOT NULL,
  aktualisiert_am TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kunden_objekte_tenant ON kunden_objekte(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kunden_objekte_kunde ON kunden_objekte(kunde_id);

CREATE TABLE IF NOT EXISTS angebote (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kunde_id TEXT,
  angebot_nr TEXT NOT NULL,
  erstellt_am TEXT NOT NULL,
  aktualisiert_am TEXT NOT NULL,
  angebotsdatum TEXT,
  gueltig_bis TEXT,
  kunde_json TEXT NOT NULL,
  posten_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_angebote_tenant ON angebote(tenant_id);

CREATE TABLE IF NOT EXISTS rechnungen (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kunde_id TEXT,
  angebot_id TEXT,
  angebot_nr TEXT,
  rechnung_nr TEXT NOT NULL,
  erstellt_am TEXT NOT NULL,
  aktualisiert_am TEXT NOT NULL,
  rechnungsdatum TEXT,
  faellig_am TEXT,
  kunde_json TEXT NOT NULL,
  posten_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rechnungen_tenant ON rechnungen(tenant_id);

CREATE TABLE IF NOT EXISTS pdf_templates (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  template_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS katalog_posten (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bezeichnung TEXT NOT NULL,
  beschreibung TEXT NOT NULL DEFAULT '',
  preis_stk REAL NOT NULL DEFAULT 0,
  preis_std REAL NOT NULL DEFAULT 0,
  erstellt_am TEXT NOT NULL,
  aktualisiert_am TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_katalog_posten_tenant ON katalog_posten(tenant_id);
`;
