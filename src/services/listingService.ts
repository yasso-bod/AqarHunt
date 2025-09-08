import { USE_MOCK_API } from '../config/api';
import { mockListings } from '../data/mockListings';
import { Listing } from '../types';
import { api } from '../utils/api';

export type SearchFilters = {
  city?: string;
  town?: string;
  district_compound?: string;
  property_type?: string;
  price_min?: number;
  price_max?: number;
  size_min?: number;
  size_max?: number;
  bedrooms_min?: number;
  bathrooms_min?: number;
  furnished?: 'Yes' | 'No' | string;
  offering_type?: 'Sale' | 'Rent' | string;
  limit?: number;
  page?: number;
};

function normalizeYN(v: any) {
  const s = String(v ?? '').toLowerCase();
  if (!s) return '';
  if (['yes', 'y', 'true', 'furnished'].includes(s)) return 'yes';
  if (['no', 'n', 'false', 'unfurnished'].includes(s)) return 'no';
  return s;
}

function applyFilters(list: Listing[], f: SearchFilters = {}) {
  return list.filter((x) => {
    if (f.city && String(x.city) !== String(f.city)) return false;
    if (f.town && String(x.town) !== String(f.town)) return false;
    if (f.district_compound && String(x.district_compound || '') !== String(f.district_compound)) return false;
    if (f.property_type && String(x.property_type) !== String(f.property_type)) return false;

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
      const have = normalizeYN(x.furnished ?? (x as any).furnishing ?? '');
      if (have && have !== normalizeYN(f.furnished)) return false;
    }
    if (f.offering_type && String(x.offering_type || '').toLowerCase() !== String(f.offering_type).toLowerCase()) {
      return false;
    }
    return true;
  });
}

// ---------- search ----------
export async function searchListings(
  filters: SearchFilters = {},
  page?: number,
  limit?: number
) {
  const p = Number(page || filters.page || 1);
  const l = Number(limit || filters.limit || 20);

  if (USE_MOCK_API) {
    const filtered = applyFilters(mockListings as any, filters);
    const start = (p - 1) * l;
    const items = filtered.slice(start, start + l);
    return { items, total: filtered.length, page: p, limit: l };
  }

  const res = await api.post<any>('/search', { ...filters, page: p, limit: l });
  return res;
}

// ---------- suggestions ----------
export async function getSingleFieldSuggestions(
  field: 'city' | 'town' | 'district_compound',
  query: string,
  limit = 10
): Promise<string[]> {
  if (USE_MOCK_API) {
    const values = Array.from(
      new Set(
        (mockListings as any)
          .map((m: any) => String(m[field] || '').trim())
          .filter(Boolean)
      )
    );
    const qq = query.toLowerCase();
    const starts = values.filter((v) => v.toLowerCase().startsWith(qq));
    const contains = values.filter(
      (v) => !v.toLowerCase().startsWith(qq) && v.toLowerCase().includes(qq)
    );
    return [...starts, ...contains].slice(0, limit);
  }

  const params = { field, q: query, limit: String(limit) };
  const res = await api.get<{ items: string[] }>('/suggest_fuzzy', params);
  return res.items || [];
}

export async function getOmniSuggestions(
  query: string,
  limit = 10
): Promise<{ field: 'city' | 'town' | 'district_compound'; value: string }[]> {
  const [c, t, d] = await Promise.all([
    getSingleFieldSuggestions('city', query, limit),
    getSingleFieldSuggestions('town', query, limit),
    getSingleFieldSuggestions('district_compound', query, limit),
  ]);
  const out: { field: 'city' | 'town' | 'district_compound'; value: string }[] = [];
  c.forEach((v) => out.push({ field: 'city', value: v }));
  t.forEach((v) => out.push({ field: 'town', value: v }));
  d.forEach((v) => out.push({ field: 'district_compound', value: v }));
  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x.field + ':' + x.value) ? false : (seen.add(x.field + ':' + x.value), true)));
}

// ---------- single listing ----------
export async function getListing(id: string) {
  if (USE_MOCK_API) {
    const found = (mockListings as any).find((x: any) => String(x.id) === String(id));
    if (!found) throw new Error('Listing not found');
    return found as Listing;
  }
  return api.getListing(id);
}

// ---------- price prediction ----------
export async function predictPrice(data: {
  city: string;
  town: string;
  district_compound: string;
  property_type: string;
  furnishing: string;
  completion_status: string;
  offering_type: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  lat: number;
  lon: number;
  down_payment_price?: number;
}) {
  if (USE_MOCK_API) {
    const size = Number(data.size) || 100;
    const br = Number(data.bedrooms) || 2;
    const base = 20000;
    const price = Math.round(size * base * (1 + br * 0.05));
    return { price };
  }
  return api.predict(data);
}

// ---------- create listing ----------
export async function createListing(payload: Partial<Listing>) {
  if (USE_MOCK_API) {
    const id = String(
      ((mockListings as any).reduce((m: number, x: any) => Math.max(m, Number(x.id) || 0), 0) || 1000) + 1
    );
    const listing = { ...payload, id } as Listing;
    (mockListings as any).push(listing);
    return listing;
  }
  return api.createListing(payload);
}

// ---------- recommendations helpers ----------
async function inflateIds(ids: string[]) {
  const details = await Promise.all(ids.map((id) => getListing(id).catch(() => null)));
  return details.filter(Boolean) as Listing[];
}

// ---------- recs: by property (live) ----------
export async function getRecommendationsByPropertyLive(propertyId: string, topK = 10) {
  const res = await api.recLive({ property_id: propertyId, top_k: topK });
  const ids = (res?.items || []).map((x: any) => String(x.property_id));
  if (!ids.length) return [];
  return inflateIds(ids);
}

// ---------- recs: within filters (live) ----------
export async function getRecommendationsWithinFiltersLive(
  propertyId: string,
  filters: SearchFilters,
  topK = 10
) {
  const res = await api.recWithinLive({ property_id: propertyId, top_k: topK, filters });
  const ids = (res?.items || []).map((x: any) => String(x.property_id));
  if (!ids.length) return [];
  return inflateIds(ids);
}

// ---------- recs: by attributes ----------
export async function getRecommendationsByAttributes(
  attributes: {
    property_type?: string;
    city?: string;
    town?: string;
    district_compound?: string;
    bedrooms?: number;
    bathrooms?: number;
    size?: number;
    offering_type?: string;
    completion_status?: string;
    furnished?: string;
  },
  topK = 10
) {
  const res = await api.recByAttributes({ ...attributes, top_k: topK });
  const ids = (res?.items || []).map((x: any) => String(x.property_id));
  if (!ids.length) return [];
  return inflateIds(ids);
}

// ---------- recs: by attributes within filters ----------
export async function getRecommendationsByAttributesWithinFilters(
  attributes: {
    property_type?: string;
    city?: string;
    town?: string;
    district_compound?: string;
    bedrooms?: number;
    bathrooms?: number;
    size?: number;
    offering_type?: string;
    completion_status?: string;
    furnished?: string;
  },
  filters: SearchFilters,
  topK = 10
) {
  const res = await api.recWithinFiltersByAttributes({ ...attributes, filters, top_k: topK });
  const ids = (res?.items || []).map((x: any) => String(x.property_id));
  if (!ids.length) return [];
  return inflateIds(ids);
}

// ---------- health ----------
export async function healthCheck() {
  return api.health();
}