import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-aqar font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-light-primary hover:bg-light-primary/90 text-white focus:ring-light-primary dark:bg-dark-primary dark:hover:bg-dark-primary/90 dark:text-white',
    secondary: 'bg-light-info hover:bg-light-info/90 text-white focus:ring-light-info dark:bg-dark-accent dark:hover:bg-dark-accent/90 dark:text-white',
    outline: 'border-2 border-light-primary text-light-primary hover:bg-light-primary hover:text-white focus:ring-light-primary dark:border-dark-primary dark:text-white dark:hover:bg-dark-primary dark:hover:text-white',
    gradient: 'bg-gradient-primary hover:bg-gradient-primary/90 text-white focus:ring-light-primary dark:bg-gradient-to-r dark:from-dark-primary dark:to-dark-accent hover:scale-105 transform text-white'
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-3 text-body min-h-[44px]',
    lg: 'px-6 py-4 text-lg min-h-[52px]'
  };

  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}