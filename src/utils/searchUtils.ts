import { Listing, SearchFilters, SortOption } from '../types';

export function filterListings(listings: Listing[], filters: SearchFilters): Listing[] {
  return listings.filter(listing => {
    if (filters.city && listing.city !== filters.city) return false;
    if (filters.town && listing.town !== filters.town) return false;
    if (filters.district_compound && listing.district_compound !== filters.district_compound) return false;
    if (filters.price_min && (listing.price || 0) < filters.price_min) return false;
    if (filters.price_max && (listing.price || 0) > filters.price_max) return false;
    if (filters.bedrooms_min && listing.bedrooms < filters.bedrooms_min) return false;
    if (filters.bathrooms_min && listing.bathrooms < filters.bathrooms_min) return false;
    if (filters.property_type && listing.property_type !== filters.property_type) return false;
    if (filters.furnished !== undefined && listing.furnished !== filters.furnished) return false;
    if (filters.offering_type && listing.offering_type !== filters.offering_type) return false;
    
    return true;
  });
}

export function sortListings(listings: Listing[], sortBy: SortOption): Listing[] {
  const sorted = [...listings];
  
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'price_asc':
      return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    case 'price_desc':
      return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    case 'size_asc':
      return sorted.sort((a, b) => a.size - b.size);
    case 'size_desc':
      return sorted.sort((a, b) => b.size - a.size);
    default:
      return sorted;
  }
}

export function searchListings(listings: Listing[], query: string): Listing[] {
  if (!query.trim()) return listings;
  
  const searchTerm = query.toLowerCase();
  return listings.filter(listing => 
    listing.city.toLowerCase().includes(searchTerm) ||
    listing.town.toLowerCase().includes(searchTerm) ||
    listing.district_compound.toLowerCase().includes(searchTerm) ||
    listing.property_type.toLowerCase().includes(searchTerm)
  );
}

export function generateSimilarListings(targetListing: Listing, allListings: Listing[]): Listing[] {
  // Mock similarity algorithm - in real app this would call the API
  return allListings
    .filter(listing => listing.id !== targetListing.id)
    .filter(listing => 
      listing.property_type === targetListing.property_type ||
      listing.city === targetListing.city ||
      Math.abs(listing.bedrooms - targetListing.bedrooms) <= 1
    )
    .slice(0, 6);
}

export function generatePriceEstimate(listing: Partial<Listing>): number {
  // Mock price estimation algorithm
  const basePrice = listing.size ? listing.size * 15000 : 2000000;
  const cityMultiplier = listing.city === 'Cairo' ? 1.2 : 1.0;
  const typeMultiplier = {
    apartment: 1.0,
    villa: 1.5,
    studio: 0.7,
    townhouse: 1.3,
    penthouse: 2.0
  }[listing.property_type || 'apartment'];
  
  return Math.round(basePrice * cityMultiplier * typeMultiplier);
}