export interface Listing {
  id: string;
  property_type: 'apartment' | 'villa' | 'studio' | 'townhouse' | 'penthouse';
  city: string;
  town: string;
  district_compound: string;
  price?: number;
  estimated_price?: number;
  bedrooms: number;
  bathrooms: number;
  size: number; // in m²
  lat: number;
  lon: number;
  created_at?: string;
  images?: string[];
  furnished?: boolean;
  offering_type: 'sale' | 'rent';
  completion_status: 'ready' | 'under_construction' | 'off_plan';
  down_payment?: number;
  verified?: boolean;
}

export interface SearchFilters {
  city?: string;
  town?: string;
  district_compound?: string;
  price_min?: number;
  price_max?: number;
  size_min?: number;
  size_max?: number;
  bedrooms_min?: number;
  bathrooms_min?: number;
  property_type?: string;
  furnished?: boolean;
  offering_type?: 'sale' | 'rent';
}

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'size_asc' | 'size_desc';

export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark' | 'auto';

export interface AppState {
  language: Language;
  theme: Theme;
  savedListings: string[];
  searchFilters: SearchFilters;
  sortBy: SortOption;
}