'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Niche,
  SourceStrategy,
  SourceType,
  SortBy,
  Source,
  AnalysisResult,
  AnalysisProgress,
  WizardState,
  Session,
  Claim,
  Hook,
  SourceCategory,
  SavedProductURL
} from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface AppContextType {
  // Wizard state
  wizard: WizardState;
  setStep: (step: number) => void;
  setNiche: (niche: Niche | null) => void;
  setCustomNiche: (niche: string) => void;
  setProductDescription: (description: string) => void;
  setStrategy: (strategy: SourceStrategy | null) => void;
  toggleCategory: (categoryId: string) => void;
  setSelectedCategories: (categories: string[]) => void;
  toggleSourceType: (sourceType: SourceType) => void;
  setSortBy: (sortBy: SortBy) => void;
  setDiscoveredSources: (sources: Source[]) => void;
  addDiscoveredSources: (sources: Source[]) => void;
  toggleSourceSelection: (sourceId: string) => void;
  selectAllSources: () => void;
  deselectAllSources: () => void;
  setSelectedSources: (sourceIds: string[]) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisProgress: (progress: AnalysisProgress | null) => void;
  setResults: (results: AnalysisResult[]) => void;
  addHookVariation: (sourceId: string, parentHookId: string, variation: Hook) => void;
  resetWizard: () => void;

  // Pre-analysis (background processing)
  preAnalyzedResults: Map<string, AnalysisResult>;
  addPreAnalyzedResult: (sourceId: string, result: AnalysisResult) => void;
  removePreAnalyzedResult: (sourceId: string) => void;
  clearPreAnalyzedResults: () => void;
  pendingAnalysis: Set<string>;
  addPendingAnalysis: (sourceId: string) => void;
  removePendingAnalysis: (sourceId: string) => void;

  // Sessions/History
  sessions: Session[];
  currentSession: Session | null;
  saveSession: () => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;

  // Favorites
  toggleClaimFavorite: (claimId: string) => void;
  toggleHookFavorite: (hookId: string) => void;
  favoriteClaims: string[];
  favoriteHooks: string[];

  // Custom Categories (global, user-wide)
  customCategories: SourceCategory[];
  addCustomCategory: (category: SourceCategory) => void;
  removeCustomCategory: (categoryId: string) => void;

  // Generated Hooks (from variations and claims)
  generatedHooks: Hook[];
  addGeneratedHook: (hook: Hook) => void;
  removeGeneratedHook: (hookId: string) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  resultsView: 'claims' | 'hooks' | 'generated' | 'favorites';
  setResultsView: (view: 'claims' | 'hooks' | 'generated' | 'favorites') => void;
  filterAngleType: string | null;
  setFilterAngleType: (type: string | null) => void;
  sortResultsBy: 'virality' | 'bridge' | 'momentum';
  setSortResultsBy: (sort: 'virality' | 'bridge' | 'momentum') => void;

  // Saved Product URLs
  savedProductURLs: SavedProductURL[];
  addSavedProductURL: (url: SavedProductURL) => void;
  removeSavedProductURL: (urlId: string) => void;
}

