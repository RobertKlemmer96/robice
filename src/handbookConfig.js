/**
 * Feature-Handbuch für KlemDesk — bei Prozessänderungen aktualisieren.
 */
export const HANDBOOK = {
  lastUpdated: '21.07.2026',
  intro:
    'Dieses Handbuch beschreibt alle wesentlichen Abläufe in KlemDesk — von der Registrierung bis zum PDF-Versand. Die App ist für Dienstleister gedacht: Angebote, Rechnungen, Katalog und Kunden ohne Voll-CRM.',
  sections: [
    {
      title: 'Registrierung & Anmeldung',
      steps: [
        'Auf der Startseite „Kostenlos registrieren“ wählen oder „Anmelden“, falls bereits ein Konto besteht.',
        'Bei der Registrierung Firmenname, E-Mail und Passwort angeben. Jede Registrierung erhält einen eigenen Mandanten (getrennte Daten).',
        'Nach dem Login führt das Onboarding durch Firmendaten, Nummernschemata und die PDF-Vorlage.',
      ],
    },
    {
      title: 'Onboarding (Ersteinrichtung)',
      steps: [
        'Firmendaten: Name, Adresse, Telefon und E-Mail für den Briefkopf in PDFs.',
        'Nummernschemata: Vorschau für Angebots-, Rechnungs- und Kundennummern prüfen.',
        'PDF-Vorlage: Layout, Logo, Farben und Fußtexte für Angebot und Rechnung anpassen.',
        'Nach Abschluss gelangen Sie direkt in die App. Einstellungen sind später unter Einstellungen → Vorlage erreichbar.',
      ],
    },
    {
      title: 'Bereich wechseln: Angebote & Rechnungen',
      steps: [
        'Oben links wechseln Sie zwischen den Bereichen Angebote und Rechnungen.',
        'Jeder Bereich hat eigene Navigation (Neu, Archiv), eigene Nummernkreise und eigene PDF-Vorlagen.',
        'Stammdaten (Katalog, Kunden) und Einstellungen (Vorlage, Admin) sind in beiden Bereichen gleich.',
      ],
    },
    {
      title: 'Katalog pflegen (Stammdaten)',
      steps: [
        'Navigation: Stammdaten → Katalog.',
        'Mit + einen neuen Katalog-Posten anlegen: Bezeichnung, Beschreibung, Art (Lohn/Material), Preis Stück und/oder Stunde.',
        'Posten erscheinen in der Liste; über Stift bearbeiten, über Papierkorb löschen.',
        'Beim Erstellen von Angeboten/Rechnungen können Posten aus dem Katalog übernommen werden — Preise und Bezeichnung werden vorausgefüllt.',
      ],
    },
    {
      title: 'Kunden verwalten (Stammdaten)',
      steps: [
        'Navigation: Stammdaten → Kunden.',
        'Mit + neuen Kunden anlegen: Anrede, Name, Kundennummer, Adresse, Telefon, E-Mail, Notiz.',
        'In der Liste Kunden suchen, Detailansicht öffnen oder direkt bearbeiten/löschen.',
        'In der Detailansicht: zugehörige Angebote und Rechnungen, Buttons für neues Angebot oder neue Rechnung für diesen Kunden.',
      ],
    },
    {
      title: 'Angebot erstellen',
      steps: [
        'Navigation: Angebote → Neues Angebot.',
        'Allgemeine Informationen: Angebotsnummer (automatisch), Datum, Gültig bis, Kunde (Freitext oder „Kunde auswählen“), E-Mail, Telefon, Adresse.',
        'Posten: Positionen hinzufügen — aus Katalog, manuell oder als Entwurf. Menge, Einheit (Stk./Std.), Preis und Art pflegen.',
        'Unten PDF erstellen oder aktualisieren. Optional: PDF per E-Mail an die Kunden-Adresse senden (SMTP muss serverseitig konfiguriert sein).',
        'Das Angebot landet im Archiv und kann jederzeit wieder geöffnet und bearbeitet werden.',
      ],
    },
    {
      title: 'Angebots-Archiv',
      steps: [
        'Navigation: Angebote → Alle Angebote.',
        'Liste durchsuchen, Angebot öffnen, bearbeiten, PDF erneut erzeugen oder löschen.',
        'Aus einem Angebot kann eine Rechnung vorbereitet werden (Button „Rechnung erstellen“).',
      ],
    },
    {
      title: 'Rechnung erstellen',
      steps: [
        'Navigation: Rechnungen → Neue Rechnung — oder aus Angebot/Kunden-Detail starten.',
        'Allgemeine Informationen: Rechnungsnummer, Rechnungsdatum, Fälligkeit, Kundendaten wie beim Angebot.',
        'Posten analog zum Angebot pflegen.',
        'PDF erstellen, speichern und optional per E-Mail versenden.',
      ],
    },
    {
      title: 'Rechnungs-Archiv',
      steps: [
        'Navigation: Rechnungen → Alle Rechnungen.',
        'Rechnungen suchen, bearbeiten, PDF neu erzeugen oder löschen.',
        'Bezug zum Ursprungs-Angebot wird angezeigt, sofern die Rechnung daraus entstanden ist.',
      ],
    },
    {
      title: 'PDF-Vorlage anpassen',
      steps: [
        'Navigation: Einstellungen → Vorlage.',
        'Getrennte Vorlagen für Angebote und Rechnungen: Firmenblock, Farben, Logo, Header-Bild, Fußtexte, Layout-Variante.',
        'Live-Vorschau zeigt Änderungen. Speichern wirkt auf alle künftigen PDFs.',
      ],
    },
    {
      title: 'Profil & Konto',
      steps: [
        'Profil-Icon oben rechts: Tarif, Nummernschemata, Passwort ändern, Konto löschen.',
        'Sprache über die Flagge umschalten (Deutsch/English) — Oberfläche und Formularlabels werden angepasst.',
        'Design (Hell/Dunkel) über das Theme-Toggle im Header.',
      ],
    },
    {
      title: 'Administration (nur Admin-Rolle)',
      steps: [
        'Navigation: Einstellungen → Admin.',
        'Übersicht aller registrierten Nutzer und Mandanten im System.',
      ],
    },
  ],
};
