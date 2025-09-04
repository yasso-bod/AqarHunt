import { api } from '../utils/api';
import { Listing, SearchFilters } from '../types';

// Helper functions
function titleCase(s?: string) {
  if (!s) return s;
  return s.toLowerCase().replace(/\b\w/g, m => m.toUpperCase());
}

function normalizeFilters(filters: SearchFilters & { limit?: number; page?: number }) {
  const out: any = {};
  
  const add = (k: string, v: any) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    out[k] = v;
  };

  // Location filters
  add("city", filters.city?.trim());
  add("town", filters.town?.trim());
  add("district_compound", filters.district_compound?.trim());

  // Numeric filters
  const toNumber = (x: any) => (x === "" || x === undefined || x === null) ? undefined : Number(x);
  const toInt = (x: any) => (x === "" || x === undefined || x === null) ? undefined : parseInt(String(x), 10);

  add("price_min", toNumber(filters.price_min));
  add("price_max", toNumber(filters.price_max));
  add("bedrooms_min", toInt(filters.bedrooms_min));
  add("bathrooms_min", toInt(filters.bathrooms_min));

  // Property type - normalize to TitleCase
  if (filters.property_type) {
    // Ensure property type is exactly as expected by API
    const normalizedType = filters.property_type.toLowerCase();
    const propertyTypeMap: { [key: string]: string } = {
      'apartment': 'Apartment',
      'villa': 'Villa', 
      'studio': 'Studio',
      'townhouse': 'Townhouse',
      'penthouse': 'Penthouse',
      'duplex': 'Duplex',
      'chalet': 'Chalet'
    };
    add("property_type", propertyTypeMap[normalizedType] || titleCase(filters.property_type));
  }

  // Furnished - normalize to proper format
  if (filters.furnished !== undefined) {
    if (typeof filters.furnished === 'boolean') {
      add("furnished", filters.furnished ? "Furnished" : "No");
    } else {
      add("furnished", filters.furnished);
    }
  }

  // Offering type - normalize to TitleCase
  if (filters.offering_type) {
    add("offering_type", titleCase(filters.offering_type));
  }

  // Pagination
  add("limit", filters.limit || 30);
  add("page", filters.page || 1);

  return out;
}

// API response types
export interface SearchResponse {
  items: Listing[];
  page: number;
  limit: number;
  count: number;
}

export interface SuggestionResponse {
  suggestions: string[];
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

export interface RecommendationResponse {
  items: Listing[];
}

// Search listings
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
  return api.post<SearchResponse>("/search", normalizedPayload);
}

// Get suggestions (exact match)
export async function getSuggestions(
  field: 'city' | 'town' | 'district_compound',
  query: string,
  limit = 10
): Promise<string[]> {
  const params = {
    field,
    q: query,
    limit: limit.toString(),
  };

  const response = await api.get<{ items: string[] }>("/suggest", params);
  return response.items || [];
}

// Get fuzzy suggestions (typo-tolerant)
export async function getSingleFieldSuggestions(
  field: 'city' | 'town' | 'district_compound',
  query: string,
  limit = 10
): Promise<string[]> {
  const params = {
    field,
    q: query,
    limit: limit.toString(),
  };

  const response = await api.get<{ items: string[] }>("/suggest_fuzzy", params);
  return response.items || [];
}

