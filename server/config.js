import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env') });

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
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@klemdesk.com',
  },
};

if (config.isProd && !process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET muss in Produktion gesetzt sein.');
  process.exit(1);
}
