import React from 'react';
import { Globe, User, Sun, Moon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/Button';

interface HeaderProps {
  onProfileClick: () => void;
  onLogoClick: () => void;
}

export function Header({ onProfileClick, onLogoClick }: HeaderProps) {
  const { state, setLanguage, setTheme } = useApp();

  const toggleLanguage = () => {
    setLanguage(state.language === 'en' ? 'ar' : 'en');
  };

  const toggleTheme = () => {
    setTheme(state.theme === 'light' ? 'dark' : 'light');
  };
  return (
    <header className="bg-white dark:bg-dark-surface border-b border-light-border dark:border-dark-muted px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <button 
          onClick={onLogoClick}
          className="flex items-center space-x-2 rtl:space-x-reverse hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-gradient-primary dark:bg-gradient-to-br dark:from-dark-primary dark:to-dark-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AH</span>
          </div>
          <span className="text-h2 font-bold text-light-text dark:text-dark-text">
            AqarHunt
          </span>
        </button>

        {/* Actions */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          {/* Theme Toggle */}
          <Button
            variant={state.theme === 'dark' ? "primary" : "outline"}
            size="sm"
            onClick={toggleTheme}
            className="px-3 hover:scale-105 transition-transform"
          >
            {state.theme === 'light' ? (
              <>
                <Moon className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {state.language === 'ar' ? 'داكن' : 'Dark'}
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {state.language === 'ar' ? 'فاتح' : 'Light'}
              </>
            )}
          </Button>

          {/* Language Toggle */}
          <Button
            variant="primary"
            size="sm"
            onClick={toggleLanguage}
            className="px-3 hover:scale-105 transition-transform"
          >
            <Globe className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
            {state.language === 'en' ? 'AR' : 'EN'}
          </Button>

          {/* Avatar */}
          <button
            onClick={onProfileClick}
            className="w-10 h-10 bg-light-primary dark:bg-dark-primary rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            <User className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}