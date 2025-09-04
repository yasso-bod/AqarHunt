import React from 'react';
import { X, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { getSingleFieldSuggestions } from '../../services/listingService';
import { useDebounce } from '../../hooks/useDebounce';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterDrawer({ isOpen, onClose }: FilterDrawerProps) {
  const { state, setSearchFilters } = useApp();
  const [localFilters, setLocalFilters] = React.useState(state.searchFilters);
  const [citySuggestions, setCitySuggestions] = React.useState<string[]>([]);
  const [townSuggestions, setTownSuggestions] = React.useState<string[]>([]);
  const [cityQuery, setCityQuery] = React.useState('');
  const [townQuery, setTownQuery] = React.useState('');

  // Debounce queries
  const debouncedCityQuery = useDebounce(cityQuery, 300);
  const debouncedTownQuery = useDebounce(townQuery, 300);

  React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // Load city suggestions
  React.useEffect(() => {
    if (debouncedCityQuery.trim()) {
      getSingleFieldSuggestions('city', debouncedCityQuery, 10)
        .then(setCitySuggestions)
        .catch(console.error);
    } else {
      setCitySuggestions([]);
    }
  }, [debouncedCityQuery]);

  // Load town suggestions
  React.useEffect(() => {
    if (debouncedTownQuery.trim()) {
      getSingleFieldSuggestions('town', debouncedTownQuery, 10)
        .then(setTownSuggestions)
        .catch(console.error);
    } else {
      setTownSuggestions([]);
    }
  }, [debouncedTownQuery]);

  const propertyTypes = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'studio', label: 'Studio' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'penthouse', label: 'Penthouse' },
  ];

  const handleApplyFilters = () => {
    setSearchFilters(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    setSearchFilters({});
    setLocalFilters({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-surface rounded-t-aqar shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-muted">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Filter className="w-5 h-5 text-light-primary dark:text-dark-text" />
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
              {t('filters', state.language)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-light-primary-200 dark:hover:bg-dark-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-light-text dark:text-dark-text" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="p-4 space-y-6">
          {/* Location Filters */}
          <div className="space-y-4">
            <h4 className="font-semibold text-light-text dark:text-dark-text">Location</h4>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  {t('city', state.language)}
                </label>
                <input
                  type="text"
                  value={localFilters.city || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLocalFilters(prev => ({ ...prev, city: value || undefined }));
                    setCityQuery(value);
                  }}
                  placeholder="Type to search cities..."
                  className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
                />
                {citySuggestions.length > 0 && (
                  <div className="mt-1 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar shadow-lg max-h-32 overflow-y-auto">
                    {citySuggestions.map((city, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setLocalFilters(prev => ({ ...prev, city }));
                          setCityQuery('');
                          setCitySuggestions([]);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-light-primary-200 dark:hover:bg-dark-muted transition-colors text-light-text dark:text-dark-text"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  {t('town', state.language)}
                </label>
                <input
                  type="text"
                  value={localFilters.town || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLocalFilters(prev => ({ ...prev, town: value || undefined }));
                    setTownQuery(value);
                  }}
                  placeholder="Type to search towns..."
                  className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
                />
                {townSuggestions.length > 0 && (
                  <div className="mt-1 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar shadow-lg max-h-32 overflow-y-auto">
                    {townSuggestions.map((town, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setLocalFilters(prev => ({ ...prev, town }));
                          setTownQuery('');
                          setTownSuggestions([]);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-light-primary-200 dark:hover:bg-dark-muted transition-colors text-light-text dark:text-dark-text"
                      >
                        {town}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-4">
            <h4 className="font-semibold text-light-text dark:text-dark-text">
              {t('priceRange', state.language)}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Min Price"
                value={localFilters.price_min || ''}
                onChange={(e) => setLocalFilters(prev => ({ 
                  ...prev, 
                  price_min: e.target.value ? Number(e.target.value) : undefined 
                }))}
              />
              <Input
                type="number"
                placeholder="Max Price"
                value={localFilters.price_max || ''}
                onChange={(e) => setLocalFilters(prev => ({ 
                  ...prev, 
                  price_max: e.target.value ? Number(e.target.value) : undefined 
                }))}
              />
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-4">
            <h4 className="font-semibold text-light-text dark:text-dark-text">Property Details</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  Min {t('bedrooms', state.language)}
                </label>
                <select
                  value={localFilters.bedrooms_min || ''}
                  onChange={(e) => setLocalFilters(prev => ({ 
                    ...prev, 
                    bedrooms_min: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num}+</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  Min {t('bathrooms', state.language)}
                </label>
                <select
                  value={localFilters.bathrooms_min || ''}
                  onChange={(e) => setLocalFilters(prev => ({ 
                    ...prev, 
                    bathrooms_min: e.target.value ? Number(e.target.value) : undefined 
                  }))}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num}+</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                {t('propertyType', state.language)}
              </label>
              <select
                value={localFilters.property_type || ''}
                onChange={(e) => setLocalFilters(prev => ({ 
                  ...prev, 
                  property_type: e.target.value || undefined 
                }))}
                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
              >
                <option value="">All Types</option>
                {propertyTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  {t('furnished', state.language)}
                </label>
                <select
                  value={localFilters.furnished === undefined ? '' : localFilters.furnished.toString()}
                  onChange={(e) => setLocalFilters(prev => ({ 
                    ...prev, 
                    furnished: e.target.value === '' ? undefined : e.target.value === 'true'
                  }))}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
                >
                  <option value="">Any</option>
                  <option value="true">Furnished</option>
                  <option value="false">Unfurnished</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  {t('offering', state.language)}
                </label>
                <select
                  value={localFilters.offering_type || ''}
                  onChange={(e) => setLocalFilters(prev => ({ 
                    ...prev, 
                    offering_type: e.target.value as any || undefined 
                  }))}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
                >
                  <option value="">Any</option>
                  <option value="sale">{t('sale', state.language)}</option>
                  <option value="rent">{t('rent', state.language)}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 pt-4 border-t border-light-border dark:border-dark-muted">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="flex-1"
          >
            Clear All
          </Button>
          <Button
            onClick={handleApplyFilters}
            className="flex-1"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}