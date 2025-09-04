import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, Language, Theme, SearchFilters, SortOption } from '../types';

interface AppContextType {
  state: AppState;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  toggleSavedListing: (listingId: string) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  setSortBy: (sortBy: SortOption) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

type AppAction =
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'TOGGLE_SAVED_LISTING'; payload: string }
  | { type: 'SET_SEARCH_FILTERS'; payload: SearchFilters }
  | { type: 'SET_SORT_BY'; payload: SortOption };

const initialState: AppState = {
  language: 'en',
  theme: 'light',
  savedListings: [],
  searchFilters: {},
  sortBy: 'newest'
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'TOGGLE_SAVED_LISTING':
      const isAlreadySaved = state.savedListings.includes(action.payload);
      return {
        ...state,
        savedListings: isAlreadySaved
          ? state.savedListings.filter(id => id !== action.payload)
          : [...state.savedListings, action.payload]
      };
    case 'SET_SEARCH_FILTERS':
      return { ...state, searchFilters: action.payload };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load saved state from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('aqarhunt-language') as Language;
    const savedTheme = localStorage.getItem('aqarhunt-theme') as Theme;
    const savedListings = JSON.parse(localStorage.getItem('aqarhunt-saved') || '[]');

    if (savedLanguage) dispatch({ type: 'SET_LANGUAGE', payload: savedLanguage });
    if (savedTheme) dispatch({ type: 'SET_THEME', payload: savedTheme });
    if (savedListings.length > 0) {
      savedListings.forEach((id: string) => {
        dispatch({ type: 'TOGGLE_SAVED_LISTING', payload: id });
      });
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('aqarhunt-language', state.language);
    localStorage.setItem('aqarhunt-theme', state.theme);
    localStorage.setItem('aqarhunt-saved', JSON.stringify(state.savedListings));
  }, [state.language, state.theme, state.savedListings]);

  // Apply theme and RTL to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply RTL
    if (state.language === 'ar') {
      root.setAttribute('dir', 'rtl');
      root.setAttribute('lang', 'ar');
    } else {
      root.setAttribute('dir', 'ltr');
      root.setAttribute('lang', 'en');
    }
  }, [state.theme, state.language]);

  const setLanguage = (language: Language) => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
  };

  const setTheme = (theme: Theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  const toggleSavedListing = (listingId: string) => {
    dispatch({ type: 'TOGGLE_SAVED_LISTING', payload: listingId });
  };

  const setSearchFilters = (filters: SearchFilters) => {
    dispatch({ type: 'SET_SEARCH_FILTERS', payload: filters });
  };

  const setSortBy = (sortBy: SortOption) => {
    dispatch({ type: 'SET_SORT_BY', payload: sortBy });
  };

  return (
    <AppContext.Provider value={{
      state,
      setLanguage,
      setTheme,
      toggleSavedListing,
      setSearchFilters,
      setSortBy
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}