/** Beispielwerte im Einrichtungs-Assistenten — nur Platzhalter, nicht als echte Daten speichern. */
export const ONBOARDING_FIRMA_EXAMPLES = {
  name: 'Ihr Unternehmen GmbH',
  strasse: 'Musterstraße 1',
  plzOrt: '12345 Musterstadt',
  telefon: '+49 123 456789',
  web: 'www.beispiel.de',
  ustId: 'DE123456789',
  iban: 'DE89 3704 0044 0532 0130 00',
};

export function isOnboardingExampleFirmaValue(field, value) {
  const example = ONBOARDING_FIRMA_EXAMPLES[field];
  if (!example) return false;
  return String(value ?? '').trim() === example.trim();
}

/** Wert fürs Formular: leer lassen, wenn noch Beispiel/Default unverändert. */
export function onboardingFirmaFieldValue(field, storedValue) {
  const value = String(storedValue ?? '').trim();
  if (!value || isOnboardingExampleFirmaValue(field, value)) return '';
  return value;
}
