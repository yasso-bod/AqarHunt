import React, { useState } from 'react';
import { Globe, Moon, Sun, Monitor, Info, Shield, FileText, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { useApp } from '../../contexts/AppContext';
import { t } from '../../utils/translations';

export function ProfileTab() {
  const { state, setLanguage, setTheme } = useApp();
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const themeOptions = [
    { value: 'light', label: t('light', state.language), icon: Sun },
    { value: 'dark', label: t('dark', state.language), icon: Moon },
    { value: 'auto', label: t('auto', state.language), icon: Monitor },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Profile Header */}
      <Card className="p-6 text-center">
        <div className="w-20 h-20 bg-light-primary dark:bg-dark-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-h1 font-bold text-light-text dark:text-dark-text mb-2">
          Welcome to AqarHunt
        </h2>
        <p className="text-light-text/70 dark:text-dark-muted">
          Your real estate companion for Egypt
        </p>
      </Card>

      {/* Settings */}
      <div className="space-y-4">
        <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
          Settings
        </h3>

        {/* Language Setting */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Globe className="w-5 h-5 text-light-primary dark:text-dark-text" />
              <span className="font-medium text-light-text dark:text-dark-text">
                {t('language', state.language)}
              </span>
            </div>
            <div className="flex bg-light-primary-200 dark:bg-dark-surface rounded-aqar p-1">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  state.language === 'en'
                    ? 'bg-white dark:bg-dark-primary text-light-primary dark:text-dark-text'
                    : 'text-light-text dark:text-dark-muted'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ar')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  state.language === 'ar'
                    ? 'bg-white dark:bg-dark-primary text-light-primary dark:text-dark-text'
                    : 'text-light-text dark:text-dark-muted'
                }`}
              >
                AR
              </button>
            </div>
          </div>
        </Card>

        {/* Theme Setting */}
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Monitor className="w-5 h-5 text-light-primary dark:text-dark-text" />
              <span className="font-medium text-light-text dark:text-dark-text">
                {t('theme', state.language)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value as any)}
                  className={`p-3 rounded-aqar border-2 transition-all ${
                    state.theme === value
                      ? 'border-light-primary bg-light-primary-200 dark:border-dark-primary dark:bg-dark-primary'
                      : 'border-light-border dark:border-dark-muted hover:border-light-primary dark:hover:border-dark-primary'
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-2 text-light-text dark:text-dark-text" />
                  <span className="text-sm font-medium text-light-text dark:text-dark-text">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Information Links */}
      <div className="space-y-4">
        <h3 className="text-h2 font-semibold text-light-text dark:text-dark-text">
          Information
        </h3>

        <div className="space-y-2">
          <Card className="p-4" hover onClick={() => setShowAbout(true)}>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Info className="w-5 h-5 text-light-primary dark:text-dark-text" />
              <span className="font-medium text-light-text dark:text-dark-text">
                {t('about', state.language)}
              </span>
            </div>
          </Card>

          <Card className="p-4" hover onClick={() => setShowPrivacy(true)}>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Shield className="w-5 h-5 text-light-primary dark:text-dark-text" />
              <span className="font-medium text-light-text dark:text-dark-text">
                {t('privacy', state.language)}
              </span>
            </div>
          </Card>

          <Card className="p-4" hover onClick={() => setShowTerms(true)}>
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <FileText className="w-5 h-5 text-light-primary dark:text-dark-text" />
              <span className="font-medium text-light-text dark:text-dark-text">
                {t('terms', state.language)}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
        title={t('about', state.language)}
        size="lg"
      >
        <div className="prose prose-sm max-w-none text-light-text dark:text-dark-text">
          <div dangerouslySetInnerHTML={{ __html: t('aboutContent', state.language) }} />
        </div>
      </Modal>

      <Modal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title={t('privacy', state.language)}
        size="lg"
      >
        <div className="prose prose-sm max-w-none text-light-text dark:text-dark-text">
          <div dangerouslySetInnerHTML={{ __html: t('privacyContent', state.language) }} />
        </div>
      </Modal>

      <Modal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        title={t('terms', state.language)}
        size="lg"
      >
        <div className="prose prose-sm max-w-none text-light-text dark:text-dark-text">
          <div dangerouslySetInnerHTML={{ __html: t('termsContent', state.language) }} />
        </div>
      </Modal>
    </div>
  );
}