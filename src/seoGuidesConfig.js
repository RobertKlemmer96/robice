/** Long-Tail-Ratgeberseiten für SEO. */
export const SEO_GUIDES = {
  'angebot-erstellen': {
    title: 'Angebot erstellen – so geht\'s mit Quotavo',
    lead: 'Ein professionelles Angebot muss nicht in Word, Excel oder einem teuren Voll-Paket wie Tool Time entstehen. Mit Quotavo erstellen Sie Angebote direkt im Browser — schnell, günstig, inklusive Katalog, MwSt. und PDF-Export.',
    sections: [
      {
        heading: 'Warum Angebote digital erstellen?',
        paragraphs: [
          'Papier oder lose Dateien führen zu Medienbrüchen: Kundendaten tippen Sie mehrfach ab, Summen rechnen sich nicht automatisch nach und das Layout wirkt oft uneinheitlich.',
          'Quotavo bündelt Kundenstamm, Leistungskatalog und PDF-Vorlage in einer Oberfläche — die schlanke Alternative zu Tool Time für Handwerker, Freelancer und Kleinbetriebe.',
        ],
      },
      {
        heading: 'Schritt für Schritt: Angebot in Quotavo',
        steps: [
          'Kostenlos registrieren und Firmendaten im Einrichtungs-Assistenten hinterlegen (Logo, USt-IdNr., IBAN für spätere Rechnungen).',
          'Optional Kunden und Katalog-Posten anlegen — spart Zeit bei jedem neuen Angebot.',
          'Unter Angebote → Neues Angebot Kunde wählen, Datum und Gültigkeit setzen.',
          'Positionen hinzufügen: aus dem Katalog übernehmen oder manuell mit Menge, Einheit (Stk./Std.) und Preis.',
          'PDF erstellen und herunterladen — oder direkt per E-Mail an die Kunden-Adresse senden (SMTP erforderlich).',
          'Optional: Kunde bestätigt das Angebot online über einen Link im PDF (PLZ-Verifizierung).',
        ],
      },
      {
        heading: 'Was im PDF enthalten ist',
        paragraphs: [
          'Ihr Logo, Firmenadresse, Angebotsnummer, Gültigkeitsdatum, Postentabelle mit Netto, MwSt. und Brutto sowie anpassbare Einleitungs- und Schlusstexte.',
          'Drei Layout-Varianten stehen zur Wahl — Farben und Fußspalten passen Sie unter Einstellungen → Vorlage an.',
        ],
      },
    ],
    related: [
      { href: '/angebot-online-bestaetigen', label: 'Angebot online bestätigen lassen' },
      { href: '/angebot-handwerker', label: 'Angebot für Handwerker' },
      { href: '/handbuch', label: 'Vollständiges Handbuch' },
    ],
  },
  'rechnung-schreiben': {
    title: 'Rechnung schreiben online – ohne Buchhaltungssoftware',
    lead: 'Quotavo ist keine Finanzbuchhaltung, aber ideal für die Erstellung professioneller Rechnungs-PDFs — inklusive ZUGFeRD-XML für die E-Rechnung, wenn IBAN und USt-IdNr. im Profil hinterlegt sind.',
    sections: [
      {
        heading: 'Rechnung aus Angebot oder neu',
        paragraphs: [
          'Haben Sie ein Angebot bereits erstellt, übernimmt Quotavo Kunde und Posten per Klick in eine neue Rechnung. Alternativ starten Sie unter Rechnungen → Neue Rechnung von null.',
          'Rechnungsnummer, Rechnungsdatum und Fälligkeit werden automatisch oder manuell gesetzt — Nummernschemata legen Sie bei der Einrichtung fest.',
        ],
      },
      {
        heading: 'Pflichtangaben für rechtskonforme Rechnungen',
        steps: [
          'Vollständiger Name und Adresse von Ihnen und Ihrem Kunden.',
          'USt-IdNr. und IBAN im Profil pflegen — sie erscheinen im Briefkopf und in der ZUGFeRD-Datei.',
          'Fortlaufende Rechnungsnummer, Leistungsdatum bzw. Rechnungsdatum, Leistungsbeschreibung, Netto, Steuersatz und Brutto.',
          'PDF prüfen, speichern und optional per E-Mail versenden.',
        ],
      },
      {
        heading: 'ZUGFeRD / E-Rechnung',
        paragraphs: [
          'Beim PDF-Export einer Rechnung erzeugt Quotavo zusätzlich eine factur-x.xml — vorausgesetzt IBAN und USt-IdNr. sind im Profil eingetragen.',
          'So sind Sie für Kunden vorbereitet, die strukturierte Rechnungsdaten erwarten, ohne eine separate E-Rechnungs-Software zu nutzen.',
        ],
      },
    ],
    related: [
      { href: '/angebot-erstellen', label: 'Zuerst Angebot erstellen' },
      { href: '/faq', label: 'FAQ zum E-Mail-Versand' },
      { href: '/handbuch', label: 'Handbuch: Rechnung erstellen' },
    ],
  },
  'angebot-handwerker': {
    title: 'Angebot für Handwerker und Kleinbetriebe',
    lead: 'Als Elektriker, SHK-Betrieb, Maler oder Freelancer brauchen Sie schnelle, saubere Angebote — oft vor Ort oder zwischen zwei Einsätzen. Quotavo ist die schlanke Alternative zu Tool Time: Browser auf PC, Tablet und Smartphone, ohne Disposition und Lager-Overkill.',
    sections: [
      {
        heading: 'Typische Anforderungen im Handwerk',
        paragraphs: [
          'Wiederkehrende Leistungen (Stundenlohn, Materialpauschalen), verschiedene Einsatzorte pro Kunde und ein einheitliches Erscheinungsbild auf dem PDF.',
          'Quotavo deckt das ab: Katalog mit Stück- und Stundensätzen, Kunden mit mehreren Objekten/Einsatzorten und professionelle PDF-Vorlagen mit Ihrem Logo.',
        ],
      },
      {
        heading: 'Empfohlener Ablauf',
        steps: [
          'Leistungen einmal im Katalog hinterlegen (z. B. „Montage Std.“, „Material Pauschale“).',
          'Stammkunden mit Adresse und Einsatzort anlegen — Adresse wird beim Angebot übernommen.',
          'Vor Ort oder im Büro Angebot mit Posten füllen, PDF erzeugen und dem Kunden per E-Mail senden.',
          'Kunde bestätigt online — in Prozesse sehen Sie den Status „Bestätigt“ statt nur „Versendet“.',
          'Aus bestätigtem Angebot mit einem Klick die Rechnung vorbereiten.',
        ],
      },
      {
        heading: 'Kein Overkill — bewusst schlanker als Tool Time',
        paragraphs: [
          'Quotavo ist bewusst schlank: keine Disposition, kein Lager, keine Zeiterfassung. Fokus auf Angebot, Rechnung, Kunde und PDF — genau das, was viele Betriebe statt Excel, Word oder einem teuren Voll-Paket brauchen.',
          'Wer von Tool Time wechselt, kann Kunden, Angebote, Rechnungen und Katalog-Posten per CSV importieren — ohne jedes Modul nachbauen zu wollen.',
        ],
      },
    ],
    related: [
      { href: '/tooltime-alternative', label: 'Tool-Time-Alternative' },
      { href: '/angebot-erstellen', label: 'Angebot erstellen' },
      { href: '/rechnung-schreiben', label: 'Rechnung schreiben' },
      { href: '/angebot-online-bestaetigen', label: 'Online-Bestätigung' },
    ],
  },
  'angebot-online-bestaetigen': {
    title: 'Angebot online bestätigen lassen',
    lead: 'Schicken Sie Ihrem Kunden einen Link — er verifiziert sich mit der Postleitzahl aus dem Angebot und bestätigt oder lehnt ab. Sie sehen den Status sofort in Quotavo.',
    sections: [
      {
        heading: 'So funktioniert die Bestätigung',
        steps: [
          'Angebot erstellen und per E-Mail versenden (oder PDF mit Link teilen). Quotavo erzeugt automatisch einen Bestätigungslink.',
          'Der Kunde öffnet den Link, gibt die PLZ aus dem Angebot ein und wählt „Bestätigen“ oder „Ablehnen“.',
          'In Quotavo unter Prozesse wechselt der Status von „Versendet“ auf „Bestätigt“ oder „Abgelehnt“.',
          'Bei erneutem Aufruf des Links sieht der Kunde, dass bereits geantwortet wurde.',
        ],
      },
      {
        heading: 'Vorteile für Sie',
        paragraphs: [
          'Weniger Rückfragen per Telefon, klare Dokumentation der Kundenentscheidung und schneller Übergang zur Rechnung nach Bestätigung.',
          'Der Link nutzt Ihre Quotavo-Domain — lokal beim Testen localhost, in Produktion Ihre Render- oder Custom-Domain.',
        ],
      },
    ],
    related: [
      { href: '/angebot-erstellen', label: 'Angebot erstellen' },
      { href: '/faq', label: 'FAQ' },
      { href: '/handbuch', label: 'Handbuch' },
    ],
  },
  'tooltime-alternative': {
    title: 'Tool Time Alternative — schlank, günstig, fokussiert',
    lead: 'Quotavo ist keine Kopie von Tool Time. Es ist die schlanke, deutlich günstigere Alternative für alle, die vor allem schnell Angebote und Rechnungen erstellen wollen — Handwerker, Freelancer und Kleinbetriebe inklusive.',
    sections: [
      {
        heading: 'Warum nicht einfach Tool Time kopieren?',
        paragraphs: [
          'Tool Time deckt Disposition, Zeiterfassung, Lager, CRM und vieles mehr ab. Das ist stark — kostet aber Zeit, Geld und Schulungsaufwand, wenn Sie eigentlich nur professionelle Angebote und Rechnungen brauchen.',
          'Erfolgreicher ist oft eine klare Positionierung statt „alles kann alles“. Quotavo konzentriert sich auf den Umsatz-Pfad: Kunde → Angebot → Bestätigung → Rechnung → PDF/E-Mail/DATEV.',
        ],
      },
      {
        heading: 'Wo Quotavo bewusst anders ist',
        steps: [
          'KI-first: KI-Import aus PDFs und automatisierter Datenimport reduzieren Tipparbeit.',
          'Deutlich günstiger: kostenloser Einstieg, Plus ab 3,99 € — ohne Voll-Paket-Preis.',
          'Spezialisiert auf Angebote & Rechnungen: Elektriker, SHK, Maler und vergleichbare Gewerke.',
          'Bessere mobile Erfahrung: responsive Oberfläche für Büro, Baustelle und unterwegs.',
          'Schnellere Angebotserstellung: Katalog, Kundenstamm, Vorlagen — Angebot in Minuten.',
          'Auch für Freelancer und Kleinbetriebe: kein Team-Minimum, kein Enterprise-Overhead.',
        ],
      },
      {
        heading: 'Wechsel von Tool Time — was geht heute?',
        paragraphs: [
          'Unter Daten-Import können Sie CSV-Exporte aus Tool Time für Kunden, Angebote, Rechnungen und Katalog-Posten einspielen. Beim erneuten Import werden Katalog-Duplikate aktualisiert statt doppelt angelegt.',
          'Sie müssen nicht jedes Tool-Time-Modul ersetzen — nur den Teil, der Ihnen Umsatz bringt: saubere Angebote, nachvollziehbare Bestätigungen und rechtskonforme Rechnungen mit ZUGFeRD.',
        ],
      },
      {
        heading: 'Für wen Quotavo die bessere Wahl ist',
        paragraphs: [
          'Einzelunternehmer und Kleinbetriebe, die Tool Time zu groß oder zu teuer finden.',
          'Handwerksbetriebe, die mobil Angebote schreiben und dem Kunden ein professionelles PDF schicken wollen.',
          'Freelancer und Dienstleister, die Excel/Word hinter sich lassen, aber kein Voll-ERP brauchen.',
          'Teams, die KI-Unterstützung und schnelle Workflows schätzen — ohne monatelange Einführung.',
        ],
      },
    ],
    related: [
      { href: '/angebot-handwerker', label: 'Angebot für Handwerker' },
      { href: '/angebot-erstellen', label: 'Angebot erstellen' },
      { href: '/faq', label: 'FAQ' },
      { href: '/ressourcen', label: 'Alle Ressourcen' },
    ],
  },
};

