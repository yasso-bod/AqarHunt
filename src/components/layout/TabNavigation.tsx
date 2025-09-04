import React from 'react';
import { Home, Search, MapPin, Stars, Bookmark, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { state } = useApp();

  const tabs = [
    { id: 'home', icon: Home, label: t('home', state.language) },
    { id: 'search', icon: Search, label: t('search', state.language) },
    { id: 'map', icon: MapPin, label: t('map', state.language) },
    { id: 'recommendations', icon: Stars, label: t('recommendations', state.language) },
    { id: 'saved', icon: Bookmark, label: t('saved', state.language) },
    { id: 'profile', icon: User, label: t('profile', state.language) },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface border-t border-light-border dark:border-dark-muted z-40">
      <div className="flex items-center justify-around py-2">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200 min-h-[44px]',
              activeTab === id
                ? 'text-light-primary dark:text-dark-text bg-light-primary-200 dark:bg-dark-primary'
                : 'text-light-text/60 dark:text-dark-muted hover:text-light-primary dark:hover:text-dark-text'
            )}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}