import React, { useState } from 'react';
import { AppProvider } from './contexts/AppContext';
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

  const handleViewListing = (listingId: string) => {
    setSelectedListingId(listingId);
    setCurrentView('listing');
  };

  const handleCreateListing = () => {
    setCurrentView('create');
  };

  const handleBackToTabs = () => {
    setCurrentView('tabs');
    setSelectedListingId(null);
  };

  const handleLogoClick = () => {
    setCurrentView('tabs');
    setActiveTab('home');
    setSelectedListingId(null);
  };

  const handleProfileClick = () => {
    setCurrentView('tabs');
    setActiveTab('profile');
    setSelectedListingId(null);
  };

  const renderCurrentView = () => {
    if (currentView === 'listing' && selectedListingId) {
      return <ListingDetails listingId={selectedListingId} onBack={handleBackToTabs} onViewListing={handleViewListing} />;
    }
    
    if (currentView === 'create') {
      return <CreateListing onBack={handleBackToTabs} />;
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
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
        {currentView === 'tabs' && <Header onProfileClick={handleProfileClick} onLogoClick={handleLogoClick} />}
        {renderCurrentView()}
      </div>
    </AppProvider>
  );
}

export default App;