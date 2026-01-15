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
  Eye,
  TrendingUp,
} from 'lucide-react';
import { useState, useEffect } from 'react';

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
    setSortBy,
  } = useApp();

  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const getCategoryNames = () => {
    if (!wizard.niche || !wizard.strategy) return [];
    const categories = CATEGORIES[wizard.niche]?.[wizard.strategy] || [];
    return wizard.selectedCategories
      .map(id => categories.find(c => c.id === id)?.name)
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
          sortBy: wizard.sortBy,
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
          sortBy: wizard.sortBy,
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

  const formatViews = (views?: number) => {
    if (!views) return 'N/A';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const availableSources = wizard.discoveredSources.filter(s => !s.failed);
  const failedSources = wizard.discoveredSources.filter(s => s.failed);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Discover Sources</h2>
        <p className="text-[var(--ca-gray-light)]">
          Find content to analyze for breakthrough angles
        </p>
      </div>

      {/* Search Controls */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Sort By</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('views')}
                className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  wizard.sortBy === 'views'
                    ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                    : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray)]'
                }`}
              >
                <Eye className="w-4 h-4" />
                Most Views
              </button>
              <button
                onClick={() => setSortBy('engagement')}
                className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  wizard.sortBy === 'engagement'
                    ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                    : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray)]'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Most Engagement
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="btn btn-primary w-full sm:w-auto"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search Sources
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {hasSearched && !isSearching && (
        <>
          {/* Selection Controls */}
          {availableSources.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--ca-gray-light)]">
                  {wizard.selectedSources.length} of {availableSources.length} selected
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
                        {source.views !== undefined && (
                          <span className="text-xs text-[var(--ca-gray-light)]">
                            {formatViews(source.views)} views
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
