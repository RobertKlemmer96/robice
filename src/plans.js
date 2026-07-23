export const REGISTRATION_PLANS = ['free', 'plus', 'pro'];

export const FREE_DOCUMENT_LIMIT = 10;

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

export const PLAN_TAGLINES = {
  free: 'Zum Ausprobieren',
  plus: 'Für regelmäßigen Versand',
  pro: 'Unbegrenzt & weniger Tipparbeit',
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

export function isFreePlan(plan) {
  return String(plan || 'free').trim().toLowerCase() === 'free';
}

export function canSendMail(plan) {
  const value = String(plan || 'free').trim().toLowerCase();
  return value === 'plus' || value === 'pro' || value === 'admin';
}
