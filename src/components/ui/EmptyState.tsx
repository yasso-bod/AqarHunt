import React from 'react';
import { Search, Home } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 mb-4 text-light-primary-400 dark:text-dark-muted">
        {icon || <Search className="w-full h-full" />}
      </div>
      <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
        {title}
      </h3>
      <p className="text-light-text/70 dark:text-dark-muted mb-6 max-w-sm">
        {description}
      </p>
      {action}
    </div>
  );
}