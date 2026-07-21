function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export function iconEditSvg() {
  return `<svg class="btn-icon__svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
}

export function iconDeleteSvg() {
  return `<svg class="btn-icon__svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`;
}

export function iconAddSvg() {
  return `<svg class="btn-icon__svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;
}

export function editIconButton(label, attrs = '') {
  const safe = escapeAttr(label);
  return `<button type="button" class="btn btn-icon btn-ghost btn-sm" aria-label="${safe}" title="${safe}" ${attrs}>${iconEditSvg()}</button>`;
}

export function deleteIconButton(label, attrs = '') {
  const safe = escapeAttr(label);
  return `<button type="button" class="btn btn-icon btn-danger btn-sm" aria-label="${safe}" title="${safe}" ${attrs}>${iconDeleteSvg()}</button>`;
}

export function addIconButton(label, { variant = 'primary' } = {}, attrs = '') {
  const safe = escapeAttr(label);
  const variantClass = variant === 'ghost' ? 'btn-ghost' : 'btn-primary';
  return `<button type="button" class="btn btn-icon btn-sm ${variantClass}" aria-label="${safe}" title="${safe}" ${attrs}>${iconAddSvg()}</button>`;
}

export function mountIconButton(el, { type, label, variant = 'primary' }) {
  if (!el) return;
  el.classList.add('btn-icon');
  el.classList.remove('btn-primary', 'btn-ghost');
  if (type === 'add') {
    el.classList.add(variant === 'ghost' ? 'btn-ghost' : 'btn-primary');
    el.innerHTML = iconAddSvg();
  } else if (type === 'edit') {
    el.classList.add('btn-ghost');
    el.innerHTML = iconEditSvg();
  } else if (type === 'delete') {
    el.classList.add('btn-danger');
    el.innerHTML = iconDeleteSvg();
  }
  if (label) {
    el.setAttribute('aria-label', label);
    el.setAttribute('title', label);
  }
}
