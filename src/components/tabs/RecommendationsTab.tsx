import React, { useState } from 'react';
import { Stars, Sparkles, Filter, Grid3X3, Grid2X2, LayoutGrid, List, Building2, Edit3, Sparkles as WandSparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ListingCard } from '../listing/ListingCard';
import { EmptyState } from '../ui/EmptyState';
import { EstimateModal } from '../modals/EstimateModal';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { getListing, searchListings, getRecommendationsByAttributes, getRecommendationsByAttributesWithinFilters, getSingleFieldSuggestions, SearchFilters } from '../../services/listingService';
import { api } from '../../utils/api';
import { useToast } from '../ui/Toast';
import { Listing } from '../../types';

interface RecommendationsTabProps {
  onViewListing: (listingId: string) => void;
}

type ViewMode = 'large' | 'medium' | 'small' | 'list';
type RecommendationMode = 'existing' | 'attributes';

export function RecommendationsTab({ onViewListing }: RecommendationsTabProps) {
  const { state } = useApp();
  const { showToast } = useToast();
  const [mode, setMode] = useState<RecommendationMode>('existing');
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [recommendationType, setRecommendationType] = useState<'similar' | 'filtered' | null>(null);
  const [recommendations, setRecommendations] = useState<Listing[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('medium');
  const [availableListings, setAvailableListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingListings, setLoadingListings] = useState(true);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  // Recommendations-specific filters (isolated from other tabs)
  const [recsFilters, setRecsFilters] = useState<SearchFilters>({});
  
  // Attributes recommendation type
  const [attributesRecommendationType, setAttributesRecommendationType] = useState<'similar' | 'filtered'>('similar');
  
  // Attributes form state
  const [attributesForm, setAttributesForm] = useState({
    property_type: 'apartment',
    city: '',
    town: '',
    district_compound: '',
    bedrooms: 2,
    bathrooms: 1,
    size: 100,
    offering_type: 'sale',
    completion_status: 'ready',
    furnished: false,
    price: '',
  });

  // Autosave draft for "Describe Your Property"
  const DRAFT_KEY = 'draft.recs.describe.v1';
  const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  // Debounced save to localStorage
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const draftData = {
        data: attributesForm,
        savedAt: Date.now()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }, 300);

    return () => clearTimeout(timer);
  }, [attributesForm]);

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    
    try {
      const { data, savedAt } = JSON.parse(raw);
      if (Date.now() - savedAt < DRAFT_TTL) {
        setAttributesForm(data);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (error) {
      console.warn('Failed to parse draft data:', error);
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);
  const viewOptions = [
    { mode: 'large' as ViewMode, icon: Grid2X2, cols: 'grid-cols-1 sm:grid-cols-2' },
    { mode: 'medium' as ViewMode, icon: LayoutGrid, cols: 'grid-cols-2 sm:grid-cols-3' },
    { mode: 'small' as ViewMode, icon: Grid3X3, cols: 'grid-cols-2 sm:grid-cols-4' },
    { mode: 'list' as ViewMode, icon: List, cols: 'grid-cols-1' },
  ];

  // ESC key handler for attributes form
  React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mode === 'attributes') {
        // Just close the form, don't clear draft
        setMode('existing');
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [mode]);

  // Load available listings for the dropdown
  React.useEffect(() => {
    loadAvailableListings();
  }, []);

  const loadAvailableListings = async () => {
    try {
      setLoadingListings(true);
      const response = await searchListings({ limit: 50, page: 1 });
      setAvailableListings(response.items);
    } catch (error) {
      console.error('Failed to load available listings:', error);
      showToast({
        type: 'error',
        title: 'Failed to load listings',
        message: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setLoadingListings(false);
    }
  };

  const handleGetRecommendations = async (type: 'similar' | 'filtered') => {
    if (!selectedListingId) return;
    
    try {
      setLoading(true);
      setRecommendationType(type);
      
      if (type === 'similar') {
        const recResponse = await api.recLive({ property_id: selectedListingId, top_k: 10 });
        
        // Extract property IDs from recommendation response
        const propertyIds = recResponse.items?.map((item: any) => String(item.property_id)) || [];
        
        if (propertyIds.length === 0) {
          setRecommendations([]);
          return;
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
        const validListings = fullListings.filter(Boolean) as Listing[];
        setRecommendations(validListings);
      } else {
        // Build proper filters object from current search filters
        const filters: any = {};
        
        // Only include filters that are actually set
        if (recsFilters.city) filters.city = recsFilters.city;
        if (recsFilters.town) filters.town = recsFilters.town;
        if (recsFilters.district_compound) filters.district_compound = recsFilters.district_compound;
        if (recsFilters.price_min !== undefined) filters.price_min = recsFilters.price_min;
        if (recsFilters.price_max !== undefined) filters.price_max = recsFilters.price_max;
        if (recsFilters.bedrooms_min !== undefined) filters.bedrooms_min = recsFilters.bedrooms_min;
        if (recsFilters.bathrooms_min !== undefined) filters.bathrooms_min = recsFilters.bathrooms_min;
        if (recsFilters.property_type) filters.property_type = recsFilters.property_type.charAt(0).toUpperCase() + recsFilters.property_type.slice(1);
        if (recsFilters.furnished !== undefined) filters.furnished = recsFilters.furnished ? 'Yes' : 'No';
        if (recsFilters.offering_type) filters.offering_type = recsFilters.offering_type.charAt(0).toUpperCase() + recsFilters.offering_type.slice(1);
        
        console.log('Sending filters to /recommend/within_filters_live:', { property_id: selectedListingId, top_k: 10, filters });
        
        const recResponse = await api.recWithinLive({ 
          property_id: selectedListingId, 
          top_k: 10, 
          filters 
        });
        
        console.log('Received response from /recommend/within_filters_live:', recResponse);
        
        // Extract property IDs from recommendation response
        const propertyIds = recResponse.items?.map((item: any) => String(item.property_id)) || [];
        
        if (propertyIds.length === 0) {
          setRecommendations([]);
          showToast({
            type: 'info',
            title: 'No results under current filters',
            message: 'Try relaxing your search filters or use "Similar Properties" instead.',
          });
          return;
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
        const validListings = fullListings.filter(Boolean) as Listing[];
        setRecommendations(validListings);
      }
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      showToast({
        type: 'error',
        title: 'Failed to get recommendations',
        message: error instanceof Error ? error.message : 'Please try again later',
      });
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendationsByAttributes = async () => {
    try {
      setLoading(true);
      setRecommendationType(attributesRecommendationType);
      
      // Step 1: Enhanced location normalization with strict validation
      console.log('=== NORMALIZING LOCATION INPUTS ===');
      const normalizedLocations: { city?: string; town?: string; district_compound?: string } = {};
      
      // Normalize city
      if (attributesForm.city.trim()) {
        try {
          const citySuggestions = await getSingleFieldSuggestions('city', attributesForm.city.trim(), 3);
          if (citySuggestions.length > 0) {
            // Prioritize exact matches, then starts-with matches
            const exactMatch = citySuggestions.find(city => 
              city.toLowerCase() === attributesForm.city.toLowerCase()
            );
            const startsWithMatch = citySuggestions.find(city => 
              city.toLowerCase().startsWith(attributesForm.city.toLowerCase())
            );
            normalizedLocations.city = exactMatch || startsWithMatch || citySuggestions[0];
            console.log(`City: "${attributesForm.city}" → "${normalizedLocations.city}"`);
          } else {
            console.log(`City: "${attributesForm.city}" → NO SUGGESTION, OMITTING`);
          }
        } catch (error) {
          console.warn('Failed to normalize city:', error);
        }
      }
      
      // Normalize town
      if (attributesForm.town.trim()) {
        try {
          const townSuggestions = await getSingleFieldSuggestions('town', attributesForm.town.trim(), 3);
          if (townSuggestions.length > 0) {
            // Prioritize exact matches, then starts-with matches
            const exactMatch = townSuggestions.find(town => 
              town.toLowerCase() === attributesForm.town.toLowerCase()
            );
            const startsWithMatch = townSuggestions.find(town => 
              town.toLowerCase().startsWith(attributesForm.town.toLowerCase())
            );
            normalizedLocations.town = exactMatch || startsWithMatch || townSuggestions[0];
            console.log(`Town: "${attributesForm.town}" → "${normalizedLocations.town}"`);
          } else {
            console.log(`Town: "${attributesForm.town}" → NO SUGGESTION, OMITTING`);
          }
        } catch (error) {
          console.warn('Failed to normalize town:', error);
        }
      }
      
      // Normalize district_compound
      if (attributesForm.district_compound.trim()) {
        try {
          const compoundSuggestions = await getSingleFieldSuggestions('district_compound', attributesForm.district_compound.trim(), 3);
          if (compoundSuggestions.length > 0) {
            // Prioritize exact matches, then starts-with matches
            const exactMatch = compoundSuggestions.find(compound => 
              compound.toLowerCase() === attributesForm.district_compound.toLowerCase()
            );
            const startsWithMatch = compoundSuggestions.find(compound => 
              compound.toLowerCase().startsWith(attributesForm.district_compound.toLowerCase())
            );
            normalizedLocations.district_compound = exactMatch || startsWithMatch || compoundSuggestions[0];
            console.log(`District/Compound: "${attributesForm.district_compound}" → "${normalizedLocations.district_compound}"`);
          } else {
            console.log(`District/Compound: "${attributesForm.district_compound}" → NO SUGGESTION, OMITTING`);
          }
        } catch (error) {
          console.warn('Failed to normalize district_compound:', error);
        }
      }
      
      // Step 2: Build comprehensive search filters with proper matching criteria
      const searchFilters: any = {
        // Location matching - highest priority
        ...(normalizedLocations.city && { city: normalizedLocations.city }),
        ...(normalizedLocations.town && { town: normalizedLocations.town }),
        ...(normalizedLocations.district_compound && { district_compound: normalizedLocations.district_compound }),
      };
      
      console.log('=== LOCATION FILTERS APPLIED ===');
      console.log('Location filters:', searchFilters);
      
      // Property type mapping to match API expectations
      const propertyTypeMap: { [key: string]: string } = {
        'apartment': 'Apartment',
        'villa': 'Villa',
        'penthouse': 'Penthouse',
        'chalet': 'Chalet',
        'studio': 'Studio',
        'duplex': 'Duplex',
        'townhouse': 'Townhouse',
        'twin_house': 'Twin House',
        'standalone_villa': 'Standalone Villa'
      };
      
      if (attributesForm.property_type) {
        searchFilters.property_type = propertyTypeMap[attributesForm.property_type] || 
          attributesForm.property_type.charAt(0).toUpperCase() + attributesForm.property_type.slice(1);
        console.log('Property type filter:', searchFilters.property_type);
      }
      
      // Enhanced numeric filters with proper ranges
      if (attributesForm.bedrooms && attributesForm.bedrooms > 0) {
        // Allow ±1 bedroom for flexibility
        searchFilters.bedrooms_min = Math.max(1, attributesForm.bedrooms - 1);
        console.log('Bedrooms filter:', searchFilters.bedrooms_min);
      }
      if (attributesForm.bathrooms && attributesForm.bathrooms > 0) {
        // Allow ±1 bathroom for flexibility
        searchFilters.bathrooms_min = Math.max(1, attributesForm.bathrooms - 1);
        console.log('Bathrooms filter:', searchFilters.bathrooms_min);
      }
      
      // Size range filter for better matching
      if (attributesForm.size && attributesForm.size > 0) {
        // Allow ±30% size variation
        searchFilters.size_min = Math.round(attributesForm.size * 0.7);
        searchFilters.size_max = Math.round(attributesForm.size * 1.3);
        console.log('Size range filter:', searchFilters.size_min, 'to', searchFilters.size_max);
      }
      
      // Price range filter with reasonable bounds
      if (attributesForm.price) {
        const price = Number(attributesForm.price);
        if (price > 0) {
          // Reasonable price range for better matching (±25%)
          searchFilters.price_min = Math.max(0, Math.round(price * 0.75));
          searchFilters.price_max = Math.round(price * 1.25);
          console.log('Price range filter:', searchFilters.price_min, 'to', searchFilters.price_max);
        }
      }
      
      console.log('=== FINAL SEARCH PAYLOAD ===');
      console.log('Exact /search payload:', JSON.stringify(searchFilters, null, 2));
      
      // Step 3: Smart seed property finding with progressive relaxation
      let seedPropertyId: string | null = null;
      let attempts = 0;
      const maxAttempts = 5; // More attempts for better matching
      let currentFilters = { ...searchFilters };
      
      while (!seedPropertyId && attempts < maxAttempts) {
        try {
          console.log(`=== SEARCH ATTEMPT ${attempts + 1} ===`);
          console.log('Filters:', JSON.stringify(currentFilters, null, 2));
          
          const searchResponse = await searchListings(currentFilters, 1, 20); // Get more results to increase chances
          
          console.log(`Found ${searchResponse.items.length} results`);
          if (searchResponse.items.length > 0) {
            console.log('First 3 seed candidates:');
            searchResponse.items.slice(0, 3).forEach((item, index) => {
              console.log(`${index + 1}. ID: ${item.id}, Type: ${item.property_type}, Location: ${item.city}, ${item.town}, Price: ${item.price}`);
            });
          }
          
          if (searchResponse.items.length > 0) {
            // Select best matching seed property based on multiple criteria
            const bestMatch = searchResponse.items.find(item => {
              // Prefer properties with similar characteristics
              const locationMatch = item.city === normalizedLocations.city && 
                                  item.town === normalizedLocations.town;
              const typeMatch = item.property_type === searchFilters.property_type;
              const priceInRange = !attributesForm.price || 
                                 (item.price && Math.abs(item.price - Number(attributesForm.price)) / Number(attributesForm.price) < 0.5);
              
              return locationMatch && (typeMatch || priceInRange);
            }) || searchResponse.items[0]; // Fallback to first result
            
            seedPropertyId = bestMatch.id;
            console.log('Selected seed property ID:', seedPropertyId);
            break;
          }
        } catch (error) {
          console.error(`Search attempt ${attempts + 1} failed:`, error);
        }
        
        attempts++;
        
        // Smart progressive relaxation strategy
        if (attempts === 1) {
          // Step 1: Remove district_compound (least important)
          if (currentFilters.district_compound) {
            delete currentFilters.district_compound;
          }
          console.log('Relaxation 1: Removed district_compound');
        } else if (attempts === 2) {
          // Step 2: Widen price range (±25% → ±40%)
          if (currentFilters.price_min && currentFilters.price_max) {
            const originalPrice = Number(attributesForm.price);
            currentFilters.price_min = Math.max(0, Math.round(originalPrice * 0.6));
            currentFilters.price_max = Math.round(originalPrice * 1.4);
          }
          // Widen size range (±30% → ±50%)
          if (currentFilters.size_min && currentFilters.size_max) {
            const originalSize = attributesForm.size;
            currentFilters.size_min = Math.round(originalSize * 0.5);
            currentFilters.size_max = Math.round(originalSize * 1.5);
          }
          console.log('Relaxation 2: Widened price and size ranges');
        } else if (attempts === 3) {
          // Step 3: Remove bedroom/bathroom constraints
          delete currentFilters.bedrooms_min;
          delete currentFilters.bathrooms_min;
          console.log('Relaxation 3: Removed bedroom/bathroom constraints');
        } else if (attempts === 4) {
          // Step 4: Remove town but keep city (location still important)
          if (currentFilters.town) {
            delete currentFilters.town;
          }
          console.log('Relaxation 4: Removed town, keeping city');
        }
      }
      
      if (!seedPropertyId) {
        console.error('=== NO SEED PROPERTY FOUND ===');
        showToast({
          type: 'error',
          title: 'No similar properties found',
          message: 'Try broadening your search criteria or check different locations',
        });
        setRecommendations([]);
        return;
      }
      
      console.log('=== GETTING RECOMMENDATIONS ===');
      console.log('Using seed property:', seedPropertyId);
      console.log('Recommendation type:', attributesRecommendationType);
      
      // Step 4: Get recommendations using the seed property
      if (attributesRecommendationType === 'filtered') {
        // Build comprehensive filters for recommendations API
        const recFilters: any = {
          // Location matching (highest priority)
          ...(recsFilters.city && { city: recsFilters.city }),
          ...(recsFilters.town && { town: recsFilters.town }),
          ...(recsFilters.district_compound && { district_compound: recsFilters.district_compound }),
        };
        
        // Add other filters with proper ranges
        if (recsFilters.price_min !== undefined) recFilters.price_min = recsFilters.price_min;
        if (recsFilters.price_max !== undefined) recFilters.price_max = recsFilters.price_max;
        if (recsFilters.size_min !== undefined) recFilters.size_min = recsFilters.size_min;
        if (recsFilters.size_max !== undefined) recFilters.size_max = recsFilters.size_max;
        if (recsFilters.bedrooms_min !== undefined) recFilters.bedrooms_min = recsFilters.bedrooms_min;
        if (recsFilters.bathrooms_min !== undefined) recFilters.bathrooms_min = recsFilters.bathrooms_min;
        if (recsFilters.property_type) {
          recFilters.property_type = propertyTypeMap[recsFilters.property_type] || 
            recsFilters.property_type.charAt(0).toUpperCase() + recsFilters.property_type.slice(1);
        }
        if (recsFilters.furnished !== undefined) {
          recFilters.furnished = recsFilters.furnished ? 'Furnished' : 'No';
        }
        if (recsFilters.offering_type) {
          recFilters.offering_type = recsFilters.offering_type.charAt(0).toUpperCase() + recsFilters.offering_type.slice(1);
        }
        
        // If no specific recommendation filters, use enhanced form data as filters
        if (Object.keys(recFilters).length === 0) {
          // Location filters
          if (normalizedLocations.city) recFilters.city = normalizedLocations.city;
          if (normalizedLocations.town) recFilters.town = normalizedLocations.town;
          if (normalizedLocations.district_compound) recFilters.district_compound = normalizedLocations.district_compound;
          
          // Property characteristics
          if (attributesForm.property_type) {
            recFilters.property_type = propertyTypeMap[attributesForm.property_type] || 
              attributesForm.property_type.charAt(0).toUpperCase() + attributesForm.property_type.slice(1);
          }
          
          // Price range (±25% for filtered recommendations)
          if (attributesForm.price) {
            const price = Number(attributesForm.price);
            if (price > 0) {
              recFilters.price_min = Math.max(0, Math.round(price * 0.75));
              recFilters.price_max = Math.round(price * 1.25);
            }
          }
          
          // Size range (±30% for filtered recommendations)
          if (attributesForm.size) {
            const size = Number(attributesForm.size);
            if (size > 0) {
              recFilters.size_min = Math.round(size * 0.7);
              recFilters.size_max = Math.round(size * 1.3);
            }
          }
          
          // Bedroom/bathroom flexibility (±1)
          if (attributesForm.bedrooms && attributesForm.bedrooms > 0) {
            recFilters.bedrooms_min = Math.max(1, attributesForm.bedrooms - 1);
          }
          if (attributesForm.bathrooms && attributesForm.bathrooms > 0) {
            recFilters.bathrooms_min = Math.max(1, attributesForm.bathrooms - 1);
          }
          
          // Offering type
          if (attributesForm.offering_type) {
            recFilters.offering_type = attributesForm.offering_type.charAt(0).toUpperCase() + attributesForm.offering_type.slice(1);
          }
          
          // Furnished status
          if (attributesForm.furnished !== undefined) {
            recFilters.furnished = attributesForm.furnished ? 'Furnished' : 'No';
          }
        }
        
        console.log('Using enhanced recommendations filters:', recFilters);
        
        const response = await api.recWithinLive({ 
          property_id: seedPropertyId, 
          top_k: 15, // Get more results for better filtering
          filters: recFilters 
        });
        
        console.log('Filtered recommendations response:', response);
        
        // Extract property IDs and fetch full details
        const propertyIds = response.items?.map((item: any) => String(item.property_id)) || [];
        
        if (propertyIds.length === 0) {
          console.log('No filtered recommendations found');
          setRecommendations([]);
          showToast({
            type: 'info',
            title: 'No similar properties found with current filters',
            message: 'Try using "Similar (Live)" instead or adjust your criteria.',
          });
          return;
        }
        
        console.log('Found filtered property IDs:', propertyIds);
        
        const detailsPromises = propertyIds.map(async (id: string) => {
          try {
            return await getListing(id);
          } catch (error) {
            console.warn(`Failed to load details for listing ${id}:`, error);
            return null;
          }
        });
        
        const fullListings = await Promise.all(detailsPromises);
        let validListings = fullListings.filter(Boolean) as Listing[];
        
        // Additional client-side filtering for quality assurance
        if (normalizedLocations.city || normalizedLocations.town) {
          validListings = validListings.filter(listing => {
            const cityMatch = !normalizedLocations.city || 
              listing.city?.toLowerCase() === normalizedLocations.city.toLowerCase();
            const townMatch = !normalizedLocations.town || 
              listing.town?.toLowerCase() === normalizedLocations.town.toLowerCase();
            return cityMatch && townMatch;
          });
        }
        
        // Price relevance check
        if (attributesForm.price) {
          const targetPrice = Number(attributesForm.price);
          validListings = validListings.filter(listing => {
            if (!listing.price) return true; // Keep listings without price
            const priceDiff = Math.abs(listing.price - targetPrice) / targetPrice;
            return priceDiff <= 0.5; // Within 50% range
          });
        }
        
        console.log('Final filtered listings after client-side filtering:', validListings.length);
        setRecommendations(validListings.slice(0, 10)); // Limit to 10 results
        
      } else {
        // Enhanced "Similar (Live)" recommendations with post-filtering
        const response = await api.recLive({ property_id: seedPropertyId, top_k: 20 });
        
        console.log('Similar recommendations response:', response);
        
        const propertyIds = response.items?.map((item: any) => String(item.property_id)) || [];
        
        if (propertyIds.length === 0) {
          console.log('No similar properties found');
          setRecommendations([]);
          showToast({
            type: 'info',
            title: 'No similar properties found',
            message: 'Try adjusting your property description or location.',
          });
          return;
        }
        
        console.log('Found similar property IDs:', propertyIds);
        
        const detailsPromises = propertyIds.map(async (id: string) => {
          try {
            return await getListing(id);
          } catch (error) {
            console.warn(`Failed to load details for listing ${id}:`, error);
            return null;
          }
        });
        
        const fullListings = await Promise.all(detailsPromises);
        let validListings = fullListings.filter(Boolean) as Listing[];
        
        console.log('Loaded similar listings before filtering:', validListings.length);
        
        // Enhanced post-filtering for "Similar (Live)" to ensure relevance
        const filteredListings = validListings.filter(listing => {
          // Location relevance (highest priority)
          const cityMatch = !normalizedLocations.city || 
            listing.city?.toLowerCase() === normalizedLocations.city.toLowerCase();
          const townMatch = !normalizedLocations.town || 
            listing.town?.toLowerCase() === normalizedLocations.town.toLowerCase();
          
          // Price relevance (within reasonable range)
          let priceRelevant = true;
          if (attributesForm.price && listing.price) {
            const targetPrice = Number(attributesForm.price);
            const priceDiff = Math.abs(listing.price - targetPrice) / targetPrice;
            priceRelevant = priceDiff <= 0.6; // Within 60% range for live recommendations
          }
          
          // Size relevance (within reasonable range)
          let sizeRelevant = true;
          if (attributesForm.size && listing.size) {
            const targetSize = Number(attributesForm.size);
            const sizeDiff = Math.abs(listing.size - targetSize) / targetSize;
            sizeRelevant = sizeDiff <= 0.5; // Within 50% range
          }
          
          // Property type relevance
          let typeRelevant = true;
          if (attributesForm.property_type && listing.property_type) {
            const targetType = propertyTypeMap[attributesForm.property_type] || 
              attributesForm.property_type.charAt(0).toUpperCase() + attributesForm.property_type.slice(1);
            typeRelevant = listing.property_type.toLowerCase() === targetType.toLowerCase();
          }
          
          // Scoring system: location is most important
          const locationScore = (cityMatch ? 2 : 0) + (townMatch ? 1 : 0);
          const relevanceScore = locationScore + (priceRelevant ? 1 : 0) + (sizeRelevant ? 1 : 0) + (typeRelevant ? 1 : 0);
          
          // Require at least location match OR high relevance in other areas
          return locationScore >= 1 || relevanceScore >= 3;
        });
        
        // Sort by relevance (location first, then price similarity)
        const sortedListings = filteredListings.sort((a, b) => {
          // Location scoring
          const aLocationScore = (normalizedLocations.city && a.city?.toLowerCase() === normalizedLocations.city.toLowerCase() ? 2 : 0) +
                                (normalizedLocations.town && a.town?.toLowerCase() === normalizedLocations.town.toLowerCase() ? 1 : 0);
          const bLocationScore = (normalizedLocations.city && b.city?.toLowerCase() === normalizedLocations.city.toLowerCase() ? 2 : 0) +
                                (normalizedLocations.town && b.town?.toLowerCase() === normalizedLocations.town.toLowerCase() ? 1 : 0);
          
          if (aLocationScore !== bLocationScore) {
            return bLocationScore - aLocationScore; // Higher location score first
          }
          
          // Price similarity scoring
          if (attributesForm.price && a.price && b.price) {
            const targetPrice = Number(attributesForm.price);
            const aPriceDiff = Math.abs(a.price - targetPrice) / targetPrice;
            const bPriceDiff = Math.abs(b.price - targetPrice) / targetPrice;
            return aPriceDiff - bPriceDiff; // Lower price difference first
          }
          
          return 0;
        });
        
        console.log('Final similar listings after enhanced filtering:', sortedListings.length);
        setRecommendations(sortedListings.slice(0, 10)); // Limit to 10 best results
      }
      
      // Clear draft on successful submission
      if (recommendations.length > 0) {
        localStorage.removeItem(DRAFT_KEY);
      }
      
    } catch (error) {
      console.error('=== RECOMMENDATION ERROR ===', error);
      showToast({
        type: 'error',
        title: 'Failed to get recommendations',
        message: error instanceof Error ? error.message : 'Please try again later',
      });
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendationsByAttributesWithType = async (type: 'similar' | 'filtered') => {
    setAttributesRecommendationType(type);
    await handleGetRecommendationsByAttributes();
  };

  const handleClearDraft = () => {
    setAttributesForm({
      property_type: 'apartment',
      city: '',
      town: '',
      district_compound: '',
      bedrooms: 2,
      bathrooms: 1,
      size: 100,
      offering_type: 'sale',
      completion_status: 'ready',
      furnished: false,
      price: '',
    });
    localStorage.removeItem(DRAFT_KEY);
    setEstimatedPrice(null);
  };
  // Set default recommendation type based on filters
  React.useEffect(() => {
    const hasFilters = Object.keys(recsFilters).length > 0;
    // Always default to 'filtered' for better location matching
    setAttributesRecommendationType('filtered');
  }, [recsFilters]);

  const propertyTypes = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'penthouse', label: 'Penthouse' },
    { value: 'chalet', label: 'Chalet' },
    { value: 'studio', label: 'Studio' },
    { value: 'duplex', label: 'Duplex' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'twin_house', label: 'Twin House' },
    { value: 'standalone_villa', label: 'Standalone Villa' },
  ];

  const completionStatuses = [
    { value: 'ready', label: t('ready', state.language) },
    { value: 'under_construction', label: t('underConstruction', state.language) },
    { value: 'off_plan', label: t('offPlan', state.language) },
  ];

  const handleViewListing = (listingId: string) => {
    onViewListing(listingId);
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Stars className="w-8 h-8 text-light-primary dark:text-dark-text mx-auto" />
        <h2 className="text-h1 font-bold text-light-text dark:text-dark-text">
          {t('recommendations', state.language)}
        </h2>
        <p className="text-light-text/70 dark:text-dark-muted">
          {t('getAIPoweredRecommendations', state.language)}
        </p>
      </div>

      {/* Mode Toggle */}
      <Card className="p-4">
        <div className="flex bg-light-primary-200 dark:bg-dark-surface rounded-aqar p-1 mb-4">
          <button
            onClick={() => setMode('existing')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse ${
              mode === 'existing'
                ? 'bg-white dark:bg-dark-primary text-light-primary dark:text-dark-text'
                : 'text-light-text dark:text-dark-muted hover:text-light-primary dark:hover:text-dark-text'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="font-medium">{t('useExistingListing', state.language)}</span>
          </button>
          <button
            onClick={() => setMode('attributes')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse ${
              mode === 'attributes'
                ? 'bg-white dark:bg-dark-primary text-light-primary dark:text-dark-text'
                : 'text-light-text dark:text-dark-muted hover:text-light-primary dark:hover:text-dark-text'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span className="font-medium">{t('describeYourProperty', state.language)}</span>
          </button>
        </div>
      </Card>

      {/* Listing Selector */}
      {mode === 'existing' && (
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-light-text dark:text-dark-text">
            {t('selectPropertyForRecommendations', state.language)}
          </h3>
          <select
            value={selectedListingId}
            onChange={(e) => setSelectedListingId(e.target.value)}
            disabled={loadingListings}
            className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
          >
            <option value="">
              {loadingListings ? 'Loading...' : t('chooseProperty', state.language)}
            </option>
            {availableListings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.property_type} in {listing.city}, {listing.town}
                {listing.price && ` - ${listing.price.toLocaleString()} EGP`}
              </option>
            ))}
          </select>

          {selectedListingId && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="gradient"
                onClick={() => handleGetRecommendations('similar')}
                disabled={loading}
                className="flex-1"
              >
                <Sparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {loading && recommendationType === 'similar' ? 'Loading...' : t('similarPropertiesLive', state.language)}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGetRecommendations('filtered')}
                disabled={loading}
                className="flex-1"
              >
                <Filter className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {loading && recommendationType === 'filtered' ? 'Loading...' : t('similarWithinFilters', state.language)}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Attributes Form */}
      {mode === 'attributes' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-light-text dark:text-dark-text">
              {t('describeYourProperty', state.language)}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDraft}
              className="text-light-highlight border-light-highlight hover:bg-light-highlight hover:text-white"
            >
              Clear
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                {t('propertyType', state.language)}
              </label>
              <select
                value={attributesForm.property_type}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, property_type: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
              >
                {propertyTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label={t('city', state.language)}
                value={attributesForm.city}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., Cairo"
              />
              <Input
                label={t('town', state.language)}
                value={attributesForm.town}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, town: e.target.value }))}
                placeholder="e.g., New Cairo"
              />
              <Input
                label={t('compound', state.language)}
                value={attributesForm.district_compound}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, district_compound: e.target.value }))}
                placeholder="e.g., Madinaty"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label={t('bedrooms', state.language)}
                type="number"
                min="0"
                value={attributesForm.bedrooms}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, bedrooms: Number(e.target.value) }))}
              />
              <Input
                label={t('bathrooms', state.language)}
                type="number"
                min="0"
                value={attributesForm.bathrooms}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, bathrooms: Number(e.target.value) }))}
              />
              <Input
                label={t('size', state.language)}
                type="number"
                min="1"
                value={attributesForm.size}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, size: Number(e.target.value) }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  {t('offering', state.language)}
                </label>
                <select
                  value={attributesForm.offering_type}
                  onChange={(e) => setAttributesForm(prev => ({ ...prev, offering_type: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
                >
                  <option value="sale">{t('sale', state.language)}</option>
                  <option value="rent">{t('rent', state.language)}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  {t('completionStatus', state.language)}
                </label>
                <select
                  value={attributesForm.completion_status}
                  onChange={(e) => setAttributesForm(prev => ({ ...prev, completion_status: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
                >
                  {completionStatuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                {t('askingPrice', state.language)} (Optional)
              </label>
              <div className="flex gap-3">
                <Input
                  type="number"
                  value={attributesForm.price}
                  onChange={(e) => setAttributesForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Enter price or leave empty"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowEstimateModal(true)}
                  className="px-4"
                >
                  <WandSparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  Predict
                </Button>
              </div>
              
              {estimatedPrice && (
                <div className="mt-2 p-3 bg-light-info/20 rounded-aqar">
                  <p className="text-sm text-light-text dark:text-dark-text">
                    Estimated Value: <span className="font-bold">{estimatedPrice.toLocaleString()} EGP</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-light-primary-200 dark:bg-dark-surface rounded-aqar">
              <span className="font-medium text-light-text dark:text-dark-text">
                {t('furnished', state.language)}
              </span>
              <button
                onClick={() => setAttributesForm(prev => ({ ...prev, furnished: !prev.furnished }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  attributesForm.furnished
                    ? 'bg-light-primary dark:bg-dark-primary'
                    : 'bg-light-border dark:bg-dark-muted'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  attributesForm.furnished ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0.5 rtl:-translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant={attributesRecommendationType === 'similar' ? 'gradient' : 'outline'}
              onClick={() => handleGetRecommendationsByAttributesWithType('similar')}
              disabled={loading}
              className="flex-1"
            >
              <Sparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {loading && attributesRecommendationType === 'similar' ? 'Loading...' : t('similarLive', state.language)}
            </Button>
            <Button
              variant={attributesRecommendationType === 'filtered' ? 'gradient' : 'outline'}
              onClick={() => handleGetRecommendationsByAttributesWithType('filtered')}
              disabled={loading}
              className="flex-1"
            >
              <Filter className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {loading && attributesRecommendationType === 'filtered' ? 'Loading...' : t('similarWithinFilters', state.language)}
            </Button>
          </div>
        </Card>
      )}

      {/* Recommendations Results */}
      {recommendationType && recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
              {recommendationType === 'similar' ? t('similarProperties', state.language) : t('recommendations', state.language)}
              {loading && (
                <span className="text-sm font-normal text-light-text/70 dark:text-dark-muted ml-2">
                  Loading...
                </span>
              )}
            </h3>
            
            {/* View Mode Toggle */}
            <div className="flex bg-light-primary-200 dark:bg-dark-surface rounded-aqar p-1">
              {viewOptions.map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === mode
                      ? 'bg-white dark:bg-dark-primary text-light-primary dark:text-dark-text'
                      : 'text-light-text dark:text-dark-muted hover:text-light-primary dark:hover:text-dark-text'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
          
          {loading ? (
            <div className={`grid gap-3 ${viewOptions.find(v => v.mode === viewMode)?.cols}`}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-dark-surface rounded-aqar border border-light-border dark:border-dark-muted p-4 space-y-4">
                  <div className="h-32 bg-light-primary-200 dark:bg-dark-muted rounded animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 bg-light-primary-200 dark:bg-dark-muted rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-light-primary-200 dark:bg-dark-muted rounded w-1/2 animate-pulse" />
                    <div className="h-6 bg-light-primary-200 dark:bg-dark-muted rounded w-1/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid gap-3 ${viewOptions.find(v => v.mode === viewMode)?.cols}`}>
              {recommendations.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onClick={() => handleViewListing(listing.id)}
                  variant={viewMode}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {mode === 'existing' && !selectedListingId && (
        <EmptyState
          icon={<Stars className="w-full h-full" />}
          title={t('getAIPoweredRecommendations', state.language)}
          description={t('selectPropertyForRecommendations', state.language)}
        />
      )}
      
      {mode === 'attributes' && recommendations.length === 0 && !loading && recommendationType === null && (
        <EmptyState
          icon={<WandSparkles className="w-full h-full" />}
          title={t('describeYourProperty', state.language)}
          description={t('fillPropertyDetailsForRecommendations', state.language)}
        />
      )}

      {/* Estimate Modal */}
      <EstimateModal
        isOpen={showEstimateModal}
        onClose={() => setShowEstimateModal(false)}
        initialData={attributesForm}
        onEstimateComplete={(price) => {
          setEstimatedPrice(price);
          setAttributesForm(prev => ({ ...prev, price: price.toString() }));
        }}
      />
    </div>
  );
}