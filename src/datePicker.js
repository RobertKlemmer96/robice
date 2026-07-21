import { getLocale, t } from './i18n.js';

const MONTHS_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function getMonths() {
  return getLocale() === 'en' ? MONTHS_EN : MONTHS_DE;
}

function getWeekdays() {
  return getLocale() === 'en' ? WEEKDAYS_EN : WEEKDAYS_DE;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseIso(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function toIso(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDisplay(value) {
  const date = parseIso(value);
  if (!date) return '';
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function isoWeekday(date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function enhanceDateInput(input) {
  if (input.dataset.datePicker === 'true') return;

  const wrapper = document.createElement('div');
  wrapper.className = 'date-picker';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'date-picker__trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');

  const valueEl = document.createElement('span');
  valueEl.className = 'date-picker__value';
  valueEl.textContent = formatDisplay(input.value) || t('datePicker.choose');

  const icon = document.createElement('span');
  icon.className = 'date-picker__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

  trigger.append(valueEl, icon);

  const popover = document.createElement('div');
  popover.className = 'date-picker__popover';
  popover.hidden = true;
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-modal', 'false');

  const header = document.createElement('div');
  header.className = 'date-picker__header';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'date-picker__nav';
  prevBtn.dataset.action = 'prev-month';
  prevBtn.setAttribute('aria-label', t('datePicker.prevMonth'));
  prevBtn.textContent = '‹';

  const title = document.createElement('span');
  title.className = 'date-picker__title';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'date-picker__nav';
  nextBtn.dataset.action = 'next-month';
  nextBtn.setAttribute('aria-label', t('datePicker.nextMonth'));
  nextBtn.textContent = '›';

  header.append(prevBtn, title, nextBtn);

  const weekdays = document.createElement('div');
  weekdays.className = 'date-picker__weekdays';
  weekdays.innerHTML = getWeekdays().map((d) => `<span>${d}</span>`).join('');

  const days = document.createElement('div');
  days.className = 'date-picker__days';

  popover.append(header, weekdays, days);

  input.classList.add('date-picker__native');
  input.dataset.datePicker = 'true';
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');

  input.before(wrapper);
  wrapper.append(input, trigger, popover);

  let viewDate = parseIso(input.value) || new Date();
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);

  const syncDisplay = () => {
    const formatted = formatDisplay(input.value);
    valueEl.textContent = formatted || t('datePicker.choose');
    valueEl.classList.toggle('is-placeholder', !formatted);
  };

  const repositionPopover = () => {
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const width = Math.max(rect.width, 280);
    let top = rect.bottom + gap;
    let left = rect.left;

    popover.style.width = `${width}px`;
    popover.style.left = `${left}px`;

    const popoverHeight = popover.offsetHeight;
    const viewportPadding = 8;

    if (top + popoverHeight > window.innerHeight - viewportPadding) {
      top = rect.top - gap - popoverHeight;
    }

    if (left + width > window.innerWidth - viewportPadding) {
      left = window.innerWidth - width - viewportPadding;
    }

    if (left < viewportPadding) left = viewportPadding;

    popover.style.top = `${Math.max(viewportPadding, top)}px`;
    popover.style.left = `${left}px`;
  };

  let onViewportChange = null;

  const close = () => {
    popover.hidden = true;
    popover.classList.remove('is-floating');
    trigger.setAttribute('aria-expanded', 'false');
    wrapper.appendChild(popover);
    if (onViewportChange) {
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
      onViewportChange = null;
    }
  };

  const open = () => {
    document.querySelectorAll('.date-picker__popover:not([hidden])').forEach((el) => {
      if (el !== popover) {
        el.hidden = true;
        el.classList.remove('is-floating');
        el.closest('.date-picker')?.appendChild(el);
      }
    });
    document.querySelectorAll('.date-picker__trigger[aria-expanded="true"]').forEach((el) => {
      if (el !== trigger) el.setAttribute('aria-expanded', 'false');
    });

    const selected = parseIso(input.value);
    viewDate = selected
      ? new Date(selected.getFullYear(), selected.getMonth(), 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    renderCalendar();
    document.body.appendChild(popover);
    popover.classList.add('is-floating');
    popover.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    repositionPopover();

    onViewportChange = () => {
      if (!popover.hidden) repositionPopover();
    };
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
  };

  const setValue = (date) => {
    input.value = toIso(date);
    syncDisplay();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    close();
  };

  const renderCalendar = () => {
    title.textContent = `${getMonths()[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = isoWeekday(new Date(year, month, 1));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const selected = parseIso(input.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    days.innerHTML = '';

    for (let i = firstWeekday - 1; i >= 0; i -= 1) {
      const day = daysInPrevMonth - i;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'date-picker__day is-outside';
      btn.textContent = String(day);
      btn.disabled = true;
      days.append(btn);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'date-picker__day';
      btn.textContent = String(day);
      btn.dataset.iso = toIso(date);

      if (selected && isSameDay(date, selected)) btn.classList.add('is-selected');
      if (isSameDay(date, today)) btn.classList.add('is-today');

      btn.addEventListener('click', () => setValue(date));
      days.append(btn);
    }

    const totalCells = firstWeekday + daysInMonth;
    const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= trailing; day += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'date-picker__day is-outside';
      btn.textContent = String(day);
      btn.disabled = true;
      days.append(btn);
    }
  };

  trigger.addEventListener('click', () => {
    if (popover.hidden) open();
    else close();
  });

  prevBtn.addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderCalendar();
  });

  nextBtn.addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderCalendar();
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target) && !popover.contains(e.target)) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popover.hidden) {
      close();
      trigger.focus();
    }
  });

  const valueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  Object.defineProperty(input, 'value', {
    configurable: true,
    enumerable: true,
    get() {
      return valueDesc.get.call(this);
    },
    set(next) {
      valueDesc.set.call(this, next);
      syncDisplay();
    },
  });

  wrapper.__refreshDatePickerLocale = () => {
    prevBtn.setAttribute('aria-label', t('datePicker.prevMonth'));
    nextBtn.setAttribute('aria-label', t('datePicker.nextMonth'));
    weekdays.innerHTML = getWeekdays().map((d) => `<span>${d}</span>`).join('');
    syncDisplay();
    if (!popover.hidden) renderCalendar();
  };

  syncDisplay();
}

export function refreshDatePickers() {
  document.querySelectorAll('.date-picker').forEach((wrapper) => {
    wrapper.__refreshDatePickerLocale?.();
  });
}

export function initDatePickers(root = document) {
  root.querySelectorAll('input[type="date"]:not([data-date-picker="true"])').forEach(enhanceDateInput);
}
