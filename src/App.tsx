import React, { useState } from 'react';
import { AppProvider } from './contexts/AppContext';
import { ToastProvider } from './components/ui/Toast';
import { Header } from './components/layout/Header';
import { TabNavigation } from './components/layout/TabNavigation';
import { HomeTab } from './components/tabs/HomeTab';
import { SearchTab } from './components/tabs/SearchTab';
import { MapTab } from './components/tabs/MapTab';
import { RecommendationsTab } from './components/tabs/RecommendationsTab';
import { SavedTab } from './components/tabs/SavedTab';
import { ProfileTab } from './components/tabs/ProfileTab';
import { ListingDetails } from './components/listing/ListingDetails';
import { CreateListing } from './components/listing/CreateListing';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentView, setCurrentView] = useState<'tabs' | 'listing' | 'create'>('tabs');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [initialListingData, setInitialListingData] = useState<any>(null);

  const handleViewListing = (listingId: string, listingData?: any) => {
    setSelectedListingId(listingId);
    setInitialListingData(listingData || null);
    setCurrentView('listing');
  };

  const handleCreateListing = () => {
    setCurrentView('create');
  };

  const handleBackToTabs = () => {
    setCurrentView('tabs');
    setSelectedListingId(null);
    setInitialListingData(null);
  };

  const handleLogoClick = () => {
    setCurrentView('tabs');
    setActiveTab('home');
    setSelectedListingId(null);
    setInitialListingData(null);
  };

  const handleProfileClick = () => {
    setCurrentView('tabs');
    setActiveTab('profile');
    setSelectedListingId(null);
    setInitialListingData(null);
  };

  const renderCurrentView = () => {
    if (currentView === 'listing' && selectedListingId) {
      return <ListingDetails listingId={selectedListingId} initialListingData={initialListingData} onBack={handleBackToTabs} onViewListing={handleViewListing} />;
    }
    
    if (currentView === 'create') {
      return <CreateListing onBack={handleBackToTabs} onViewListing={handleViewListing} />;
    }

    return (
      <>
        <div className="pb-20">
          {activeTab === 'home' && <HomeTab onViewListing={handleViewListing} onCreateListing={handleCreateListing} onNavigateToSearch={() => setActiveTab('search')} />}
          {activeTab === 'search' && <SearchTab onViewListing={handleViewListing} />}
          {activeTab === 'map' && <MapTab onViewListing={handleViewListing} onBack={() => setActiveTab('home')} />}
          {activeTab === 'recommendations' && <RecommendationsTab onViewListing={handleViewListing} />}
          {activeTab === 'saved' && <SavedTab onViewListing={handleViewListing} />}
          {activeTab === 'profile' && <ProfileTab />}
        </div>
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </>
    );
  };

  return (
    <AppProvider>
      <ToastProvider>
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
          {currentView === 'tabs' && <Header onProfileClick={handleProfileClick} onLogoClick={handleLogoClick} />}
          {renderCurrentView()}
        </div>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;