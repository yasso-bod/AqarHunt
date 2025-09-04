import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Building2, Home } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { getOmniSuggestions } from '../../services/listingService';
import { useDebounce } from '../../hooks/useDebounce';
import { cn } from '../../utils/cn';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder }: SearchBarProps) {
  const { state, setSearchFilters } = useApp();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ field: 'city' | 'town' | 'district_compound'; value: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce the search query
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const loadSuggestions = async () => {
      try {
        setLoading(true);
        abortControllerRef.current = new AbortController();
        
        const suggestions = await getOmniSuggestions(debouncedQuery, 10);
        
        setSuggestions(suggestions);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to load suggestions:', error);
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: { field: 'city' | 'town' | 'district_compound'; value: string }) => {
    setQuery(suggestion.value);
    setShowSuggestions(false);
    
    // Clear existing location filters and set the selected one
    const newFilters: any = {};
    if (suggestion.field === 'city') {
      newFilters.city = suggestion.value;
    } else if (suggestion.field === 'town') {
      newFilters.town = suggestion.value;
    } else if (suggestion.field === 'district_compound') {
      newFilters.district_compound = suggestion.value;
    }
    
    setSearchFilters(newFilters);
    onSearch(suggestion.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    
    // If no suggestion selected, try to find best match
    if (query.trim() && suggestions.length > 0) {
      const bestMatch = suggestions[0];
      handleSuggestionClick(bestMatch);
    } else {
      onSearch(query);
    }
  };

  const getFieldIcon = (field: 'city' | 'town' | 'district_compound') => {
    switch (field) {
      case 'city': return MapPin;
      case 'town': return Building2;
      case 'district_compound': return Home;
      default: return MapPin;
    }
  };

  const getFieldLabel = (field: 'city' | 'town' | 'district_compound') => {
    switch (field) {
      case 'city': return t('city', state.language);
      case 'town': return t('town', state.language);
      case 'district_compound': return t('compound', state.language);
      default: return field;
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex bg-white dark:bg-dark-surface rounded-aqar border-2 border-light-border dark:border-dark-muted focus-within:border-light-primary dark:focus-within:border-dark-primary transition-colors">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => setShowSuggestions(true)}
              placeholder={placeholder || t('searchPlaceholder', state.language)}
              className="w-full px-4 py-3 bg-transparent text-light-text dark:text-dark-text placeholder-light-text/60 dark:placeholder-dark-muted focus:outline-none"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 rtl:right-auto rtl:left-3 p-1 text-light-primary dark:text-dark-text hover:bg-light-primary-200 dark:hover:bg-dark-muted rounded-lg transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (loading || suggestions.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar shadow-lg z-10">
            {loading ? (
              <div className="px-4 py-3 text-light-text/70 dark:text-dark-muted text-sm">
                Loading suggestions...
              </div>
            ) : (
              suggestions.map((suggestion, index) => {
                const Icon = getFieldIcon(suggestion.field);
                const fieldLabel = getFieldLabel(suggestion.field);
                
                return (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-light-primary-200 dark:hover:bg-dark-muted transition-colors flex items-center space-x-3 rtl:space-x-reverse"
                >
                  <Icon className="w-4 h-4 text-light-primary dark:text-dark-text" />
                  <div className="flex-1">
                    <span className="text-light-text dark:text-dark-text">{suggestion.value}</span>
                    <span className="text-xs text-light-text/50 dark:text-dark-muted ml-2">
                      {fieldLabel}
                    </span>
                  </div>
                </button>
                );
              })
            )}
          </div>
        )}
      </form>
    </div>
  );
}