import React, { useState } from 'react';
import { ArrowLeft, Heart, Share, Sparkles as WandSparkles, Stars, Bed, Bath, Ruler, MapPin, ShieldCheck, Phone, MessageCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EstimateModal } from '../modals/EstimateModal';
import { RecommendationCarousel } from '../listing/RecommendationCarousel';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { mockListings } from '../../data/mockListings';
import { generateSimilarListings } from '../../utils/searchUtils';
import { cn } from '../../utils/cn';

interface ListingDetailsProps {
  listingId: string;
  onBack: () => void;
  onViewListing: (listingId: string) => void;
}

export function ListingDetails({ listingId, onBack, onViewListing }: ListingDetailsProps) {
  const { state, toggleSavedListing } = useApp();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  
  const listing = mockListings.find(l => l.id === listingId);
  const isSaved = state.savedListings.includes(listingId);
  
  React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onBack();
      }
    };

    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onBack]);

  if (!listing) {
    return (
      <div className="p-4">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
          Back
        </Button>
        <p className="mt-4 text-center">Listing not found</p>
      </div>
    );
  }

  const similarListings = generateSimilarListings(listing, mockListings);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${listing.property_type} in ${listing.city}`,
        text: `Check out this ${listing.property_type} for ${listing.price?.toLocaleString()} EGP`,
        url: window.location.href,
      });
    }
  };

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-sm border-b border-light-border dark:border-dark-muted px-4 py-3">
        <div className="flex items-center justify-between">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
            Back
          </Button>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
            >
              <Share className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => toggleSavedListing(listingId)}
              variant={isSaved ? "primary" : "outline"}
              size="sm"
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Image Gallery */}
        <div className="relative aspect-[16/10] rounded-aqar overflow-hidden">
          <img
            src={listing.images[currentImageIndex]}
            alt={`${listing.property_type} in ${listing.city}`}
            className="w-full h-full object-cover"
          />
          
          {listing.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 rtl:space-x-reverse">
              {listing.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Price and Verification */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
              {listing.price?.toLocaleString() || 'Price on request'} {t('egp', state.language)}
            </h1>
            {listing.estimated_price && listing.estimated_price !== listing.price && (
              <p className="text-light-text/70 dark:text-dark-muted">
                Est. {listing.estimated_price.toLocaleString()} {t('egp', state.language)}
              </p>
            )}
          </div>
          
          {listing.verified && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-light-info/20 text-light-info px-3 py-1 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">{t('verified', state.language)}</span>
            </div>
          )}
        </div>

        {/* Property Details */}
        <Card className="p-4 space-y-4">
          <h2 className="text-h2 font-semibold text-light-text dark:text-dark-text capitalize">
            {t(listing.property_type, state.language)} in {listing.district_compound}
          </h2>
          
          <div className="flex items-center text-light-text/70 dark:text-dark-muted">
            <MapPin className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
            <span>{listing.city}, {listing.town}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Bed className="w-5 h-5 text-light-primary dark:text-dark-text" />
              </div>
              <p className="text-sm text-light-text/70 dark:text-dark-muted">Bedrooms</p>
              <p className="font-semibold text-light-text dark:text-dark-text">{listing.bedrooms}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Bath className="w-5 h-5 text-light-primary dark:text-dark-text" />
              </div>
              <p className="text-sm text-light-text/70 dark:text-dark-muted">Bathrooms</p>
              <p className="font-semibold text-light-text dark:text-dark-text">{listing.bathrooms}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Ruler className="w-5 h-5 text-light-primary dark:text-dark-text" />
              </div>
              <p className="text-sm text-light-text/70 dark:text-dark-muted">Size</p>
              <p className="font-semibold text-light-text dark:text-dark-text">{listing.size}{t('squareMeters', state.language)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-light-primary-200 dark:bg-dark-muted text-light-text dark:text-dark-text text-sm rounded-full capitalize">
              {listing.offering_type}
            </span>
            {listing.furnished && (
              <span className="px-3 py-1 bg-light-info/20 text-light-info dark:bg-dark-muted dark:text-dark-text text-sm rounded-full">
                {t('furnished', state.language)}
              </span>
            )}
            <span className="px-3 py-1 bg-light-primary-200 dark:bg-dark-muted text-light-text dark:text-dark-text text-sm rounded-full capitalize">
              {listing.completion_status.replace('_', ' ')}
            </span>
          </div>
        </Card>

        {/* Actions */}
        {!listing.price ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="gradient"
              onClick={() => setShowEstimateModal(true)}
            >
              <WandSparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('estimatePrice', state.language)}
            </Button>
            
            <Button variant="outline">
              <Stars className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('similarProperties', state.language)}
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full">
            <Stars className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
            {t('similarProperties', state.language)}
          </Button>
        )}

        {/* Contact Seller */}
        <Card className="p-4">
          <h3 className="font-semibold text-light-text dark:text-dark-text mb-3">
            {t('contactSeller', state.language)}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="flex items-center justify-center">
              <Phone className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              Call
            </Button>
            <Button variant="outline" className="flex items-center justify-center">
              <MessageCircle className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              Message
            </Button>
          </div>
        </Card>

        {/* Similar Properties */}
        {similarListings.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
              {t('similarProperties', state.language)}
            </h3>
            <RecommendationCarousel
              listings={similarListings}
              onViewListing={onViewListing}
            />
          </div>
        )}
      </div>

      {/* Estimate Modal */}
      <EstimateModal
        isOpen={showEstimateModal}
        onClose={() => setShowEstimateModal(false)}
        initialData={listing}
      />
    </div>
  );
}