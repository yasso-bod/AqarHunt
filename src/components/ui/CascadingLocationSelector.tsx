import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, MapPin, Building2, Home } from 'lucide-react';
import { getSingleFieldSuggestions } from '../../services/listingService';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '../../utils/cn';

interface LocationData {
  city: string;
  town: string;
  district_compound: string;
}

interface CascadingLocationSelectorProps {
  value: LocationData;
  onChange: (location: LocationData) => void;
  disabled?: boolean;
  className?: string;
}

interface DropdownOption {
  value: string;
  label: string;
}

export function CascadingLocationSelector({ 
  value, 
  onChange, 
  disabled = false, 
  className 
}: CascadingLocationSelectorProps) {
  // State for each field
  const [cityQuery, setCityQuery] = useState(value.city || '');
  const [townQuery, setTownQuery] = useState(value.town || '');
  const [compoundQuery, setCompoundQuery] = useState(value.district_compound || '');

  // Dropdown states
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showTownDropdown, setShowTownDropdown] = useState(false);
  const [showCompoundDropdown, setShowCompoundDropdown] = useState(false);

  // Options
  const [cityOptions, setCityOptions] = useState<DropdownOption[]>([]);
  const [townOptions, setTownOptions] = useState<DropdownOption[]>([]);
  const [compoundOptions, setCompoundOptions] = useState<DropdownOption[]>([]);

  // Loading states
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingTowns, setLoadingTowns] = useState(false);
  const [loadingCompounds, setLoadingCompounds] = useState(false);

  // Refs for click outside detection
  const cityRef = useRef<HTMLDivElement>(null);
  const townRef = useRef<HTMLDivElement>(null);
  const compoundRef = useRef<HTMLDivElement>(null);

  // Debounced queries
  const debouncedCityQuery = useDebounce(cityQuery, 300);
  const debouncedTownQuery = useDebounce(townQuery, 300);
  const debouncedCompoundQuery = useDebounce(compoundQuery, 300);

  // Load city suggestions
  useEffect(() => {
    if (debouncedCityQuery.trim() && showCityDropdown) {
      loadCitySuggestions(debouncedCityQuery);
    } else {
      setCityOptions([]);
    }
  }, [debouncedCityQuery, showCityDropdown]);

  // Load town suggestions when city is selected
  useEffect(() => {
    if (value.city && debouncedTownQuery.trim() && showTownDropdown) {
      loadTownSuggestions(debouncedTownQuery);
    } else if (value.city && showTownDropdown && !debouncedTownQuery.trim()) {
      // Load all towns for the selected city
      loadTownSuggestions('');
    } else {
      setTownOptions([]);
    }
  }, [value.city, debouncedTownQuery, showTownDropdown]);

  // Load compound suggestions when town is selected
  useEffect(() => {
    if (value.town && debouncedCompoundQuery.trim() && showCompoundDropdown) {
      loadCompoundSuggestions(debouncedCompoundQuery);
    } else if (value.town && showCompoundDropdown && !debouncedCompoundQuery.trim()) {
      // Load all compounds for the selected town
      loadCompoundSuggestions('');
    } else {
      setCompoundOptions([]);
    }
  }, [value.town, debouncedCompoundQuery, showCompoundDropdown]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
      if (townRef.current && !townRef.current.contains(event.target as Node)) {
        setShowTownDropdown(false);
      }
      if (compoundRef.current && !compoundRef.current.contains(event.target as Node)) {
        setShowCompoundDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCitySuggestions = async (query: string) => {
    try {
      setLoadingCities(true);
      const suggestions = await getSingleFieldSuggestions('city', query, 10);
      setCityOptions(suggestions.map(city => ({ value: city, label: city })));
    } catch (error) {
      console.error('Failed to load city suggestions:', error);
      setCityOptions([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const loadTownSuggestions = async (query: string) => {
    try {
      setLoadingTowns(true);
      // For towns, we need to filter by city context
      // Since the API doesn't support city filtering directly, we'll get all towns and filter client-side
      const suggestions = await getSingleFieldSuggestions('town', query || value.city, 20);
      setTownOptions(suggestions.map(town => ({ value: town, label: town })));
    } catch (error) {
      console.error('Failed to load town suggestions:', error);
      setTownOptions([]);
    } finally {
      setLoadingTowns(false);
    }
  };

  const loadCompoundSuggestions = async (query: string) => {
    try {
      setLoadingCompounds(true);
      // For compounds, we'll search based on the query or town context
      const suggestions = await getSingleFieldSuggestions('district_compound', query || value.town, 15);
      setCompoundOptions(suggestions.map(compound => ({ value: compound, label: compound })));
    } catch (error) {
      console.error('Failed to load compound suggestions:', error);
      setCompoundOptions([]);
    } finally {
      setLoadingCompounds(false);
    }
  };

  const handleCitySelect = (city: string) => {
    setCityQuery(city);
    setShowCityDropdown(false);
    
    // Clear dependent fields when city changes
    setTownQuery('');
    setCompoundQuery('');
    
    onChange({
      city,
      town: '',
      district_compound: ''
    });
  };

  const handleTownSelect = (town: string) => {
    setTownQuery(town);
    setShowTownDropdown(false);
    
    // Clear compound when town changes
    setCompoundQuery('');
    
    onChange({
      ...value,
      town,
      district_compound: ''
    });
  };

  const handleCompoundSelect = (compound: string) => {
    setCompoundQuery(compound);
    setShowCompoundDropdown(false);
    
    onChange({
      ...value,
      district_compound: compound
    });
  };

  const clearCity = () => {
    setCityQuery('');
    setTownQuery('');
    setCompoundQuery('');
    onChange({ city: '', town: '', district_compound: '' });
  };

  const clearTown = () => {
    setTownQuery('');
    setCompoundQuery('');
    onChange({ ...value, town: '', district_compound: '' });
  };

  const clearCompound = () => {
    setCompoundQuery('');
    onChange({ ...value, district_compound: '' });
  };

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-3', className)}>
      {/* City Field */}
      <div ref={cityRef} className="relative">
        <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          City <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              setShowCityDropdown(true);
            }}
            onFocus={() => setShowCityDropdown(true)}
            placeholder="Type to search cities..."
            disabled={disabled}
            className={cn(
              'w-full px-4 py-3 pr-10 bg-white dark:bg-dark-surface border-2 border-light-border dark:border-dark-muted rounded-aqar',
              'text-light-text dark:text-dark-text placeholder-light-text/60 dark:placeholder-dark-muted',
              'focus:border-light-primary dark:focus:border-dark-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none',
              'transition-all duration-200',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
          
          {cityQuery && (
            <button
              onClick={clearCity}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light-text/50 hover:text-light-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-light-text/50 pointer-events-none" />
        </div>

        {/* City Dropdown */}
        {showCityDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar shadow-lg z-50 max-h-48 overflow-y-auto">
            {loadingCities ? (
              <div className="px-4 py-3 text-light-text/70 dark:text-dark-muted text-sm">
                Loading cities...
              </div>
            ) : cityOptions.length > 0 ? (
              cityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleCitySelect(option.value)}
                  className="w-full px-4 py-3 text-left hover:bg-light-primary-200 dark:hover:bg-dark-muted transition-colors text-light-text dark:text-dark-text"
                >
                  {option.label}
                </button>
              ))
            ) : debouncedCityQuery.trim() ? (
              <div className="px-4 py-3 text-light-text/70 dark:text-dark-muted text-sm">
                No cities found
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Town Field */}
      <div ref={townRef} className="relative">
        <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
          <Building2 className="w-4 h-4 inline mr-1" />
          Town <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={townQuery}
            onChange={(e) => {
              setTownQuery(e.target.value);
              setShowTownDropdown(true);
            }}
            onFocus={() => value.city && setShowTownDropdown(true)}
            placeholder={value.city ? "Type to search towns..." : "Select city first"}
            disabled={disabled || !value.city}
            className={cn(
              'w-full px-4 py-3 pr-10 bg-white dark:bg-dark-surface border-2 border-light-border dark:border-dark-muted rounded-aqar',
              'text-light-text dark:text-dark-text placeholder-light-text/60 dark:placeholder-dark-muted',
              'focus:border-light-primary dark:focus:border-dark-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none',
              'transition-all duration-200',
              (disabled || !value.city) && 'opacity-50 cursor-not-allowed'
            )}
          />
          
          {townQuery && value.city && (
            <button
              onClick={clearTown}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light-text/50 hover:text-light-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-light-text/50 pointer-events-none" />
        </div>

        {/* Town Dropdown */}
        {showTownDropdown && value.city && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar shadow-lg z-50 max-h-48 overflow-y-auto">
            {loadingTowns ? (
              <div className="px-4 py-3 text-light-text/70 dark:text-dark-muted text-sm">
                Loading towns...
              </div>
            ) : townOptions.length > 0 ? (
              townOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTownSelect(option.value)}
                  className="w-full px-4 py-3 text-left hover:bg-light-primary-200 dark:hover:bg-dark-muted transition-colors text-light-text dark:text-dark-text"
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-light-text/70 dark:text-dark-muted text-sm">
                No towns found for {value.city}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compound Field */}
      <div ref={compoundRef} className="relative">
        <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
          <Home className="w-4 h-4 inline mr-1" />
          Compound <span className="text-light-text/50 dark:text-dark-muted text-xs">(Optional)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={compoundQuery}
            onChange={(e) => {
              setCompoundQuery(e.target.value);
              setShowCompoundDropdown(true);
            }}
            onFocus={() => value.town && setShowCompoundDropdown(true)}
            placeholder={value.town ? "Type to search compounds..." : "Select town first"}
            disabled={disabled || !value.town}
            className={cn(
              'w-full px-4 py-3 pr-10 bg-white dark:bg-dark-surface border-2 border-light-border dark:border-dark-muted rounded-aqar',
              'text-light-text dark:text-dark-text placeholder-light-text/60 dark:placeholder-dark-muted',
              'focus:border-light-primary dark:focus:border-dark-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none',
              'transition-all duration-200',
              (disabled || !value.town) && 'opacity-50 cursor-not-allowed'
            )}
          />
          
          {compoundQuery && value.town && (
            <button
              onClick={clearCompound}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light-text/50 hover:text-light-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-light-text/50 pointer-events-none" />
        </div>

        {/* Compound Dropdown */}
        {showCompoundDropdown && value.town && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar shadow-lg z-50 max-h-48 overflow-y-auto">
            {loadingCompounds ? (
              <div className="px-4 py-3 text-light-text/70 dark:text-dark-muted text-sm">
                Loading compounds...
              </div>
            ) : compoundOptions.length > 0 ? (
              compoundOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleCompoundSelect(option.value)}
                  className="w-full px-4 py-3 text-left hover:bg-light-primary-200 dark:hover:bg-dark-muted transition-colors text-light-text dark:text-dark-text"
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-light-text/70 dark:text-dark-muted text-sm">
                No compounds found for {value.town}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}