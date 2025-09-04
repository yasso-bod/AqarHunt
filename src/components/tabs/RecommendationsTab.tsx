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

// Helper functions for API schema mapping
const mapType = (t?: string) => {
  const M: Record<string,string> = {
    apartment:"Apartment", villa:"Villa", townhouse:"Townhouse", duplex:"Duplex",
    penthouse:"Penthouse", studio:"Studio", "twin house":"Twin house", chalet:"Chalet"
  };
  return t ? (M[t.toLowerCase()] ?? t) : undefined;
};

const mapOffering = (o?: string) =>
  o ? (o.toLowerCase()==="rent" ? "Rent" : "Sale") : undefined;

const mapFurnished = (b?: boolean) =>
  b===undefined ? undefined : (b ? "Yes" : "No");

const clean = (o:any) =>
  Object.fromEntries(Object.entries(o).filter(([_,v]) => v!==undefined && v!==null && v!==""));

// Build seed filters in the SAME way as the filtered flow
const buildSeedFilters = (form:any) => {
  const size = Number(form.size) || undefined;
  const price = Number(form.price) || undefined;
  return clean({
    city: form.city,                      // must be exact DB strings
    town: form.town,
    district_compound: form.district_compound || undefined,
    property_type: mapType(form.property_type),
    bedrooms_min: form.bedrooms || undefined,
    bathrooms_min: form.bathrooms || undefined,
    size_min: size ? Math.round(size*0.8) : undefined,
    size_max: size ? Math.round(size*1.2) : undefined,
    price_min: price ? Math.round(price*0.75) : undefined,
    price_max: price ? Math.round(price*1.25) : undefined,
    furnished: mapFurnished(form.furnished),
    offering_type: mapOffering(form.offering_type),
  });
};

