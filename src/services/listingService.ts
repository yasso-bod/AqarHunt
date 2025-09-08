import { api } from '../utils/api';
import { Listing, SearchFilters } from '../types';

// ---------- helpers ----------
function titleCase(s?: string) {
  if (!s) return s;
  return s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}

function dedupeListings(list: Listing[]) {
  const seen = new Set<string>();
  const out: Listing[] = [];
  for (const x of list) {
    const id = String(x.id);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(x);
    }
  }
  return out;
}

export function rankByCloseness(seed: Partial<Listing>, arr: Listing[]) {
  const sBeds = Number(seed.bedrooms) || 0;
  const sBaths = Number(seed.bathrooms) || 0;
  const sSize = Number(seed.size) || 0;
  const sType = String(seed.property_type || '').toLowerCase();
  const sCity = (seed.city || '').toLowerCase();
  const sTown = (seed.town || '').toLowerCase();

  const score = (x: Listing) => {
    const xCity = (x.city || '').toLowerCase();
    const xTown = (x.town || '').toLowerCase();
    const xType = String(x.property_type || '').toLowerCase();
    const loc = (xCity === sCity ? 8 : 0) + (xTown === sTown ? 8 : 0);
    const typ = xType === sType ? 6 : 0;
    const beds = -Math.abs((Number(x.bedrooms) || 0) - sBeds) * 2;
    const baths = -Math.abs((Number(x.bathrooms) || 0) - sBaths) * 1.5;
    const size =
      sSize > 0
        ? -Math.min(10, Math.abs((Number(x.size) || 0) - sSize) / (sSize * 0.1))
        : 0;
    return loc + typ + beds + baths + size;
  };

  return [...arr].sort((a, b) => score(b) - score(a));
}

function normalizeFilters(filters: SearchFilters & { limit?: number; page?: number }) {
  const out: any = {};
  const add = (k: string, v: any) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'string' && v.trim() === '') return;
    out[k] = v;
  };

  // location
  add('city', filters.city?.trim());
  add('town', filters.town?.trim());
  add('district_compound', filters.district_compound?.trim());

  // numerics
  const toNumber = (x: any) =>
    x === '' || x === undefined || x === null ? undefined : Number(x);
  const toInt = (x: any) =>
    x === '' || x === undefined || x === null ? undefined : parseInt(String(x), 10);

  add('price_min', toNumber(filters.price_min));
  add('price_max', toNumber(filters.price_max));
  add('size_min', toNumber(filters.size_min));
  add('size_max', toNumber(filters.size_max));
  add('bedrooms_min', toInt(filters.bedrooms_min));
  add('bathrooms_min', toInt(filters.bathrooms_min));

  // property type
  if (filters.property_type) {
    const normalizedType = filters.property_type.toLowerCase();
    const map: Record<string, string> = {
      apartment: 'Apartment',
      villa: 'Villa',
      studio: 'Studio',
      townhouse: 'Townhouse',
      penthouse: 'Penthouse',
      duplex: 'Duplex',
      chalet: 'Chalet',
      twin_house: 'Twin House',
      standalone_villa: 'Standalone Villa',
    };
    add('property_type', map[normalizedType] || titleCase(filters.property_type));
  }

  // furnished
  if (filters.furnished !== undefined) {
    if (typeof filters.furnished === 'boolean') {
      add('furnished', filters.furnished ? 'Yes' : 'No');
    } else {
      add('furnished', filters.furnished);
    }
  }

  // offering
  if (filters.offering_type) {
    add('offering_type', titleCase(filters.offering_type));
  }

  add('limit', filters.limit || 30);
  add('page', filters.page || 1);
  return out;
}

// ---------- API types ----------
export interface SearchResponse {
  items: Listing[];
  page: number;
  limit: number;
  count: number;
}
export interface PricePredictionResponse {
  predicted_price_egp: number;
  model_version: string;
}
export interface CreateListingResponse {
  id: string;
  estimated_price_egp: number;
  final_price_saved: number;
  used_asking_price: boolean;
}

// ---------- Search ----------
export async function searchListings(
  filters: SearchFilters & { limit?: number; page?: number } = {},
  page?: number,
  limit?: number
): Promise<SearchResponse> {
  const searchParams = {
    ...filters,
    page: page || filters.page || 1,
    limit: limit || filters.limit || 30,
  };
  const normalizedPayload = normalizeFilters(searchParams);
  return api.post<SearchResponse>('/search', normalizedPayload);
}

export async function getListing(id: string): Promise<Listing> {
  return api.get<Listing>(`/listings/${encodeURIComponent(id)}`);
}

