'use client';

import { useApp } from '@/context/AppContext';
import { Source, SourceType, AnalysisResult } from '@/types';
import { CATEGORIES } from '@/data/categories';
import { NICHES } from '@/data/niches';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Youtube,
  Radio,
  MessageSquare,
  BookOpen,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
  Newspaper,
  GraduationCap,
  FileText,
  FlaskConical,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

const sourceTypeLabels: Record<SourceType, string> = {
  youtube: 'YouTube',
  podcast: 'Podcasts',
  reddit: 'Reddit',
  research: 'Research',
  sciencedaily: 'ScienceDaily',
  scholar: 'Scholar',
  arxiv: 'arXiv',
  preprint: 'Preprints',
};

const sourceIcons: Record<SourceType, typeof Youtube> = {
  youtube: Youtube,
  podcast: Radio,
  reddit: MessageSquare,
  research: BookOpen,
  sciencedaily: Newspaper,
  scholar: GraduationCap,
  arxiv: FileText,
  preprint: FlaskConical,
};

export function Step5Discovery() {
  const {
    wizard,
    setStep,
    setDiscoveredSources,
    addDiscoveredSources,
    toggleSourceSelection,
    setSelectedSources,
    preAnalyzedResults,
    addPreAnalyzedResult,
    removePreAnalyzedResult,
    pendingAnalysis,
    addPendingAnalysis,
    removePendingAnalysis,
  } = useApp();

  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingModified, setIsSearchingModified] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [modifiedPage, setModifiedPage] = useState(1);
  const [filterSourceType, setFilterSourceType] = useState<SourceType | 'all'>('all');
  const [showSelectedSources, setShowSelectedSources] = useState(false);
  const [activeTab, setActiveTab] = useState<'unmodified' | 'modified'>('unmodified');
  const hasAutoSearched = useRef(false);

  // Store for abort controllers to cancel pending analysis requests
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  // Debounce timer for selection changes
  const selectionDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  // Track previous selections to detect changes
  const previousSelections = useRef<Set<string>>(new Set());
  // Background analysis queue and concurrency control
  const backgroundQueue = useRef<Source[]>([]);
  const activeBackgroundCount = useRef(0);
  const BACKGROUND_CONCURRENCY_LIMIT = 6; // Max parallel background analyses

  const getCategoryNames = () => {
    if (!wizard.niche || !wizard.strategy) return [];
    const builtInCategories = CATEGORIES[wizard.niche]?.[wizard.strategy] || [];
    return wizard.selectedCategories
      .map(id => builtInCategories.find(c => c.id === id)?.name || id)
      .filter(Boolean) as string[];
  };

  const getNicheName = () => {
    if (wizard.niche === 'other') return wizard.customNiche;
    return NICHES.find(n => n.id === wizard.niche)?.name || '';
  };

  // Process background queue - runs the actual analysis
  const processBackgroundQueue = useCallback(async () => {
    // If we're at capacity or queue is empty, do nothing
    while (activeBackgroundCount.current < BACKGROUND_CONCURRENCY_LIMIT && backgroundQueue.current.length > 0) {
      const source = backgroundQueue.current.shift();
      if (!source) break;

      // Skip if already analyzed or in progress
      if (preAnalyzedResults.has(source.id) || pendingAnalysis.has(source.id)) {
        continue;
      }

      activeBackgroundCount.current++;
      const controller = new AbortController();
      abortControllers.current.set(source.id, controller);
      addPendingAnalysis(source.id);

      // Start the analysis (don't await - let it run in parallel)
      (async () => {
        try {
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source,
              niche: getNicheName(),
              product: wizard.productDescription,
              strategy: wizard.strategy,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error('Analysis failed');
          }

          const result: AnalysisResult = await response.json();
          addPreAnalyzedResult(source.id, result);
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log(`Analysis cancelled for source: ${source.id}`);
          } else {
            console.error('Background analysis error:', error);
          }
        } finally {
          removePendingAnalysis(source.id);
          abortControllers.current.delete(source.id);
          activeBackgroundCount.current--;
          // Process next item in queue
          processBackgroundQueue();
        }
      })();
    }
  }, [wizard.productDescription, wizard.strategy, preAnalyzedResults, pendingAnalysis, addPendingAnalysis, removePendingAnalysis, addPreAnalyzedResult]);

  // Queue a source for background analysis
  const queueBackgroundAnalysis = useCallback((source: Source) => {
    // Don't queue if already done, in progress, or already in queue
    if (preAnalyzedResults.has(source.id) || pendingAnalysis.has(source.id)) {
      return;
    }
    if (backgroundQueue.current.some(s => s.id === source.id)) {
      return;
    }

    backgroundQueue.current.push(source);
    processBackgroundQueue();
  }, [preAnalyzedResults, pendingAnalysis, processBackgroundQueue]);

  // Cancel analysis for a source
  const cancelAnalysis = useCallback((sourceId: string) => {
    // Remove from queue if queued
    backgroundQueue.current = backgroundQueue.current.filter(s => s.id !== sourceId);

    // Abort if in progress
    const controller = abortControllers.current.get(sourceId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(sourceId);
    }
    removePendingAnalysis(sourceId);
    removePreAnalyzedResult(sourceId);
  }, [removePendingAnalysis, removePreAnalyzedResult]);

  // Debounced selection change handler
  useEffect(() => {
    const currentSelections = new Set(wizard.selectedSources);
    const prevSelections = previousSelections.current;

    // Find newly selected and deselected sources
    const newlySelected = wizard.selectedSources.filter(id => !prevSelections.has(id));
    const newlyDeselected = Array.from(prevSelections).filter(id => !currentSelections.has(id));

    // Update previous selections
    previousSelections.current = currentSelections;

    // Clear existing debounce timer
    if (selectionDebounceTimer.current) {
      clearTimeout(selectionDebounceTimer.current);
    }

    // Set new debounce timer
    selectionDebounceTimer.current = setTimeout(() => {
      // Cancel analysis for deselected sources immediately
      for (const sourceId of newlyDeselected) {
        cancelAnalysis(sourceId);
      }

      // Queue analysis for newly selected sources
      for (const sourceId of newlySelected) {
        const source = wizard.discoveredSources.find(s => s.id === sourceId);
        if (source && !source.failed) {
          queueBackgroundAnalysis(source);
        }
      }
    }, 500); // 500ms debounce

    return () => {
      if (selectionDebounceTimer.current) {
        clearTimeout(selectionDebounceTimer.current);
      }
    };
  }, [wizard.selectedSources, wizard.discoveredSources, queueBackgroundAnalysis, cancelAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't cancel - let background analysis continue
      // Only clean up the timer
      if (selectionDebounceTimer.current) {
        clearTimeout(selectionDebounceTimer.current);
      }
    };
  }, []);

  const handleSearch = async () => {
    setIsSearching(true);
    setIsSearchingModified(true);
    setHasSearched(true);
    setPage(1);
    setModifiedPage(1);

    // Run both searches in parallel
    const standardSearchPromise = fetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        niche: getNicheName(),
        product: wizard.productDescription,
        strategy: wizard.strategy,
        categories: getCategoryNames(),
        sourceTypes: wizard.selectedSourceTypes,
        page: 1,
        useModifiers: false,
      }),
    });

    const modifiedSearchPromise = fetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        niche: getNicheName(),
        product: wizard.productDescription,
        strategy: wizard.strategy,
        categories: getCategoryNames(),
        sourceTypes: wizard.selectedSourceTypes,
        page: 1,
        useModifiers: true,
      }),
    });

    try {
      const [standardResponse, modifiedResponse] = await Promise.all([
        standardSearchPromise,
        modifiedSearchPromise,
      ]);

      let allSources: Source[] = [];

      // Process standard results
      if (standardResponse.ok) {
        const standardData = await standardResponse.json();
        const unmodifiedSources = standardData.sources.map((s: Source) => ({
          ...s,
          modified: false,
        }));
        allSources = [...unmodifiedSources];
      }

      // Process modified results
      if (modifiedResponse.ok) {
        const modifiedData = await modifiedResponse.json();
        // Modified sources - ensure IDs are unique by adding suffix
        // This prevents the same source from being "selected" across both tabs
        const modifiedSources = modifiedData.sources.map((s: Source) => ({
          ...s,
          id: s.id.endsWith('-mod') ? s.id : `${s.id}-mod`,
        }));
        allSources = [...allSources, ...modifiedSources];
      }

      setDiscoveredSources(allSources);
    } catch (error) {
      console.error('Search error:', error);
      setDiscoveredSources([]);
    } finally {
      setIsSearching(false);
      setIsSearchingModified(false);
    }
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const isModified = activeTab === 'modified';
    const nextPage = isModified ? modifiedPage + 1 : page + 1;

    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: getNicheName(),
          product: wizard.productDescription,
          strategy: wizard.strategy,
          categories: getCategoryNames(),
          sourceTypes: wizard.selectedSourceTypes,
          page: nextPage,
          useModifiers: isModified,
        }),
      });

      if (!response.ok) throw new Error('Load more failed');

      const data = await response.json();

      if (!isModified) {
        // Mark as unmodified
        const unmodifiedSources = data.sources.map((s: Source) => ({
          ...s,
          modified: false,
        }));
        addDiscoveredSources(unmodifiedSources);
        setPage(nextPage);
      } else {
        // Modified sources - ensure IDs are unique by adding suffix
        const modifiedSources = data.sources.map((s: Source) => ({
          ...s,
          id: s.id.endsWith('-mod') ? s.id : `${s.id}-mod`,
        }));
        addDiscoveredSources(modifiedSources);
        setModifiedPage(nextPage);
      }
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Auto-search when page loads
  useEffect(() => {
    if (!hasAutoSearched.current && !hasSearched) {
      hasAutoSearched.current = true;
      handleSearch();
    }
  }, []);

  const formatViews = (views?: number) => {
    if (!views) return null;
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  // Separate sources by modified/unmodified
  const unmodifiedSources = wizard.discoveredSources.filter(s => !s.failed && !s.modified);
  const modifiedSources = wizard.discoveredSources.filter(s => !s.failed && s.modified);
  const failedSources = wizard.discoveredSources.filter(s => s.failed);

  // Get the active source list based on tab
  const activeSourceList = activeTab === 'unmodified' ? unmodifiedSources : modifiedSources;

  // Filter sources by selected type
  const availableSources = filterSourceType === 'all'
    ? activeSourceList
    : activeSourceList.filter(s => s.type === filterSourceType);

  // Get counts per source type for active tab
  const sourceTypeCounts = wizard.selectedSourceTypes.reduce((acc, type) => {
    acc[type] = activeSourceList.filter(s => s.type === type).length;
    return acc;
  }, {} as Record<SourceType, number>);

  // Get selected sources for the summary
  const selectedSourcesList = wizard.discoveredSources.filter(s =>
    wizard.selectedSources.includes(s.id)
  );

  // Count pre-analyzed
  const preAnalyzedCount = selectedSourcesList.filter(s => preAnalyzedResults.has(s.id)).length;
  const analyzingCount = selectedSourcesList.filter(s => pendingAnalysis.has(s.id)).length;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Discover Sources</h2>
        <p className="text-[var(--ca-gray-light)]">
          Find content to analyze for breakthrough angles
        </p>
      </div>

      {/* Tabs for Unmodified / Modified */}
      {hasSearched && !isSearching && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('unmodified')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'unmodified'
                ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray)]'
            }`}
          >
            <Search className="w-4 h-4" />
            Standard ({unmodifiedSources.length})
          </button>
          <button
            onClick={() => setActiveTab('modified')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'modified'
                ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray)]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Modified ({modifiedSources.length})
          </button>
        </div>
      )}


      {/* Skeleton Loading */}
      {isSearching && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--ca-gold)]" />
              <span className="text-sm text-[var(--ca-gray-light)]">
                Searching for relevant content...
              </span>
            </div>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--ca-gray-dark)] flex-shrink-0 shimmer" />
                <div className="flex-1">
                  <div className="h-4 bg-[var(--ca-gray-dark)] rounded w-3/4 mb-3 shimmer" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-[var(--ca-gray-dark)] rounded-full w-20 shimmer" />
                    <div className="h-5 bg-[var(--ca-gray-dark)] rounded w-16 shimmer" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {hasSearched && !isSearching && (
        <>
          {/* Selected Sources Summary with Hyperlinks */}
          {selectedSourcesList.length > 0 && (
            <div className="card mb-6">
              <button
                onClick={() => setShowSelectedSources(!showSelectedSources)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--ca-gold)]" />
                  <span className="font-medium text-sm">Selected Sources ({selectedSourcesList.length})</span>
                </div>
                {showSelectedSources ? (
                  <ChevronUp className="w-4 h-4 text-[var(--ca-gray-light)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--ca-gray-light)]" />
                )}
              </button>
              {showSelectedSources && (
                <div className="mt-4 pt-4 border-t border-[var(--ca-gray-dark)] space-y-2 max-h-48 overflow-y-auto">
                  {selectedSourcesList.map(source => {
                    const Icon = sourceIcons[source.type];
                    const isPreAnalyzed = preAnalyzedResults.has(source.id);
                    const isAnalyzing = pendingAnalysis.has(source.id);
                    return (
                      <div
                        key={source.id}
                        className="flex items-center justify-between gap-2 text-sm py-1"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Icon className="w-3.5 h-3.5 text-[var(--ca-gray-light)] flex-shrink-0" />
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate hover:text-[var(--ca-gold)] hover:underline transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {source.title}
                          </a>
                          {source.modified && (
                            <Sparkles className="w-3 h-3 text-[var(--ca-gold)] flex-shrink-0" />
                          )}
                        </div>
                        <button
                          onClick={() => toggleSourceSelection(source.id)}
                          className="p-1 rounded hover:bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)] hover:text-red-400 flex-shrink-0"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Source Type Filter */}
          {activeSourceList.length > 0 && wizard.selectedSourceTypes.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-[var(--ca-gray-light)] mr-1">Filter:</span>
              <button
                onClick={() => setFilterSourceType('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterSourceType === 'all'
                    ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                    : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray)]'
                }`}
              >
                All ({activeSourceList.length})
              </button>
              {wizard.selectedSourceTypes.map(type => {
                const Icon = sourceIcons[type];
                const count = sourceTypeCounts[type] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={type}
                    onClick={() => setFilterSourceType(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      filterSourceType === type
                        ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                        : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray)]'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {sourceTypeLabels[type]} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Selection Controls */}
          {availableSources.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--ca-gray-light)]">
                  {wizard.selectedSources.filter(id => availableSources.some(s => s.id === id)).length} of {availableSources.length} selected
                </span>
                <button
                  onClick={() => {
                    // Select only visible sources (respects active tab AND filter)
                    const visibleIds = availableSources.filter(s => !s.failed).map(s => s.id);
                    // Merge with existing selections (keep sources from other tabs/filters)
                    const newSelection = [...new Set([...wizard.selectedSources, ...visibleIds])];
                    setSelectedSources(newSelection);
                  }}
                  className="text-sm text-[var(--ca-gold)] hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={() => {
                    // Deselect only visible sources (respects active tab AND filter)
                    const visibleIds = new Set(availableSources.map(s => s.id));
                    // Keep selections from other tabs/filters
                    const newSelection = wizard.selectedSources.filter(id => !visibleIds.has(id));
                    setSelectedSources(newSelection);
                  }}
                  className="text-sm text-[var(--ca-gray-light)] hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Source List */}
          <div className="space-y-3 mb-6">
            {availableSources.map(source => {
              const Icon = sourceIcons[source.type];
              const isSelected = wizard.selectedSources.includes(source.id);
              const viewCount = formatViews(source.views);
              const isPreAnalyzed = preAnalyzedResults.has(source.id);
              const isAnalyzing = pendingAnalysis.has(source.id);

              return (
                <div
                  key={source.id}
                  onClick={() => toggleSourceSelection(source.id)}
                  className={`card card-hover cursor-pointer transition-all ${
                    isSelected ? 'border-[var(--ca-gold)]' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                          : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)]'
                      }`}
                    >
                      {isSelected ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate pr-4">{source.title}</h4>
                        {source.modified && (
                          <span className="tag text-[10px] bg-[var(--ca-gold)]/20 text-[var(--ca-gold)] flex-shrink-0">
                            <Sparkles className="w-2.5 h-2.5" />
                            {source.modifierUsed || 'Modified'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="tag text-xs">
                          <Icon className="w-3 h-3" />
                          {source.type === 'youtube'
                            ? 'YouTube'
                            : source.type === 'podcast'
                            ? 'Podcast'
                            : source.type === 'reddit'
                            ? `r/${source.subreddit}`
                            : sourceTypeLabels[source.type]}
                        </span>
                        {viewCount && (
                          <span className="text-xs text-[var(--ca-gray-light)]">
                            {viewCount} {source.type === 'reddit' ? 'upvotes' : 'views'}
                          </span>
                        )}
                        {source.duration && (
                          <span className="text-xs text-[var(--ca-gray-light)]">
                            {source.duration}
                          </span>
                        )}
                        {source.author && (
                          <span className="text-xs text-[var(--ca-gray-light)]">
                            by {source.author}
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-2 rounded-lg hover:bg-[var(--ca-gray-dark)] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-[var(--ca-gray-light)]" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Failed Sources */}
          {failedSources.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-[var(--ca-gray-light)] mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {failedSources.length} source(s) unavailable
              </p>
            </div>
          )}

          {/* Load More */}
          {availableSources.length >= 20 && (
            <div className="text-center mb-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="btn btn-secondary"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Load More {activeTab === 'modified' ? 'Modified ' : ''}Sources
                  </>
                )}
              </button>
            </div>
          )}

          {/* No Results */}
          {availableSources.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-[var(--ca-gray)] mx-auto mb-4" />
              <p className="text-[var(--ca-gray-light)]">
                {activeTab === 'modified'
                  ? 'No modified sources found. Try the Standard tab.'
                  : 'No sources found. Try adjusting your search criteria.'}
              </p>
            </div>
          )}
        </>
      )}


      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => setStep(4)} className="btn btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setStep(6)}
          disabled={wizard.selectedSources.length === 0}
          className="btn btn-primary"
        >
          Analyze {wizard.selectedSources.length} Source{wizard.selectedSources.length !== 1 ? 's' : ''}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
