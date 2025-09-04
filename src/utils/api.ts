import { API_BASE_URL, API_KEY, REQUEST_TIMEOUT, RETRY_CONFIG, FALLBACK_URLS } from '../config/api';

// Error types
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public body?: string,
    public url?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

function getHeaders(extra: HeadersInit = {}) {
  return {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "ngrok-skip-browser-warning": "true",
    ...extra,
  };
}

function buildUrl(path: string, baseUrl: string = API_BASE_URL) {
  return `${baseUrl}${path}`;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchJSON(path: string, init: RequestInit = {}) {
  try {
    const url = buildUrl(path);
    const res = await fetchWithTimeout(url, { 
      ...init, 
      headers: getHeaders(init.headers ?? {}) 
    });
    
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const body = await res.text();
      throw new APIError(
        "Server returned unexpected response format (expected JSON)",
        res.status,
        "INVALID_RESPONSE_FORMAT",
        body,
        url
      );
    }
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new APIError(
        err.detail || `HTTP ${res.status}`,
        res.status,
        err.code,
        JSON.stringify(err),
        url
      );
    }
    
    return res.json();
  } catch (error) {
    throw error;
  }
}

export const api = {
  health: () => fetchJSON("/health"),

  post: <T>(path: string, body: any) =>
    fetchJSON(path, { method: "POST", body: JSON.stringify(body) }),

  get: <T>(path: string, params?: Record<string, any>) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return fetchJSON(`${path}${qs}`);
  },

  // Core endpoints
  predict: (payload: any) =>
    fetchJSON("/predict_price", { method: "POST", body: JSON.stringify(payload) }),

  createListing: (payload: any) =>
    fetchJSON("/listings/create", { method: "POST", body: JSON.stringify(payload) }),

  getListing: (id: string) =>
    fetchJSON(`/listings/${encodeURIComponent(id)}`),

  // Search & suggest
  search: (payload: any) =>
    fetchJSON("/search", { method: "POST", body: JSON.stringify(payload) }),

  suggestFuzzy: ({ field, q, limit = 10 }: { field: string; q: string; limit?: number }) =>
    fetchJSON(`/suggest_fuzzy?field=${encodeURIComponent(field)}&q=${encodeURIComponent(q)}&limit=${limit}`),

  // Recommendations by existing property
  recLive: (payload: any) =>
    fetchJSON("/recommend/by_property_live", { method: "POST", body: JSON.stringify(payload) }),

  recWithinLive: (payload: any) =>
    fetchJSON("/recommend/within_filters_live", { method: "POST", body: JSON.stringify(payload) }),

  // NEW: Recommendations by attributes (live)
  recByAttrs: (payload: any) =>
    fetchJSON("/recommend/by_attributes_live", { method: "POST", body: JSON.stringify(payload) }),

  recWithinByAttrs: (payload: any) =>
    fetchJSON("/recommend/within_filters_by_attributes_live", { method: "POST", body: JSON.stringify(payload) }),

  // Optional: keep non-live endpoints for compatibility (if backend exposes them)
  recByAttributes: (payload: any) =>
    fetchJSON("/recommend/by_attributes", { method: "POST", body: JSON.stringify(payload) }),

  recWithinFiltersByAttributes: (payload: any) =>
    fetchJSON("/recommend/within_filters_by_attributes", { method: "POST", body: JSON.stringify(payload) }),
};


// Legacy exports for backward compatibility
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<T> {
  if (skipAuth) {
    return fetchJSON(endpoint, { ...options, headers: {} });
  }
  return fetchJSON(endpoint, options);
  
}

