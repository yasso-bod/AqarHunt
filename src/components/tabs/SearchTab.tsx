import React, { useState, useMemo } from 'react';
import { Filter, SlidersHorizontal, Grid3X3, Grid2X2, LayoutGrid, List, Rows3 } from 'lucide-react';
import { SearchBar } from '../search/SearchBar';
import { FilterDrawer } from '../search/FilterDrawer';
import { ListingCard } from '../listing/ListingCard';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { mockListings } from '../../data/mockListings';
import { filterListings, sortListings, searchListings } from '../../utils/searchUtils';

interface SearchTabProps {
  onViewListing: (listingId: string) => void;
}

type ViewMode = 'extra-large' | 'large' | 'medium' | 'small' | 'list';
export function SearchTab({ onViewListing }: SearchTabProps) {
  const { state, setSortBy } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('medium');

  const filteredListings = useMemo(() => {
    let results = mockListings;
    
    // Apply search query
    if (searchQuery.trim()) {
      results = searchListings(results, searchQuery);
    }
    
    // Apply filters
    results = filterListings(results, state.searchFilters);
    
    // Apply sorting
    results = sortListings(results, state.sortBy);
    
    return results;
  }, [searchQuery, state.searchFilters, state.sortBy]);

  const handleSearch = (query: string) => {
    setIsLoading(true);
    setSearchQuery(query);
    // Simulate API delay
    setTimeout(() => setIsLoading(false), 300);
  };

  const viewOptions = [
    { mode: 'extra-large' as ViewMode, icon: Grid3X3, label: 'Extra Large', cols: 'grid-cols-1' },
    { mode: 'large' as ViewMode, icon: Grid2X2, label: 'Large', cols: 'grid-cols-1 sm:grid-cols-2' },
    { mode: 'medium' as ViewMode, icon: LayoutGrid, label: 'Medium', cols: 'grid-cols-2 sm:grid-cols-3' },
    { mode: 'small' as ViewMode, icon: Grid3X3, label: 'Small', cols: 'grid-cols-2 sm:grid-cols-4' },
    { mode: 'list' as ViewMode, icon: List, label: 'List', cols: 'grid-cols-1' },
  ];

  const getCardVariant = (mode: ViewMode) => {
    switch (mode) {
      case 'extra-large': return 'extra-large';
      case 'large': return 'large';
      case 'medium': return 'medium';
      case 'small': return 'small';
      case 'list': return 'list';
      default: return 'medium';
    }
  };

  const sortOptions = [
    { value: 'newest', label: t('newest', state.language) },
    { value: 'price_asc', label: t('priceAsc', state.language) },
    { value: 'price_desc', label: t('priceDesc', state.language) },
    { value: 'size_asc', label: t('sizeAsc', state.language) },
    { value: 'size_desc', label: t('sizeDesc', state.language) },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Search and Controls */}
      <div className="space-y-4">
        <SearchBar onSearch={handleSearch} />
        
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(true)}
            className="flex items-center"
          >
            <Filter className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
            {t('filters', state.language)}
          </Button>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
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
                  title={viewOptions.find(v => v.mode === mode)?.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
            
            <select
              value={state.sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
            {filteredListings.length} {t('results', state.language)}
          </h3>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-dark-surface rounded-aqar border border-light-border dark:border-dark-muted p-4 space-y-4">
                <LoadingSkeleton variant="card" className="h-32" />
                <div className="space-y-2">
                  <LoadingSkeleton className="h-4 w-3/4" />
                  <LoadingSkeleton className="h-4 w-1/2" />
                  <LoadingSkeleton className="h-6 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <EmptyState
            title={t('noResults', state.language)}
            description="Try adjusting your search criteria or filters"
            action={
              <Button onClick={() => setShowFilters(true)}>
                <SlidersHorizontal className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                Adjust Filters
              </Button>
            }
          />
        ) : (
          <div className={`grid gap-3 ${viewOptions.find(v => v.mode === viewMode)?.cols}`}>
            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onClick={() => onViewListing(listing.id)}
                variant={getCardVariant(viewMode) as any}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
      />
    </div>
  );
}