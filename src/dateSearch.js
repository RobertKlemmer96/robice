function appendIsoDateParts(parts, isoLike) {
  const raw = String(isoLike || '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!iso) return;
  const [, y, m, d] = iso;
  parts.push(`${d}.${m}.${y}`, `${d}.${m}`, `${m}.${y}`, y, `${y}-${m}-${d}`);
}

function appendDateValueParts(parts, value) {
  const raw = String(value || '').trim();
  if (!raw) return;

  parts.push(raw);
  appendIsoDateParts(parts, raw);

  const isoFromTimestamp = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoFromTimestamp) appendIsoDateParts(parts, isoFromTimestamp[1]);

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return;

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  parts.push(`${dd}.${mm}.${yyyy}`, `${dd}.${mm}`, `${mm}.${yyyy}`, yyyy);
}

export function buildDateSearchHaystack(...dateValues) {
  const parts = [];
  for (const value of dateValues) appendDateValueParts(parts, value);
  return parts.map((part) => part.toLowerCase()).join(' ');
}

export function matchesDateSearch(query, ...dateValues) {
  const q = String(query || '')
    .trim()
    .toLowerCase()
    .replace(/\//g, '.');
  if (!q) return false;
  return buildDateSearchHaystack(...dateValues).includes(q);
}
