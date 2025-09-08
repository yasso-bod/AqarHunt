import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { getUniqueCities, getUniqueTowns, getUniqueCompounds } from '../../data/mockListings';
import { cn } from '../../utils/cn';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  showTypeahead?: boolean;
}

export function SearchBar({ onSearch, placeholder, showTypeahead = true }: SearchBarProps) {
  const { state } = useApp();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedField, setSelectedField] = useState<'city' | 'town' | 'compound'>('city');
  const inputRef = useRef<HTMLInputElement>(null);

  const fields = [
    { id: 'city' as const, label: t('city', state.language) },
    { id: 'town' as const, label: t('town', state.language) },
    { id: 'compound' as const, label: t('compound', state.language) },
  ];

  useEffect(() => {
    if (!query.trim() || !showTypeahead) {
      setSuggestions([]);
      return;
    }

    let options: string[] = [];
    switch (selectedField) {
      case 'city':
        options = getUniqueCities();
        break;
      case 'town':
        options = getUniqueTowns();
        break;
      case 'compound':
        options = getUniqueCompounds();
        break;
    }

    const filtered = options.filter(option =>
      option.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    setSuggestions(filtered);
  }, [query, selectedField, showTypeahead]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    onSearch(value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    onSearch(query);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex bg-white dark:bg-dark-surface rounded-aqar border-2 border-light-border dark:border-dark-muted focus-within:border-light-primary dark:focus-within:border-dark-primary transition-colors">
          {/* Field Selector */}
          {showTypeahead && (
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value as 'city' | 'town' | 'compound')}
              className="px-3 py-3 bg-transparent text-light-text dark:text-dark-text border-none focus:outline-none text-sm font-medium"
            >
              {fields.map(field => (
                <option key={field.id} value={field.id}>
                  {field.label}
                </option>
              ))}
            </select>
          )}
          
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
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar shadow-lg z-10">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-light-primary-200 dark:hover:bg-dark-muted transition-colors flex items-center space-x-3 rtl:space-x-reverse"
              >
                <MapPin className="w-4 h-4 text-light-primary dark:text-dark-text" />
                <span className="text-light-text dark:text-dark-text">{suggestion}</span>
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}