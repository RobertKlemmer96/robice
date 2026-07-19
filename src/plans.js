export const REGISTRATION_PLANS = ['free', 'plus', 'pro'];

export const PLAN_LABELS = {
  free: 'Free',
  plus: 'Plus',
  pro: 'Pro',
  admin: 'Administration',
};

export const PLAN_PRICES = {
  free: '0 €/Monat',
  plus: '3,99 €/Monat',
  pro: '7,99 €/Monat',
};

export function normalizeRegistrationPlan(plan) {
  const value = String(plan || 'free').trim().toLowerCase();
  return REGISTRATION_PLANS.includes(value) ? value : 'free';
}

export function formatPlanLabel(plan) {
  if (!plan) return '—';
  const label = PLAN_LABELS[plan] || plan;
  const price = PLAN_PRICES[plan];
  return price ? `${label} (${price})` : label;
}
