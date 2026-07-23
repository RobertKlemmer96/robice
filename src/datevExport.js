function parseFilename(contentDisposition, fallback) {
  const match = String(contentDisposition || '').match(/filename="([^"]+)"/i);
  return match?.[1] || fallback;
}

export async function downloadDatevExport(von, bis) {
  const res = await fetch('/api/rechnungen/export/datev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ von, bis }),
  });

  if (!res.ok) {
    let message = 'DATEV-Export fehlgeschlagen.';
    const contentType = res.headers.get('Content-Type') || '';
    try {
      if (contentType.includes('application/json')) {
        const data = await res.json();
        message = data.error || message;
      } else {
        const text = await res.text();
        if (res.status === 404) {
          message =
            'Export-Endpunkt nicht gefunden. Bitte den Server neu starten (npm run dev) und erneut versuchen.';
        } else if (text && !text.includes('<!DOCTYPE')) {
          message = text.slice(0, 200);
        } else if (res.status === 401) {
          message = 'Bitte erneut anmelden.';
        } else {
          message = `${message} (HTTP ${res.status})`;
        }
      }
    } catch {
      message = res.statusText ? `${message} (${res.statusText})` : message;
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const filename = parseFilename(
    res.headers.get('Content-Disposition'),
    `EXTF_Buchungsstapel_${String(von).slice(0, 7)}.csv`
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  return {
    count: Number.parseInt(res.headers.get('X-DATEV-Export-Count') || '0', 10) || null,
    filename,
  };
}
