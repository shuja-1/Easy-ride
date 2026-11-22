const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'easyride_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export async function api(path, { method = 'GET', body, form = false } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const assetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const server = import.meta.env.VITE_ASSET_URL || '';
  return `${server}${path}`;
};
