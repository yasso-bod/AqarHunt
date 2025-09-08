import React, { useState } from 'react';
import { Sparkles as WandSparkles, Building2, Home, MapPin, Sparkles, Grid2X2, LayoutGrid, Grid3X3 } from 'lucide-react';
import { SearchBar } from '../search/SearchBar';
import { ListingCard } from '../listing/ListingCard';
import { EstimateModal } from '../modals/EstimateModal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { mockListings } from '../../data/mockListings';

interface HomeTabProps {
  onViewListing: (listingId: string) => void;
  onCreateListing: () => void;
  onNavigateToSearch: () => void;
}

export function HomeTab({ onViewListing, onCreateListing, onNavigateToSearch }: HomeTabProps) {
  const { state, setSearchFilters } = useApp();
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'large' | 'medium' | 'small'>('medium');

  const quickFilters = [
    { label: t('apartments', state.language), filter: { property_type: 'apartment' } },
    { label: t('villas', state.language), filter: { property_type: 'villa' } },
    { label: t('studios', state.language), filter: { property_type: 'studio' } },
    { label: t('cairo', state.language), filter: { city: 'Cairo' } },
    { label: t('giza', state.language), filter: { city: 'Giza' } },
  ];

  const handleQuickFilter = (filter: any) => {
    setSearchFilters(filter);
    // Navigate to search tab after applying filter
    onNavigateToSearch();
  };

  const handleSearch = (query: string) => {
    // This would normally trigger a search
    console.log('Search query:', query);
  };

  const recentListings = mockListings.slice(0, 6);

  const viewOptions = [
    { mode: 'large' as const, icon: Grid2X2, cols: 'grid-cols-1 sm:grid-cols-2' },
    { mode: 'medium' as const, icon: LayoutGrid, cols: 'grid-cols-2 sm:grid-cols-3' },
    { mode: 'small' as const, icon: Grid3X3, cols: 'grid-cols-2 sm:grid-cols-4' },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Search Section */}
      <div className="space-y-4">
        <SearchBar onSearch={handleSearch} />
        
        {/* Quick Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((item, index) => (
            <button
              key={index}
              onClick={() => handleQuickFilter(item.filter)}
              className="px-4 py-2 bg-light-primary-200 dark:bg-dark-surface text-light-text dark:text-dark-text rounded-full text-sm font-medium hover:bg-light-primary-400 dark:hover:bg-dark-muted transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <Card className="p-6 bg-gradient-primary dark:bg-gradient-primary-dark">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-h2 font-bold text-white">
            {t('getInstantPrice', state.language)}
          </h2>
          <p className="text-white/90 text-sm">
            {t('listYourProperty', state.language)}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowEstimateModal(true)}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <WandSparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('getInstantPrice', state.language)}
            </Button>
            <Button
              variant="outline"
              onClick={onCreateListing}
              className="flex-1 bg-transparent border-white text-white hover:bg-white hover:text-light-primary"
            >
              <Building2 className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('createListing', state.language)}
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Listings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
            {t('recentListings', state.language)}
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
        
        <div className={`grid gap-4 ${viewOptions.find(v => v.mode === viewMode)?.cols}`}>
          {recentListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => onViewListing(listing.id)}
              variant={viewMode}
            />
          ))}
        </div>
      </div>

      {/* Estimate Modal */}
      <EstimateModal
        isOpen={showEstimateModal}
        onClose={() => setShowEstimateModal(false)}
        onContinueToListing={onCreateListing}
      />
    </div>
  );
}