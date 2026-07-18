import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

export const config = {
  port: Number(process.env.PORT) || 3001,
  isProd: process.env.NODE_ENV === 'production',
  sessionSecret:
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === 'production' ? null : 'dev-only-change-in-production'),
  databasePath: process.env.DATABASE_PATH || path.join(ROOT, 'data', 'app.db'),
  legacyDataDir: path.join(ROOT, 'data'),
  tenantAssetsDir: path.join(ROOT, 'data', 'tenants'),
  adminEmail: process.env.ADMIN_EMAIL || 'admin@local',
  adminPassword: process.env.ADMIN_PASSWORD || 'nimda',
  defaultTenantName: process.env.DEFAULT_TENANT_NAME || 'Mein Unternehmen',
};

if (config.isProd && !process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET muss in Produktion gesetzt sein.');
  process.exit(1);
}
