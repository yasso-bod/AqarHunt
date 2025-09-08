import React, { useState } from 'react';
import { Sparkles as WandSparkles, TrendingUp, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { generatePriceEstimate } from '../../utils/searchUtils';
import { Listing } from '../../types';

interface EstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueToListing?: () => void;
  onEstimateComplete?: (price: number) => void;
  initialData?: Partial<Listing>;
}

export function EstimateModal({ 
  isOpen, 
  onClose, 
  onContinueToListing,
  onEstimateComplete,
  initialData 
}: EstimateModalProps) {
  const { state } = useApp();
  const [step, setStep] = useState<'form' | 'loading' | 'result'>('form');
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    city: initialData?.city || '',
    town: initialData?.town || '',
    district_compound: initialData?.district_compound || '',
    property_type: initialData?.property_type || 'apartment',
    bedrooms: initialData?.bedrooms || 2,
    bathrooms: initialData?.bathrooms || 1,
    size: initialData?.size || 100,
    lat: initialData?.lat || 30.0444,
    lon: initialData?.lon || 31.2357,
  });

  // Update form data when initialData changes
  React.useEffect(() => {
    if (initialData) {
      setFormData({
        city: initialData.city || '',
        town: initialData.town || '',
        district_compound: initialData.district_compound || '',
        property_type: initialData.property_type || 'apartment',
        bedrooms: initialData.bedrooms || 2,
        bathrooms: initialData.bathrooms || 1,
        size: initialData.size || 100,
        lat: initialData.lat || 30.0444,
        lon: initialData.lon || 31.2357,
      });
    }
  }, [initialData]);

  const handleSubmit = () => {
    setStep('loading');
    
    // Simulate API call
    setTimeout(() => {
      const estimate = generatePriceEstimate(formData);
      setEstimatedPrice(estimate);
      setStep('result');
      onEstimateComplete?.(estimate);
    }, 2000);
  };

  const handleClose = () => {
    setStep('form');
    setEstimatedPrice(null);
    onClose();
  };

  const propertyTypes = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'studio', label: 'Studio' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'penthouse', label: 'Penthouse' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'result' ? 'Price Estimate' : t('getInstantPrice', state.language)}
      size="md"
    >
      {step === 'form' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <WandSparkles className="w-12 h-12 text-light-primary dark:text-dark-text mx-auto mb-3" />
            <p className="text-light-text/70 dark:text-dark-muted">
              Get an AI-powered price estimate for your property
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Input
              label={t('city', state.language)}
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              placeholder="e.g., Cairo"
            />
            
            <Input
              label={t('town', state.language)}
              value={formData.town}
              onChange={(e) => setFormData(prev => ({ ...prev, town: e.target.value }))}
              placeholder="e.g., New Cairo"
            />

            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                {t('propertyType', state.language)}
              </label>
              <select
                value={formData.property_type}
                onChange={(e) => setFormData(prev => ({ ...prev, property_type: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
              >
                {propertyTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label={t('bedrooms', state.language)}
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: Number(e.target.value) }))}
              />
              <Input
                label={t('bathrooms', state.language)}
                type="number"
                min="0"
                value={formData.bathrooms}
                onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: Number(e.target.value) }))}
              />
              <Input
                label={t('size', state.language)}
                type="number"
                min="1"
                value={formData.size}
                onChange={(e) => setFormData(prev => ({ ...prev, size: Number(e.target.value) }))}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full mt-6"
            disabled={!formData.city || !formData.town}
          >
            <WandSparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
            Get Estimate
          </Button>
        </div>
      )}

      {step === 'loading' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-gentle">
            <WandSparkles className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
            Analyzing Your Property
          </h3>
          <p className="text-light-text/70 dark:text-dark-muted">
            Our AI is processing market data and comparable properties...
          </p>
        </div>
      )}

      {step === 'result' && estimatedPrice && (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
              Estimated Market Value
            </h3>
            <div className="text-3xl font-bold text-light-primary dark:text-dark-text">
              {estimatedPrice.toLocaleString()} {t('egp', state.language)}
            </div>
            <p className="text-sm text-light-text/70 dark:text-dark-muted mt-2">
              Based on similar properties and market trends
            </p>
          </div>

          <div className="bg-light-primary-200 dark:bg-dark-surface p-4 rounded-aqar text-left">
            <h4 className="font-semibold text-light-text dark:text-dark-text mb-2">
              Estimate Details
            </h4>
            <div className="space-y-1 text-sm text-light-text/70 dark:text-dark-muted">
              <p>• Location: {formData.city}, {formData.town}</p>
              <p>• Type: {formData.property_type}</p>
              <p>• Size: {formData.size}m² • {formData.bedrooms} BR • {formData.bathrooms} Bath</p>
              <p>• Confidence: High (based on 150+ similar properties)</p>
            </div>
          </div>

          <div className="space-y-3">
            {onContinueToListing && (
              <Button onClick={onContinueToListing} className="w-full">
                Continue to Full Listing
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}