import React, { useState } from 'react';
import {
  Stars, Sparkles, Filter, Grid3X3, Grid2X2, LayoutGrid, List, Building2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ListingCard } from '../listing/ListingCard';
import { EmptyState } from '../ui/EmptyState';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { getListing, searchListings } from '../../services/listingService';
import { api } from '../../utils/api';
import { useToast } from '../ui/Toast';
import { Listing } from '../../types';

interface RecommendationsTabProps { onViewListing: (listingId: string) => void; }
type ViewMode = 'large' | 'medium' | 'small' | 'list';

export function RecommendationsTab({ onViewListing }: RecommendationsTabProps) {
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

  React.useEffect(() => { loadAvailableListings(); }, []);
  async function loadAvailableListings() {
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
  }

  async function handleGetRecommendations(type: 'similar' | 'filtered') {
    if (!selectedListingId) return;
    try {
      setLoading(true);
      setRecommendationType(type);
      setRecommendations([]);

      if (type === 'similar') {
        const rec = await api.recLive({ property_id: selectedListingId, top_k: 12 });
        const ids = (rec?.items || []).map((x: any) => String(x.property_id));
        const details = await Promise.all(ids.map((id: string) => getListing(id).catch(() => null)));
        setRecommendations(details.filter(Boolean) as Listing[]);
      } else {
        const filters: any = {};
        const recWithin = await api.recWithinLive({ property_id: selectedListingId, top_k: 12, filters });
        const ids = (recWithin?.items || []).map((x: any) => String(x.property_id));
        if (!ids.length) {
          setRecommendations([]);
          showToast({ type: 'info', title: 'No results under current filters', message: 'Try relaxing your filters.' });
          return;
        }
        const details = await Promise.all(ids.map((id: string) => getListing(id).catch(() => null)));
        setRecommendations(details.filter(Boolean) as Listing[]);
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

      {/* Listing Selector (Existing Listing only) */}
      <Card className="p-4 space-y-4">
        <div className="flex bg-light-primary-200 dark:bg-dark-surface rounded-aqar p-1 mb-4">
          <button
            className="flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse bg-white dark:bg-dark-primary text-light-primary dark:text-dark-text"
            disabled
          >
            <Building2 className="w-4 h-4" />
            <span className="font-medium">{t('useExistingListing', state.language)}</span>
          </button>
        </div>

        <h3 className="font-semibold text-light-text dark:text-dark-text">
          {t('selectPropertyForRecommendations', state.language)}
        </h3>

        <select
          value={selectedListingId}
          onChange={(e) => setSelectedListingId(e.target.value)}
          disabled={loadingListings}
          className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
        >
          <option value="">
            {loadingListings ? 'Loading...' : t('chooseProperty', state.language)}
          </option>
          {availableListings.map((listing) => (
            <option key={listing.id} value={listing.id}>
              {listing.property_type} in {listing.city}, {listing.town}
              {listing.price && ` - ${listing.price.toLocaleString()} EGP`}
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

      {/* Recommendations Results */}
      {recommendationType && recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
              {recommendationType === 'similar' ? t('similarProperties', state.language) : t('recommendations', state.language)}
              {loading && (
                <span className="text-sm font-normal text-light-text/70 dark:text-dark-muted ml-2">
                  Loading...
                </span>
              )}
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

          {loading ? (
            <div className={`grid gap-3 ${viewOptions.find(v => v.mode === viewMode)?.cols}`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-dark-surface rounded-aqar border border-light-border dark:border-dark-muted p-4 space-y-4">
                  <div className="h-32 bg-light-primary-200 dark:bg-dark-muted rounded animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 bg-light-primary-200 dark:bg-dark-muted rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-light-primary-200 dark:bg-dark-muted rounded w-1/2 animate-pulse" />
                    <div className="h-6 bg-light-primary-200 dark:bg-dark-muted rounded w-1/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
          )}
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