const pickSeedId = async (seedFilters:any): Promise<string|null> => {
  // progressive relaxation identical to filtered flow
  const size = seedFilters.size_min && seedFilters.size_max
    ? Math.round((seedFilters.size_min + seedFilters.size_max)/2) : undefined;
  const price = seedFilters.price_min && seedFilters.price_max
    ? Math.round((seedFilters.price_min + seedFilters.price_max)/2) : undefined;

  const attempts = [
    seedFilters,
    clean({
      ...seedFilters, district_compound: undefined,
      price_min: price ? Math.round(price*0.6) : undefined,
      price_max: price ? Math.round(price*1.4) : undefined,
      size_min: size ? Math.round(size*0.6) : undefined,
      size_max: size ? Math.round(size*1.4) : undefined,
    }),
    clean({ ...seedFilters, bedrooms_min: undefined, bathrooms_min: undefined }),
    clean({ ...seedFilters, town: undefined }), // keep only city + type
  ];

  for (const f of attempts) {
    const r = await searchListings({ ...f, limit: 10, page: 1 });
    if (r?.items?.length) return String(r.items[0].id);
  }
  return null;
};

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

  // Helper function to map form values to API schema
  const mapToAPISchema = (form: typeof attributesForm) => {
    // Property type mapping to exact DB values
    const propertyTypeMap: { [key: string]: string } = {
      'apartment': 'Apartment',
      'villa': 'Villa',
      'townhouse': 'Townhouse',
      'duplex': 'Duplex',
      'penthouse': 'Penthouse',
      'studio': 'Studio',
      'twin_house': 'Twin House',
      'chalet': 'Chalet',
      'standalone_villa': 'Standalone Villa'
    };

    return {
      property_type: propertyTypeMap[form.property_type] || form.property_type,
      city: form.city, // Use exact strings from vocab selectors
      town: form.town,
      district_compound: form.district_compound || undefined,
      furnished: form.furnished ? 'Yes' : 'No',
      offering_type: form.offering_type === 'sale' ? 'Sale' : 'Rent',
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      size: form.size,
      price: form.price || undefined,
      completion_status: form.completion_status
    };
  };

  // Helper function to find seed property
  const findSeedProperty = async (mappedAttributes: any): Promise<string | null> => {
    console.log('=== FINDING SEED PROPERTY ===');
    
    // Build search payload (don't filter by price for seeding)
    let searchFilters: SearchFilters = {
      city: mappedAttributes.city,
      town: mappedAttributes.town,
      district_compound: mappedAttributes.district_compound,
      property_type: mappedAttributes.property_type,
      furnished: mappedAttributes.furnished === 'Yes',
      offering_type: mappedAttributes.offering_type.toLowerCase() as 'sale' | 'rent',
      bedrooms_min: mappedAttributes.bedrooms,
      bathrooms_min: mappedAttributes.bathrooms
    };

    // Convert size to band if provided
    if (mappedAttributes.size) {
      searchFilters.size_min = Math.round(mappedAttributes.size * 0.8);
      searchFilters.size_max = Math.round(mappedAttributes.size * 1.2);
    }

    console.log('Initial search filters:', searchFilters);

    // Progressive relaxation for seed finding
    const relaxationSteps = [
      (f: SearchFilters) => ({ ...f }), // Initial strict filters
      (f: SearchFilters) => ({ ...f, district_compound: undefined }), // Drop compound
      (f: SearchFilters) => { // Widen size band
        const newF = { ...f, district_compound: undefined };
        if (mappedAttributes.size) {
          newF.size_min = Math.round(mappedAttributes.size * 0.6);
          newF.size_max = Math.round(mappedAttributes.size * 1.4);
        }
        return newF;
      },
      (f: SearchFilters) => { // Drop bedrooms/bathrooms
        const newF = { ...f, district_compound: undefined, bedrooms_min: undefined, bathrooms_min: undefined };
        if (mappedAttributes.size) {
          newF.size_min = Math.round(mappedAttributes.size * 0.6);
          newF.size_max = Math.round(mappedAttributes.size * 1.4);
        }
        return newF;
      },
      (f: SearchFilters) => ({ // Drop town, keep city + type
        city: f.city,
        property_type: f.property_type,
        offering_type: f.offering_type,
        furnished: f.furnished
      })
    ];

    for (let i = 0; i < relaxationSteps.length; i++) {
      const relaxedFilters = relaxationSteps[i](searchFilters);
      console.log(`Relaxation step ${i + 1}:`, relaxedFilters);
      
      try {
        const response = await searchListings(relaxedFilters, 1, 10);
        console.log(`Step ${i + 1} results:`, response.items.length);
        
        if (response.items.length > 0) {
          const seedId = response.items[0].id;
          console.log('Found seed property:', seedId);
          return seedId;
        }
      } catch (error) {
        console.error(`Search step ${i + 1} failed:`, error);
      }
    }

    console.log('=== NO SEED PROPERTY FOUND ===');
    return null;
  };

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
    // Validate that we have sufficient attributes to make a recommendation
    if (!attributesForm.city || !attributesForm.town || !attributesForm.property_type) {
      showToast({
        type: 'warning',
        title: 'Incomplete Property Details',
        message: 'Please fill in at least City, Town, and Property Type to get recommendations.',
      });
      return;
    }

    try {
      setLoading(true);
      setRecommendationType(attributesRecommendationType);
      
      let fetchedRecommendations: Listing[] = [];

      if (attributesRecommendationType === 'similar') {
        const seedFilters = buildSeedFilters(attributesForm);
        let seedId = await pickSeedId(seedFilters);
        if (!seedId) {
          setRecommendationError(t('noSimilarPropertiesFound', state.language));
          setLoadingRecommendations(false);
          return;
        }

        // call the live endpoint with NO filters
        let recResp: any;
        try {
          recResp = await api.recLive({ property_id: seedId, top_k: 12 });
        } catch (e) {
          // try a different seed (2nd item) if available
          const retry = await searchListings({ ...seedFilters, limit: 10, page: 1 });
          const fallback = retry?.items?.[1]?.id;
          if (!fallback) throw e;
          recResp = await api.recLive({ property_id: String(fallback), top_k: 12 });
        }

        const ids = (recResp?.items || []).map((x:any) => String(x.property_id));
        if (!ids.length) {
          setRecommendationError(t('noSimilarPropertiesFound', state.language));
          setRecommendations([]);
        } else {
          const details = await Promise.all(ids.map((id:string) =>
            getListing(id).catch(() => null)
          ));
          fetchedRecommendations = details.filter(Boolean) as Listing[];
        }
      } else {
        // Similar within Filters logic (unchanged)
        const seedFilters = buildSeedFilters(attributesForm);
        let seedId = await pickSeedId(seedFilters);
        if (!seedId) {
          setRecommendationError(t('noSimilarPropertiesFound', state.language));
          setLoadingRecommendations(false);
          return;
        }

        // Build clean filters for within_filters_live
        const size = Number(attributesForm.size) || undefined;
        const price = Number(attributesForm.price) || undefined;
        
        let currentFilters = clean({
          city: attributesForm.city,
          town: attributesForm.town,
          district_compound: attributesForm.district_compound || undefined,
          property_type: mapType(attributesForm.property_type),
          bedrooms_min: attributesForm.bedrooms || undefined,
          bathrooms_min: attributesForm.bathrooms || undefined,
          size_min: size ? Math.round(size * 0.8) : undefined,
          size_max: size ? Math.round(size * 1.2) : undefined,
          price_min: price ? Math.round(price * 0.75) : undefined,
          price_max: price ? Math.round(price * 1.25) : undefined,
          furnished: mapFurnished(attributesForm.furnished),
          offering_type: mapOffering(attributesForm.offering_type),
        });

        console.log('=== SIMILAR WITHIN FILTERS ===');
        console.log('Seed ID:', seedId);
        console.log('Initial filters:', currentFilters);

        // Progressive relaxation for within_filters_live
        const relaxationSteps = [
          (f: any) => ({ ...f }), // Initial strict filters
          (f: any) => clean({ // Drop compound, widen price/size
            ...f, 
            district_compound: undefined,
            price_min: price ? Math.round(price * 0.6) : undefined,
            price_max: price ? Math.round(price * 1.4) : undefined,
            size_min: size ? Math.round(size * 0.6) : undefined,
            size_max: size ? Math.round(size * 1.4) : undefined,
          }),
          (f: any) => clean({ // Drop bed/bath
            ...f, 
            bedrooms_min: undefined, 
            bathrooms_min: undefined 
          }),
          (f: any) => clean({ // Drop town, keep city
            ...f, 
            town: undefined 
          }),
        ];

        for (const relaxFn of relaxationSteps) {
          const relaxedFilters = relaxFn(currentFilters);
          console.log('Trying filters:', relaxedFilters);
          
          try {
            const recResponse = await api.recWithinLive({ 
              property_id: seedId, 
              top_k: 10, 
              filters: relaxedFilters 
            });
            console.log('Within filters response:', recResponse);
            
            const propertyIds = recResponse.items?.map((item: any) => String(item.property_id)) || [];
            
            if (propertyIds.length > 0) {
              console.log('Found property IDs:', propertyIds);
              
              const detailsPromises = propertyIds.map(async (id: string) => {
                try {
                  return await getListing(id);
                } catch (error) {
                  console.warn(`Failed to load details for listing ${id}:`, error);
                  return null;
                }
              });
              
              const fullListings = await Promise.all(detailsPromises);
              fetchedRecommendations = fullListings.filter(Boolean) as Listing[];
              console.log(`Loaded ${fetchedRecommendations.length} recommendations`);
              break; // Found results, stop relaxing
            }
          } catch (error) {
            console.error('Within filters API error:', error);
            if (error instanceof Error && error.message.includes('No vector found')) {
              console.log('No vector found for property_id, trying different approach...');
              continue; // Try next relaxation step
            }
            throw error; // Re-throw other errors
          }
        }
      }

      if (fetchedRecommendations.length === 0) {
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
      
      // Clear draft on successful submission
      if (recommendations.length > 0) {
        localStorage.removeItem(DRAFT_KEY);
      }
      
    } catch (error) {
      console.error('=== RECOMMENDATION ERROR ===', error);
      showToast({
        type: 'error',
        title: 'Recommendations Not Available',
        message: error instanceof Error && error.message.includes('No vector found') 
          ? 'Recommendations are not available for this property combination. Try adjusting your search criteria.'
          : 'Failed to get recommendations. Please try again later.',
      });
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendationsByAttributesWithType = async (type: 'similar' | 'filtered') => {
    console.log('=== STARTING RECOMMENDATION REQUEST ===');
    console.log('Type:', type);
    console.log('Form data:', attributesForm);
    
    // Validate that we have sufficient attributes
    if (!attributesForm.city || !attributesForm.town || !attributesForm.property_type) {
      showToast({
        type: 'warning',
        title: 'Incomplete Property Details',
        message: 'Please fill in at least City, Town, and Property Type to get recommendations.',
      });
      return;
    }

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