const initialWizardState: WizardState = {
  step: 1,
  niche: null,
  customNiche: '',
  productDescription: '',
  strategy: null,
  selectedCategories: [],
  selectedSourceTypes: [],
  sortBy: 'views',
  discoveredSources: [],
  selectedSources: [],
  isAnalyzing: false,
  analysisProgress: null,
  results: [],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [wizard, setWizard] = useState<WizardState>(initialWizardState);
  const [sessions, setSessions] = useLocalStorage<Session[]>('angle-finder-sessions', []);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [favoriteClaims, setFavoriteClaims] = useLocalStorage<string[]>('angle-finder-favorite-claims', []);
  const [favoriteHooks, setFavoriteHooks] = useLocalStorage<string[]>('angle-finder-favorite-hooks', []);

  // Pre-analysis state for background processing
  const [preAnalyzedResults, setPreAnalyzedResults] = useState<Map<string, AnalysisResult>>(new Map());
  const [pendingAnalysis, setPendingAnalysis] = useState<Set<string>>(new Set());

  const [customCategories, setCustomCategories] = useLocalStorage<SourceCategory[]>('angle-finder-custom-categories', [], {
    // Migration: convert old object format to new array format
    deserialize: (value) => {
      try {
        const parsed = JSON.parse(value);
        // If it's already an array, return it
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // If it's the old object format, flatten all categories into a single array
        if (typeof parsed === 'object' && parsed !== null) {
          const allCategories: SourceCategory[] = [];
          for (const key in parsed) {
            if (Array.isArray(parsed[key])) {
              allCategories.push(...parsed[key]);
            }
          }
          return allCategories;
        }
        return [];
      } catch {
        return [];
      }
    },
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resultsView, setResultsView] = useState<'claims' | 'hooks' | 'generated' | 'favorites'>('hooks');
  const [filterAngleType, setFilterAngleType] = useState<string | null>(null);
  const [sortResultsBy, setSortResultsBy] = useState<'virality' | 'bridge' | 'momentum'>('virality');
  const [savedProductURLs, setSavedProductURLs] = useLocalStorage<SavedProductURL[]>('angle-finder-saved-urls', []);
  const [generatedHooks, setGeneratedHooks] = useLocalStorage<Hook[]>('angle-finder-generated-hooks', []);

  // Wizard actions
  const setStep = useCallback((step: number) => {
    setWizard(prev => ({ ...prev, step }));
  }, []);

  const setNiche = useCallback((niche: Niche | null) => {
    setWizard(prev => ({ ...prev, niche, productDescription: '' }));
  }, []);

  const setCustomNiche = useCallback((customNiche: string) => {
    setWizard(prev => ({ ...prev, customNiche }));
  }, []);

  const setProductDescription = useCallback((productDescription: string) => {
    setWizard(prev => ({ ...prev, productDescription }));
  }, []);

  const setStrategy = useCallback((strategy: SourceStrategy | null) => {
    setWizard(prev => ({ ...prev, strategy, selectedCategories: [] }));
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setWizard(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter(id => id !== categoryId)
        : [...prev.selectedCategories, categoryId],
    }));
  }, []);

  const setSelectedCategories = useCallback((categories: string[]) => {
    setWizard(prev => ({ ...prev, selectedCategories: categories }));
  }, []);

  const toggleSourceType = useCallback((sourceType: SourceType) => {
    setWizard(prev => ({
      ...prev,
      selectedSourceTypes: prev.selectedSourceTypes.includes(sourceType)
        ? prev.selectedSourceTypes.filter(t => t !== sourceType)
        : [...prev.selectedSourceTypes, sourceType],
    }));
  }, []);

  const setSortBy = useCallback((sortBy: SortBy) => {
    setWizard(prev => ({ ...prev, sortBy }));
  }, []);

  const setDiscoveredSources = useCallback((discoveredSources: Source[]) => {
    setWizard(prev => ({ ...prev, discoveredSources }));
  }, []);

  const addDiscoveredSources = useCallback((sources: Source[]) => {
    setWizard(prev => {
      // Deduplicate by ID
      const existingIds = new Set(prev.discoveredSources.map(s => s.id));
      const newSources = sources.filter(s => !existingIds.has(s.id));
      return {
        ...prev,
        discoveredSources: [...prev.discoveredSources, ...newSources],
      };
    });
  }, []);

  const toggleSourceSelection = useCallback((sourceId: string) => {
    setWizard(prev => ({
      ...prev,
      selectedSources: prev.selectedSources.includes(sourceId)
        ? prev.selectedSources.filter(id => id !== sourceId)
        : [...prev.selectedSources, sourceId],
    }));
  }, []);

  const selectAllSources = useCallback(() => {
    setWizard(prev => ({
      ...prev,
      selectedSources: prev.discoveredSources.filter(s => !s.failed).map(s => s.id),
    }));
  }, []);

  const deselectAllSources = useCallback(() => {
    setWizard(prev => ({ ...prev, selectedSources: [] }));
  }, []);

  const setSelectedSources = useCallback((sourceIds: string[]) => {
    setWizard(prev => ({ ...prev, selectedSources: sourceIds }));
  }, []);

  const setIsAnalyzing = useCallback((isAnalyzing: boolean) => {
    setWizard(prev => ({ ...prev, isAnalyzing }));
  }, []);

  const setAnalysisProgress = useCallback((analysisProgress: AnalysisProgress | null) => {
    setWizard(prev => ({ ...prev, analysisProgress }));
  }, []);

  const setResults = useCallback((results: AnalysisResult[]) => {
    setWizard(prev => ({ ...prev, results }));
  }, []);

  const addHookVariation = useCallback((sourceId: string, parentHookId: string, variation: Hook) => {
    // Add variation to wizard results
    setWizard(prev => ({
      ...prev,
      results: prev.results.map(result => {
        if (result.sourceId === sourceId) {
          // Find the index of the parent hook and insert variation after it
          const parentIndex = result.hooks.findIndex(h => h.id === parentHookId);
          const newHooks = [...result.hooks];
          if (parentIndex !== -1) {
            newHooks.splice(parentIndex + 1, 0, variation);
          } else {
            newHooks.push(variation);
          }
          return { ...result, hooks: newHooks };
        }
        return result;
      }),
    }));

    // Also update the current session if viewing one
    if (currentSession) {
      setSessions(prev => prev.map(session => {
        if (session.id === currentSession.id) {
          return {
            ...session,
            results: session.results.map(result => {
              if (result.sourceId === sourceId) {
                const parentIndex = result.hooks.findIndex(h => h.id === parentHookId);
                const newHooks = [...result.hooks];
                if (parentIndex !== -1) {
                  newHooks.splice(parentIndex + 1, 0, variation);
                } else {
                  newHooks.push(variation);
                }
                return { ...result, hooks: newHooks };
              }
              return result;
            }),
          };
        }
        return session;
      }));
    }
  }, [currentSession, setSessions]);

  const resetWizard = useCallback(() => {
    setWizard(initialWizardState);
    setCurrentSession(null);
    // Clear pre-analysis state on wizard reset
    setPreAnalyzedResults(new Map());
    setPendingAnalysis(new Set());
  }, []);

  // Pre-analysis management (background processing)
  const addPreAnalyzedResult = useCallback((sourceId: string, result: AnalysisResult) => {
    setPreAnalyzedResults(prev => {
      const newMap = new Map(prev);
      newMap.set(sourceId, result);
      return newMap;
    });
  }, []);

  const removePreAnalyzedResult = useCallback((sourceId: string) => {
    setPreAnalyzedResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(sourceId);
      return newMap;
    });
  }, []);

  const clearPreAnalyzedResults = useCallback(() => {
    setPreAnalyzedResults(new Map());
  }, []);

  const addPendingAnalysis = useCallback((sourceId: string) => {
    setPendingAnalysis(prev => {
      const newSet = new Set(prev);
      newSet.add(sourceId);
      return newSet;
    });
  }, []);

  const removePendingAnalysis = useCallback((sourceId: string) => {
    setPendingAnalysis(prev => {
      const newSet = new Set(prev);
      newSet.delete(sourceId);
      return newSet;
    });
  }, []);

  // Session management
  const saveSession = useCallback(() => {
    // Don't save if we're viewing an existing session
    if (currentSession) return;
    if (!wizard.niche || wizard.results.length === 0) return;

    // Get the sources that were actually analyzed
    const analyzedSources = wizard.discoveredSources.filter(s =>
      wizard.selectedSources.includes(s.id)
    );

    const session: Session = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      niche: wizard.niche,
      customNiche: wizard.customNiche,
      productDescription: wizard.productDescription,
      strategy: wizard.strategy!,
      categories: wizard.selectedCategories,
      sourceTypes: wizard.selectedSourceTypes,
      sources: analyzedSources,
      results: wizard.results,
    };

    setSessions(prev => [session, ...prev]);
    setCurrentSession(session);
  }, [wizard, setSessions, currentSession]);

  const loadSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Don't reload if already viewing this session
    if (currentSession?.id === sessionId) return;

    setCurrentSession(session);
    setWizard({
      ...initialWizardState,
      step: 7, // Results step
      niche: session.niche,
      customNiche: session.customNiche || '',
      productDescription: session.productDescription,
      strategy: session.strategy,
      selectedCategories: session.categories,
      selectedSourceTypes: session.sourceTypes,
      discoveredSources: session.sources || [],
      selectedSources: (session.sources || []).map(s => s.id),
      results: session.results,
    });
  }, [sessions, currentSession]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }
  }, [setSessions, currentSession]);

  // Favorites
  const toggleClaimFavorite = useCallback((claimId: string) => {
    setFavoriteClaims(prev =>
      prev.includes(claimId)
        ? prev.filter(id => id !== claimId)
        : [...prev, claimId]
    );
  }, [setFavoriteClaims]);

  const toggleHookFavorite = useCallback((hookId: string) => {
    setFavoriteHooks(prev =>
      prev.includes(hookId)
        ? prev.filter(id => id !== hookId)
        : [...prev, hookId]
    );
  }, [setFavoriteHooks]);

  // Custom categories (global, user-wide)
  const addCustomCategory = useCallback((category: SourceCategory) => {
    setCustomCategories(prev => [...prev, { ...category, isCustom: true }]);
  }, [setCustomCategories]);

  const removeCustomCategory = useCallback((categoryId: string) => {
    setCustomCategories(prev => prev.filter(c => c.id !== categoryId));
  }, [setCustomCategories]);

  // Saved Product URLs
  const addSavedProductURL = useCallback((url: SavedProductURL) => {
    setSavedProductURLs(prev => {
      // Remove if already exists (to move to top)
      const filtered = prev.filter(u => u.url !== url.url);
      // Limit to 10 saved URLs
      return [url, ...filtered].slice(0, 10);
    });
  }, [setSavedProductURLs]);

  const removeSavedProductURL = useCallback((urlId: string) => {
    setSavedProductURLs(prev => prev.filter(u => u.id !== urlId));
  }, [setSavedProductURLs]);

  // Generated hooks (variations and from claims)
  const addGeneratedHook = useCallback((hook: Hook) => {
    setGeneratedHooks(prev => [{ ...hook, isGenerated: true }, ...prev]);
  }, [setGeneratedHooks]);

  const removeGeneratedHook = useCallback((hookId: string) => {
    setGeneratedHooks(prev => prev.filter(h => h.id !== hookId));
  }, [setGeneratedHooks]);

  return (
    <AppContext.Provider
      value={{
        wizard,
        setStep,
        setNiche,
        setCustomNiche,
        setProductDescription,
        setStrategy,
        toggleCategory,
        setSelectedCategories,
        toggleSourceType,
        setSortBy,
        setDiscoveredSources,
        addDiscoveredSources,
        toggleSourceSelection,
        selectAllSources,
        deselectAllSources,
        setSelectedSources,
        setIsAnalyzing,
        setAnalysisProgress,
        setResults,
        addHookVariation,
        resetWizard,
        preAnalyzedResults,
        addPreAnalyzedResult,
        removePreAnalyzedResult,
        clearPreAnalyzedResults,
        pendingAnalysis,
        addPendingAnalysis,
        removePendingAnalysis,
        sessions,
        currentSession,
        saveSession,
        loadSession,
        deleteSession,
        toggleClaimFavorite,
        toggleHookFavorite,
        favoriteClaims,
        favoriteHooks,
        customCategories,
        addCustomCategory,
        removeCustomCategory,
        sidebarOpen,
        setSidebarOpen,
        resultsView,
        setResultsView,
        filterAngleType,
        setFilterAngleType,
        sortResultsBy,
        setSortResultsBy,
        savedProductURLs,
        addSavedProductURL,
        removeSavedProductURL,
        generatedHooks,
        addGeneratedHook,
        removeGeneratedHook,
      }}
    >
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
