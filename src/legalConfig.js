/**
 * Rechtliche Angaben — bitte vor Go-Live mit echten Daten ersetzen.
 * Keine Rechtsberatung; Texte ggf. von Fachanwalt prüfen lassen.
 */
export const LEGAL_CONFIG = {
  productName: 'Angebot-App',
  companyName: 'Max Mustermann',
  legalForm: '',
  street: 'Musterstraße 1',
  zipCity: '12345 Musterstadt',
  country: 'Deutschland',
  email: 'kontakt@example.de',
  privacyEmail: 'datenschutz@example.de',
  phone: '',
  vatId: '',
  registerCourt: '',
  registerNumber: '',
  responsiblePerson: 'Max Mustermann',
  jurisdictionCity: 'Musterstadt',
  hostingProvider: 'Eigener Server',
  hostingLocation: 'Deutschland',
  logRetentionDays: 90,
  privacyAuthority:
    'Der für Sie zuständige Landesbeauftragte für Datenschutz (siehe www.bfdi.bund.de)',
  agbNoticeDays: 30,
  cancellationNoticeDays: 30,
  lastUpdated: '18.07.2026',
  participatesInDisputeResolution: false,
};

export function getCompanyLine() {
  const { companyName, legalForm } = LEGAL_CONFIG;
  return legalForm ? `${companyName} ${legalForm}` : companyName;
}
