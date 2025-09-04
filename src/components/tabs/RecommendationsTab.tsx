import React, { useState } from 'react';
import {
  Stars, Sparkles, Filter, Grid3X3, Grid2X2, LayoutGrid, List,
  Building2, Edit3, Sparkles as WandSparkles
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ListingCard } from '../listing/ListingCard';
import { EmptyState } from '../ui/EmptyState';
import { EstimateModal } from '../modals/EstimateModal';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';
import { getListing, searchListings, SearchFilters } from '../../services/listingService';
import { api } from '../../utils/api';
import { useToast } from '../ui/Toast';
import { Listing } from '../../types';

/* ===================== Helpers ===================== */

// map to exact DB strings
const mapType = (t?: string) => {
  const M: Record<string, string> = {
    apartment: "Apartment",
    villa: "Villa",
    townhouse: "Townhouse",
    duplex: "Duplex",
    penthouse: "Penthouse",
    studio: "Studio",
    "twin_house": "Twin House",
    chalet: "Chalet",
    "standalone_villa": "Standalone Villa",
  };
  return t ? (M[t.toLowerCase()] ?? t) : undefined;
};
const mapOffering = (o?: string) => (o ? (o.toLowerCase() === "rent" ? "Rent" : "Sale") : undefined);
// filters use furnished Yes/No
const mapFurnished = (b?: boolean) => (b === undefined ? undefined : b ? "Yes" : "No");
// by-attributes endpoint uses furnishing string
const mapFurnishingFromBool = (b?: boolean) =>
  b === undefined ? undefined : (b ? "Furnished" : "Unfurnished");

const clean = (o: any) =>
  Object.fromEntries(Object.entries(o).filter(([_, v]) => v !== undefined && v !== null && v !== ""));

// snap free-text to DB strings using suggest_fuzzy
async function snapToDbStrings(form: any) {
  const pick = (arr: string[] | undefined) => (arr && arr.length ? arr[0] : undefined);
  try {
    const [c, twn, d] = await Promise.all([
      form.city ? api.suggestFuzzy({ field: 'city', q: form.city, limit: 1 }) : Promise.resolve([]),
      form.town ? api.suggestFuzzy({ field: 'town', q: form.town, limit: 1 }) : Promise.resolve([]),
      form.district_compound
        ? api.suggestFuzzy({ field: 'district_compound', q: form.district_compound, limit: 1 })
        : Promise.resolve([]),
    ]);
    return {
      ...form,
      city: pick(c) ?? form.city,
      town: pick(twn) ?? form.town,
      district_compound: pick(d) ?? form.district_compound,
    };
  } catch {
    return form; // graceful fallback
  }
}

/* ===================== Component ===================== */

interface RecommendationsTabProps { onViewListing: (listingId: string) => void; }
type ViewMode = 'large' | 'medium' | 'small' | 'list';
type RecommendationMode = 'existing' | 'attributes';

