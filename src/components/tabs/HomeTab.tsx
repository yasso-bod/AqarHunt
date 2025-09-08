import React, { useState } from 'react';
import { Sparkles as WandSparkles, Building2, Sparkles, Grid2X2, LayoutGrid, Grid3X3 } from 'lucide-react';
import { SearchBar } from '../search/SearchBar';
import { ListingCard } from '../listing/ListingCard';
import { EstimateModal } from '../modals/EstimateModal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { useToast } from '../ui/Toast';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { searchListings, getListing, getRecommendationsByPropertyLive } from '../../services/listingService';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { Listing } from '../../types';
import { getSignals } from '../../utils/interactionStore';

interface HomeTabProps {
  onViewListing: (listingId: string) => void;
  onCreateListing: () => void;
  onNavigateToSearch: () => void;
}

export function HomeTab({ onViewListing, onCreateListing, onNavigateToSearch }: HomeTabProps) {
  const { state, setSearchFilters } = useApp();
  const { showToast } = useToast();
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'large' | 'medium' | 'small'>('medium');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Personalized rails
  const [loadingRails, setLoadingRails] = useState(true);
  const [similarToSaves, setSimilarToSaves] = useState<Listing[]>([]);
  const [becauseYouViewed, setBecauseYouViewed] = useState<Listing[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([]);
  const [trending, setTrending] = useState<Listing[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const quickFilters = [
    { label: t('apartments', state.language), filter: { property_type: 'Apartment' } },
    { label: t('villas', state.language), filter: { property_type: 'Villa' } },
    { label: t('studios', state.language), filter: { property_type: 'Studio' } },
    { label: t('cairo', state.language), filter: { city: 'Cairo' } },
    { label: t('giza', state.language), filter: { city: 'Giza' } },
  ];

  // Load initial listings
  React.useEffect(() => { loadListings(true); }, []);

  // Load personalized rails
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingRails(true);
        const { saved, viewed } = getSignals();

        // recent viewed details
        const recent = await Promise.all(
          [...new Set(viewed)].slice(0, 6).map(id => getListing(id).catch(() => null))
        );
        const recentValid = (recent.filter(Boolean) as Listing[]);
        setRecentlyViewed(recentValid);

        // similar to saves OR because you viewed
        const seedsForSimilar = saved.length ? saved.slice(0, 4) : viewed.slice(0, 4);
        if (seedsForSimilar.length) {
          const all: Listing[] = [];
          for (const seed of seedsForSimilar) {
            const recs = await getRecommendationsByPropertyLive(seed, 6);
            all.push(...recs);
            if (!mounted) return;
          }
          // simple dedupe by id
          const seen = new Set<string>();
          const deduped = all.filter(x => !seen.has(String(x.id)) && seen.add(String(x.id)));
          if (saved.length) setSimilarToSaves(deduped.slice(0, 12));
          else setBecauseYouViewed(deduped.slice(0, 12));
        } else {
          setSimilarToSaves([]);
          setBecauseYouViewed([]);
        }

        // trending near last viewed city/town or general fallback
        if (recentValid[0]) {
          const seed = recentValid[0];
          const res = await searchListings({ city: seed.city, town: seed.town, limit: 12, page: 1 });
          setTrending(res.items || []);
        } else {
          const res = await searchListings({ limit: 12, page: 1 });
          setTrending(res.items || []);
        }
      } finally {
        if (mounted) setLoadingRails(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadListings = async (reset = false) => {
    try {
      if (reset) { setLoading(true); setPage(1); }
      const currentPage = reset ? 1 : page;
      const response = await searchListings({}, currentPage, 30);
      if (reset) setListings(response.items);
      else setListings(prev => [...prev, ...response.items]);
      setHasMore(response.items.length >= 30);
      if (!reset) setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load listings:', error);
      showToast({
        type: 'error',
        title: 'Failed to load listings from API',
        message: error instanceof Error ? error.message : 'Please try again later',
      });
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll
  const [sentinelRef, isFetching, setIsFetchingMore] = useInfiniteScroll(
    async () => {
      if (hasMore && !loading) {
        setIsFetchingMore(true);
        await loadListings(false);
        setIsFetchingMore(false);
      }
    }
  );

  const handleQuickFilter = (filter: any) => {
    setSearchFilters(filter);
    onNavigateToSearch();
  };
  const handleSearch = (_query: string) => onNavigateToSearch();

  const displayListings = listings.slice(0, 6);

  const viewOptions = [
    { mode: 'large' as const, icon: Grid2X2, cols: 'grid-cols-1 sm:grid-cols-2' },
    { mode: 'medium' as const, icon: LayoutGrid, cols: 'grid-cols-2 sm:grid-cols-3' },
    { mode: 'small' as const, icon: Grid3X3, cols: 'grid-cols-2 sm:grid-cols-4' },
  ];

  const Rail = ({ title, items, railKey }: { title: string; items: Listing[]; railKey: string }) => {
    if (loadingRails) {
      return (
        <div className="space-y-2">
          <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">{title}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded animate-pulse" />)}
          </div>
        </div>
      );
    }
    if (!items.length) return null;
    const isExpanded = !!expanded[railKey];
    const shown = isExpanded ? items : items.slice(0, 8);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">{title}</h3>
          <Button variant="outline" size="sm" onClick={() => setExpanded(e => ({ ...e, [railKey]: !isExpanded }))}>
            {isExpanded ? 'Collapse' : 'See all'}
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {shown.map(l => (
            <ListingCard key={l.id} listing={l} onClick={() => onViewListing(l.id)} variant="small" />
          ))}
        </div>
      </div>
    );
  };

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

      {/* NEW: Personalized rails */}
      <Rail title="Similar to your saves" items={similarToSaves} railKey="saves" />
      <Rail title="Because you viewed" items={becauseYouViewed} railKey="viewed" />
      <Rail title="Recently viewed" items={recentlyViewed} railKey="recent" />
      <Rail title="Trending near you" items={trending} railKey="trend" />

      {/* CTA Section */}
      <Card className="p-6 bg-gradient-primary dark:bg-gradient-primary-dark">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-h2 font-bold text-white">{t('getInstantPrice', state.language)}</h2>
          <p className="text-white/90 text-sm">{t('listYourProperty', state.language)}</p>
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

      {/* Recent Listings (unchanged) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
            {t('recentListings', state.language)}
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
          <div className={`grid gap-4 ${viewOptions.find(v => v.mode === viewMode)?.cols}`}>
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
        ) : (
          <div className={`grid gap-4 ${viewOptions.find(v => v.mode === viewMode)?.cols}`}>
            {displayListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onClick={() => onViewListing(listing.id)}
                variant={viewMode}
              />
            ))}
          </div>
        )}
      </div>

      <EstimateModal
        isOpen={showEstimateModal}
        onClose={() => setShowEstimateModal(false)}
        onContinueToListing={onCreateListing}
      />

      <div ref={sentinelRef} className="h-4" />
    </div>
  );
}