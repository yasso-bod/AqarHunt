import React, { useState } from 'react';
import { ArrowLeft, Heart, Share, Sparkles as WandSparkles, Stars, Bed, Bath, Ruler, MapPin, ShieldCheck, Phone, MessageCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EstimateModal } from '../modals/EstimateModal';
import { RecommendationCarousel } from '../listing/RecommendationCarousel';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { getListing, getRecommendationsByPropertyLive } from '../../services/listingService';
import { useToast } from '../ui/Toast';
import { cn } from '../../utils/cn';
import { Listing } from '../../types';

// Helper function to translate city names
const translateCity = (city: string, language: string) => {
  // Revert to English for all locations until proper Arabic localization is implemented
  return city;
};

// Helper function to translate town/area names
const translateTown = (town: string, language: string) => {
  // Revert to English for all locations until proper Arabic localization is implemented
  return town;
};

interface ListingDetailsProps {
  listingId: string;
  initialListingData?: Listing | null;
  onBack: () => void;
  onViewListing: (listingId: string, listingData?: Listing) => void;
}

export function ListingDetails({ listingId, initialListingData, onBack, onViewListing }: ListingDetailsProps) {
  const { state, toggleSavedListing } = useApp();
  const { showToast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [listing, setListing] = useState<Listing | null>(initialListingData || null);
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(!initialListingData);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarPropertiesRequested, setSimilarPropertiesRequested] = useState(false);
  
  const isSaved = listing ? state.savedListings.includes(listing.id) : false;
  
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

  // Load listing details
  React.useEffect(() => {
    if (!initialListingData) {
      loadListing();
    }
  }, [listingId]);

  // Load similar listings when listing is loaded
  React.useEffect(() => {
    if (listing && !similarPropertiesRequested) {
      // Don't auto-load similar listings anymore
      // They will be loaded when user clicks the button
    }
  }, [listing, similarPropertiesRequested]);

  // Manual similar properties loading function
  const handleLoadSimilarProperties = async () => {
    if (!listing || loadingSimilar) return;
    
    try {
      setLoadingSimilar(true);
      setSimilarPropertiesRequested(true);
      
      console.log('=== LOADING SIMILAR PROPERTIES ===');
      console.log('Current listing:', {
        id: listing.id,
        property_type: listing.property_type,
        city: listing.city,
        bedrooms: listing.bedrooms,
        size: listing.size
      });
      
      // Use the improved recommendations service
      const similarProperties = await getRecommendationsByPropertyLive(listing.id, 6);
      
      console.log('Similar properties loaded:', similarProperties.length);
      if (similarProperties.length > 0) {
        console.log('Sample similar property:', {
          id: similarProperties[0].id,
          property_type: similarProperties[0].property_type,
          bedrooms: similarProperties[0].bedrooms,
          size: similarProperties[0].size,
          price: similarProperties[0].price
        });
      }
      
      setSimilarListings(similarProperties);
      
      if (similarProperties.length === 0) {
        showToast({
          type: 'info',
          title: 'No similar properties found',
          message: 'We couldn\'t find properties similar to this one at the moment.',
        });
      }
    } catch (error) {
      console.error('Failed to load similar properties:', error);
      showToast({
        type: 'error',
        title: 'Failed to load similar properties',
        message: error instanceof Error ? error.message : 'Please try again later',
      });
      setSimilarListings([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const loadListing = async () => {
    if (initialListingData) return;
    
    try {
      setLoading(true);
      const listingData = await getListing(listingId);
      setListing(listingData);
    } catch (error) {
      console.error('Failed to load listing:', error);
      showToast({
        type: 'error',
        title: 'Listing not found',
        message: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSimilarListings = async () => {
    if (!listing) return;
    
    try {
      console.log('Loading similar properties for listing:', listing.id);
      
      // First try the live recommendations API
      const recResponse = await api.recLive({ property_id: listing.id, top_k: 10 });
      console.log('Recommendations API response:', recResponse);
      
      // Extract property IDs from recommendation response
      const propertyIds = recResponse.items?.map((item: any) => String(item.property_id)) || [];
      console.log('Property IDs from recommendations:', propertyIds);
      
      if (propertyIds.length === 0) {
        console.log('No property IDs returned from recommendations API');
        setSimilarListings([]);
        showToast({
          type: 'info',
          title: 'No similar properties found',
          message: 'We couldn\'t find properties similar to this one at the moment.',
        });
        return;
      }
      
      // Fetch full listing details for each recommended property
      console.log('Fetching details for recommended properties...');
      const detailsPromises = propertyIds.slice(0, 6).map(async (id: string) => {
        try {
          console.log(`Fetching details for property ${id}`);
          const propertyDetails = await getListing(id);
          console.log(`Successfully loaded property ${id}:`, propertyDetails);
          return propertyDetails;
        } catch (error) {
          console.warn(`Failed to load details for listing ${id}:`, error);
          return null;
        }
      });
      
      const fullListings = await Promise.all(detailsPromises);
      const validListings = fullListings.filter(Boolean) as Listing[];
      
      console.log('Valid similar listings loaded:', validListings.length);
      console.log('Sample listing data:', validListings[0]);
      
      setSimilarListings(validListings);
      
      if (validListings.length === 0) {
        showToast({
          type: 'info',
          title: 'No similar properties found',
          message: 'We couldn\'t find properties similar to this one at the moment.',
        });
      }
    } catch (error) {
      console.error('Failed to load similar listings:', error);
      // Re-throw to be handled by the calling function
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-sm border-b border-light-border dark:border-dark-muted px-4 py-3">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
            Back
          </Button>
        </div>
        <div className="px-4 py-6 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="aspect-[16/10] bg-light-primary-200 dark:bg-dark-muted rounded-aqar" />
            <div className="h-8 bg-light-primary-200 dark:bg-dark-muted rounded w-1/2" />
            <div className="h-4 bg-light-primary-200 dark:bg-dark-muted rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

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
              onClick={() => toggleSavedListing(listing.id)}
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
          {listing.images && listing.images.length > 0 ? (
            <img
              src={listing.images[currentImageIndex]}
              alt={`${listing.property_type} in ${listing.city}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-light-primary-200 dark:bg-dark-muted flex items-center justify-center">
              <span className="text-light-text/50 dark:text-dark-muted">
                {t('noPhoto', state.language)}
              </span>
            </div>
          )}
          
          {listing.images && listing.images.length > 1 && (
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
            <span>
              {translateCity(listing.city, state.language)}, {translateTown(listing.town, state.language)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Bed className="w-5 h-5 text-light-primary dark:text-dark-text" />
              </div>
              <p className="text-sm text-light-text/70 dark:text-dark-muted">{t('bedrooms', state.language)}</p>
              <p className="font-semibold text-light-text dark:text-dark-text">{listing.bedrooms}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Bath className="w-5 h-5 text-light-primary dark:text-dark-text" />
              </div>
              <p className="text-sm text-light-text/70 dark:text-dark-muted">{t('bathrooms', state.language)}</p>
              <p className="font-semibold text-light-text dark:text-dark-text">{listing.bathrooms}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Ruler className="w-5 h-5 text-light-primary dark:text-dark-text" />
              </div>
              <p className="text-sm text-light-text/70 dark:text-dark-muted">{t('size', state.language)}</p>
              <p className="font-semibold text-light-text dark:text-dark-text">{listing.size}{t('squareMeters', state.language)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-light-primary-200 dark:bg-dark-muted text-light-text dark:text-dark-text text-sm rounded-full capitalize">
              {listing.offering_type === 'sale' 
                ? (state.language === 'ar' ? 'بيع' : 'Sale')
                : listing.offering_type === 'rent'
                ? (state.language === 'ar' ? 'إيجار' : 'Rent')
                : listing.offering_type
              }
            </span>
            {listing.furnished && (
              <span className="px-3 py-1 bg-light-info/20 text-light-info dark:bg-dark-muted dark:text-dark-text text-sm rounded-full">
                {t('furnished', state.language)}
              </span>
            )}
            <span className="px-3 py-1 bg-light-primary-200 dark:bg-dark-muted text-light-text dark:text-dark-text text-sm rounded-full capitalize">
              {(listing.completion_status || '').replace('_', ' ')}
            </span>
          </div>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!listing.price && (
            <Button
              variant="gradient"
              onClick={() => setShowEstimateModal(true)}
            >
              <WandSparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('estimatePrice', state.language)}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={handleLoadSimilarProperties}
            disabled={loadingSimilar}
            className={!listing.price ? "" : "col-span-full"}
          >
            <Stars className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
            {loadingSimilar ? 'Loading...' : t('similarProperties', state.language)}
          </Button>
        </div>

        {/* Contact Seller */}
        <Card className="p-4">
          <h3 className="font-semibold text-light-text dark:text-dark-text mb-3">
            {t('contactSeller', state.language)}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="flex items-center justify-center">
              <Phone className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('call', state.language)}
            </Button>
            <Button variant="outline" className="flex items-center justify-center">
              <MessageCircle className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('message', state.language)}
            </Button>
          </div>
        </Card>

        {/* Similar Properties */}
        {similarPropertiesRequested && (
          <div className="space-y-4">
            <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
              {t('similarProperties', state.language)}
              {similarListings.length > 0 && (
                <span className="text-sm font-normal text-light-text/70 dark:text-dark-muted ml-2">
                  ({similarListings.length} found)
                </span>
              )}
            </h3>
            
            {loadingSimilar ? (
              <div className="flex justify-center py-8">
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-light-text/70 dark:text-dark-muted">
                  <div className="w-4 h-4 border-2 border-light-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading similar properties...</span>
                </div>
              </div>
            ) : similarListings.length > 0 ? (
              <div className="space-y-4">
                <RecommendationCarousel
                  listings={similarListings}
                  onViewListing={onViewListing}
                />
                <div className="text-center">
                  <p className="text-sm text-light-text/70 dark:text-dark-muted">
                    Showing properties similar to this {listing.property_type} in {listing.city}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 text-light-primary-400 dark:text-dark-muted">
                  <Stars className="w-full h-full" />
                </div>
                <p className="text-light-text/70 dark:text-dark-muted">
                  No similar properties found at the moment.
                </p>
                <p className="text-sm text-light-text/50 dark:text-dark-muted/70 mt-2">
                  Try viewing other properties or check back later.
                </p>
              </div>
            )}
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