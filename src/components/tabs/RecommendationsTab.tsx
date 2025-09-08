import React, { useState } from 'react';
import { Stars, Sparkles, Filter, Grid3X3, Grid2X2, LayoutGrid, List } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ListingCard } from '../listing/ListingCard';
import { EmptyState } from '../ui/EmptyState';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { mockListings } from '../../data/mockListings';
import { generateSimilarListings } from '../../utils/searchUtils';

interface RecommendationsTabProps {
  onViewListing: (listingId: string) => void;
}

type ViewMode = 'large' | 'medium' | 'small' | 'list';

export function RecommendationsTab({ onViewListing }: RecommendationsTabProps) {
  const { state } = useApp();
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [recommendationType, setRecommendationType] = useState<'similar' | 'filtered' | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('medium');

  const viewOptions = [
    { mode: 'large' as ViewMode, icon: Grid2X2, cols: 'grid-cols-1 sm:grid-cols-2' },
    { mode: 'medium' as ViewMode, icon: LayoutGrid, cols: 'grid-cols-2 sm:grid-cols-3' },
    { mode: 'small' as ViewMode, icon: Grid3X3, cols: 'grid-cols-2 sm:grid-cols-4' },
    { mode: 'list' as ViewMode, icon: List, cols: 'grid-cols-1' },
  ];

  const handleGetRecommendations = (type: 'similar' | 'filtered') => {
    if (!selectedListingId) return;
    
    const targetListing = mockListings.find(l => l.id === selectedListingId);
    if (!targetListing) return;

    const similar = generateSimilarListings(targetListing, mockListings);
    setRecommendations(similar);
    setRecommendationType(type);
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

      {/* Listing Selector */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-light-text dark:text-dark-text">
          {t('selectPropertyForRecommendations', state.language)}
        </h3>
        <select
          value={selectedListingId}
          onChange={(e) => setSelectedListingId(e.target.value)}
          className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
        >
          <option value="">{t('chooseProperty', state.language)}</option>
          {mockListings.slice(0, 10).map((listing) => (
            <option key={listing.id} value={listing.id}>
              {listing.property_type} in {listing.city}, {listing.town} - {listing.price?.toLocaleString()} EGP
            </option>
          ))}
        </select>

        {selectedListingId && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="gradient"
              onClick={() => handleGetRecommendations('similar')}
              className="flex-1"
            >
              <Sparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('similarPropertiesLive', state.language)}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleGetRecommendations('filtered')}
              className="flex-1"
            >
              <Filter className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('similarWithinFilters', state.language)}
            </Button>
          </div>
        )}
      </Card>

      {/* Recommendations Results */}
      {recommendationType && recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
              {recommendationType === 'similar' ? t('similarProperties', state.language) : t('recommendations', state.language)}
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
          
          <div className={`grid gap-3 ${viewOptions.find(v => v.mode === viewMode)?.cols}`}>
            {recommendations.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onClick={() => onViewListing(listing.id)}
                variant={viewMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedListingId && (
        <EmptyState
          icon={<Stars className="w-full h-full" />}
          title={t('getAIPoweredRecommendations', state.language)}
          description={t('selectPropertyForRecommendations', state.language)}
        />
      )}
    </div>
  );
}