/** Einrichtungs-Assistent — weitere Schritte später aktivierbar. */
export const ONBOARDING_STEPS = [
  { id: 'firma', label: 'Firma', enabled: true },
  { id: 'nummern', label: 'Nummern', enabled: true },
  { id: 'design', label: 'Design', enabled: false, soon: true },
  { id: 'katalog', label: 'Katalog', enabled: false, soon: true },
];

export const ENABLED_ONBOARDING_STEPS = ONBOARDING_STEPS.filter((step) => step.enabled);
