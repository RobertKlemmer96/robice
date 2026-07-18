import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { SCHEMA_SQL } from './schema.js';

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