// ---------- Suggestions (used by SearchBar) ----------
export async function getSuggestions(
  field: 'city' | 'town' | 'district_compound',
  query: string,
  limit = 10
): Promise<string[]> {
  const params = { field, q: query, limit: String(limit) };
  const res = await api.get<{ items: string[] }>('/suggest', params);
  return res.items || [];
}

export async function getSingleFieldSuggestions(
  field: 'city' | 'town' | 'district_compound',
  query: string,
  limit = 10
): Promise<string[]> {
  if (!query.trim()) return [];
  const params = { field, q: query, limit: String(limit) };
  const res = await api.get<{ items: string[] }>('/suggest_fuzzy', params);
  const suggestions = res.items || [];
  return suggestions.sort((a, b) => {
    const q = query.toLowerCase();
    const aL = a.toLowerCase();
    const bL = b.toLowerCase();
    const aExact = aL === q;
    const bExact = bL === q;
    if (aExact !== bExact) return aExact ? -1 : 1;
    const aStarts = aL.startsWith(q);
    const bStarts = bL.startsWith(q);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return 0;
  });
}

export async function getOmniSuggestions(
  query: string,
  limit = 10
): Promise<{ field: 'city' | 'town' | 'district_compound'; value: string }[]> {
  if (!query.trim()) return [];
  const [c, t, d] = await Promise.allSettled([
    getSingleFieldSuggestions('city', query, 5),
    getSingleFieldSuggestions('town', query, 5),
    getSingleFieldSuggestions('district_compound', query, 5),
  ]);

  const out: { field: 'city' | 'town' | 'district_compound'; value: string }[] = [];
  if (c.status === 'fulfilled') c.value.forEach((v) => out.push({ field: 'city', value: v }));
  if (t.status === 'fulfilled') t.value.forEach((v) => out.push({ field: 'town', value: v }));
  if (d.status === 'fulfilled') d.value.forEach((v) => out.push({ field: 'district_compound', value: v }));

  const seen = new Set<string>();
  const deduped = out.filter((x) => {
    const k = `${x.field}:${x.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return deduped.slice(0, limit);
}

// ---------- Price prediction & create listing (needed by EstimateModal / CreateListing) ----------
export async function predictPrice(data: {
  city: string;
  town: string;
  district_compound: string;
  property_type: string;
  furnishing: string;          // NOTE: "furnishing" for /predict_price
  completion_status: string;
  offering_type: string;       // "Sale" | "Rent"
  bedrooms: number;
  bathrooms: number;
  size: number;
  lat: number;
  lon: number;
  down_payment_price?: number;
}): Promise<PricePredictionResponse> {
  // Validate offering_type early (common source of server 4xx)
  const ot = (data.offering_type || '').toLowerCase();
  if (ot !== 'sale' && ot !== 'rent') {
    throw new Error('Offering type must be either "Sale" or "Rent"');
  }
  return api.predict(data);
}

export async function createListing(data: {
  property_type: string;
  city: string;
  town: string;
  district_compound: string;
  completion_status: string;
  offering_type: string;
  furnished: string;           // NOTE: "furnished" for /listings/create
  lat: number;
  lon: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  down_payment_price?: number;
  price?: number;
}): Promise<CreateListingResponse> {
  return api.createListing(data);
}

// ---------- Recommendations ----------
export async function getRecommendationsByPropertyLive(
  propertyId: string,
  topK = 10
): Promise<Listing[]> {
  const response = await api.recLive({ property_id: propertyId, top_k: topK });
  const ids: string[] = (response?.items || []).map((x: any) => String(x.property_id));
  if (!ids.length) return [];
  const details = await Promise.all(ids.map((id) => getListing(id).catch(() => null)));
  return details.filter(Boolean) as Listing[];
}

export async function getRecommendationsWithinFiltersLive(
  propertyId: string,
  filters: SearchFilters,
  topK = 10
): Promise<Listing[]> {
  const response = await api.recWithinLive({ property_id: propertyId, top_k: topK, filters });
  const ids: string[] = (response?.items || []).map((x: any) => String(x.property_id));
  if (!ids.length) return [];
  const details = await Promise.all(ids.map((id) => getListing(id).catch(() => null)));
  return details.filter(Boolean) as Listing[];
}

// ---------- Rails helpers ----------
export async function getSimilarFromSeeds(seeds: string[], perSeed = 6, maxTotal = 12) {
  const out: Listing[] = [];
  for (const seed of seeds.slice(0, 4)) {
    const sims = await getRecommendationsByPropertyLive(seed, perSeed);
    out.push(...sims);
    if (out.length >= maxTotal) break;
  }
  return dedupeListings(out).slice(0, maxTotal);
}

export async function getTrendingNear(city?: string, town?: string, limit = 12) {
  const res = await searchListings({
    city,
    town,
    limit,
    page: 1,
  });
  return res.items || [];
}
