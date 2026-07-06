const BASE = '/api';

function getToken() {
  return localStorage.getItem('dassa_token');
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token vencido/ inválido: el backend responde 401. Si había sesión abierta
  // (token presente) y no es el propio endpoint de login, deslogueamos y
  // redirigimos en vez de dejar la app en un estado muerto.
  if (res.status === 401 && token && !path.startsWith('/auth/login')) {
    localStorage.removeItem('dassa_token');
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get:    <T>(path: string)                => request<T>('GET',    path),
  post:   <T>(path: string, body?: unknown) => request<T>('POST',   path, body),
  put:    <T>(path: string, body?: unknown) => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body?: unknown) => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                => request<T>('DELETE', path),
};
