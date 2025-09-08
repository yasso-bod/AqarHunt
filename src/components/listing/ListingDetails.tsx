import React from 'react';
import { useEffect, useState } from 'react';
import { Listing } from '../../types';
import { getListing, getRecommendationsByPropertyLive } from '../../services/listingService';
import { ListingCard } from './ListingCard';
import { logView } from '../../utils/interactionStore';
import { Card } from '../ui/Card';

interface ListingDetailsProps {
  listingId: string;
  onClose?: () => void;
}

export default function ListingDetails({ listingId, onClose }: ListingDetailsProps) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSimilar, setLoadingSimilar] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getListing(listingId)
      .then(l => {
        if (!mounted) return;
        setListing(l);
        logView(String(l.id));
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [listingId]);

  useEffect(() => {
    let mounted = true;
    setLoadingSimilar(true);
    getRecommendationsByPropertyLive(listingId, 10)
      .then(items => { if (mounted) setSimilar(items); })
      .finally(() => mounted && setLoadingSimilar(false));
    return () => { mounted = false; };
  }, [listingId]);

  if (loading || !listing) {
    return (
      <div className="p-4">
        <div className="h-6 w-40 bg-gray-200 rounded mb-3 animate-pulse" />
        <div className="h-40 bg-gray-200 rounded mb-4 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Basic listing header/content (minimal; keep your own UI here if you had one) */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold">
          {listing.property_type} • {listing.city}{listing.town ? , ${listing.town} : ''}
        </h2>
        <p className="text-sm text-gray-600">
          {listing.bedrooms} BR • {listing.bathrooms} BA • {listing.size} m² • {listing.price?.toLocaleString()} EGP
        </p>
      </Card>

      {/* Similar to this (auto) */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Similar to this</h3>
        {loadingSimilar ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) =>
              <div key={i} className="h-40 bg-gray-200 rounded animate-pulse" />
            )}
          </div>
        ) : similar.length === 0 ? (
          <p className="text-sm text-gray-500">No similar properties found right now.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {similar.map(l => (
              <ListingCard key={l.id} listing={l} onClick={() => { /* open detail elsewhere if needed */ }} variant="small" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
