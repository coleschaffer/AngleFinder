'use client';

import { useApp } from '@/context/AppContext';
import { AngleType, Hook, Claim } from '@/types';
import { ClaimCard } from '@/components/results/ClaimCard';
import { HookCard } from '@/components/results/HookCard';
import {
  Download,
  Star,
  Filter,
  ArrowUpDown,
  Lightbulb,
  Zap,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

const ANGLE_TYPES: AngleType[] = [
  'Hidden Cause',
  'Deficiency',
  'Contamination',
  'Timing/Method',
  'Differentiation',
  'Identity',
  'Contrarian',
];

export function Step7Results() {
  const {
    wizard,
    resultsView,
    setResultsView,
    filterAngleType,
    setFilterAngleType,
    sortResultsBy,
    setSortResultsBy,
    favoriteClaims,
    favoriteHooks,
    resetWizard,
    saveSession,
  } = useApp();

  const [showFilters, setShowFilters] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Auto-save session on first load of results
  useEffect(() => {
    if (!hasSaved && wizard.results.length > 0) {
      saveSession();
      setHasSaved(true);
    }
  }, [wizard.results, hasSaved, saveSession]);

  // Flatten all claims and hooks from results
  const allClaims = useMemo(() => {
    return wizard.results.flatMap(result =>
      result.claims.map(claim => ({
        ...claim,
        sourceName: result.sourceName,
        sourceType: result.sourceType,
        sourceUrl: result.sourceUrl,
      }))
    );
  }, [wizard.results]);

  const allHooks = useMemo(() => {
    return wizard.results.flatMap(result =>
      result.hooks.map(hook => ({
        ...hook,
        sourceName: result.sourceName,
        sourceType: result.sourceType,
        sourceUrl: result.sourceUrl,
      }))
    );
  }, [wizard.results]);

  // Filter hooks by angle type
  const filteredHooks = useMemo(() => {
    let hooks = allHooks;
    if (filterAngleType) {
      hooks = hooks.filter(h => h.angleTypes.includes(filterAngleType as AngleType));
    }
    return hooks;
  }, [allHooks, filterAngleType]);

  // Sort hooks
  const sortedHooks = useMemo(() => {
    const hooks = [...filteredHooks];
    if (sortResultsBy === 'virality') {
      return hooks.sort((a, b) => b.viralityScore.total - a.viralityScore.total);
    }
    // Sort by source - group by sourceId
    return hooks;
  }, [filteredHooks, sortResultsBy]);

  // Get favorite items
  const favoriteClaimItems = useMemo(() => {
    return allClaims.filter(c => favoriteClaims.includes(c.id));
  }, [allClaims, favoriteClaims]);

  const favoriteHookItems = useMemo(() => {
    return allHooks.filter(h => favoriteHooks.includes(h.id));
  }, [allHooks, favoriteHooks]);

  // Export functions
  const exportToMarkdown = (type: 'claims' | 'hooks' | 'all' | 'favorites') => {
    let content = `# Angle Finder Results\n\n`;
    content += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    content += `---\n\n`;

    const exportClaims = (claims: typeof allClaims) => {
      let md = `## Claims\n\n`;
      claims.forEach((claim, i) => {
        md += `### ${i + 1}. ${claim.claim}\n\n`;
        md += `**Surprise Score:** ${claim.surpriseScore}/10\n\n`;
        md += `**Exact Quote:**\n> "${claim.exactQuote}"\n\n`;
        md += `**Mechanism:** ${claim.mechanism}\n\n`;
        md += `**Source:** [${claim.sourceName}](${claim.sourceUrl})\n\n`;
        md += `---\n\n`;
      });
      return md;
    };

    const exportHooks = (hooks: typeof allHooks) => {
      let md = `## Hooks\n\n`;
      hooks.forEach((hook, i) => {
        md += `### ${i + 1}. ${hook.headline}\n\n`;
        md += `**Virality Score:** ${hook.viralityScore.total}/50\n\n`;
        md += `**Bridge Distance:** ${hook.bridgeDistance}\n\n`;
        md += `**Angle Types:** ${hook.angleTypes.join(', ')}\n\n`;
        md += `**Source Claim:** ${hook.sourceClaim}\n\n`;
        md += `**The Bridge:**\n${hook.bridge}\n\n`;
        md += `**Big Idea Summary:**\n${hook.bigIdeaSummary}\n\n`;
        md += `**Sample Ad Opener:**\n${hook.sampleAdOpener}\n\n`;
        md += `**Virality Breakdown:**\n`;
        md += `- Easy to Understand: ${hook.viralityScore.easyToUnderstand}/10\n`;
        md += `- Emotional: ${hook.viralityScore.emotional}/10\n`;
        md += `- Curiosity: ${hook.viralityScore.curiosityInducing}/10\n`;
        md += `- Contrarian: ${hook.viralityScore.contrarian}/10\n`;
        md += `- Provable: ${hook.viralityScore.provable}/10\n\n`;
        md += `**Source:** [${hook.sourceName}](${hook.sourceUrl})\n\n`;
        md += `---\n\n`;
      });
      return md;
    };

    if (type === 'claims') {
      content += exportClaims(allClaims);
    } else if (type === 'hooks') {
      content += exportHooks(sortedHooks);
    } else if (type === 'favorites') {
      if (favoriteClaimItems.length > 0) {
        content += exportClaims(favoriteClaimItems);
      }
      if (favoriteHookItems.length > 0) {
        content += exportHooks(favoriteHookItems);
      }
    } else {
      content += exportClaims(allClaims);
      content += exportHooks(sortedHooks);
    }

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `angle-finder-${type}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (wizard.results.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--ca-gray-light)]">No results yet. Start a new research session.</p>
        <button onClick={resetWizard} className="btn btn-primary mt-4">
          <RefreshCw className="w-4 h-4" />
          New Research
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analysis Results</h2>
          <p className="text-[var(--ca-gray-light)] text-sm">
            {allClaims.length} claims, {allHooks.length} hooks from {wizard.results.length} sources
          </p>
        </div>
        <button onClick={resetWizard} className="btn btn-secondary">
          <RefreshCw className="w-4 h-4" />
          New Research
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-[var(--ca-gray-dark)] pb-4">
        <button
          onClick={() => setResultsView('hooks')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            resultsView === 'hooks'
              ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
              : 'text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray-dark)]'
          }`}
        >
          <Zap className="w-4 h-4" />
          Hooks ({allHooks.length})
        </button>
        <button
          onClick={() => setResultsView('claims')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            resultsView === 'claims'
              ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
              : 'text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray-dark)]'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Claims ({allClaims.length})
        </button>
        <button
          onClick={() => setResultsView('favorites')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            resultsView === 'favorites'
              ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
              : 'text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray-dark)]'
          }`}
        >
          <Star className="w-4 h-4" />
          Favorites ({favoriteClaimItems.length + favoriteHookItems.length})
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        {/* Filter & Sort (for hooks view) */}
        {resultsView === 'hooks' && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-secondary text-sm"
              >
                <Filter className="w-4 h-4" />
                {filterAngleType || 'All Angles'}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showFilters && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--ca-dark)] border border-[var(--ca-gray)] rounded-lg shadow-xl z-10 py-1">
                  <button
                    onClick={() => {
                      setFilterAngleType(null);
                      setShowFilters(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] ${
                      !filterAngleType ? 'text-[var(--ca-gold)]' : ''
                    }`}
                  >
                    All Angles
                  </button>
                  {ANGLE_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setFilterAngleType(type);
                        setShowFilters(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] ${
                        filterAngleType === type ? 'text-[var(--ca-gold)]' : ''
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() =>
                setSortResultsBy(sortResultsBy === 'virality' ? 'source' : 'virality')
              }
              className="btn btn-secondary text-sm"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort: {sortResultsBy === 'virality' ? 'Virality Score' : 'By Source'}
            </button>
          </div>
        )}

        {/* Export Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() =>
              exportToMarkdown(
                resultsView === 'favorites' ? 'favorites' : resultsView === 'claims' ? 'claims' : 'hooks'
              )
            }
            className="btn btn-secondary text-sm"
          >
            <Download className="w-4 h-4" />
            Export {resultsView === 'favorites' ? 'Favorites' : resultsView === 'claims' ? 'Claims' : 'Hooks'}
          </button>
          {resultsView !== 'favorites' && (
            <button onClick={() => exportToMarkdown('all')} className="btn btn-secondary text-sm">
              <Download className="w-4 h-4" />
              Export All
            </button>
          )}
        </div>
      </div>

      {/* Results Grid */}
      <div className="space-y-4">
        {resultsView === 'claims' && (
          <>
            {allClaims.length === 0 ? (
              <p className="text-center text-[var(--ca-gray-light)] py-12">No claims found</p>
            ) : (
              allClaims.map(claim => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  sourceName={claim.sourceName}
                  sourceType={claim.sourceType}
                  sourceUrl={claim.sourceUrl}
                />
              ))
            )}
          </>
        )}

        {resultsView === 'hooks' && (
          <>
            {sortedHooks.length === 0 ? (
              <p className="text-center text-[var(--ca-gray-light)] py-12">
                {filterAngleType ? `No hooks with "${filterAngleType}" angle type` : 'No hooks found'}
              </p>
            ) : (
              sortedHooks.map(hook => (
                <HookCard
                  key={hook.id}
                  hook={hook}
                  sourceName={hook.sourceName}
                  sourceType={hook.sourceType}
                  sourceUrl={hook.sourceUrl}
                />
              ))
            )}
          </>
        )}

        {resultsView === 'favorites' && (
          <>
            {favoriteClaimItems.length === 0 && favoriteHookItems.length === 0 ? (
              <p className="text-center text-[var(--ca-gray-light)] py-12">
                No favorites yet. Star claims and hooks to save them here.
              </p>
            ) : (
              <>
                {favoriteHookItems.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-[var(--ca-gold)]" />
                      Favorite Hooks ({favoriteHookItems.length})
                    </h3>
                    <div className="space-y-4">
                      {favoriteHookItems.map(hook => (
                        <HookCard
                          key={hook.id}
                          hook={hook}
                          sourceName={hook.sourceName}
                          sourceType={hook.sourceType}
                          sourceUrl={hook.sourceUrl}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {favoriteClaimItems.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-[var(--ca-gold)]" />
                      Favorite Claims ({favoriteClaimItems.length})
                    </h3>
                    <div className="space-y-4">
                      {favoriteClaimItems.map(claim => (
                        <ClaimCard
                          key={claim.id}
                          claim={claim}
                          sourceName={claim.sourceName}
                          sourceType={claim.sourceType}
                          sourceUrl={claim.sourceUrl}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