// Omni-search: search across all fields simultaneously
export async function getOmniSuggestions(
  query: string,
  limit = 10
): Promise<{ field: 'city' | 'town' | 'district_compound'; value: string }[]> {
  if (!query.trim()) return [];
  
  try {
    // Call all three endpoints in parallel
    const [cityResults, townResults, compoundResults] = await Promise.allSettled([
      getSingleFieldSuggestions('city', query, 5),
      getSingleFieldSuggestions('town', query, 5),
      getSingleFieldSuggestions('district_compound', query, 5),
    ]);
    
    const suggestions: { field: 'city' | 'town' | 'district_compound'; value: string }[] = [];
    
    // Add city suggestions
    if (cityResults.status === 'fulfilled') {
      cityResults.value.forEach(city => {
        suggestions.push({ field: 'city', value: city });
      });
    }
    
    // Add town suggestions
    if (townResults.status === 'fulfilled') {
      townResults.value.forEach(town => {
        suggestions.push({ field: 'town', value: town });
      });
    }
    
    // Add compound suggestions
    if (compoundResults.status === 'fulfilled') {
      compoundResults.value.forEach(compound => {
        suggestions.push({ field: 'district_compound', value: compound });
      });
    }
    
    // Dedupe and limit
    const seen = new Set<string>();
    const deduped = suggestions.filter(item => {
      const key = `${item.field}:${item.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    return deduped.slice(0, limit);
  } catch (error) {
    console.error('Failed to get omni suggestions:', error);
    return [];
  }
}

// Get single listing by ID
export async function getListing(id: string): Promise<Listing> {
  return api.get<Listing>(`/listings/${id}`);
}

// Predict price
export async function predictPrice(data: {
  city: string;
  town: string;
  district_compound: string;
  property_type: string;
  furnishing: string; // Note: "furnishing" for predict_price
  completion_status: string;
  offering_type: string;
  bedrooms: number;
  bathrooms: number;
  size: number;
  lat: number;
  lon: number;
  down_payment_price?: number;
}): Promise<PricePredictionResponse> {
  return api.predict(data);
}

// Create listing
export async function createListing(data: {
  property_type: string;
  city: string;
  town: string;
  district_compound: string;
  completion_status: string;
  offering_type: string;
  furnished: string; // Note: "furnished" for listings/create
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

// Get recommendations by property (live)
export async function getRecommendationsByPropertyLive(
  propertyId: string,
  topK = 10
): Promise<Listing[]> {
  const response = await api.recLive({ property_id: propertyId, top_k: topK });
  return response.items || [];
}

// Get recommendations within filters (live)
export async function getRecommendationsWithinFiltersLive(
  propertyId: string,
  filters: SearchFilters,
  topK = 10
): Promise<Listing[]> {
  const response = await api.recWithinLive({ property_id: propertyId, top_k: topK, filters });
  return response.items || [];
}

// Get recommendations by attributes
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
): Promise<Listing[]> {
  const response = await api.recByAttributes({ ...attributes, top_k: topK });
  
  // Extract property IDs from recommendation response
  const propertyIds = response.items?.map((item: any) => String(item.property_id)) || [];
  
  if (propertyIds.length === 0) {
    return [];
  }
  
  // Fetch full listing details for each recommended property
  const detailsPromises = propertyIds.map(async (id: string) => {
    try {
      return await getListing(id);
    } catch (error) {
      console.warn(`Failed to load details for listing ${id}:`, error);
      return null;
    }
  });
  
  const fullListings = await Promise.all(detailsPromises);
  return fullListings.filter(Boolean) as Listing[];
}

// Get recommendations by attributes within filters
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
): Promise<Listing[]> {
  const response = await api.recWithinFiltersByAttributes({ ...attributes, filters, top_k: topK });
  
  // Extract property IDs from recommendation response
  const propertyIds = response.items?.map((item: any) => String(item.property_id)) || [];
  
  if (propertyIds.length === 0) {
    return [];
  }
  
  // Fetch full listing details for each recommended property
  const detailsPromises = propertyIds.map(async (id: string) => {
    try {
      return await getListing(id);
    } catch (error) {
      console.warn(`Failed to load details for listing ${id}:`, error);
      return null;
    }
  });
  
  const fullListings = await Promise.all(detailsPromises);
  return fullListings.filter(Boolean) as Listing[];
}

// Health check
export async function healthCheck(): Promise<{ status: string; version: string }> {
  return api.health();
}