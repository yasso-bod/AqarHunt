import { Listing } from '../types';

export const mockListings: Listing[] = [
  {
    id: '1',
    property_type: 'apartment',
    city: 'Cairo',
    town: 'New Cairo',
    district_compound: 'Madinaty',
    price: 3500000,
    estimated_price: 3450000,
    bedrooms: 3,
    bathrooms: 2,
    size: 180,
    lat: 30.0444,
    lon: 31.2357,
    created_at: '2024-01-15T10:30:00Z',
    images: [
      'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: true,
    offering_type: 'sale',
    completion_status: 'ready',
    verified: true
  },
  {
    id: '2',
    property_type: 'villa',
    city: 'Giza',
    town: '6th of October',
    district_compound: 'Beverly Hills',
    price: 8500000,
    estimated_price: 8200000,
    bedrooms: 5,
    bathrooms: 4,
    size: 350,
    lat: 29.9792,
    lon: 31.1342,
    created_at: '2024-01-14T14:20:00Z',
    images: [
      'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1571453/pexels-photo-1571453.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: false,
    offering_type: 'sale',
    completion_status: 'ready',
    verified: true
  },
  {
    id: '3',
    property_type: 'studio',
    city: 'Cairo',
    town: 'Downtown',
    district_compound: 'Zamalek',
    price: 25000,
    bedrooms: 1,
    bathrooms: 1,
    size: 45,
    lat: 30.0626,
    lon: 31.2197,
    created_at: '2024-01-13T09:15:00Z',
    images: [
      'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: true,
    offering_type: 'rent',
    completion_status: 'ready'
  },
  {
    id: '4',
    property_type: 'apartment',
    city: 'Cairo',
    town: 'Heliopolis',
    district_compound: 'Baron City',
    price: 4200000,
    estimated_price: 4100000,
    bedrooms: 4,
    bathrooms: 3,
    size: 220,
    lat: 30.0875,
    lon: 31.3241,
    created_at: '2024-01-12T16:45:00Z',
    images: [
      'https://images.pexels.com/photos/2724748/pexels-photo-2724748.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1571457/pexels-photo-1571457.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: false,
    offering_type: 'sale',
    completion_status: 'ready',
    verified: true
  },
  {
    id: '5',
    property_type: 'penthouse',
    city: 'Cairo',
    town: 'New Cairo',
    district_compound: 'Katameya Heights',
    price: 12000000,
    bedrooms: 4,
    bathrooms: 4,
    size: 400,
    lat: 30.0131,
    lon: 31.4015,
    created_at: '2024-01-11T11:30:00Z',
    images: [
      'https://images.pexels.com/photos/2635038/pexels-photo-2635038.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: true,
    offering_type: 'sale',
    completion_status: 'ready'
  },
  {
    id: '6',
    property_type: 'apartment',
    city: 'Giza',
    town: 'Dokki',
    district_compound: 'Central Dokki',
    price: 35000,
    bedrooms: 2,
    bathrooms: 2,
    size: 120,
    lat: 30.0378,
    lon: 31.2089,
    created_at: '2024-01-10T13:20:00Z',
    images: [
      'https://images.pexels.com/photos/2724748/pexels-photo-2724748.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: true,
    offering_type: 'rent',
    completion_status: 'ready'
  },
  {
    id: '7',
    property_type: 'villa',
    city: 'Cairo',
    town: 'New Cairo',
    district_compound: 'Mivida',
    price: 15000000,
    estimated_price: 14500000,
    bedrooms: 6,
    bathrooms: 5,
    size: 500,
    lat: 30.0131,
    lon: 31.4215,
    created_at: '2024-01-09T08:45:00Z',
    images: [
      'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1571450/pexels-photo-1571450.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: false,
    offering_type: 'sale',
    completion_status: 'under_construction',
    verified: true
  },
  {
    id: '8',
    property_type: 'apartment',
    city: 'Giza',
    town: 'Mohandessin',
    district_compound: 'Arab League',
    price: 28000,
    bedrooms: 3,
    bathrooms: 2,
    size: 150,
    lat: 30.0626,
    lon: 31.2003,
    created_at: '2024-01-08T15:10:00Z',
    images: [
      'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: false,
    offering_type: 'rent',
    completion_status: 'ready'
  },
  {
    id: '9',
    property_type: 'townhouse',
    city: 'Giza',
    town: '6th of October',
    district_compound: 'Palm Hills',
    price: 6800000,
    bedrooms: 4,
    bathrooms: 3,
    size: 280,
    lat: 29.9792,
    lon: 31.1142,
    created_at: '2024-01-07T12:00:00Z',
    images: [
      'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: true,
    offering_type: 'sale',
    completion_status: 'ready'
  },
  {
    id: '10',
    property_type: 'studio',
    city: 'Cairo',
    town: 'Maadi',
    district_compound: 'Degla',
    price: 18000,
    bedrooms: 1,
    bathrooms: 1,
    size: 55,
    lat: 29.9602,
    lon: 31.2569,
    created_at: '2024-01-06T17:30:00Z',
    images: [
      'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: true,
    offering_type: 'rent',
    completion_status: 'ready'
  },
  // Additional listings for variety
  {
    id: '11',
    property_type: 'apartment',
    city: 'Cairo',
    town: 'Nasr City',
    district_compound: 'City Stars',
    price: 2800000,
    bedrooms: 2,
    bathrooms: 2,
    size: 130,
    lat: 30.0626,
    lon: 31.3241,
    created_at: '2024-01-05T10:15:00Z',
    images: [
      'https://images.pexels.com/photos/2724748/pexels-photo-2724748.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: false,
    offering_type: 'sale',
    completion_status: 'ready'
  },
  {
    id: '12',
    property_type: 'villa',
    city: 'Giza',
    town: 'Sheikh Zayed',
    district_compound: 'Allegria',
    price: 18000000,
    bedrooms: 7,
    bathrooms: 6,
    size: 600,
    lat: 30.0626,
    lon: 30.9754,
    created_at: '2024-01-04T14:20:00Z',
    images: [
      'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: true,
    offering_type: 'sale',
    completion_status: 'ready',
    verified: true
  },
  {
    id: '13',
    property_type: 'apartment',
    city: 'Cairo',
    town: 'Maadi',
    district_compound: 'Sarayat',
    price: 45000,
    bedrooms: 3,
    bathrooms: 2,
    size: 200,
    lat: 29.9502,
    lon: 31.2469,
    created_at: '2024-01-03T09:45:00Z',
    images: [
      'https://images.pexels.com/photos/2635038/pexels-photo-2635038.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: true,
    offering_type: 'rent',
    completion_status: 'ready'
  },
  {
    id: '14',
    property_type: 'apartment',
    city: 'Giza',
    town: 'Agouza',
    district_compound: 'Nile View',
    price: 32000,
    bedrooms: 2,
    bathrooms: 1,
    size: 110,
    lat: 30.0626,
    lon: 31.2089,
    created_at: '2024-01-02T16:30:00Z',
    images: [
      'https://images.pexels.com/photos/2724748/pexels-photo-2724748.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: false,
    offering_type: 'rent',
    completion_status: 'ready'
  },
  {
    id: '15',
    property_type: 'penthouse',
    city: 'Cairo',
    town: 'Zamalek',
    district_compound: 'Nile Tower',
    price: 22000000,
    bedrooms: 5,
    bathrooms: 4,
    size: 450,
    lat: 30.0626,
    lon: 31.2197,
    created_at: '2024-01-01T12:00:00Z',
    images: [
      'https://images.pexels.com/photos/2635038/pexels-photo-2635038.jpeg?auto=compress&cs=tinysrgb&w=800'
    ],
    furnished: true,
    offering_type: 'sale',
    completion_status: 'ready',
    verified: true
  }
];

// Helper functions to get unique values for typeahead
export const getUniqueCities = (): string[] => {
  return [...new Set(mockListings.map(listing => listing.city))];
};

export const getUniqueTowns = (city?: string): string[] => {
  const filtered = city ? mockListings.filter(listing => listing.city === city) : mockListings;
  return [...new Set(filtered.map(listing => listing.town))];
};

export const getUniqueCompounds = (city?: string, town?: string): string[] => {
  let filtered = mockListings;
  if (city) filtered = filtered.filter(listing => listing.city === city);
  if (town) filtered = filtered.filter(listing => listing.town === town);
  return [...new Set(filtered.map(listing => listing.district_compound))];
};