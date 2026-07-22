/**
 * Rechtliche Angaben — bitte vor Go-Live mit echten Daten ersetzen.
 * Keine Rechtsberatung; Texte ggf. von Fachanwalt prüfen lassen.
 */
export const LEGAL_CONFIG = {
  productName: 'Quotavo',
  companyName: 'Robert Klemmer',
  legalForm: '',
  street: 'Hamberger Straße 42',
  zipCity: '51381 Leverkusen',
  country: 'Deutschland',
  email: 'klemmer.robert.96@gmail.com',
  privacyEmail: 'klemmer.robert.96@gmail.com',
  phone: '',
  vatId: '',
  registerCourt: '',
  registerNumber: '',
  responsiblePerson: 'Robert Klemmer',
  jurisdictionCity: 'Leverkusen',
  hostingProvider: 'Render (render.com)',
  hostingLocation: 'EU',
  logRetentionDays: 90,
  privacyAuthority:
    'Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW)',
  agbNoticeDays: 30,
  cancellationNoticeDays: 30,
  lastUpdated: '19.07.2026',
  participatesInDisputeResolution: false,
};

export function getCompanyLine() {
  const { companyName, legalForm } = LEGAL_CONFIG;
  return legalForm ? `${companyName} ${legalForm}` : companyName;
}
