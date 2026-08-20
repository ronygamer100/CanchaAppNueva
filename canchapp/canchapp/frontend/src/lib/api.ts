const PRODUCTION_API_URL = 'https://canchaappnueva-0dkn.onrender.com';

function normalizeApiUrl(value?: string): string {
  const fallback = process.env.NODE_ENV === 'production'
    ? PRODUCTION_API_URL
    : 'http://localhost:8000';
  let raw = (value || '').trim();

  const markdownTarget = raw.match(/\]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownTarget) {
    raw = markdownTarget[1];
  } else {
    const embeddedUrl = raw.match(/https?:\/\/[^\s\])"']+/i);
    if (embeddedUrl) raw = embeddedUrl[0];
  }

  raw = raw.replace(/^['"]|['"]$/g, '').replace(/\/+$/, '');
  if (raw && !/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  try {
    const parsed = new URL(raw || fallback);
    if (!['http:', 'https:'].includes(parsed.protocol)) return fallback;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

const OWNER_KEY = 'canchapp_token';
const PLAYER_KEY = 'canchapp_player_token';

// ----- Owner token (compat con código existente) -----
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OWNER_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(OWNER_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(OWNER_KEY);
}

// ----- Player token -----
export function getPlayerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PLAYER_KEY);
}
export function setPlayerToken(token: string) {
  localStorage.setItem(PLAYER_KEY, token);
}
export function clearPlayerToken() {
  localStorage.removeItem(PLAYER_KEY);
}

type FetchOpts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  auth?: boolean | 'player';  // true=owner, 'player'=player
};

export async function apiFetch<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  if (opts.auth) {
    const token = opts.auth === 'player' ? getPlayerToken() : getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method || 'GET',
    headers,
    body,
  });

  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Descarga un archivo binario protegido con auth. Dispara descarga en el navegador. */
export async function apiDownload(path: string, suggestedFilename?: string): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  // Sacar filename del Content-Disposition si lo trae
  let filename = suggestedFilename || 'download';
  const disp = res.headers.get('Content-Disposition');
  if (disp) {
    const m = disp.match(/filename="?([^"]+)"?/i);
    if (m) filename = m[1];
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function loginWithEmail(email: string, password: string) {
  // OAuth2 password form
  const fd = new FormData();
  fd.append('username', email);
  fd.append('password', password);
  const res = await fetch(`${API_URL}/api/auth/login`, { method: 'POST', body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Credenciales inválidas');
  }
  const data = await res.json();
  setToken(data.access_token);
  return data;
}
