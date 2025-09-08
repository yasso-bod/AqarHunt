import React, { useState } from 'react';
import { Bookmark, Grid3X3, Grid2X2, LayoutGrid, List, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { ListingCard } from '../listing/ListingCard';
import { EmptyState } from '../ui/EmptyState';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { getListing } from '../../services/listingService';
import { useToast } from '../ui/Toast';
import { Listing } from '../../types';

interface SavedTabProps {
  onViewListing: (listingId: string) => void;
}

type ViewMode = 'large' | 'medium' | 'small' | 'list';
export function SavedTab({ onViewListing }: SavedTabProps) {
  const { state, toggleSavedListing } = useApp();
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('medium');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Load saved listings from API
  React.useEffect(() => {
    loadSavedListings();
  }, [state.savedListings]);

  const loadSavedListings = async () => {
    if (state.savedListings.length === 0) {
      setSavedListings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const results = await Promise.all(
        state.savedListings.map(async (id) => {
          try {
            return await getListing(id);
          } catch (e: any) {
            // 404 => drop the stale mock id
            if (e?.status === 404) return null;
            // Any other error — log and skip, do not break the whole page
            console.warn("Saved getListing failed", id, e);
            return null;
          }
        })
      );
      setSavedListings(results.filter(Boolean) as Listing[]);
    } catch (error) {
      console.error('Failed to load saved listings:', error);
      showToast({
        type: 'error',
        title: 'Failed to load some saved listings',
        message: error instanceof Error ? error.message : 'Please try again later',
      });
      setSavedListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRemove = () => {
    selectedItems.forEach(id => toggleSavedListing(id));
    setSelectedItems([]);
  };

  const handleSelectAll = () => {
    if (selectedItems.length === savedListings.length) {
      // If all are selected, deselect all
      setSelectedItems([]);
    } else {
      // Select all listings
      setSelectedItems(savedListings.map(listing => listing.id));
    }
  };

  const viewOptions = [
    { mode: 'large' as ViewMode, icon: Grid2X2, cols: 'grid-cols-1 sm:grid-cols-2' },
    { mode: 'medium' as ViewMode, icon: LayoutGrid, cols: 'grid-cols-2 sm:grid-cols-3' },
    { mode: 'small' as ViewMode, icon: Grid3X3, cols: 'grid-cols-2 sm:grid-cols-4' },
    { mode: 'list' as ViewMode, icon: List, cols: 'grid-cols-1' },
  ];

  const toggleSelection = (listingId: string) => {
    setSelectedItems(prev => 
      prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    );
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-dark-surface rounded-aqar border border-light-border dark:border-dark-muted p-4 space-y-4">
              <div className="h-32 bg-light-primary-200 dark:bg-dark-muted rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-light-primary-200 dark:bg-dark-muted rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-light-primary-200 dark:bg-dark-muted rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (savedListings.length === 0) {
    return (
      <div className="px-4 py-6">
        <EmptyState
          icon={<Bookmark className="w-full h-full" />}
          title="No Saved Properties"
          description="Properties you save will appear here for easy access"
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-h1 font-bold text-light-text dark:text-dark-text">
          {t('saved', state.language)} ({savedListings.length})
        </h2>
        
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {selectedItems.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-light-primary border-light-primary hover:bg-light-primary hover:text-white dark:text-dark-text dark:border-dark-primary dark:hover:bg-dark-primary"
              >
                {selectedItems.length === savedListings.length ? 
                  (state.language === 'ar' ? 'إلغاء تحديد الكل' : 'Deselect All') : 
                  t('selectAll', state.language)
                }
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRemove}
                className="text-light-highlight border-light-highlight hover:bg-light-highlight hover:text-white"
              >
                <Trash2 className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {t('remove', state.language)} ({selectedItems.length})
              </Button>
            </>
          )}
          
          {selectedItems.length === 0 && savedListings.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-light-primary border-light-primary hover:bg-light-primary hover:text-white dark:text-dark-text dark:border-dark-primary dark:hover:bg-dark-primary"
            >
              {t('selectAll', state.language)}
            </Button>
          )}
          
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
      </div>

      {/* Listings Grid */}
      <div className={`grid gap-3 ${viewOptions.find(v => v.mode === viewMode)?.cols}`}>
        {savedListings.map((listing) => (
          <div key={listing.id} className="relative">
            {/* Selection Checkbox */}
            <button
              onClick={() => toggleSelection(listing.id)}
              className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedItems.includes(listing.id)
                  ? 'bg-light-primary border-light-primary text-white'
                  : 'bg-white/80 border-light-border hover:border-light-primary'
              }`}
            >
              {selectedItems.includes(listing.id) && (
                <div className="w-3 h-3 bg-white rounded-full" />
              )}
            </button>
            
            <ListingCard
              listing={listing}
              onClick={() => onViewListing(listing.id)}
              variant={viewMode}
            />
          </div>
        ))}
      </div>
    </div>
  );
}