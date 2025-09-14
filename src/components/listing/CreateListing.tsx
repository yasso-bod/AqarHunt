import React, { useState } from 'react';
import { ArrowLeft, Sparkles as WandSparkles, Camera, MapPin, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { EstimateModal } from '../modals/EstimateModal';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { createListing, getRecommendationsByPropertyLive } from '../../services/listingService';
import { useToast } from '../ui/Toast';
import { Listing } from '../../types';

interface CreateListingProps {
  onBack: () => void;
  onViewListing?: (listingId: string, listingData?: any) => void;
}

export function CreateListing({ onBack, onViewListing }: CreateListingProps) {
  const { state } = useApp();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [newListingId, setNewListingId] = useState<string | null>(null);
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [newListingData, setNewListingData] = useState<any>(null);
  
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

  const [formData, setFormData] = useState({
    property_type: 'apartment',
    offering_type: 'sale',
    completion_status: 'ready',
    furnished: false,
    city: '',
    town: '',
    district_compound: '',
    lat: 30.0444,
    lon: 31.2357,
    bedrooms: 2,
    bathrooms: 1,
    size: 100,
    down_payment: '',
    price: '',
    images: [] as string[]
  });

  const steps = [
    { id: 'basics', title: t('basics', state.language) },
    { id: 'location', title: t('location', state.language) },
    { id: 'specifications', title: t('specifications', state.language) },
    { id: 'pricing', title: t('pricing', state.language) },
    { id: 'photos', title: t('photos', state.language) },
  ];

const propertyTypes = [
  { value: 'Apartment', label: t('apartment', state.language) },
  { value: 'Villa', label: t('villa', state.language) },
  { value: 'Penthouse', label: t('penthouse', state.language) },
  { value: 'Chalet', label: t('chalet', state.language) },
  { value: 'Studio', label: t('studio', state.language) },
  { value: 'Duplex', label: t('duplex', state.language) },
  { value: 'Townhouse', label: t('townhouse', state.language) },
  { value: 'Twin House', label: t('twin_house', state.language) },
  { value: 'Standalone Villa', label: t('standalone_villa', state.language) },
];


  const completionStatuses = [
    { value: 'ready', label: t('ready', state.language) },
    { value: 'under_construction', label: t('underConstruction', state.language) },
    { value: 'off_plan', label: t('offPlan', state.language) },
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const submitListing = async () => {
      try {
        setSubmitting(true);
        
        // Map completion status to API format
        const completionStatusMap = {
          ready: 'Completed',
          under_construction: 'Under Construction',
          off_plan: 'Off Plan',
        };
        
        // Map offering type to API format
        const offeringTypeMap = {
          sale: 'Sale',
          rent: 'Rent',
        };
        
        const response = await createListing({
          property_type: formData.property_type.charAt(0).toUpperCase() + formData.property_type.slice(1), // "Apartment", "Villa", etc.
          city: formData.city,
          town: formData.town,
          district_compound: formData.district_compound,
          completion_status: completionStatusMap[formData.completion_status as keyof typeof completionStatusMap], // "Completed", "Under Construction", "Off Plan"
          offering_type: offeringTypeMap[formData.offering_type as keyof typeof offeringTypeMap], // "Sale", "Rent"
          furnished: formData.furnished ? 'Yes' : 'No',
          lat: formData.lat,
          lon: formData.lon,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          size: formData.size,
          down_payment_price: formData.down_payment ? Number(formData.down_payment) : 0,
          price: formData.price ? Number(formData.price) : undefined,
        });
        
        setNewListingId(response.id);
        setEstimatedPrice(response.estimated_price_egp);
        setFinalPrice(response.final_price_saved);
        setIsSubmitted(true);
        
        // Store the complete listing data for viewing
        const completeListing = {
          id: response.id,
          property_type: formData.property_type,
          city: formData.city,
          town: formData.town,
          district_compound: formData.district_compound,
          completion_status: formData.completion_status,
          offering_type: formData.offering_type,
          furnished: formData.furnished,
          lat: formData.lat,
          lon: formData.lon,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          size: formData.size,
          down_payment: formData.down_payment ? Number(formData.down_payment) : undefined,
          price: response.final_price_saved,
          estimated_price: response.estimated_price_egp,
          images: formData.images,
          verified: false,
        };
        
        // Store for potential viewing
        setNewListingData(completeListing);
        
        // Load similar listings
        try {
          const similar = await getRecommendationsByPropertyLive(response.id, 6);
          setSimilarListings(similar);
        } catch (error) {
          console.error('Failed to load similar listings:', error);
        }
        
      } catch (error) {
        console.error('Failed to create listing:', error);
        showToast({
          type: 'error',
          title: 'Failed to create listing via API',
          message: error instanceof Error ? error.message : 'Please try again later',
        });
      } finally {
        setSubmitting(false);
      }
    };

    submitListing();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basics
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                {t('propertyType', state.language)}
              </label>
              <select
                value={formData.property_type}
                onChange={(e) => handleInputChange('property_type', e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
              >
                {propertyTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                {t('offering', state.language)}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleInputChange('offering_type', 'sale')}
                  className={`p-3 rounded-aqar border-2 transition-colors ${
                    formData.offering_type === 'sale'
                      ? 'border-light-primary bg-light-primary-200 dark:border-dark-primary dark:bg-dark-primary'
                      : 'border-light-border dark:border-dark-muted'
                  }`}
                >
                  <span className="font-medium text-light-text dark:text-dark-text">
                    {t('sale', state.language)}
                  </span>
                </button>
                <button
                  onClick={() => handleInputChange('offering_type', 'rent')}
                  className={`p-3 rounded-aqar border-2 transition-colors ${
                    formData.offering_type === 'rent'
                      ? 'border-light-primary bg-light-primary-200 dark:border-dark-primary dark:bg-dark-primary'
                      : 'border-light-border dark:border-dark-muted'
                  }`}
                >
                  <span className="font-medium text-light-text dark:text-dark-text">
                    {t('rent', state.language)}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                {t('completionStatus', state.language)}
              </label>
              <select
                value={formData.completion_status}
                onChange={(e) => handleInputChange('completion_status', e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
              >
                {completionStatuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-light-primary-200 dark:bg-dark-surface rounded-aqar">
              <span className="font-medium text-light-text dark:text-dark-text">
                {t('furnished', state.language)}
              </span>
              <button
                onClick={() => handleInputChange('furnished', !formData.furnished)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.furnished
                    ? 'bg-light-primary dark:bg-dark-primary'
                    : 'bg-light-border dark:bg-dark-muted'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.furnished ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0.5 rtl:-translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        );

      case 1: // Location
        return (
          <div className="space-y-4">
            <Input
              label={t('city', state.language)}
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="e.g., Cairo"
              required
            />
            <Input
              label={t('town', state.language)}
              value={formData.town}
              onChange={(e) => handleInputChange('town', e.target.value)}
              placeholder="e.g., New Cairo"
              required
            />
            <Input
              label={t('compound', state.language)}
              value={formData.district_compound}
              onChange={(e) => handleInputChange('district_compound', e.target.value)}
              placeholder="e.g., Madinaty"
              required
            />
            
            <Card className="p-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-3">
                <MapPin className="w-5 h-5 text-light-primary dark:text-dark-text" />
                <span className="font-medium text-light-text dark:text-dark-text">Map Location</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Latitude"
                  type="number"
                  step="0.000001"
                  value={formData.lat}
                  onChange={(e) => handleInputChange('lat', Number(e.target.value))}
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="0.000001"
                  value={formData.lon}
                  onChange={(e) => handleInputChange('lon', Number(e.target.value))}
                />
              </div>
            </Card>
          </div>
        );

      case 2: // Specifications
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('bedrooms', state.language)}
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(e) => handleInputChange('bedrooms', Number(e.target.value))}
                required
              />
              <Input
                label={t('bathrooms', state.language)}
                type="number"
                min="0"
                value={formData.bathrooms}
                onChange={(e) => handleInputChange('bathrooms', Number(e.target.value))}
                required
              />
            </div>
            
            <Input
              label={t('size', state.language)}
              type="number"
              min="1"
              value={formData.size}
              onChange={(e) => handleInputChange('size', Number(e.target.value))}
              required
            />

            {formData.offering_type === 'sale' && (
              <Input
                label={t('downPayment', state.language)}
                type="number"
                value={formData.down_payment}
                onChange={(e) => handleInputChange('down_payment', e.target.value)}
                placeholder="Optional"
              />
            )}
          </div>
        );

      case 3: // Pricing
        return (
          <div className="space-y-4">
            <Input
              label={t('askingPrice', state.language)}
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="Enter your asking price"
              required
            />

            <Card className="p-4 text-center">
              <WandSparkles className="w-8 h-8 text-light-primary dark:text-dark-text mx-auto mb-3" />
              <h4 className="font-semibold text-light-text dark:text-dark-text mb-2">
                Get AI Price Estimate
              </h4>
              <p className="text-sm text-light-text/70 dark:text-dark-muted mb-4">
                Our AI will analyze your property details and provide an instant market estimate
              </p>
              <Button
                variant="gradient"
                onClick={() => setShowEstimateModal(true)}
              >
                <WandSparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                Get Instant Estimate
              </Button>
              
              {estimatedPrice && (
                <div className="mt-4 p-3 bg-light-info/20 rounded-aqar">
                  <p className="text-sm text-light-text dark:text-dark-text">
                    Estimated Value: <span className="font-bold">{estimatedPrice.toLocaleString()} EGP</span>
                  </p>
                </div>
              )}
            </Card>
          </div>
        );

      case 4: // Photos
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Camera className="w-12 h-12 text-light-primary dark:text-dark-text mx-auto mb-4" />
              <h4 className="font-semibold text-light-text dark:text-dark-text mb-2">
                {t('uploadPhotos', state.language)}
              </h4>
              <p className="text-sm text-light-text/70 dark:text-dark-muted">
                Add up to 8 high-quality photos of your property
              </p>
            </div>

            <Card className="p-6 border-2 border-dashed border-light-border dark:border-dark-muted text-center">
              <Camera className="w-8 h-8 text-light-primary dark:text-dark-text mx-auto mb-3" />
              <p className="text-light-text dark:text-dark-text mb-2">
                Click to upload photos
              </p>
              <p className="text-sm text-light-text/70 dark:text-dark-muted">
                JPG, PNG up to 10MB each
              </p>
              <div className="mt-4">
                <input
                  id="photo-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    // Mock photo upload
                    const files = Array.from(e.target.files || []);
                    const mockUrls = files.map(() => 
                      'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800'
                    );
                    handleInputChange('images', mockUrls);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  className="mt-2"
                >
                  <Camera className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  Choose Photos
                </Button>
              </div>
            </Card>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-aqar overflow-hidden">
                    <img src={image} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

//   const propertyTypes = [
//   { value: 'Apartment', label: t('apartment', state.language) },
//   { value: 'Villa', label: t('villa', state.language) },
//   { value: 'Penthouse', label: t('penthouse', state.language) },
//   { value: 'Chalet', label: t('chalet', state.language) },
//   { value: 'Studio', label: t('studio', state.language) },
//   { value: 'Duplex', label: t('duplex', state.language) },
//   { value: 'Townhouse', label: t('townhouse', state.language) },
//   { value: 'Twin House', label: t('twin_house', state.language) },
//   { value: 'Standalone Villa', label: t('standalone_villa', state.language) },
// ];

<select
  value={formData.property_type}
  onChange={(e) => setFormData(prev => ({ ...prev, property_type: e.target.value }))}
  className="w-full px-4 py-3 ..."
>
  {propertyTypes.map((opt) => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>



  // Function to check if user can navigate to a specific step
  const canNavigateToStep = (targetStep: number) => {
    // Always allow navigation to current step or backward to previous steps
    if (targetStep <= currentStep) {
      return true;
    }
    
    // For forward navigation, check if all previous steps are complete
    for (let i = currentStep; i < targetStep; i++) {
      if (!isStepComplete(i)) {
        return false;
      }
    }
    
    return true;
  };

  const handleStepClick = (targetStep: number) => {
    if (canNavigateToStep(targetStep)) {
      setCurrentStep(targetStep);
    }
  };

  // Validation function to check if current step is complete
  const isStepComplete = (step: number) => {
    switch (step) {
      case 0: // Basics - all fields required
        return formData.property_type && formData.offering_type && formData.completion_status;
      case 1: // Location - all fields required
        return formData.city && formData.town && formData.district_compound;
      case 2: // Specifications - all fields required except down payment
        return formData.bedrooms && formData.bathrooms && formData.size;
      case 3: // Pricing - price required
        return formData.price;
      case 4: // Photos - optional
        return true;
      default:
        return true;
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg px-4 py-6">
        <Card className="p-8 text-center max-w-md mx-auto mt-20">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-h1 font-bold text-light-text dark:text-dark-text mb-4">
            Listing Created Successfully!
          </h2>
          {finalPrice && (
            <div className="bg-light-primary-200 dark:bg-dark-surface p-4 rounded-aqar mb-6">
              <p className="text-light-text dark:text-dark-text">
                Final Price: <span className="font-bold text-light-primary dark:text-dark-text">
                  {finalPrice.toLocaleString()} EGP
                </span>
              </p>
              {estimatedPrice && estimatedPrice !== finalPrice && (
                <p className="text-sm text-light-text/70 dark:text-dark-muted mt-1">
                  Estimated: {estimatedPrice.toLocaleString()} EGP
                </p>
              )}
            </div>
          )}
          <div className="space-y-3">
            {newListingId && (
              <Button onClick={() => onViewListing?.(newListingId, newListingData)} className="w-full">
                View Listing
              </Button>
            )}
            {similarListings.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-light-text dark:text-dark-text text-center">
                  Similar Properties
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {similarListings.slice(0, 4).map((listing) => (
                    <button
                      key={listing.id}
                      onClick={() => onViewListing(listing.id)}
                      className="p-3 bg-light-primary-200 dark:bg-dark-surface rounded-aqar text-left hover:bg-light-primary-400 dark:hover:bg-dark-muted transition-colors"
                    >
                      <p className="font-medium text-sm text-light-text dark:text-dark-text">
                        {listing.property_type} in {listing.city}
                      </p>
                      <p className="text-xs text-light-text/70 dark:text-dark-muted">
                        {listing.price?.toLocaleString()} EGP
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button variant="outline" onClick={onBack} className="w-full">
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-sm border-b border-light-border dark:border-dark-muted px-4 py-3">
        <div className="flex items-center justify-between">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
            Back
          </Button>
          
          <h1 className="text-lg font-semibold text-light-text dark:text-dark-text">
            {t('createListing', state.language)}
          </h1>
          
          <div className="w-16" /> {/* Spacer */}
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <button
                  onClick={() => handleStepClick(index)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all hover:scale-105 ${
                    index === currentStep
                      ? 'bg-light-primary dark:bg-dark-primary text-white hover:bg-light-primary/90 dark:hover:bg-dark-primary/90'
                      : canNavigateToStep(index)
                        ? 'bg-light-border dark:bg-dark-muted text-light-text/50 dark:text-dark-muted hover:bg-light-primary/20 dark:hover:bg-dark-primary/20 cursor-pointer'
                        : 'bg-light-border dark:bg-dark-muted text-light-text/30 dark:text-dark-muted/50 cursor-not-allowed opacity-50'
                  }`}
                  disabled={!canNavigateToStep(index)}
                >
                  {index + 1}
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    index < currentStep
                      ? 'bg-light-primary'
                      : 'bg-light-border dark:bg-dark-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <h2 className="text-h1 font-bold text-light-text dark:text-dark-text text-center">
            {steps[currentStep].title}
          </h2>
        </div>

        {/* Step Content */}
        <Card className="p-6 mb-6">
          {renderStepContent()}
        </Card>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex-1"
            >
              Previous
            </Button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <div className="flex gap-3 flex-1">
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!isStepComplete(currentStep)}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              disabled={!isStepComplete(currentStep)}
              className="flex-1"
            >
              {submitting ? 'Creating...' : t('submit', state.language)}
            </Button>
          )}
        </div>
      </div>

      {/* Estimate Modal */}
      <EstimateModal
        isOpen={showEstimateModal}
        onClose={() => setShowEstimateModal(false)}
        initialData={formData}
        onEstimateComplete={(price) => setEstimatedPrice(price)}
      />
    </div>
  );
}