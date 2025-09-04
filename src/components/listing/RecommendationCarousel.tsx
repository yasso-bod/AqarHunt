import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ListingCard } from './ListingCard';
import { Listing } from '../../types';
import { cn } from '../../utils/cn';

interface RecommendationCarouselProps {
  listings: Listing[];
  onViewListing: (listingId: string) => void;
}

export function RecommendationCarousel({ listings, onViewListing }: RecommendationCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerView = 2;
  const maxIndex = Math.max(0, listings.length - itemsPerView);

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
  };

  if (listings.length === 0) return null;

  return (
    <div className="relative">
      {/* Navigation Buttons */}
      {listings.length > itemsPerView && (
        <>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={cn(
              'absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-dark-surface rounded-full shadow-lg flex items-center justify-center transition-all',
              currentIndex === 0 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:scale-110'
            )}
          >
            <ChevronLeft className="w-5 h-5 text-light-text dark:text-dark-text" />
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentIndex >= maxIndex}
            className={cn(
              'absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-dark-surface rounded-full shadow-lg flex items-center justify-center transition-all',
              currentIndex >= maxIndex 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:scale-110'
            )}
          >
            <ChevronRight className="w-5 h-5 text-light-text dark:text-dark-text" />
          </button>
        </>
      )}

      {/* Carousel Container */}
      <div className="overflow-hidden mx-6">
        <div 
          className="flex transition-transform duration-300 ease-out gap-4"
          style={{ 
            transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
            width: `${(listings.length / itemsPerView) * 100}%`
          }}
        >
          {listings.map((listing) => (
            <div 
              key={listing.id} 
              className="flex-shrink-0"
              style={{ width: `${100 / listings.length}%` }}
            >
              <ListingCard
                listing={listing}
                onClick={() => onViewListing(listing.id)}
                variant="compact"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      {listings.length > itemsPerView && (
        <div className="flex justify-center space-x-2 rtl:space-x-reverse mt-4">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentIndex 
                  ? 'bg-light-primary dark:bg-dark-text' 
                  : 'bg-light-border dark:bg-dark-muted'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}