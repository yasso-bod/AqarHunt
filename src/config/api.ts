// FRONTEND-ONLY SWITCH
// When true, the app runs entirely on mock data (no network calls).
// Your friend can flip this to false and fill API_BASE_URL to use a real .NET backend.
export const USE_MOCK_API = true;

// Used ONLY when USE_MOCK_API === false
export const API_BASE_URL = 'http://localhost:5000';
export const API_KEY = '';

export const API_ENDPOINTS = {
  health: '/health',
  search: '/search',
  suggest: '/suggest',
  suggestFuzzy: '/suggest_fuzzy',
  listing: (id: string | number) => /listings/${id},
  predictPrice: '/predict_price',
  predictPriceBatch: '/predict_price/batch',
  createListing: '/listings/create',
  getListing: '/listings',
  recommendByProperty: '/recommend/by_property',
  recommendByPropertyLive: '/recommend/by_property_live',
  recommendWithinFilters: '/recommend/within_filters',
  recommendWithinFiltersLive: '/recommend/within_filters_live',
  recommendByAttributes: '/recommend/by_attributes',
  recommendWithinFiltersByAttributes: '/recommend/within_filters_by_attributes',
} as const;

export const REQUEST_TIMEOUT = 30000;

export const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 5000,
};