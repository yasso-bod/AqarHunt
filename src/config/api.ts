// API Configuration - to be updated when backend is ready
export const API_BASE_URL = process.env.VITE_API_BASE_URL || '';
export const API_KEY = process.env.VITE_API_KEY || '';

// Mock API endpoints for future integration
export const API_ENDPOINTS = {
  health: '/health',
  search: '/search',
  suggest: '/suggest',
  suggestFuzzy: '/suggest_fuzzy',
  predictPrice: '/predict_price',
  predictPriceBatch: '/predict_price/batch',
  createListing: '/listings/create',
  getListing: '/listings',
  recommendByProperty: '/recommend/by_property',
  recommendByPropertyLive: '/recommend/by_property_live',
  recommendWithinFilters: '/recommend/within_filters',
  recommendWithinFiltersLive: '/recommend/within_filters_live',
} as const;