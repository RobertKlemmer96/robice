import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dbPath = process.env.DATABASE_PATH || path.join(root, 'data', 'app.db');

if (!fs.existsSync(dbPath)) {
  console.error('Keine Datenbank gefunden:', dbPath);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = path.join(path.dirname(dbPath), `app-backup-${stamp}.db`);
fs.copyFileSync(dbPath, dest);
console.log('Backup erstellt:', dest);
