import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, X, Search } from 'lucide-react';
import { SearchBar } from '../search/SearchBar';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { ListingCard } from '../listing/ListingCard';
import { useApp } from '../../contexts/AppContext';
import { mockListings } from '../../data/mockListings';
import { filterListings, searchListings } from '../../utils/searchUtils';
import { t } from '../../utils/translations';
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
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Apply both search query and filters
  let filteredListings = mockListings;
  
  // Apply search query first
  if (searchQuery.trim()) {
    filteredListings = searchListings(filteredListings, searchQuery);
  }
  
  // Then apply filters
  filteredListings = filterListings(filteredListings, state.searchFilters);
  
  const selectedListingData = selectedListing 
    ? filteredListings.find(l => l.id === selectedListing)
    : null;

  // Default center on Cairo
  const center: [number, number] = [30.0444, 31.2357];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Search Bar */}
      <div className="flex-shrink-0 bg-white dark:bg-dark-surface border-b border-light-border dark:border-dark-muted p-4 z-20">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-light-primary-200 dark:bg-dark-surface rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          >
            <X className="w-5 h-5 text-light-text dark:text-dark-text" />
          </button>
          
          <div className="flex-1">
            <SearchBar 
              onSearch={handleSearch}
              placeholder="Search properties on map..."
              showTypeahead={true}
            />
          </div>
        </div>
        
        {/* Results Counter */}
        <div className="mt-3 flex items-center text-light-text dark:text-dark-text">
          <MapPin className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2 text-light-primary" />
          <span className="text-sm font-medium">
            {filteredListings.length} properties found
            {searchQuery && ` for "${searchQuery}"`}
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
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
          
          {filteredListings.map((listing) => (
            <Marker
              key={listing.id}
              position={[listing.lat, listing.lon]}
              eventHandlers={{
                click: () => setSelectedListing(listing.id),
              }}
            >
              <Popup>
                <div 
                  className="p-2 max-w-xs cursor-pointer hover:bg-gray-50 rounded transition-colors"
                  onClick={() => onViewListing(listing.id)}
                >
                  <div className="w-24 h-16 mb-2 rounded overflow-hidden">
                    <img 
                      src={listing.images[0]} 
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
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Bottom Sheet for Selected Listing */}
      <BottomSheet
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        title="Property Details"
      >
        {selectedListingData && (
          <div className="space-y-4">
            <ListingCard
              listing={selectedListingData}
              onClick={() => onViewListing(selectedListingData.id)}
              variant="large"
            />
            <Button
              onClick={() => onViewListing(selectedListingData.id)}
              className="w-full"
            >
              View Full Details
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}