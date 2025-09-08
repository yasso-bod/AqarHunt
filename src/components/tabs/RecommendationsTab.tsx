import React, { useState, useEffect } from 'react';
import { Stars, Sparkles, Filter, Grid3X3, Grid2X2, LayoutGrid, List, Building2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ListingCard } from '../listing/ListingCard';
import { EmptyState } from '../ui/EmptyState';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { getListing, searchListings, SearchFilters, getRecommendationsByPropertyLive, getRecommendationsWithinFiltersLive } from '../../services/listingService';
import { useToast } from '../ui/Toast';
import { Listing } from '../../types';

type ViewMode = 'large' | 'medium' | 'small' | 'list';

export default function RecommendationsTab({ onViewListing }: { onViewListing: (listingId: string) => void }) {
  const { state } = useApp();
  const { showToast } = useToast();

  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [recommendationType, setRecommendationType] = useState<'similar' | 'filtered' | null>(null);
  const [recommendations, setRecommendations] = useState<Listing[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('medium');
  const [availableListings, setAvailableListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingListings, setLoadingListings] = useState(true);

  const viewOptions = [
    { mode: 'large' as ViewMode, icon: Grid2X2, cols: 'grid-cols-1 sm:grid-cols-2' },
    { mode: 'medium' as ViewMode, icon: LayoutGrid, cols: 'grid-cols-2 sm:grid-cols-3' },
    { mode: 'small' as ViewMode, icon: Grid3X3, cols: 'grid-cols-2 sm:grid-cols-4' },
    { mode: 'list' as ViewMode, icon: List, cols: 'grid-cols-1' },
  ];

  useEffect(() => {
    (async () => {
      try {
        setLoadingListings(true);
        const res = await searchListings({ limit: 50, page: 1 });
        setAvailableListings(res.items || []);
      } catch (e: any) {
        console.error('Failed to load listings:', e);
        showToast({ type: 'error', title: 'Failed to load listings', message: e?.message || 'Please try again' });
      } finally {
        setLoadingListings(false);
      }
    })();
  }, []);

  async function handleGetRecommendations(type: 'similar' | 'filtered') {
    if (!selectedListingId) return;
    try {
      setLoading(true);
      setRecommendationType(type);
      setRecommendations([]);

      if (type === 'similar') {
        const sims = await getRecommendationsByPropertyLive(selectedListingId, 12);
        setRecommendations(sims);
      } else {
        // No extra UI filters now; if you later add a drawer, pass them here.
        const within = await getRecommendationsWithinFiltersLive(selectedListingId, {}, 12);
        if (!within.length) {
          showToast({ type: 'info', title: 'No similar properties found', message: 'Try relaxing your criteria.' });
        }
        setRecommendations(within);
      }
    } catch (e: any) {
      console.error('Failed to get recommendations:', e);
      showToast({ type: 'error', title: 'Failed to get recommendations', message: e?.message || 'Please try again' });
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }

  const handleViewListing = (listingId: string) => onViewListing(listingId);

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="text-center space-y-2">
        <Stars className="w-8 h-8 text-light-primary dark:text-dark-text mx-auto" />
        <h2 className="text-h1 font-bold text-light-text dark:text-dark-text">
          {t('recommendations', state.language)}
        </h2>
        <p className="text-light-text/70 dark:text-dark-muted">
          {t('getAIPoweredRecommendations', state.language)}
        </p>
      </div>

      {/* Listing selector only (Describe tab removed) */}
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
          <option value="">{loadingListings ? 'Loading...' : t('chooseProperty', state.language)}</option>
          {availableListings.map((listing) => (
            <option key={listing.id} value={listing.id}>
              {listing.property_type} in {listing.city}, {listing.town}
              {listing.price && ` - ${Number(listing.price).toLocaleString()} EGP`}
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

      {recommendationType && recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
              {recommendationType === 'similar' ? t('similarProperties', state.language) : t('recommendations', state.language)}
              {loading && <span className="text-sm font-normal text-light-text/70 dark:text-dark-muted ml-2">Loading...</span>}
            </h3>

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
                onClick={() => handleViewListing(listing.id)}
                variant={viewMode}
              />
            ))}
          </div>
        </div>
      )}

      {!selectedListingId && (
        <EmptyState
          icon={<Building2 className="w-full h-full" />}
          title={t('getAIPoweredRecommendations', state.language)}
          description={t('selectPropertyForRecommendations', state.language)}
        />
      )}
    </div>
  );
}
