// api.js - Centralized HTTP client for CENAREPAS Frontend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
const REQUEST_TIMEOUT_MS = 15000;

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error('[API] VITE_API_URL no está definida en este build: las peticiones van a http://localhost:4000/api/v1 y fallarán. Defínela en Vercel y vuelve a desplegar.');
}

export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  return `${SERVER_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function apiRequest(endpoint, options = {}, fallbackFn = null) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Retrieve token if present
  let token = null;
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      token = parsed.token || null;
    }
    if (!token) {
      token = localStorage.getItem('token');
    }
  } catch (e) {
    // Ignore JSON parse errors
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      body: isFormData
        ? options.body
        : options.body && typeof options.body === 'object'
        ? JSON.stringify(options.body)
        : options.body,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || `HTTP Error ${response.status}: ${response.statusText}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    // Sin status = fetch no obtuvo respuesta (servidor caído, URL o CORS mal configurados).
    const sinRespuesta = isTimeout || !err.status;
    const finalErr = isTimeout
      ? Object.assign(new Error('Tiempo de espera agotado. Verifica tu conexión e inténtalo de nuevo.'), { status: 408 })
      : sinRespuesta
      ? Object.assign(new Error('No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.'), { cause: err })
      : err;

    // Los datos de respaldo solo cubren la falta de conexión (sin respuesta del
    // servidor). Un error HTTP (400, 401, 409, 500...) siempre llega al usuario.
    if (fallbackFn && sinRespuesta) {
      console.warn(`[API Notice] Conexión a Backend ${endpoint} falló (${finalErr.message}). Utilizando datos de respaldo locales.`);
      return await fallbackFn();
    }
    throw finalErr;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get: (endpoint, fallbackFn) => apiRequest(endpoint, { method: 'GET' }, fallbackFn),
  post: (endpoint, body, fallbackFn) => apiRequest(endpoint, { method: 'POST', body }, fallbackFn),
  put: (endpoint, body, fallbackFn) => apiRequest(endpoint, { method: 'PUT', body }, fallbackFn),
  patch: (endpoint, body, fallbackFn) => apiRequest(endpoint, { method: 'PATCH', body }, fallbackFn),
  delete: (endpoint, fallbackFn) => apiRequest(endpoint, { method: 'DELETE' }, fallbackFn),
};

export default api;
