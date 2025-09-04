import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, X, Search } from 'lucide-react';
import { SearchBar } from '../search/SearchBar';
import { Button } from '../ui/Button';
import { useApp } from '../../contexts/AppContext';
import { searchListings } from '../../services/listingService';
import { useToast } from '../ui/Toast';
import { useDebounce } from '../../hooks/useDebounce';
import { t } from '../../utils/translations';
import { Listing } from '../../types';
import { SearchFilters } from '../../types';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapTabProps {
  onViewListing: (listingId: string) => void;
  onBack: () => void;
}

export function MapTab({ onViewListing, onBack }: MapTabProps) {
  const { state } = useApp();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  // Map-specific filters (isolated from other tabs)
  const [mapFilters, setMapFilters] = useState<SearchFilters>({});

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onBack();
      }
    };

    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onBack]);

  // Load listings when filters or search query changes
  React.useEffect(() => {
    loadListings();
  }, [mapFilters, debouncedSearchQuery]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const response = await searchListings(mapFilters, 1, 100);
      
      setListings(response.items);
    } catch (error) {
      console.error('Failed to load listings:', error);
      showToast({
        type: 'error',
        title: 'Failed to load listings from API',
        message: error instanceof Error ? error.message : 'Please try again later',
      });
      setListings([]);
    } finally {
      setLoading(false);
    }
  };
  

  // Default center on Cairo
  const center: [number, number] = [30.0444, 31.2357];

  const handleSearch = (query: string, filters?: SearchFilters) => {
    setSearchQuery(query);
    if (filters) {
      setMapFilters(filters);
    }
  };

  const handleSearchBarFilter = (filters: SearchFilters) => {
    setMapFilters(filters);
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Fixed Search Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white/95 dark:bg-dark-surface/95 backdrop-blur-sm border-b border-light-border dark:border-dark-muted p-4 shadow-sm">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          >
            <X className="w-5 h-5 text-light-text dark:text-dark-text" />
          </button>
          
          <div className="flex-1">
            <SearchBar 
              onSearch={handleSearch}
              onFiltersChange={handleSearchBarFilter}
              placeholder="Search properties on map..."
            />
          </div>
        </div>
        
        {/* Results Counter */}
        <div className="mt-3 flex items-center text-light-text dark:text-dark-text">
          <MapPin className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2 text-light-primary" />
          <span className="text-sm font-medium">
            {loading ? 'Loading...' : `${listings.length} properties found`}
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 pt-[120px] z-0">
        <MapContainer
          center={center}
          zoom={11}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {!loading && listings.map((listing) => (
            <Marker
              key={listing.id}
              position={[listing.lat, listing.lon]}
            >
              <Popup>
                <div className="p-2 max-w-xs">
                  <div className="w-24 h-16 mb-2 rounded overflow-hidden">
                    <img 
                      src={listing.images && listing.images.length > 0 ? listing.images[0] : 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=400'} 
                      alt={`${t(listing.property_type, state.language)} in ${listing.city}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-semibold text-sm">{t(listing.property_type, state.language)}</h4>
                  <p className="text-sm text-gray-600">
                    {listing.city}, {listing.town}
                  </p>
                  <p className="font-bold text-light-primary text-sm">
                    {listing.price?.toLocaleString()} {t('egp', state.language)}
                  </p>
                  <button
                    onClick={() => onViewListing(listing.id)}
                    className="w-full bg-light-primary hover:bg-light-primary/90 text-white px-3 py-1 rounded text-sm font-medium transition-colors mt-2"
                  >
                    View Full Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

    </div>
  );
}