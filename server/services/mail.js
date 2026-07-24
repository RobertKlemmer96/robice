import nodemailer from 'nodemailer';
import { config } from '../config.js';

function parseFromAddress(from) {
  const raw = String(from || '').trim();
  const named = raw.match(/^"([^"]+)"\s*<([^>]+)>$/);
  if (named) {
    return { name: named[1].trim(), email: named[2].trim() };
  }
  const plain = raw.match(/^([^<]+?)\s*<([^>]+)>$/);
  if (plain) {
    return { name: plain[1].trim(), email: plain[2].trim() };
  }
  if (raw.includes('@')) {
    return { name: '', email: raw };
  }
  return { name: 'Quotavo', email: raw || 'noreply@quotavo.com' };
}

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
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 25_000,
    requireTLS: !config.smtp.secure && config.smtp.port === 587,
  });
}

export function isMailConfigured() {
  return Boolean(
    config.brevoApiKey || (config.smtp.host && config.smtp.user && config.smtp.pass)
  );
}

export function getMailStatus() {
  const configured = isMailConfigured();
  const devMode =
    configured &&
    !config.brevoApiKey &&
    /ethereal\.email/i.test(config.smtp.host || '');

  if (!configured) {
    return {
      configured: false,
      devMode: false,
      hint: 'E-Mail-Versand ist nicht konfiguriert. BREVO_API_KEY oder SMTP-Daten in .env bzw. auf dem Server hinterlegen.',
    };
  }

  if (config.brevoApiKey) {
    return {
      configured: true,
      devMode: false,
      hint: 'Versand über Brevo API (HTTPS). PDF wird per E-Mail an den Kunden gesendet.',
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

async function sendViaBrevoApi({ to, bcc, subject, text, filename, pdfBuffer }) {
  const sender = parseFromAddress(config.smtp.from);
  const payload = {
    sender: {
      name: sender.name || 'Quotavo',
      email: sender.email,
    },
    to: [{ email: to }],
    subject,
    textContent: text,
    attachment: [{ name: filename, content: pdfBuffer.toString('base64') }],
  };
  if (bcc) {
    payload.bcc = [{ email: bcc }];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  let response;
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': config.brevoApiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Brevo API hat zu lange geantwortet. Bitte später erneut versuchen.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let message = `Brevo API Fehler (${response.status})`;
    try {
      const data = await response.json();
      message = data.message || data.code || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return { previewUrl: undefined };
}

async function sendViaSmtp({ to, bcc, subject, text, filename, pdfBuffer }) {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error(
      'E-Mail-Versand ist nicht konfiguriert. Bitte BREVO_API_KEY oder SMTP_HOST, SMTP_USER und SMTP_PASS setzen.'
    );
  }

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

export async function sendDocumentEmail({ to, bcc, subject, text, filename, pdfBuffer }) {
  if (config.brevoApiKey) {
    return sendViaBrevoApi({ to, bcc, subject, text, filename, pdfBuffer });
  }

  try {
    return await sendViaSmtp({ to, bcc, subject, text, filename, pdfBuffer });
  } catch (err) {
    const message = String(err?.message || err);
    if (/timeout|ETIMEDOUT|ECONNREFUSED|ESOCKET/i.test(message)) {
      throw new Error(
        'SMTP-Verbindung fehlgeschlagen. Auf Render (und vielen Hostern) ist SMTP blockiert — bitte BREVO_API_KEY statt SMTP nutzen.'
      );
    }
    throw err;
  }
}
