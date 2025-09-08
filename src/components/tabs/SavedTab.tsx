import React, { useState } from 'react';
import { Bookmark, Grid3X3, Grid2X2, LayoutGrid, List, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { ListingCard } from '../listing/ListingCard';
import { EmptyState } from '../ui/EmptyState';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { mockListings } from '../../data/mockListings';

interface SavedTabProps {
  onViewListing: (listingId: string) => void;
}

type ViewMode = 'large' | 'medium' | 'small' | 'list';
export function SavedTab({ onViewListing }: SavedTabProps) {
  const { state, toggleSavedListing } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('medium');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const savedListings = mockListings.filter(listing => 
    state.savedListings.includes(listing.id)
  );

  const handleBulkRemove = () => {
    selectedItems.forEach(id => toggleSavedListing(id));
    setSelectedItems([]);
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkRemove}
              className="text-light-highlight border-light-highlight hover:bg-light-highlight hover:text-white"
            >
              <Trash2 className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              Remove ({selectedItems.length})
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