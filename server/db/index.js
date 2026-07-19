import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { SCHEMA_SQL } from './schema.js';
import { normalizeAdresse } from '../../src/adresse.js';

let db;

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
    db = new DatabaseSync(config.databasePath);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(SCHEMA_SQL);
    runMigrations(db);
  }
  return db;
}

function runMigrations(database) {
  const cols = database.prepare('PRAGMA table_info(kunden)').all();
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('telefon')) {
    database.exec(`ALTER TABLE kunden ADD COLUMN telefon TEXT NOT NULL DEFAULT ''`);
  }
  if (!names.has('email')) {
    database.exec(`ALTER TABLE kunden ADD COLUMN email TEXT NOT NULL DEFAULT ''`);
  }
  if (!names.has('notiz')) {
    database.exec(`ALTER TABLE kunden ADD COLUMN notiz TEXT NOT NULL DEFAULT ''`);
  }
  if (!names.has('strasse')) {
    database.exec(`ALTER TABLE kunden ADD COLUMN strasse TEXT NOT NULL DEFAULT ''`);
  }
  if (!names.has('plz_ort')) {
    database.exec(`ALTER TABLE kunden ADD COLUMN plz_ort TEXT NOT NULL DEFAULT ''`);
  }

  migrateAdresseColumns(database, 'kunden');

  database.exec(`
    CREATE TABLE IF NOT EXISTS kunden_objekte (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      kunde_id TEXT NOT NULL REFERENCES kunden(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      adresse TEXT NOT NULL DEFAULT '',
      typ TEXT NOT NULL DEFAULT 'einsatz',
      erstellt_am TEXT NOT NULL,
      aktualisiert_am TEXT NOT NULL
    )
  `);
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_kunden_objekte_tenant ON kunden_objekte(tenant_id)
  `);
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_kunden_objekte_kunde ON kunden_objekte(kunde_id)
  `);

  const objCols = database.prepare('PRAGMA table_info(kunden_objekte)').all();
  const objNames = new Set(objCols.map((c) => c.name));
  if (!objNames.has('strasse')) {
    database.exec(`ALTER TABLE kunden_objekte ADD COLUMN strasse TEXT NOT NULL DEFAULT ''`);
  }
  if (!objNames.has('plz_ort')) {
    database.exec(`ALTER TABLE kunden_objekte ADD COLUMN plz_ort TEXT NOT NULL DEFAULT ''`);
  }

  migrateAdresseColumns(database, 'kunden_objekte');

  database.exec(`
    CREATE TABLE IF NOT EXISTS katalog_posten (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      bezeichnung TEXT NOT NULL,
      beschreibung TEXT NOT NULL DEFAULT '',
      preis_stk REAL NOT NULL DEFAULT 0,
      preis_std REAL NOT NULL DEFAULT 0,
      erstellt_am TEXT NOT NULL,
      aktualisiert_am TEXT NOT NULL
    )
  `);
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_katalog_posten_tenant ON katalog_posten(tenant_id)
  `);

  const angebotCols = database.prepare('PRAGMA table_info(angebote)').all();
  const angebotNames = new Set(angebotCols.map((c) => c.name));
  if (!angebotNames.has('angebotsdatum')) {
    database.exec(`ALTER TABLE angebote ADD COLUMN angebotsdatum TEXT`);
    database.exec(`
      UPDATE angebote
      SET angebotsdatum = substr(erstellt_am, 1, 10)
      WHERE angebotsdatum IS NULL AND erstellt_am IS NOT NULL AND erstellt_am != ''
    `);
  }

  const tenantCols = database.prepare('PRAGMA table_info(tenants)').all();
  const tenantNames = new Set(tenantCols.map((c) => c.name));
  if (!tenantNames.has('onboarding_completed')) {
    database.exec(
      `ALTER TABLE tenants ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 1`
    );
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const adminOnboardingMigration = database
    .prepare('SELECT 1 FROM schema_migrations WHERE id = ?')
    .get('admin_tenant_onboarding_pending_v1');
  if (!adminOnboardingMigration) {
    database.prepare(`UPDATE tenants SET onboarding_completed = 0 WHERE plan = 'admin'`).run();
    database
      .prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)')
      .run('admin_tenant_onboarding_pending_v1', new Date().toISOString());
  }
}

function migrateAdresseColumns(database, table) {
  const rows = database.prepare(`SELECT id, adresse, strasse, plz_ort FROM ${table}`).all();
  const update = database.prepare(
    `UPDATE ${table} SET strasse = ?, plz_ort = ?, adresse = ? WHERE id = ?`
  );

  for (const row of rows) {
    const normalized = normalizeAdresse({
      strasse: row.strasse,
      plz_ort: row.plz_ort,
      adresse: row.adresse,
    });
    if (
      normalized.strasse === (row.strasse || '') &&
      normalized.plzOrt === (row.plz_ort || '') &&
      normalized.adresse === (row.adresse || '')
    ) {
      continue;
    }
    update.run(normalized.strasse, normalized.plzOrt, normalized.adresse, row.id);
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export function runTransaction(fn) {
  const database = getDb();
  database.exec('BEGIN IMMEDIATE');
  try {
    fn(database);
    database.exec('COMMIT');
  } catch (err) {
    database.exec('ROLLBACK');
    throw err;
  }
}
