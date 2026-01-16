'use client';

import { useApp } from '@/context/AppContext';
import { Source, SourceType } from '@/types';
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
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const sourceTypeLabels: Record<SourceType, string> = {
  youtube: 'YouTube',
  podcast: 'Podcasts',
  reddit: 'Reddit',
  pubmed: 'PubMed',
};

const sourceIcons: Record<SourceType, typeof Youtube> = {
  youtube: Youtube,
  podcast: Radio,
  reddit: MessageSquare,
  pubmed: BookOpen,
};

export function Step5Discovery() {
  const {
    wizard,
    setStep,
    setDiscoveredSources,
    addDiscoveredSources,
    toggleSourceSelection,
    selectAllSources,
    deselectAllSources,
  } = useApp();

  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [filterSourceType, setFilterSourceType] = useState<SourceType | 'all'>('all');
  const [showSelectedSources, setShowSelectedSources] = useState(false);
  const hasAutoSearched = useRef(false);

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

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    setPage(1);

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
          page: 1,
        }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setDiscoveredSources(data.sources);
    } catch (error) {
      console.error('Search error:', error);
      setDiscoveredSources([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;

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
        }),
      });

      if (!response.ok) throw new Error('Load more failed');

      const data = await response.json();
      addDiscoveredSources(data.sources);
      setPage(nextPage);
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

  const allAvailableSources = wizard.discoveredSources.filter(s => !s.failed);
  const failedSources = wizard.discoveredSources.filter(s => s.failed);

  // Filter sources by selected type
  const availableSources = filterSourceType === 'all'
    ? allAvailableSources
    : allAvailableSources.filter(s => s.type === filterSourceType);

  // Get counts per source type
  const sourceTypeCounts = wizard.selectedSourceTypes.reduce((acc, type) => {
    acc[type] = allAvailableSources.filter(s => s.type === type).length;
    return acc;
  }, {} as Record<SourceType, number>);

  // Get selected sources for the summary
  const selectedSourcesList = wizard.discoveredSources.filter(s =>
    wizard.selectedSources.includes(s.id)
  );

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Discover Sources</h2>
        <p className="text-[var(--ca-gray-light)]">
          Find content to analyze for breakthrough angles
        </p>
      </div>

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
          {/* Selected Sources Summary */}
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
                    return (
                      <div
                        key={source.id}
                        className="flex items-center justify-between gap-2 text-sm py-1"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-3.5 h-3.5 text-[var(--ca-gray-light)] flex-shrink-0" />
                          <span className="truncate">{source.title}</span>
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
          {allAvailableSources.length > 0 && wizard.selectedSourceTypes.length > 1 && (
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
                All ({allAvailableSources.length})
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
                  {wizard.selectedSources.length} of {allAvailableSources.length} selected
                </span>
                <button
                  onClick={selectAllSources}
                  className="text-sm text-[var(--ca-gold)] hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllSources}
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
                      <h4 className="font-medium text-sm truncate pr-4">{source.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="tag text-xs">
                          <Icon className="w-3 h-3" />
                          {source.type === 'youtube'
                            ? 'YouTube'
                            : source.type === 'podcast'
                            ? 'Podcast'
                            : source.type === 'reddit'
                            ? `r/${source.subreddit}`
                            : 'PubMed'}
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
                    Load More Sources
                  </>
                )}
              </button>
            </div>
          )}

          {/* No Results */}
          {availableSources.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-[var(--ca-gray)] mx-auto mb-4" />
              <p className="text-[var(--ca-gray-light)]">No sources found. Try adjusting your search criteria.</p>
            </div>
          )}
        </>
      )}

      {/* Analysis Note */}
      {wizard.selectedSources.length > 3 && (
        <div className="flex items-center gap-2 text-xs text-[var(--ca-gray-light)] mb-4 justify-center">
          <Clock className="w-3.5 h-3.5" />
          <span>Selecting more sources may result in longer analysis time</span>
        </div>
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
