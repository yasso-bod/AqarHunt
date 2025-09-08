import { api } from '../utils/api';
import { Listing } from '../types';

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

function titleCase(s?: string) {
  if (!s) return s;
  return s.toLowerCase().replace(/\b\w/g, m => m.toUpperCase());
}

function normalizeFilters(filters: SearchFilters & { limit?: number; page?: number }) {
  const out: any = {};
  const add = (k: string, v: any) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'string' && v.trim() === '') return;
    out[k] = v;
  };

  add('city', filters.city?.trim());
  add('town', filters.town?.trim());
  add('district_compound', filters.district_compound?.trim());

  const num = (x: any) => (x === '' || x == null ? undefined : Number(x));
  const int = (x: any) => (x === '' || x == null ? undefined : parseInt(String(x), 10));

  add('price_min', num(filters.price_min));
  add('price_max', num(filters.price_max));
  add('size_min', num(filters.size_min));
  add('size_max', num(filters.size_max));
  add('bedrooms_min', int(filters.bedrooms_min));
  add('bathrooms_min', int(filters.bathrooms_min));

  if (filters.property_type) {
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
    add('property_type', map[filters.property_type.toLowerCase()] || titleCase(filters.property_type));
  }

  if (filters.furnished !== undefined) {
    if (typeof filters.furnished === 'boolean') add('furnished', filters.furnished ? 'Yes' : 'No');
    else add('furnished', filters.furnished);
  }

  if (filters.offering_type) add('offering_type', titleCase(filters.offering_type));

  add('limit', filters.limit || 30);
  add('page', filters.page || 1);
  return out;
}

export interface SearchResponse {
  items: Listing[];
  page: number;
  limit: number;
  count: number;
}

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
  return api.get<Listing>(`/listings/${id}`);
}

export async function getRecommendationsByPropertyLive(propertyId: string, topK = 10): Promise<Listing[]> {
  const response = await api.recLive({ property_id: propertyId, top_k: topK });
  const ids = (response.items || []).map((it: any) => String(it.property_id));
  const details = await Promise.all(ids.map((id: string) => getListing(id).catch(() => null)));
  return details.filter(Boolean) as Listing[];
}

export async function getRecommendationsWithinFiltersLive(
  propertyId: string,
  filters: SearchFilters,
  topK = 10
): Promise<Listing[]> {
  const response = await api.recWithinLive({ property_id: propertyId, top_k: topK, filters });
  const ids = (response.items || []).map((it: any) => String(it.property_id));
  const details = await Promise.all(ids.map((id: string) => getListing(id).catch(() => null)));
  return details.filter(Boolean) as Listing[];
}

// (Optional) keep these if used elsewhere
export async function healthCheck(): Promise<{ status: string; version: string }> {
  return api.health();
}
