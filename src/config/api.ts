// API Configuration
export const API_BASE_URL = 'https://5f0ace1b1dfe.ngrok-free.app';
export const API_KEY = 'secret123';

// API endpoints
export const API_ENDPOINTS = {
  health: '/health',
  search: '/search',
  suggest: '/suggest',
  suggestFuzzy: '/suggest_fuzzy',
  listing: (id: string | number) => `/listings/${id}`,
  predictPrice: '/predict_price',
  predictPriceBatch: '/predict_price/batch',
  createListing: '/listings/create',
  getListing: '/listings',
  recommendByProperty: '/recommend/by_property',
  recommendByPropertyLive: '/recommend/by_property_live',
  recommendWithinFilters: '/recommend/within_filters',
  recommendWithinFiltersLive: '/recommend/within_filters_live',
} as const;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 12000;

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelay: 1000, // 1 second
  maxDelay: 5000,  // 5 seconds
};

// Optional: keep history but DON'T export it
const _PREVIOUS_API_BASE_URLS = [
  'http://localhost:8000', // Local development
  'http://127.0.0.1:8000', // Alternative local
  'https://5f0ace1b1dfe.ngrok-free.app', // Previous ngrok URL (may be expired)
];