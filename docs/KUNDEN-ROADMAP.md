# Kunden-Bereich – Roadmap (Dienstleistung)

Zielgruppe: kleine Dienstleistungsunternehmen. Fokus: Angebot → Rechnung, ohne Voll-CRM.

**Stand: 22.07.2026**

## Ist-Stand

- Kunden anlegen, bearbeiten, löschen (Anrede, Name, Adresse, Kundennummer)
- **Kontakt:** Telefon, E-Mail, Notiz
- **Kunden-Detail** mit Kontaktlinks (`tel:`, `mailto:`), Notiz, Dokumentenübersicht
- Schnellaktionen: **Neues Angebot**, **Neue Rechnung** (Kunde vorausgefüllt)
- **Objekte** pro Kunde: Name, Adresse, Art (*Einsatzort* oder *alternative Rechnungsadresse*)
- Angebot/Rechnung: Kunde wählen → **Objekt** optional; PDF mit **Leistungsort** bei Einsatzort
- Suche, Verknüpfung mit Angeboten/Rechnungen
- Kundenauswahl in Angebot/Rechnung (Stamm oder Freitext)

### Mandantenweit (nicht nur Kunden-Bereich)

- **Dashboard** nach Login: Kennzahlen, zuletzt bearbeitete Dokumente, Profil-Checkliste
- Rechnungen haben **Fälligkeitsdatum**; Dashboard zeigt Anzahl **bald fälliger** Rechnungen (14 Tage)

### Noch nicht umgesetzt (Phase 3)

- Rechnungsstatus (offen / bezahlt / gemahnt)
- Summe offener Posten und letzte Zahlung am Kunden-Detail
- Status-Badges in Kunden- und Archivlisten

---

## Phase 1 – Kunden-Detail & Kontakt ✅ (umgesetzt)

- Felder: **Telefon**, **E-Mail**, **Notiz**
- **Kunden-Detail** mit Kontaktlinks, Notiz, Dokumentenübersicht
- Schnellaktionen: **Neues Angebot**, **Neue Rechnung**
- Liste schlanker; Details über „Öffnen“

---

## Phase 2 – Adressen & Objekte ✅ (umgesetzt)

- **Rechnungsadresse** am Kunden (Hauptadresse)
- **Objekte** pro Kunde: Name, Adresse, Art (*Einsatzort* oder *alternative Rechnungsadresse*)
- Verwaltung im **Kunden-Detail**
- Angebot/Rechnung: Kunde wählen → **Objekt** optional auswählen
- PDF: bei Einsatzort zusätzlich Block **Leistungsort**

---

## Phase 3 – Zahlungsstatus & Übersicht ⏳ (geplant, Q3 2026)

- Rechnungsstatus: offen / bezahlt / (optional: gemahnt)
- Auf Kunden-Detail: Summe offener Posten, letzte Zahlung
- Ampel oder Badge in der Kundenliste und im Rechnungs-Archiv
- *Teil-Basis:* Fälligkeitsdatum und Dashboard-Hinweis „bald fällig“ existieren bereits

---

## Phase 4 – Stammdaten & Export (geplant, Q4 2026)

- Kundentyp: Privat / Gewerbe / Hausverwaltung
- Optional: USt-IdNr., Leitweg-ID (öffentliche Auftraggeber)
- **Ansprechpartner** (Name, Rolle, Mobil)
- Export: Rechnungen pro Kunde/Jahr (PDF-Liste oder CSV) für Steuerberater

---

## Phase 5 – Alltag & Wiederholung (geplant, 2027)

- **Notizen & Anhänge** (Fotos, Skizzen, PDFs am Kunden)
- **Wartung / wiederkehrende Aufträge** mit Erinnerung
- **Tags & Filter** (Stammkunde, Elektro, „zahlt langsam“)
- **Duplikat-Hinweis** beim Anlegen (gleicher Name/ähnliche Adresse)

---

## Phase 6 – Integration (optional)

- CSV-Import bestehender Kunden
- Kommunikation: Maps-Link zum Einsatzort
- Mehrere Benutzer: „Zuletzt bearbeitet von …“

---

## Bewusst nicht (Scope)

- Volle Disposition / Kalender
- Zeiterfassung & Lager
- E-Mail-Marketing

---

## Technische Notizen

- Kunden in SQLite (`kunden`), mandantenfähig (`tenant_id`)
- Phase 1: Spalten `telefon`, `email`, `notiz` (+ Migration für bestehende DBs)
- Phase 2: Tabelle `kunden_objekte`, API unter `/api/kunden/:kundeId/objekte`
- Rechnungen: Spalte `faellig_am` (Fälligkeit, kein Zahlungsstatus)
