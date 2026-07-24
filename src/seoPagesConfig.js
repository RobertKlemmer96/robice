import { getAbsoluteUrl } from './seoConfig.js';
import { PUBLIC_PATHS } from './publicRoutes.js';

export const SEO_PAGES = {
  impressum: {
    path: '/impressum',
    title: 'Impressum | Quotavo',
    description:
      'Impressum und Anbieterkennzeichnung für Quotavo — Software für Angebote und Rechnungen online.',
    ogTitle: 'Impressum | Quotavo',
    keywords: 'Impressum, Quotavo, Anbieter, Kontakt',
  },
  datenschutz: {
    path: '/datenschutz',
    title: 'Datenschutzerklärung | Quotavo',
    description:
      'Datenschutzerklärung für Quotavo: Verarbeitung von Kontodaten, Kunden- und Rechnungsdaten, Cookies und Ihre Rechte nach DSGVO.',
    ogTitle: 'Datenschutz | Quotavo',
    keywords: 'Datenschutz, DSGVO, Quotavo, SaaS',
  },
  agb: {
    path: '/agb',
    title: 'AGB | Quotavo',
    description: 'Allgemeine Geschäftsbedingungen für die Nutzung der Quotavo Web-App.',
    ogTitle: 'AGB | Quotavo',
    keywords: 'AGB, Nutzungsbedingungen, Quotavo',
  },
  handbook: {
    path: '/handbuch',
    title: 'Handbuch – Angebote & Rechnungen mit Quotavo',
    description:
      'Schritt-für-Schritt-Anleitung: Registrierung, Katalog, Kunden, Angebote, Rechnungen, PDF-Vorlage und E-Mail-Versand mit Quotavo.',
    ogTitle: 'Quotavo Handbuch',
    keywords: 'Handbuch, Anleitung, Angebot erstellen, Rechnung schreiben, Quotavo',
    schema: 'handbook',
  },
  faq: {
    path: '/faq',
    title: 'FAQ – Quotavo als Tool-Time-Alternative',
    description:
      'Häufige Fragen zu Quotavo: Kosten, Tool-Time-Wechsel, CSV-Import, Handwerk, PDF-Vorlagen, E-Mail-Versand und Katalog.',
    ogTitle: 'Quotavo FAQ',
    keywords: 'FAQ, Hilfe, Quotavo, Angebote, Rechnungen',
    schema: 'faq',
  },
  roadmap: {
    path: '/roadmap',
    title: 'Roadmap | Quotavo',
    description: 'Geplante Funktionen und Entwicklungsschritte für Quotavo.',
    ogTitle: 'Quotavo Roadmap',
    keywords: 'Roadmap, Produktentwicklung, Quotavo',
  },
  'angebot-erstellen': {
    path: '/angebot-erstellen',
    title: 'Angebot erstellen als PDF – schnell & günstig | Quotavo',
    description:
      'Professionelles Angebot online erstellen — schlanke Tool-Time-Alternative: Katalog, MwSt., PDF-Export und E-Mail-Versand für Handwerker und Kleinbetriebe.',
    ogTitle: 'Angebot erstellen als PDF – Quotavo',
    keywords:
      'Angebot erstellen, Angebot PDF, Angebot Vorlage, Angebot online, Angebotssoftware, Dienstleister',
    schema: 'guide-angebot',
  },
  'rechnung-schreiben': {
    path: '/rechnung-schreiben',
    title: 'Rechnung schreiben online – PDF & ZUGFeRD | Quotavo',
    description:
      'Rechnung online schreiben ohne Buchhaltungssoftware: aus Angebot übernehmen, PDF exportieren, ZUGFeRD-XML für E-Rechnung, E-Mail-Versand.',
    ogTitle: 'Rechnung schreiben online – Quotavo',
    keywords:
      'Rechnung schreiben, Rechnung online, Rechnung PDF, ZUGFeRD, E-Rechnung, Kleinunternehmen',
    schema: 'guide-rechnung',
  },
  'angebot-handwerker': {
    path: '/angebot-handwerker',
    title: 'Angebot für Handwerker – günstige Tool-Time-Alternative | Quotavo',
    description:
      'Angebote für Elektriker, SHK, Maler und Kleinbetriebe: Leistungskatalog, mobile Nutzung, schnelle PDFs und Online-Bestätigung — schlanker als Tool Time.',
    ogTitle: 'Angebot für Handwerker – Quotavo',
    keywords:
      'Angebot Handwerker, Tool Time Alternative Handwerk, SHK Software, Elektriker Angebot, Maler Angebot, Kleinbetrieb Software',
    schema: 'guide-handwerker',
  },
  'tooltime-alternative': {
    path: '/tooltime-alternative',
    title: 'Tool Time Alternative – schlank & günstig | Quotavo',
    description:
      'Quotavo ist die schlanke, günstige Alternative zu Tool Time für Angebote und Rechnungen: KI-Import, CSV-Migration, mobile Nutzung — für Handwerker, Freelancer und Kleinbetriebe.',
    ogTitle: 'Tool Time Alternative – Quotavo',
    keywords:
      'Tool Time Alternative, ToolTime Alternative, günstige Handwerkersoftware, Angebotssoftware Handwerk, Kleinbetrieb Software, Freelancer Rechnung',
    schema: 'guide-tooltime',
  },
  'angebot-online-bestaetigen': {
    path: '/angebot-online-bestaetigen',
    title: 'Angebot online bestätigen lassen | Quotavo',
    description:
      'Kunden bestätigen Angebote per Link mit PLZ-Check — Status „Bestätigt“ in Quotavo, ohne Telefon-Hin-und-Her.',
    ogTitle: 'Angebot online bestätigen – Quotavo',
    keywords: 'Angebot bestätigen, Angebot annehmen, Online Bestätigung, Angebotslink',
    schema: 'guide-bestaetigen',
  },
  ressourcen: {
    path: '/ressourcen',
    title: 'Ressourcen & Ratgeber | Quotavo',
    description:
      'Alle Quotavo-Ratgeber, FAQ, Handbuch und Hilfeseiten — zum Teilen und Verlinken.',
    ogTitle: 'Quotavo Ressourcen',
    keywords: 'Quotavo, Ratgeber, Ressourcen, Angebote, Rechnungen',
  },
};

export function getSeoForPublicRoute(route) {
  if (!route) return null;
  if (route.kind === 'legal') return SEO_PAGES[route.pageId] || null;
  if (route.kind === 'guide') return SEO_PAGES[route.slug] || null;
  if (route.kind === 'hub') return SEO_PAGES.ressourcen;
  return null;
}

export function getAllSitemapEntries() {
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    { loc: getAbsoluteUrl('/'), changefreq: 'weekly', priority: '1.0', lastmod: today },
  ];

  for (const slug of PUBLIC_PATHS) {
    const path = `/${slug}`;
    const guidePriority =
      slug.startsWith('angebot') || slug === 'rechnung-schreiben' ? '0.9' : '0.7';
    entries.push({
      loc: getAbsoluteUrl(path),
      changefreq: slug === 'roadmap' ? 'monthly' : 'weekly',
      priority: slug === 'ressourcen' ? '0.8' : guidePriority,
      lastmod: today,
    });
  }

  return entries;
}
