import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cn(
        'absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-surface rounded-t-aqar shadow-xl',
        'transform transition-transform duration-300 ease-out',
        isOpen ? 'translate-y-0' : 'translate-y-full'
      )}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-light-border dark:border-dark-muted">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-light-primary-200 dark:hover:bg-dark-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-light-text dark:text-dark-text" />
            </button>
          </div>
        )}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}