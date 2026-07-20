/** Einrichtungs-Assistent */
export const ONBOARDING_STEPS = [
  { id: 'firma', label: 'Firma', enabled: true },
  { id: 'nummern', label: 'Nummern', enabled: true },
  { id: 'layout', label: 'Layout', enabled: true },
];

export const ENABLED_ONBOARDING_STEPS = ONBOARDING_STEPS.filter((step) => step.enabled);
