import {
  API_BASE_URL,
  API_KEY,
  REQUEST_TIMEOUT,
  USE_MOCK_API,
  API_ENDPOINTS,
} from '../config/api';
import { Listing } from '../types';
import { mockListings } from '../data/mockListings';

// ---------- shared helpers ----------
const mapType = (v?: string) => {
  const M: Record<string, string> = {
    apartment: 'Apartment',
    villa: 'Villa',
    townhouse: 'Townhouse',
    duplex: 'Duplex',
    penthouse: 'Penthouse',
    studio: 'Studio',
    'twin_house': 'Twin House',
    chalet: 'Chalet',
    'standalone_villa': 'Standalone Villa',
  };
  return v ? (M[String(v).toLowerCase()] ?? v) : undefined;
};

const clean = (o: any) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );

function normalizeYN(v: any) {
  const s = String(v ?? '').toLowerCase();
  if (!s) return '';
  if (['yes', 'y', 'true', 'furnished'].includes(s)) return 'yes';
  if (['no', 'n', 'false', 'unfurnished'].includes(s)) return 'no';
  return s;
}

function matchesFilters(x: Listing, f: any) {
  if (!f) return true;
  if (f.city && String(x.city) !== String(f.city)) return false;
  if (f.town && String(x.town) !== String(f.town)) return false;
  if (f.district_compound && String(x.district_compound || '') !== String(f.district_compound)) return false;
  if (f.property_type && mapType(x.property_type) !== mapType(f.property_type)) return false;

  const price = Number(x.price) || 0;
  if (f.price_min != null && price < Number(f.price_min)) return false;
  if (f.price_max != null && price > Number(f.price_max)) return false;

  const size = Number(x.size) || 0;
  if (f.size_min != null && size < Number(f.size_min)) return false;
  if (f.size_max != null && size > Number(f.size_max)) return false;

  const beds = Number(x.bedrooms) || 0;
  const baths = Number(x.bathrooms) || 0;
  if (f.bedrooms_min != null && beds < Number(f.bedrooms_min)) return false;
  if (f.bathrooms_min != null && baths < Number(f.bathrooms_min)) return false;

  if (f.furnished) {
    const want = normalizeYN(f.furnished);
    const have = normalizeYN(x.furnished ?? x.furnishing ?? '');
    if (want && have && want !== have) return false;
  }
  if (f.offering_type && String(x.offering_type || '').toLowerCase() !== String(f.offering_type).toLowerCase()) {
    return false;
  }
  return true;
}

function scoreSimilarity(seed: Partial<Listing>, x: Listing) {
  const sBeds = Number(seed.bedrooms) || 0;
  const sBaths = Number(seed.bathrooms) || 0;
  const sSize = Number(seed.size) || 0;
  const sType = mapType(String(seed.property_type || ''));
  const sCity = (seed.city || '').toLowerCase();
  const sTown = (seed.town || '').toLowerCase();

  const xCity = (x.city || '').toLowerCase();
  const xTown = (x.town || '').toLowerCase();
  const xType = mapType(String(x.property_type || ''));

  const loc = (xCity === sCity ? 8 : 0) + (xTown === sTown ? 8 : 0);
  const typ = xType === sType ? 6 : 0;
  const beds = -Math.abs((Number(x.bedrooms) || 0) - sBeds) * 2;
  const baths = -Math.abs((Number(x.bathrooms) || 0) - sBaths) * 1.5;
  const size =
    sSize > 0
      ? -Math.min(10, Math.abs((Number(x.size) || 0) - sSize) / (sSize * 0.1))
      : 0;

  return loc + typ + beds + baths + size;
}

function uniqueValues(field: 'city' | 'town' | 'district_compound') {
  return Array.from(
    new Set(
      mockListings.map((m: any) => String(m[field] || '').trim()).filter(Boolean)
    )
  );
}

