import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-light-text dark:text-dark-text">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-4 py-3 rounded-aqar border-2 border-light-border bg-white text-light-text placeholder-light-text/60',
          'focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none',
          'dark:bg-dark-surface dark:border-dark-border dark:text-dark-text dark:placeholder-dark-muted',
          'dark:focus:border-dark-primary dark:focus:ring-dark-primary/20',
          'transition-all duration-200',
          error && 'border-light-highlight dark:border-light-highlight',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-light-highlight">{error}</p>
      )}
    </div>
  );
}