export const SEO_HUB = {
  title: 'Ressourcen & Ratgeber',
  lead: 'Hilfeseiten, Ratgeber und Dokumentation zu Quotavo — inklusive Tool-Time-Alternative für Handwerk und Kleinbetrieb.',
  groups: [
    {
      title: 'Ratgeber',
      links: [
        {
          href: '/tooltime-alternative',
          label: 'Tool Time Alternative',
          desc: 'Schlanke, günstige Alternative — KI, Mobil, CSV-Import.',
        },
        {
          href: '/angebot-erstellen',
          label: 'Angebot erstellen als PDF',
          desc: 'Schritt-für-Schritt-Anleitung für professionelle Angebote online.',
        },
        {
          href: '/rechnung-schreiben',
          label: 'Rechnung schreiben online',
          desc: 'Rechnungs-PDF, Pflichtangaben und ZUGFeRD-E-Rechnung.',
        },
        {
          href: '/angebot-handwerker',
          label: 'Angebot für Handwerker',
          desc: 'Katalog, Einsatzorte und mobile Nutzung im Handwerk.',
        },
        {
          href: '/angebot-online-bestaetigen',
          label: 'Angebot online bestätigen',
          desc: 'Kunden-Link mit PLZ-Check und Prozess-Status.',
        },
      ],
    },
    {
      title: 'Hilfe & Rechtliches',
      links: [
        { href: '/handbuch', label: 'Handbuch', desc: 'Alle Funktionen im Überblick.' },
        { href: '/faq', label: 'FAQ', desc: 'Häufige Fragen und Antworten.' },
        { href: '/roadmap', label: 'Roadmap', desc: 'Geplante Features.' },
        { href: '/impressum', label: 'Impressum', desc: 'Anbieterkennzeichnung.' },
        { href: '/datenschutz', label: 'Datenschutz', desc: 'Datenschutzerklärung (DSGVO).' },
        { href: '/agb', label: 'AGB', desc: 'Nutzungsbedingungen.' },
      ],
    },
  ],
  shareText:
    'Quotavo — Angebote und Rechnungen online erstellen, PDF exportieren, Kunden verwalten. Kostenlos starten:',
};
