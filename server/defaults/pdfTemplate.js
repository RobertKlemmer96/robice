export const PDF_TEMPLATE_DEFAULT = {
  firma: {
    name: 'Ihr Unternehmen GmbH',
    strasse: 'Musterstraße 1',
    plzOrt: '12345 Musterstadt',
    telefon: '+49 123 456789',
    email: 'info@ihr-unternehmen.de',
    web: 'www.ihr-unternehmen.de',
    ustId: 'DE123456789',
    iban: 'DE89370400440532013000',
    bic: 'COBADEFFXXX',
    bankName: 'Sparkasse Musterstadt',
  },
  farben: {
    primaer: '#1e3a5f',
    textMuted: '#505050',
    fusszeile: '#646464',
    trennlinie: '#dcdcdc',
    tabellenkopfText: '#ffffff',
    tabellenRand: '#e5e7eb',
    tabellenKoerperText: '#374151',
    tabellenZebr: '#f3f4f6',
  },
  texte: {
    titel: 'ANGEBOT',
    einleitung:
      'Vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot:',
    fuss1:
      'Dieses Angebot ist freibleibend. Es gelten unsere allgemeinen Geschäftsbedingungen.',
    fuss2: 'Wir freuen uns auf Ihre Rückmeldung.',
  },
  bilder: { logo: '', header: '' },
  layout: {
    logoBreiteMm: 35,
    logoHoeheMm: 18,
    headerHoeheMm: 22,
    headerAktiv: false,
    angebotVariant: 1,
    rechnungVariant: 1,
    klassischTabellenStil: 'grid',
    klassischTabellenZebr: false,
  },
  angebot: {
    nummerSchema: 'ANG-{YYYY}{MM}{DD}-{NR:3}',
  },
  rechnung: {
    nummerSchema: 'RE-{YYYY}{MM}{DD}-{NR:3}',
    zahlungszielTage: 14,
  },
  zugferd: {
    profile: 'EN16931',
    enabled: true,
  },
  texteRechnung: {
    titel: 'RECHNUNG',
    einleitung: 'Wir stellen Ihnen folgende Leistungen in Rechnung:',
    fuss1: 'Bitte überweisen Sie den Rechnungsbetrag bis zum angegebenen Fälligkeitsdatum.',
    fuss2: 'Es gelten unsere allgemeinen Geschäftsbedingungen.',
  },
  fussSpalten: [
    {
      ueberschrift: 'Bankverbindung',
      text: 'IBAN DE00 0000 0000 0000 0000 00\nSparkasse Musterstadt',
    },
    {
      ueberschrift: 'Geschäftsführung',
      text: 'Max Mustermann',
    },
    {
      ueberschrift: 'Register',
      text: 'Amtsgericht Musterstadt\nHRB 12345',
    },
  ],
};
