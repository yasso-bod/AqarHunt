import React from 'react';
import { Heart, Bed, Bath, Ruler, MapPin, ShieldCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { Listing } from '../../types';
import { cn } from '../../utils/cn';

interface ListingCardProps {
  listing: Listing;
  onClick: () => void;
  variant?: 'extra-large' | 'large' | 'medium' | 'small' | 'compact' | 'list';
}

export function ListingCard({ listing, onClick, variant = 'medium' }: ListingCardProps) {
  const { state, toggleSavedListing } = useApp();
  const isSaved = state.savedListings.includes(listing.id);

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSavedListing(listing.id);
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Price on request';
    return `${price.toLocaleString()} ${t('egp', state.language)}`;
  };

  const formatBedrooms = (bedrooms?: number) => {
    return bedrooms || 0;
  };

  const formatBathrooms = (bathrooms?: number) => {
    return bathrooms || 0;
  };

  const formatSize = (size?: number) => {
    return size || 0;
  };

  const getImageAspect = () => {
    switch (variant) {
      case 'extra-large': return 'aspect-[16/9]';
      case 'large': return 'aspect-[4/3]';
      case 'medium': return 'aspect-[4/3]';
      case 'small': return 'aspect-square';
      case 'list': return 'aspect-[16/10]';
      default: return 'aspect-[4/3]';
    }
  };

  const getCardLayout = () => {
    if (variant === 'list') {
      return 'flex flex-row';
    }
    return 'flex flex-col';
  };

  const getImageContainer = () => {
    if (variant === 'list') {
      return 'w-32 sm:w-48 flex-shrink-0';
    }
    return 'w-full';
  };

  const getContentPadding = () => {
    switch (variant) {
      case 'extra-large': return 'p-6';
      case 'large': return 'p-4';
      case 'medium': return 'p-3';
      case 'small': return 'p-2';
      case 'list': return 'p-4';
      default: return 'p-3';
    }
  };

  const getTextSize = () => {
    switch (variant) {
      case 'extra-large': return { title: 'text-lg', details: 'text-base', meta: 'text-sm' };
      case 'large': return { title: 'text-base', details: 'text-sm', meta: 'text-xs' };
      case 'medium': return { title: 'text-sm', details: 'text-xs', meta: 'text-xs' };
      case 'small': return { title: 'text-xs', details: 'text-xs', meta: 'text-xs' };
      case 'list': return { title: 'text-base', details: 'text-sm', meta: 'text-xs' };
      default: return { title: 'text-sm', details: 'text-xs', meta: 'text-xs' };
    }
  };

  const textSizes = getTextSize();

  return (
    <Card hover onClick={onClick} className={cn('overflow-hidden', getCardLayout())}>
      <div className={cn('relative', getImageContainer())}>
        <div className={getImageAspect()}>
          {listing.images && listing.images.length > 0 ? (
            <img
              src={listing.images[0]}
              alt={`${t(listing.property_type, state.language)} in ${listing.city}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-light-primary-200 dark:bg-dark-muted flex items-center justify-center">
              <span className="text-light-text/50 dark:text-dark-muted text-sm">
                {t('noPhoto', state.language)}
              </span>
            </div>
          )}
          
          {/* Save Button */}
          <button
            onClick={handleSaveClick}
            className={cn(
              'absolute top-2 right-2 rtl:right-auto rtl:left-2 rounded-full flex items-center justify-center transition-all',
              variant === 'small' ? 'w-6 h-6' : 'w-8 h-8',
              isSaved
                ? 'bg-light-highlight text-white'
                : 'bg-white/80 text-light-text hover:bg-white'
            )}
          >
            <Heart className={cn(variant === 'small' ? 'w-3 h-3' : 'w-4 h-4', isSaved && 'fill-current')} />
          </button>

          {/* Verified Badge */}
          {listing.verified && variant !== 'small' && (
            <div className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-light-info text-white px-2 py-1 rounded-full flex items-center space-x-1 rtl:space-x-reverse text-xs font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>{t('verified', state.language)}</span>
            </div>
          )}

          {/* Price Badge */}
          <div className={cn(
            'absolute bottom-2 left-2 rtl:left-auto rtl:right-2 bg-black/70 text-white rounded-full font-bold',
            variant === 'small' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'
          )}>
            {variant === 'small' 
              ? `${Math.round((listing.price || listing.estimated_price || 0) / 1000)}K`
              : formatPrice(listing.price || listing.estimated_price)
            }
          </div>
        </div>
      </div>

      <div className={cn(getContentPadding(), 'space-y-2 flex-1')}>
        {/* Property Info */}
        <div className={cn('space-y-1', variant === 'small' && 'space-y-0')}>
          <h3 className={cn('font-semibold text-light-text dark:text-dark-text capitalize', textSizes.title)}>
            {t(listing.property_type?.toLowerCase() || 'apartment', state.language)} • {formatBedrooms(listing.bedrooms)} {t('br', state.language)} • {formatSize(listing.size)} {t('squareMeters', state.language)}
          </h3>
          
          <div className={cn('flex items-center text-light-text/70 dark:text-dark-muted', textSizes.meta)}>
            <MapPin className={cn('mr-1 rtl:mr-0 rtl:ml-1', variant === 'small' ? 'w-3 h-3' : 'w-4 h-4')} />
            <span>{listing.city || 'Unknown'}, {listing.town || 'Unknown'}</span>
          </div>
        </div>

        {/* Property Details */}
        {variant !== 'small' && (
          <div className={cn('flex items-center justify-between text-light-text/70 dark:text-dark-muted', textSizes.details)}>
            <div className={cn('flex items-center', variant === 'list' ? 'space-x-4 rtl:space-x-reverse' : 'space-x-3 rtl:space-x-reverse')}>
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                <Bed className="w-4 h-4" />
                <span>{formatBedrooms(listing.bedrooms)}</span>
              </div>
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                <Bath className="w-4 h-4" />
                <span>{formatBathrooms(listing.bathrooms)}</span>
              </div>
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                <Ruler className="w-4 h-4" />
                <span>{formatSize(listing.size)}{t('squareMeters', state.language)}</span>
              </div>
            </div>
            
            <span className="capitalize text-light-primary dark:text-dark-primary font-medium">
              {listing.offering_type || 'sale'}
            </span>
          </div>
        )}

        {/* Tags */}
        {variant !== 'small' && (
          <div className="flex flex-wrap gap-1">
            {listing.furnished && (
              <span className={cn('px-2 py-1 bg-light-primary-200 dark:bg-dark-subtle text-light-text dark:text-dark-text rounded-full', textSizes.meta)}>
                {t('furnished', state.language)}
              </span>
            )}
            {listing.completion_status && (
              <span className={cn('px-2 py-1 bg-light-info/20 text-light-info dark:bg-dark-subtle dark:text-dark-accent rounded-full capitalize', textSizes.meta)}>
                {listing.completion_status.replace('_', ' ')}
              </span>
            )}
          </div>
        )}

        {/* Small variant compact info */}
        {variant === 'small' && (
          <div className="flex items-center justify-between text-xs text-light-text/70 dark:text-dark-muted">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span>{formatBedrooms(listing.bedrooms)}</span>
              <span>•</span>
              <span>{formatBathrooms(listing.bathrooms)}</span>
            </div>
            <span className="text-light-primary dark:text-dark-primary font-medium">
              {listing.offering_type || 'sale'}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}