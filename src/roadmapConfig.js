/**
 * Produkt-Roadmap für KlemDesk — bei Meilenstein-Updates anpassen.
 */
export const ROADMAP = {
  lastUpdated: '22.07.2026',
  phases: [
    {
      title: 'Angebote & Rechnungen',
      status: 'done',
      points: [
        'Angebote und Rechnungen anlegen, bearbeiten und archivieren',
        'PDF-Export mit Vorlage, Logo und Firmendaten',
        'Posten aus eigenem Katalog mit Stück- und Stundensätzen',
      ],
    },
    {
      title: 'Mandanten & Einstieg',
      status: 'done',
      points: [
        'Registrierung mit getrennten Mandantendaten, Tarifpläne und Onboarding',
        'PDF-Vorlagen für Angebot und Rechnung getrennt pflegen',
        'Landingpage, kostenloser Einstieg und Marketing-Seiten',
      ],
    },
    {
      title: 'Kunden & Mobile',
      status: 'done',
      points: [
        'Kundenverwaltung mit Kontakt, Notiz und Dokumentenübersicht',
        'Objekte und Einsatzorte pro Kunde (Leistungsort im PDF)',
        'Mobile Oberfläche mit kompakter Navigation',
      ],
    },
    {
      title: 'Plattform & PDF',
      status: 'done',
      points: [
        'Dashboard nach Login: Kennzahlen, Schnellzugriff, Profil-Checkliste',
        'Sidebar-Navigation, DE/EN-Oberfläche, Handbuch und FAQ',
        'PDF per E-Mail (SMTP), ZUGFeRD-Export, mehrere Layout-Varianten',
        'Admin-Bereich mit Mandanten-Impersonation; Firmendaten zentral im Profil',
      ],
    },
    {
      period: '2026',
      quarter: 'Q3',
      title: 'Zahlungen & Übersicht',
      status: 'active',
      points: [
        'Rechnungsstatus: offen, bezahlt, optional gemahnt',
        'Offene Posten und Zahlungsübersicht im Kunden-Detail',
        'Status-Badges in Kunden- und Archivlisten',
        'Basis vorhanden: Fälligkeitsdatum an Rechnungen, Dashboard-Zähler „bald fällig“ (14 Tage)',
      ],
    },
    {
      period: '2026',
      quarter: 'Q4',
      title: 'Stammdaten & Export',
      status: 'planned',
      points: [
        'Kundentyp, USt-IdNr. und Ansprechpartner',
        'Export von Rechnungen pro Kunde/Jahr (PDF oder CSV)',
        'Erweiterte Filter für Archiv und Kundenliste',
      ],
    },
    {
      period: '2027',
      quarter: 'Q1',
      title: 'Alltag & Integration',
      status: 'planned',
      points: [
        'Notizen und Anhänge am Kunden',
        'Tags, Duplikat-Hinweise und CSV-Import',
        'Wiederkehrende Aufträge mit Erinnerung',
      ],
    },
  ],
};

export const ROADMAP_STATUS_LABELS = {
  done: 'Erledigt',
  active: 'In Arbeit',
  planned: 'Geplant',
};
