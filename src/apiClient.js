export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    let message = 'Serverfehler';
    let code = null;
    try {
      const data = await res.json();
      message = data.error || message;
      code = data.code || null;
    } catch {
      message = res.statusText || message;
    }
    const err = new Error(message);
    err.status = res.status;
    err.code = code;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}