function suggestFrom(field: 'city' | 'town' | 'district_compound', q: string, limit = 10) {
  const values = uniqueValues(field);
  const qq = q.toLowerCase();
  const starts = values.filter((v) => v.toLowerCase().startsWith(qq));
  const contains = values.filter(
    (v) => !v.toLowerCase().startsWith(qq) && v.toLowerCase().includes(qq)
  );
  return [...starts, ...contains].slice(0, limit);
}

// ---------- MOCK IMPLEMENTATION ----------
const mockApi = {
  health: async () => ({ status: 'ok', mode: 'mock' }),
  post: async <T>(path: string, body: any) => {
    if (path === API_ENDPOINTS.search) {
      const { page = 1, limit = 20, ...filters } = body || {};
      const pool = mockListings.filter((x) => matchesFilters(x as any, filters));
      const start = (Number(page) - 1) * Number(limit);
      const items = pool.slice(start, start + Number(limit));
      return { items, page: Number(page), limit: Number(limit), count: pool.length } as any as T;
    }
    return {} as T;
  },
  get: async <T>(_path: string) => ({ } as T),

  predict: async (payload: any) => {
    const size = Number(payload?.size) || 100;
    const br = Number(payload?.bedrooms) || 2;
    const base = 20000; // mock EGP/m²
    const price = Math.round(size * base * (1 + br * 0.05));
    return { price };
  },

  createListing: async (payload: any) => {
    const id = String(
      (mockListings.reduce((m, x) => Math.max(m, Number((x as any).id) || 0), 0) || 1000) +
        1
    );
    const listing: Listing = { ...(payload as any), id };
    (mockListings as any).push(listing);
    return listing;
  },

  getListing: async (id: string) => {
    const found = mockListings.find((x) => String((x as any).id) === String(id));
    if (!found) throw new Error('Not found');
    return found as Listing;
  },

  suggestFuzzy: async ({ field, q, limit = 10 }: { field: string; q: string; limit?: number }) => {
    if (!['city', 'town', 'district_compound'].includes(field)) return [];
    return suggestFrom(field as any, q, limit);
  },

  recLive: async ({ property_id, top_k = 12 }: { property_id: string; top_k?: number }) => {
    const seed = mockListings.find((x) => String((x as any).id) === String(property_id)) as any;
    if (!seed) return { items: [] };
    const ranked = (mockListings as any)
      .filter((x: any) => String(x.id) !== String(seed.id))
      .sort((a: Listing, b: Listing) => scoreSimilarity(seed, b) - scoreSimilarity(seed, a))
      .slice(0, top_k)
      .map((x: Listing) => ({ property_id: (x as any).id, score: scoreSimilarity(seed, x) }));
    return { items: ranked };
  },

  recWithinLive: async ({
    property_id,
    top_k = 12,
    filters = {} as any,
  }: {
    property_id: string;
    top_k?: number;
    filters?: any;
  }) => {
    const seed = mockListings.find((x) => String((x as any).id) === String(property_id)) as any;
    if (!seed) return { items: [] };
    const pool = (mockListings as any)
      .filter((x: Listing) => String((x as any).id) !== String(seed.id))
      .filter((x: Listing) => matchesFilters(x, filters));
    const ranked = pool
      .sort((a: Listing, b: Listing) => scoreSimilarity(seed, b) - scoreSimilarity(seed, a))
      .slice(0, top_k)
      .map((x: Listing) => ({ property_id: (x as any).id, score: scoreSimilarity(seed, x) }));
    return { items: ranked };
  },

  recByAttributes: async (attrs: any) => {
    const seed: Partial<Listing> = {
      property_type: mapType(attrs.property_type),
      city: attrs.city,
      town: attrs.town,
      bedrooms: attrs.bedrooms,
      bathrooms: attrs.bathrooms,
      size: attrs.size,
    };
    const top_k = Number(attrs.top_k) || 12;
    const ranked = (mockListings as any)
      .sort((a: Listing, b: Listing) => scoreSimilarity(seed, b) - scoreSimilarity(seed, a))
      .slice(0, top_k)
      .map((x: Listing) => ({ property_id: (x as any).id, score: scoreSimilarity(seed, x) }));
    return { items: ranked };
  },

  recWithinFiltersByAttributes: async ({ filters = {}, ...attrs }: any) => {
    const seed: Partial<Listing> = {
      property_type: mapType(attrs.property_type),
      city: attrs.city,
      town: attrs.town,
      bedrooms: attrs.bedrooms,
      bathrooms: attrs.bathrooms,
      size: attrs.size,
    };
    const top_k = Number(attrs.top_k) || 12;
    const pool = (mockListings as any).filter((x: Listing) => matchesFilters(x, filters));
    const ranked = pool
      .sort((a: Listing, b: Listing) => scoreSimilarity(seed, b) - scoreSimilarity(seed, a))
      .slice(0, top_k)
      .map((x: Listing) => ({ property_id: (x as any).id, score: scoreSimilarity(seed, x) }));
    return { items: ranked };
  },
};