export function RecommendationsTab({ onViewListing }: RecommendationsTabProps) {
  const { state } = useApp();
  const { showToast } = useToast();

  const [mode, setMode] = useState<RecommendationMode>('existing');
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [recommendationType, setRecommendationType] = useState<'similar' | 'filtered' | null>(null);
  const [recommendations, setRecommendations] = useState<Listing[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('medium');
  const [availableListings, setAvailableListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingListings, setLoadingListings] = useState(true);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  // local filters for "Similar within Filters" in existing-listing mode
  const [recsFilters, setRecsFilters] = useState<SearchFilters>({});

  // form state for "Describe your property"
  const [attributesForm, setAttributesForm] = useState({
    property_type: 'apartment',
    city: '',
    town: '',
    district_compound: '',
    bedrooms: 2,
    bathrooms: 1,
    size: 100,
    offering_type: 'sale',
    completion_status: 'ready',
    furnished: false,
    price: '',
  });

  // draft autosave
  const DRAFT_KEY = 'draft.recs.describe.v1';
  const DRAFT_TTL = 24 * 60 * 60 * 1000;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const draftData = { data: attributesForm, savedAt: Date.now() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }, 300);
    return () => clearTimeout(timer);
  }, [attributesForm]);

  React.useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const { data, savedAt } = JSON.parse(raw);
      if (Date.now() - savedAt < DRAFT_TTL) setAttributesForm(data);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  // preload a few items for the "use existing listing" dropdown
  React.useEffect(() => { loadAvailableListings(); }, []);
  async function loadAvailableListings() {
    try {
      setLoadingListings(true);
      const res = await searchListings({ limit: 50, page: 1 });
      setAvailableListings(res.items || []);
    } catch (e: any) {
      console.error('Failed to load listings:', e);
      showToast({
        type: 'error',
        title: 'Failed to load listings',
        message: e?.message || 'Please try again',
      });
    } finally {
      setLoadingListings(false);
    }
  }

  /* ========== Existing listing flow ========== */
  async function handleGetRecommendations(type: 'similar' | 'filtered') {
    if (!selectedListingId) return;
    try {
      setLoading(true);
      setRecommendationType(type);
      setRecommendations([]);
      setRecommendationError(null);

      if (type === 'similar') {
        const rec = await api.recLive({ property_id: selectedListingId, top_k: 12 });
        const ids = (rec?.items || []).map((x: any) => String(x.property_id));
        const details = await Promise.all(ids.map((id: string) => getListing(id).catch(() => null)));
        setRecommendations(details.filter(Boolean) as Listing[]);
      } else {
        const filters: any = {};
        if (recsFilters.city) filters.city = recsFilters.city;
        if (recsFilters.town) filters.town = recsFilters.town;
        if (recsFilters.district_compound) filters.district_compound = recsFilters.district_compound;
        if (recsFilters.price_min !== undefined) filters.price_min = recsFilters.price_min;
        if (recsFilters.price_max !== undefined) filters.price_max = recsFilters.price_max;
        if (recsFilters.bedrooms_min !== undefined) filters.bedrooms_min = recsFilters.bedrooms_min;
        if (recsFilters.bathrooms_min !== undefined) filters.bathrooms_min = recsFilters.bathrooms_min;
        if (recsFilters.property_type) filters.property_type = mapType(recsFilters.property_type);
        if (recsFilters.furnished !== undefined) filters.furnished = recsFilters.furnished ? 'Yes' : 'No';
        if (recsFilters.offering_type) filters.offering_type = mapOffering(recsFilters.offering_type);

        const rec = await api.recWithinLive({ property_id: selectedListingId, top_k: 12, filters });
        const ids = (rec?.items || []).map((x: any) => String(x.property_id));
        if (!ids.length) {
          setRecommendations([]);
          setRecommendationError('No results under current filters. Try relaxing filters.');
          return;
        }
        const details = await Promise.all(ids.map((id: string) => getListing(id).catch(() => null)));
        setRecommendations(details.filter(Boolean) as Listing[]);
      }
    } catch (e: any) {
      console.error('Failed to get recommendations:', e);
      setRecommendationError(e?.message || 'Failed to get recommendations.');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }

  /* ========== Attributes flow (uses new backend endpoints) ========== */
  async function handleGetRecommendationsByAttributesWithType(type: 'similar' | 'filtered') {
    if (!attributesForm.city || !attributesForm.town || !attributesForm.property_type) {
      showToast({
        type: 'warning',
        title: 'Incomplete Property Details',
        message: 'Please fill City, Town, and Property Type.',
      });
      return;
    }

    setLoading(true);
    setRecommendationType(type);
    setRecommendations([]);
    setRecommendationError(null);

    try {
      const snapped = await snapToDbStrings(attributesForm);

      // Attributes payload for /recommend/by_attributes_live
      const attrs = clean({
        city: snapped.city,
        town: snapped.town,
        district_compound: snapped.district_compound || undefined,
        property_type: mapType(snapped.property_type),
        furnishing: mapFurnishingFromBool(snapped.furnished),
        completion_status: snapped.completion_status ? String(snapped.completion_status) : undefined,
        offering_type: mapOffering(snapped.offering_type),
        bedrooms: snapped.bedrooms || undefined,
        bathrooms: snapped.bathrooms || undefined,
        size: snapped.size || undefined,
        // optional extras if available in your UI: floor, age_years, lat, lon, down_payment_price, amenities
      });

      let ids: string[] = [];

      if (type === 'similar') {
        const rec = await api.recByAttrs({ ...attrs, top_k: 12 });
        ids = (rec?.items || []).map((x: any) => String(x.property_id));
      } else {
        const size = Number(snapped.size) || undefined;
        const price = Number(snapped.price) || undefined;

        let filters = clean({
          city: snapped.city,
          town: snapped.town,
          district_compound: snapped.district_compound || undefined,
          property_type: mapType(snapped.property_type),
          bedrooms_min: snapped.bedrooms || undefined,
          bathrooms_min: snapped.bathrooms || undefined,
          size_min: size ? Math.round(size * 0.8) : undefined,
          size_max: size ? Math.round(size * 1.2) : undefined,
          price_min: price ? Math.round(price * 0.75) : undefined,
          price_max: price ? Math.round(price * 1.25) : undefined,
          furnished: mapFurnished(snapped.furnished),
          offering_type: mapOffering(snapped.offering_type),
        });

        // strict → progressively relax
        const relaxers = [
          (f: any) => f,
          (f: any) => clean({ ...f, district_compound: undefined }),
          (f: any) => clean({ ...f, bedrooms_min: undefined, bathrooms_min: undefined }),
          (f: any) => clean({ ...f, town: undefined }),
        ];

        for (const fn of relaxers) {
          const f = fn(filters);
          const rec = await api.recWithinByAttrs({ ...attrs, top_k: 12, filters: f });
          ids = (rec?.items || []).map((x: any) => String(x.property_id));
          if (ids.length) break;
        }
      }

      if (!ids.length) {
        setRecommendationError(
          type === 'filtered'
            ? 'No similar properties found with current filters. Try relaxing them.'
            : 'No similar properties found. Try adjusting your criteria.'
        );
        setRecommendations([]);
        return;
      }

      const details = await Promise.all(ids.map((id: string) => getListing(id).catch(() => null)));
      setRecommendations(details.filter(Boolean) as Listing[]);
      localStorage.removeItem(DRAFT_KEY); // success → clear draft
    } catch (e: any) {
      console.error('=== RECOMMENDATION ERROR ===', e);
      setRecommendationError(e?.message || 'Failed to get recommendations. Please try again later.');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }

  const propertyTypes = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'penthouse', label: 'Penthouse' },
    { value: 'chalet', label: 'Chalet' },
    { value: 'studio', label: 'Studio' },
    { value: 'duplex', label: 'Duplex' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'twin_house', label: 'Twin House' },
    { value: 'standalone_villa', label: 'Standalone Villa' },
  ];

  const completionStatuses = [
    { value: 'ready', label: t('ready', state.language) },
    { value: 'under_construction', label: t('underConstruction', state.language) },
    { value: 'off_plan', label: t('offPlan', state.language) },
  ];

  const viewOptions = [
    { mode: 'large' as ViewMode, icon: Grid2X2, cols: 'grid-cols-1 sm:grid-cols-2' },
    { mode: 'medium' as ViewMode, icon: LayoutGrid, cols: 'grid-cols-2 sm:grid-cols-3' },
    { mode: 'small' as ViewMode, icon: Grid3X3, cols: 'grid-cols-2 sm:grid-cols-4' },
    { mode: 'list' as ViewMode, icon: List, cols: 'grid-cols-1' },
  ];

  const handleClearDraft = () => {
    setAttributesForm({
      property_type: 'apartment',
      city: '',
      town: '',
      district_compound: '',
      bedrooms: 2,
      bathrooms: 1,
      size: 100,
      offering_type: 'sale',
      completion_status: 'ready',
      furnished: false,
      price: '',
    });
    localStorage.removeItem(DRAFT_KEY);
    setEstimatedPrice(null);
  };

  const handleViewListing = (listingId: string) => onViewListing(listingId);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Stars className="w-8 h-8 text-light-primary dark:text-dark-text mx-auto" />
        <h2 className="text-h1 font-bold text-light-text dark:text-dark-text">
          {t('recommendations', state.language)}
        </h2>
        <p className="text-light-text/70 dark:text-dark-muted">
          {t('getAIPoweredRecommendations', state.language)}
        </p>
      </div>

      {/* Mode Toggle */}
      <Card className="p-4">
        <div className="flex bg-light-primary-200 dark:bg-dark-surface rounded-aqar p-1 mb-4">
          <button
            onClick={() => setMode('existing')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse ${
              mode === 'existing'
                ? 'bg-white dark:bg-dark-primary text-light-primary dark:text-dark-text'
                : 'text-light-text dark:text-dark-muted hover:text-light-primary dark:hover:text-dark-text'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="font-medium">{t('useExistingListing', state.language)}</span>
          </button>
          <button
            onClick={() => setMode('attributes')}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse ${
              mode === 'attributes'
                ? 'bg-white dark:bg-dark-primary text-light-primary dark:text-dark-text'
                : 'text-light-text dark:text-dark-muted hover:text-light-primary dark:hover:text-dark-text'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span className="font-medium">{t('describeYourProperty', state.language)}</span>
          </button>
        </div>
      </Card>

      {/* Existing listing picker */}
      {mode === 'existing' && (
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
      )}

      {/* Describe your property */}
      {mode === 'attributes' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-light-text dark:text-dark-text">
              {t('describeYourProperty', state.language)}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDraft}
              className="text-light-highlight border-light-highlight hover:bg-light-highlight hover:text-white"
            >
              Clear
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                {t('propertyType', state.language)}
              </label>
              <select
                value={attributesForm.property_type}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, property_type: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
              >
                {[
                  { value: 'apartment', label: 'Apartment' },
                  { value: 'villa', label: 'Villa' },
                  { value: 'penthouse', label: 'Penthouse' },
                  { value: 'chalet', label: 'Chalet' },
                  { value: 'studio', label: 'Studio' },
                  { value: 'duplex', label: 'Duplex' },
                  { value: 'townhouse', label: 'Townhouse' },
                  { value: 'twin_house', label: 'Twin House' },
                  { value: 'standalone_villa', label: 'Standalone Villa' },
                ].map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label={t('city', state.language)}
                value={attributesForm.city}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., Giza"
              />
              <Input
                label={t('town', state.language)}
                value={attributesForm.town}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, town: e.target.value }))}
                placeholder="e.g., 6 October"
              />
              <Input
                label={t('compound', state.language)}
                value={attributesForm.district_compound}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, district_compound: e.target.value }))}
                placeholder="e.g., Madinaty"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label={t('bedrooms', state.language)}
                type="number"
                min="0"
                value={attributesForm.bedrooms}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, bedrooms: Number(e.target.value) }))}
              />
              <Input
                label={t('bathrooms', state.language)}
                type="number"
                min="0"
                value={attributesForm.bathrooms}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, bathrooms: Number(e.target.value) }))}
              />
              <Input
                label={t('size', state.language)}
                type="number"
                min="1"
                value={attributesForm.size}
                onChange={(e) => setAttributesForm(prev => ({ ...prev, size: Number(e.target.value) }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  {t('offering', state.language)}
                </label>
                <select
                  value={attributesForm.offering_type}
                  onChange={(e) => setAttributesForm(prev => ({ ...prev, offering_type: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
                >
                  <option value="sale">{t('sale', state.language)}</option>
                  <option value="rent">{t('rent', state.language)}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  {t('completionStatus', state.language)}
                </label>
                <select
                  value={attributesForm.completion_status}
                  onChange={(e) => setAttributesForm(prev => ({ ...prev, completion_status: e.target.value }))}
                  className="w-full px-4 py-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-muted rounded-aqar text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary"
                >
                  {completionStatuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-light-primary-200 dark:bg-dark-surface rounded-aqar">
              <span className="font-medium text-light-text dark:text-dark-text">{t('furnished', state.language)}</span>
              <button
                onClick={() => setAttributesForm(prev => ({ ...prev, furnished: !prev.furnished }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  attributesForm.furnished ? 'bg-light-primary dark:bg-dark-primary' : 'bg-light-border dark:bg-dark-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    attributesForm.furnished ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-0.5 rtl:-translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                {t('askingPrice', state.language)} (Optional)
              </label>
              <div className="flex gap-3">
                <Input
                  type="number"
                  value={attributesForm.price}
                  onChange={(e) => setAttributesForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Enter price or leave empty"
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => setShowEstimateModal(true)} className="px-4">
                  <WandSparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  Predict
                </Button>
              </div>
              {estimatedPrice && (
                <div className="mt-2 p-3 bg-light-info/20 rounded-aqar">
                  <p className="text-sm text-light-text dark:text-dark-text">
                    Estimated Value: <span className="font-bold">{estimatedPrice.toLocaleString()} EGP</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="gradient"
                onClick={() => handleGetRecommendationsByAttributesWithType('similar')}
                disabled={loading}
                className="flex-1"
              >
                <Sparkles className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {loading && recommendationType === 'similar' ? 'Loading...' : t('similarLive', state.language)}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGetRecommendationsByAttributesWithType('filtered')}
                disabled={loading}
                className="flex-1"
              >
                <Filter className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {loading && recommendationType === 'filtered' ? 'Loading...' : t('similarWithinFilters', state.language)}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Error */}
      {recommendationError && (
        <div className="mt-3">
          <EmptyState
            icon={<Stars className="w-full h-full" />}
            title="Unable to Load Recommendations"
            description={recommendationError}
          />
        </div>
      )}

      {/* Results */}
      {recommendationType && recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
              {recommendationType === 'similar'
                ? t('similarProperties', state.language)
                : t('recommendations', state.language)}
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

          <div
            className={`grid gap-3 ${
              viewOptions.find(v => v.mode === viewMode)?.cols
            }`}
          >
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

      {/* Empty states */}
      {mode === 'existing' && !selectedListingId && (
        <EmptyState
          icon={<Stars className="w-full h-full" />}
          title={t('getAIPoweredRecommendations', state.language)}
          description={t('selectPropertyForRecommendations', state.language)}
        />
      )}
      {mode === 'attributes' && recommendations.length === 0 && !loading && recommendationType === null && (
        <EmptyState
          icon={<WandSparkles className="w-full h-full" />}
          title={t('describeYourProperty', state.language)}
          description={t('fillPropertyDetailsForRecommendations', state.language)}
        />
      )}

      {/* Estimate modal */}
      <EstimateModal
        isOpen={showEstimateModal}
        onClose={() => setShowEstimateModal(false)}
        initialData={attributesForm}
        onEstimateComplete={(price) => {
          setEstimatedPrice(price);
          setAttributesForm(prev => ({ ...prev, price: price.toString() }));
        }}
      />
    </div>
  );
}