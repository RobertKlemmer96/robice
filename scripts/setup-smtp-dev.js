import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

function upsertEnvValue(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

async function main() {
  const testAccount = await nodemailer.createTestAccount();

  let envContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf8')
    : fs.readFileSync(examplePath, 'utf8');

  envContent = upsertEnvValue(envContent, 'SMTP_HOST', 'smtp.ethereal.email');
  envContent = upsertEnvValue(envContent, 'SMTP_PORT', '587');
  envContent = upsertEnvValue(envContent, 'SMTP_SECURE', 'false');
  envContent = upsertEnvValue(envContent, 'SMTP_USER', testAccount.user);
  envContent = upsertEnvValue(envContent, 'SMTP_PASS', testAccount.pass);
  envContent = upsertEnvValue(envContent, 'SMTP_FROM', `"Klemdesk Dev" <${testAccount.user}>`);

  fs.writeFileSync(envPath, envContent.endsWith('\n') ? envContent : `${envContent}\n`);

  console.log('Dev-SMTP (Ethereal) in .env eingetragen.\n');
  console.log(`  SMTP_HOST=smtp.ethereal.email`);
  console.log(`  SMTP_USER=${testAccount.user}`);
  console.log(`  SMTP_PASS=${testAccount.pass}`);
  console.log('\nHinweis: E-Mails werden nicht wirklich zugestellt.');
  console.log('Nach dem Versand erscheint eine Vorschau-URL in der App und in der API-Konsole.');
  console.log('\nAls Nächstes: npm run dev neu starten.');
}

main().catch((err) => {
  console.error('SMTP-Setup fehlgeschlagen:', err.message || err);
  process.exit(1);
});