// ---------- NETWORK IMPLEMENTATION (only used if USE_MOCK_API === false) ----------
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
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-api-key': API_KEY,
    'ngrok-skip-browser-warning': 'true',
    ...extra,
  };
}

function buildUrl(path: string, baseUrl: string = API_BASE_URL) {
  return `${baseUrl}${path}`;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchJSON(path: string, init: RequestInit = {}) {
  const url = buildUrl(path);
  const res = await fetchWithTimeout(url, {
    ...init,
    headers: getHeaders(init.headers ?? {}),
  });

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const body = await res.text();
    throw new APIError(
      'Server returned unexpected response format (expected JSON)',
      res.status,
      'INVALID_RESPONSE_FORMAT',
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
}

const networkApi = {
  health: () => fetchJSON(API_ENDPOINTS.health),
  post: <T>(path: string, body: any) => fetchJSON(path, { method: 'POST', body: JSON.stringify(body) }),
  get: <T>(path: string, params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return fetchJSON(`${path}${qs}`);
  },
  predict: (payload: any) => fetchJSON(API_ENDPOINTS.predictPrice, { method: 'POST', body: JSON.stringify(payload) }),
  createListing: (payload: any) =>
    fetchJSON(API_ENDPOINTS.createListing, { method: 'POST', body: JSON.stringify(payload) }),
  getListing: (id: string) => fetchJSON(API_ENDPOINTS.listing(encodeURIComponent(id))),
  suggestFuzzy: ({ field, q, limit = 10 }: { field: string; q: string; limit?: number }) =>
    fetchJSON(`${API_ENDPOINTS.suggestFuzzy}?field=${encodeURIComponent(field)}&q=${encodeURIComponent(q)}&limit=${limit}`),
  recLive: (payload: any) =>
    fetchJSON(API_ENDPOINTS.recommendByPropertyLive, { method: 'POST', body: JSON.stringify(payload) }),
  recWithinLive: (payload: any) =>
    fetchJSON(API_ENDPOINTS.recommendWithinFiltersLive, { method: 'POST', body: JSON.stringify(payload) }),
  recByAttributes: (payload: any) =>
    fetchJSON(API_ENDPOINTS.recommendByAttributes, { method: 'POST', body: JSON.stringify(payload) }),
  recWithinFiltersByAttributes: (payload: any) =>
    fetchJSON(API_ENDPOINTS.recommendWithinFiltersByAttributes, { method: 'POST', body: JSON.stringify(payload) }),
};

// Select implementation
export const api = USE_MOCK_API ? mockApi : networkApi;

// Legacy helper (kept for compatibility)
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<T> {
  if (USE_MOCK_API) return {} as T;
  if (skipAuth) {
    return fetchJSON(endpoint, { ...options, headers: {} });
  }
  return fetchJSON(endpoint, options);
}