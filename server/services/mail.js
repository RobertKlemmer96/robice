import nodemailer from 'nodemailer';
import { config } from '../config.js';

function getTransporter() {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

export function isMailConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}

export function getMailStatus() {
  const configured = isMailConfigured();
  const devMode = configured && /ethereal\.email/i.test(config.smtp.host || '');

  if (!configured) {
    return {
      configured: false,
      devMode: false,
      hint: 'E-Mail-Versand ist nicht konfiguriert. SMTP-Daten in .env oder auf dem Server hinterlegen.',
    };
  }

  if (devMode) {
    return {
      configured: true,
      devMode: true,
      hint: 'Test-Modus (Ethereal): Keine echte Zustellung ins Postfach. Nach dem Versand öffnet sich eine Vorschau im Browser.',
    };
  }

  return {
    configured: true,
    devMode: false,
    hint: 'PDF wird per E-Mail an den Kunden gesendet. Eine Kopie geht an Ihre Profil-E-Mail.',
  };
}

export async function sendDocumentEmail({ to, bcc, subject, text, filename, pdfBuffer }) {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error(
      'E-Mail-Versand ist nicht konfiguriert. Bitte SMTP_HOST, SMTP_USER und SMTP_PASS setzen.'
    );
  }

  await transporter.verify();

  const info = await transporter.sendMail({
    from: config.smtp.from,
    to,
    bcc: bcc || undefined,
    subject,
    text,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`E-Mail-Vorschau (Ethereal): ${previewUrl}`);
  }
  return { previewUrl: previewUrl || undefined };
}
