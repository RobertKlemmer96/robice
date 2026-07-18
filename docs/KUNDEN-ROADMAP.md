# Kunden-Bereich – Roadmap (Handwerker)

Zielgruppe: kleine Handwerksbetriebe. Fokus: Angebot → Rechnung, ohne Voll-CRM.

## Ist-Stand (Basis)

- Kunden anlegen, bearbeiten, löschen (Name, Adresse)
- Suche, Verknüpfung mit Angeboten/Rechnungen
- Kundenauswahl in Angebot/Rechnung

---

## Phase 1 – Kunden-Detail & Kontakt ✅ (umgesetzt)

- Felder: **Telefon**, **E-Mail**, **Notiz**
- **Kunden-Detail** mit Kontaktlinks (`tel:`, `mailto:`), Notiz, Dokumentenübersicht
- Schnellaktionen: **Neues Angebot**, **Neue Rechnung** (Kunde vorausgefüllt)
- Liste schlanker; Details über „Öffnen“

---

## Phase 2 – Adressen & Objekte ✅ (umgesetzt)

- **Rechnungsadresse** am Kunden (Hauptadresse)
- **Objekte** pro Kunde: Name, Adresse, Art (*Einsatzort* oder *alternative Rechnungsadresse*)
- Verwaltung im **Kunden-Detail**
- Angebot/Rechnung: Kunde wählen → **Objekt** optional auswählen
- PDF: bei Einsatzort zusätzlich Block **Leistungsort**

---

## Phase 3 – Zahlungsstatus & Übersicht

- Rechnungsstatus: offen / bezahlt / (optional: gemahnt)
- Auf Kunden-Detail: Summe offener Posten, letzte Zahlung
- Ampel oder Badge in der Kundenliste

---

## Phase 4 – Stammdaten & Export

- Kundentyp: Privat / Gewerbe / Hausverwaltung
- Optional: USt-IdNr., Leitweg-ID (öffentliche Auftraggeber)
- **Ansprechpartner** (Name, Rolle, Mobil)
- Export: Rechnungen pro Kunde/Jahr (PDF-Liste oder CSV) für Steuerberater

---

## Phase 5 – Alltag & Wiederholung

- **Notizen & Anhänge** (Fotos, Skizzen, PDFs am Kunden)
- **Wartung / wiederkehrende Aufträge** mit Erinnerung
- **Tags & Filter** (Stammkunde, Elektro, „zahlt langsam“)
- **Duplikat-Hinweis** beim Anlegen (gleicher Name/ähnliche Adresse)

---

## Phase 6 – Integration (optional)

- CSV-Import bestehender Kunden
- Kommunikation: Maps-Link zur Baustelle
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
