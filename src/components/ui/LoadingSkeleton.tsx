import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle' | 'button';
}

export function LoadingSkeleton({ className, variant = 'text' }: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-light-primary-200 dark:bg-dark-muted';
  
  const variants = {
    card: 'h-48 w-full rounded-aqar',
    text: 'h-4 w-full rounded',
    circle: 'h-12 w-12 rounded-full',
    button: 'h-11 w-24 rounded-aqar'
  };

  return (
    <div className={cn(baseClasses, variants[variant], className)} />
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-aqar border border-light-border dark:border-dark-muted p-4 space-y-4">
      <LoadingSkeleton variant="card" className="h-32" />
      <div className="space-y-2">
        <LoadingSkeleton className="h-4 w-3/4" />
        <LoadingSkeleton className="h-4 w-1/2" />
        <LoadingSkeleton className="h-6 w-1/3" />
      </div>
    </div>
  );
}