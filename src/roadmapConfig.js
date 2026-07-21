/**
 * Produkt-Roadmap für KlemDesk — bei Meilenstein-Updates anpassen.
 */
export const ROADMAP = {
  lastUpdated: '20.07.2026',
  phases: [
    {
      period: '2025',
      quarter: 'Q3',
      title: 'Angebote & Rechnungen',
      status: 'done',
      points: [
        'Angebote und Rechnungen anlegen, bearbeiten und archivieren',
        'PDF-Export mit Vorlage, Logo und Firmendaten',
        'Posten aus eigenem Katalog mit Stück- und Stundensätzen',
      ],
    },
    {
      period: '2025',
      quarter: 'Q4',
      title: 'Mandanten & Vorlagen',
      status: 'done',
      points: [
        'Registrierung mit getrennten Mandantendaten',
        'PDF-Vorlagen für Angebot und Rechnung getrennt pflegen',
        'Landingpage und kostenloser Einstieg',
      ],
    },
    {
      period: '2026',
      quarter: 'Q1',
      title: 'Kunden & Mobile',
      status: 'done',
      points: [
        'Kundenverwaltung mit Kontakt, Notiz und Dokumentenübersicht',
        'Objekte und Einsatzorte pro Kunde',
        'Mobile Oberfläche mit kompakter Navigation',
      ],
    },
    {
      period: '2026',
      quarter: 'Q2',
      title: 'Zahlungen & Übersicht',
      status: 'active',
      points: [
        'Rechnungsstatus: offen, bezahlt, optional gemahnt',
        'Offene Posten und Zahlungsübersicht im Kunden-Detail',
        'Status-Badges in Kunden- und Archivlisten',
      ],
    },
    {
      period: '2026',
      quarter: 'Q3',
      title: 'Stammdaten & Export',
      status: 'planned',
      points: [
        'Kundentyp, USt-IdNr. und Ansprechpartner',
        'Export von Rechnungen pro Kunde/Jahr (PDF oder CSV)',
        'Erweiterte Filter für Archiv und Kundenliste',
      ],
    },
    {
      period: '2026',
      quarter: 'Q4',
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
