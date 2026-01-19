'use client';

import { useApp } from '@/context/AppContext';
import { AngleType, Hook, Claim, SourceType, AwarenessLevel } from '@/types';
import { ClaimCard } from '@/components/results/ClaimCard';
import { HookCard } from '@/components/results/HookCard';
import { NICHES } from '@/data/niches';
import { CATEGORIES } from '@/data/categories';
import {
  Download,
  Star,
  Filter,
  ArrowUpDown,
  Lightbulb,
  Zap,
  RefreshCw,
  ChevronDown,
  Trash2,
  Youtube,
  Radio,
  MessageSquare,
  BookOpen,
  ChevronUp,
  FileText,
  Shuffle,
  Target,
  Newspaper,
  GraduationCap,
  FlaskConical,
  Sparkles,
  Eye,
  EyeOff,
  TrendingUp,
  Activity,
} from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';

const ANGLE_TYPES: AngleType[] = [
  'Hidden Cause',
  'Deficiency',
  'Contamination',
  'Timing/Method',
  'Differentiation',
  'Identity',
  'Contrarian',
];

const sourceTypeIcons: Record<SourceType, typeof Youtube> = {
  youtube: Youtube,
  podcast: Radio,
  reddit: MessageSquare,
  research: BookOpen,
  sciencedaily: Newspaper,
  scholar: GraduationCap,
  arxiv: FileText,
  preprint: FlaskConical,
};

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

// Awareness level configuration
const awarenessConfig: Record<AwarenessLevel, { label: string; color: string; Icon: typeof Eye }> = {
  hidden: { label: 'Hidden', color: '#22C55E', Icon: EyeOff },
  emerging: { label: 'Emerging', color: '#EAB308', Icon: TrendingUp },
  known: { label: 'Known', color: '#EF4444', Icon: Eye },
};

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
    currentSession,
    deleteSession,
    generatedHooks,
    customCategories,
  } = useApp();

  const [showFilters, setShowFilters] = useState(false);
  const [showAwarenessFilter, setShowAwarenessFilter] = useState(false);
  const [showBridgeFilter, setShowBridgeFilter] = useState(false);
  const [showSourceFilter, setShowSourceFilter] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInputsSummary, setShowInputsSummary] = useState(true);
  const [sortClaimsBy, setSortClaimsBy] = useState<'surprise' | 'momentum'>('surprise');
  const [filterAwareness, setFilterAwareness] = useState<AwarenessLevel | 'sweet-spot' | null>(null);
  const [filterBridge, setFilterBridge] = useState<'Aggressive' | 'Moderate' | 'Conservative' | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [filterHookSource, setFilterHookSource] = useState<string | null>(null);
  const [showHookSourceFilter, setShowHookSourceFilter] = useState(false);

  // Auto-save session on first load of results (only for new sessions)
  useEffect(() => {
    if (!hasSaved && wizard.results.length > 0 && !currentSession) {
      saveSession();
      setHasSaved(true);
    }
  }, [wizard.results, hasSaved, saveSession, currentSession]);

  // Get niche name for display
  const getNicheName = () => {
    if (wizard.niche === 'other') return wizard.customNiche;
    return NICHES.find(n => n.id === wizard.niche)?.name || wizard.niche;
  };

  // Get category names for display
  const getCategoryNames = () => {
    if (!wizard.niche || !wizard.strategy) return [];
    const builtInCategories = CATEGORIES[wizard.niche]?.[wizard.strategy] || [];
    const allCategories = [...builtInCategories, ...customCategories];
    return wizard.selectedCategories
      .map(id => allCategories.find(c => c.id === id)?.name || id)
      .filter(Boolean);
  };

  // Get analyzed sources
  const analyzedSources = wizard.discoveredSources.filter(s =>
    wizard.selectedSources.includes(s.id)
  );

  // Handle delete with confirmation
  const handleDelete = () => {
    if (currentSession) {
      deleteSession(currentSession.id);
      resetWizard();
    }
    setShowDeleteConfirm(false);
  };

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

  // Get unique sources for claims filter
  const uniqueSources = useMemo(() => {
    const sources = new Map<string, { name: string; type: SourceType }>();
    allClaims.forEach(claim => {
      if (!sources.has(claim.sourceName)) {
        sources.set(claim.sourceName, { name: claim.sourceName, type: claim.sourceType });
      }
    });
    return Array.from(sources.values());
  }, [allClaims]);

  // Get unique sources for hooks filter
  const uniqueHookSources = useMemo(() => {
    const sources = new Map<string, { name: string; type: SourceType }>();
    allHooks.forEach(hook => {
      if (!sources.has(hook.sourceName)) {
        sources.set(hook.sourceName, { name: hook.sourceName, type: hook.sourceType });
      }
    });
    return Array.from(sources.values());
  }, [allHooks]);

  // Filter and sort claims
  const sortedClaims = useMemo(() => {
    let claims = [...allClaims];

    // Filter by awareness level
    if (filterAwareness === 'sweet-spot') {
      claims = claims.filter(c => c.isSweetSpot || (c.awarenessLevel === 'hidden' && (c.momentumScore || 0) >= 7));
    } else if (filterAwareness) {
      claims = claims.filter(c => c.awarenessLevel === filterAwareness);
    }

    // Filter by source
    if (filterSource) {
      claims = claims.filter(c => c.sourceName === filterSource);
    }

    // Sort
    if (sortClaimsBy === 'surprise') {
      return claims.sort((a, b) => b.surpriseScore - a.surpriseScore);
    }
    if (sortClaimsBy === 'momentum') {
      return claims.sort((a, b) => (b.momentumScore || 0) - (a.momentumScore || 0));
    }
    return claims;
  }, [allClaims, sortClaimsBy, filterAwareness, filterSource]);

  // Filter hooks by angle type, awareness level, bridge distance, and source
  const filteredHooks = useMemo(() => {
    let hooks = allHooks;

    // Filter by angle type
    if (filterAngleType) {
      hooks = hooks.filter(h => h.angleTypes.includes(filterAngleType as AngleType));
    }

    // Filter by awareness level
    if (filterAwareness === 'sweet-spot') {
      hooks = hooks.filter(h => h.isSweetSpot || (h.awarenessLevel === 'hidden' && (h.momentumScore || 0) >= 7));
    } else if (filterAwareness) {
      hooks = hooks.filter(h => h.awarenessLevel === filterAwareness);
    }

    // Filter by bridge distance
    if (filterBridge) {
      hooks = hooks.filter(h => h.bridgeDistance === filterBridge);
    }

    // Filter by source
    if (filterHookSource) {
      hooks = hooks.filter(h => h.sourceName === filterHookSource);
    }

    return hooks;
  }, [allHooks, filterAngleType, filterAwareness, filterBridge, filterHookSource]);

  // Sort hooks
  const bridgeDistanceOrder = { 'Aggressive': 0, 'Moderate': 1, 'Conservative': 2 };
  const sortedHooks = useMemo(() => {
    const hooks = [...filteredHooks];
    if (sortResultsBy === 'virality') {
      return hooks.sort((a, b) => b.viralityScore.total - a.viralityScore.total);
    }
    if (sortResultsBy === 'bridge') {
      return hooks.sort((a, b) => bridgeDistanceOrder[a.bridgeDistance] - bridgeDistanceOrder[b.bridgeDistance]);
    }
    if (sortResultsBy === 'momentum') {
      return hooks.sort((a, b) => (b.momentumScore || 0) - (a.momentumScore || 0));
    }
    return hooks;
  }, [filteredHooks, sortResultsBy]);

  // Get favorite items
  const favoriteClaimItems = useMemo(() => {
    return allClaims.filter(c => favoriteClaims.includes(c.id));
  }, [allClaims, favoriteClaims]);

  const favoriteHookItems = useMemo(() => {
    return allHooks.filter(h => favoriteHooks.includes(h.id));
  }, [allHooks, favoriteHooks]);

  // Get source IDs from current session to filter generated hooks
  const currentSessionSourceIds = useMemo(() => {
    return new Set(wizard.results.map(r => r.sourceId));
  }, [wizard.results]);

  // Filter generated hooks to only show ones from current session
  const currentSessionGeneratedHooks = useMemo(() => {
    return generatedHooks.filter(h => currentSessionSourceIds.has(h.sourceId));
  }, [generatedHooks, currentSessionSourceIds]);

  const favoriteGeneratedItems = useMemo(() => {
    // Only show favorited generated hooks that belong to current session
    return currentSessionGeneratedHooks.filter(h => favoriteHooks.includes(h.id));
  }, [currentSessionGeneratedHooks, favoriteHooks]);

  // Export functions
  const exportToMarkdown = (type: 'claims' | 'hooks' | 'all' | 'favorites' | 'generated') => {
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
      content += exportClaims(sortedClaims);
    } else if (type === 'hooks') {
      content += exportHooks(sortedHooks);
    } else if (type === 'generated') {
      content += `## Generated Hooks\n\n`;
      content += exportHooks(generatedHooks as typeof allHooks);
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
    // Create descriptive filename with niche and date
    const nicheName = (getNicheName() || 'research').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `angle-finder-${nicheName}-${type}-${dateStr}.md`;
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
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md mx-4 animate-slide-up">
            <h3 className="text-lg font-semibold mb-2">Delete Session?</h3>
            <p className="text-sm text-[var(--ca-gray-light)] mb-6">
              This will permanently delete this research session and all its results. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold">Analysis Results</h2>
        <div className="flex gap-2">
          {currentSession && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-ghost text-[var(--ca-gray-light)] hover:text-red-400 hover:bg-red-500/20 transition-colors"
              title="Delete this session"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => exportToMarkdown('all')} className="btn btn-secondary">
            <Download className="w-4 h-4" />
            Export All
          </button>
        </div>
      </div>

      {/* Research Summary */}
      <div className="card mb-6">
        <button
          onClick={() => setShowInputsSummary(!showInputsSummary)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--ca-gold)]" />
            <span className="font-medium text-sm">Research Summary</span>
          </div>
          {showInputsSummary ? (
            <ChevronUp className="w-4 h-4 text-[var(--ca-gray-light)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--ca-gray-light)]" />
          )}
        </button>

        {showInputsSummary && (
          <div className="mt-4 pt-4 border-t border-[var(--ca-gray-dark)] overflow-hidden">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {/* Product Description */}
              <div className="sm:col-span-2 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[var(--ca-gray)] mb-1">Product</p>
                <p className="text-sm break-words">{wizard.productDescription || 'No product description'}</p>
              </div>

              {/* Strategy */}
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[var(--ca-gray)] mb-1">Strategy</p>
                <div className="flex items-center gap-2">
                  {wizard.strategy === 'translocate' ? (
                    <Shuffle className="w-4 h-4 text-[var(--ca-gold)] flex-shrink-0" />
                  ) : (
                    <Target className="w-4 h-4 text-[var(--ca-gold)] flex-shrink-0" />
                  )}
                  <span className="text-sm capitalize">{wizard.strategy}</span>
                </div>
              </div>

              {/* Niche */}
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[var(--ca-gray)] mb-1">Niche</p>
                <p className="text-sm truncate">{getNicheName()}</p>
              </div>

              {/* Source Types */}
              <div className="min-w-0 sm:col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--ca-gray)] mb-1">Source Types</p>
                <div className="flex flex-wrap gap-1.5">
                  {wizard.selectedSourceTypes.map(type => {
                    const Icon = sourceTypeIcons[type];
                    return (
                      <span key={type} className="tag text-xs flex items-center gap-1">
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{sourceTypeLabels[type]}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Sources Analyzed */}
              <div className="min-w-0 sm:col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--ca-gray)] mb-1">
                  Sources Analyzed ({analyzedSources.length})
                </p>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {analyzedSources.length > 0 ? (
                    analyzedSources.slice(0, 5).map(source => {
                      const Icon = sourceTypeIcons[source.type];
                      return (
                        <div key={source.id} className="flex items-center gap-1.5 text-xs text-[var(--ca-gray-light)] min-w-0">
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{source.title}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-[var(--ca-gray-light)]">
                      {wizard.results.length} source{wizard.results.length !== 1 ? 's' : ''} analyzed
                    </p>
                  )}
                  {analyzedSources.length > 5 && (
                    <p className="text-[10px] text-[var(--ca-gray)]">
                      +{analyzedSources.length - 5} more
                    </p>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="sm:col-span-2 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[var(--ca-gray)] mb-1">Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {getCategoryNames().map((name, i) => (
                    <span key={i} className="tag text-xs">{name}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation with Export */}
      <div className="flex flex-col gap-4 mb-6 border-b border-[var(--ca-gray-dark)] pb-4">
        {/* 2x2 grid on mobile, row on sm+ */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
          <button
            onClick={() => setResultsView('hooks')}
            className={`px-3 py-2.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center sm:justify-start gap-2 transition-colors text-sm ${
              resultsView === 'hooks'
                ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                : 'bg-[var(--ca-gray-dark)]/50 text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray-dark)]'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Hooks ({allHooks.length})</span>
          </button>
          <button
            onClick={() => setResultsView('claims')}
            className={`px-3 py-2.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center sm:justify-start gap-2 transition-colors text-sm ${
              resultsView === 'claims'
                ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                : 'bg-[var(--ca-gray-dark)]/50 text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray-dark)]'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Claims ({allClaims.length})</span>
          </button>
          <button
            onClick={() => setResultsView('generated')}
            className={`px-3 py-2.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center sm:justify-start gap-2 transition-colors text-sm ${
              resultsView === 'generated'
                ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                : 'bg-[var(--ca-gray-dark)]/50 text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray-dark)]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Generated ({currentSessionGeneratedHooks.length})</span>
          </button>
          <button
            onClick={() => setResultsView('favorites')}
            className={`px-3 py-2.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center sm:justify-start gap-2 transition-colors text-sm ${
              resultsView === 'favorites'
                ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                : 'bg-[var(--ca-gray-dark)]/50 text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray-dark)]'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Favorites ({favoriteClaimItems.length + favoriteHookItems.length + favoriteGeneratedItems.length})</span>
          </button>
        </div>
        <button
          onClick={() =>
            exportToMarkdown(
              resultsView === 'favorites' ? 'favorites'
                : resultsView === 'claims' ? 'claims'
                : resultsView === 'generated' ? 'generated'
                : 'hooks'
            )
          }
          className="btn btn-secondary text-sm"
        >
          <Download className="w-4 h-4" />
          Export {resultsView === 'favorites' ? 'Favorites'
            : resultsView === 'claims' ? 'Claims'
            : resultsView === 'generated' ? 'Generated'
            : 'Hooks'}
        </button>
      </div>

      {/* Filter & Sort Controls (for hooks view) */}
      {resultsView === 'hooks' && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Angle Type Filter */}
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

          {/* Awareness Level Filter */}
          <div className="relative">
            <button
              onClick={() => setShowAwarenessFilter(!showAwarenessFilter)}
              className={`btn btn-secondary text-sm ${filterAwareness ? 'ring-1 ring-[var(--ca-gold)]' : ''}`}
            >
              {filterAwareness === 'sweet-spot' ? (
                <Sparkles className="w-4 h-4 text-[#22C55E]" />
              ) : filterAwareness ? (
                React.createElement(awarenessConfig[filterAwareness].Icon, {
                  className: 'w-4 h-4',
                  style: { color: awarenessConfig[filterAwareness].color }
                })
              ) : (
                <Activity className="w-4 h-4" />
              )}
              {filterAwareness === 'sweet-spot' ? 'Sweet Spots' : filterAwareness ? awarenessConfig[filterAwareness].label : 'Awareness'}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showAwarenessFilter && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--ca-dark)] border border-[var(--ca-gray)] rounded-lg shadow-xl z-10 py-1">
                <button
                  onClick={() => {
                    setFilterAwareness(null);
                    setShowAwarenessFilter(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] flex items-center gap-2 ${
                    !filterAwareness ? 'text-[var(--ca-gold)]' : ''
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  All Levels
                </button>
                <button
                  onClick={() => {
                    setFilterAwareness('sweet-spot');
                    setShowAwarenessFilter(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] flex items-center gap-2 ${
                    filterAwareness === 'sweet-spot' ? 'text-[#22C55E]' : ''
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#22C55E]" />
                  Sweet Spots Only
                </button>
                {(['hidden', 'emerging', 'known'] as const).map(level => {
                  const config = awarenessConfig[level];
                  const LevelIcon = config.Icon;
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        setFilterAwareness(level);
                        setShowAwarenessFilter(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] flex items-center gap-2`}
                      style={{ color: filterAwareness === level ? config.color : undefined }}
                    >
                      <LevelIcon className="w-4 h-4" style={{ color: config.color }} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bridge Filter */}
          <div className="relative">
            <button
              onClick={() => setShowBridgeFilter(!showBridgeFilter)}
              className={`btn btn-secondary text-sm ${filterBridge ? 'ring-1 ring-[var(--ca-gold)]' : ''}`}
            >
              <Shuffle className="w-4 h-4" />
              {filterBridge || 'All Bridges'}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showBridgeFilter && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--ca-dark)] border border-[var(--ca-gray)] rounded-lg shadow-xl z-10 py-1">
                <button
                  onClick={() => {
                    setFilterBridge(null);
                    setShowBridgeFilter(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] ${
                    !filterBridge ? 'text-[var(--ca-gold)]' : ''
                  }`}
                >
                  All Bridges
                </button>
                {(['Aggressive', 'Moderate', 'Conservative'] as const).map(bridge => (
                  <button
                    key={bridge}
                    onClick={() => {
                      setFilterBridge(bridge);
                      setShowBridgeFilter(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] ${
                      filterBridge === bridge ? 'text-[var(--ca-gold)]' : ''
                    }`}
                  >
                    {bridge}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Source Filter */}
          <div className="relative">
            <button
              onClick={() => setShowHookSourceFilter(!showHookSourceFilter)}
              className={`btn btn-secondary text-sm ${filterHookSource ? 'ring-1 ring-[var(--ca-gold)]' : ''}`}
            >
              <BookOpen className="w-4 h-4" />
              {filterHookSource ? (
                <span className="max-w-32 truncate">{filterHookSource}</span>
              ) : (
                'All Sources'
              )}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showHookSourceFilter && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--ca-dark)] border border-[var(--ca-gray)] rounded-lg shadow-xl z-10 py-1 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setFilterHookSource(null);
                    setShowHookSourceFilter(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] ${
                    !filterHookSource ? 'text-[var(--ca-gold)]' : ''
                  }`}
                >
                  All Sources
                </button>
                {uniqueHookSources.map(source => {
                  const Icon = sourceTypeIcons[source.type];
                  return (
                    <button
                      key={source.name}
                      onClick={() => {
                        setFilterHookSource(source.name);
                        setShowHookSourceFilter(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] flex items-center gap-2 ${
                        filterHookSource === source.name ? 'text-[var(--ca-gold)]' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{source.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sort Toggle */}
          <button
            onClick={() => {
              if (sortResultsBy === 'virality') setSortResultsBy('momentum');
              else if (sortResultsBy === 'momentum') setSortResultsBy('bridge');
              else setSortResultsBy('virality');
            }}
            className="btn btn-secondary text-sm"
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort: {sortResultsBy === 'virality' ? 'Virality' : sortResultsBy === 'momentum' ? 'Momentum' : 'Bridge'}
          </button>
        </div>
      )}

      {/* Filter & Sort Controls (for claims view) */}
      {resultsView === 'claims' && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Awareness Level Filter */}
          <div className="relative">
            <button
              onClick={() => setShowAwarenessFilter(!showAwarenessFilter)}
              className={`btn btn-secondary text-sm ${filterAwareness ? 'ring-1 ring-[var(--ca-gold)]' : ''}`}
            >
              {filterAwareness === 'sweet-spot' ? (
                <Sparkles className="w-4 h-4 text-[#22C55E]" />
              ) : filterAwareness ? (
                React.createElement(awarenessConfig[filterAwareness].Icon, {
                  className: 'w-4 h-4',
                  style: { color: awarenessConfig[filterAwareness].color }
                })
              ) : (
                <Activity className="w-4 h-4" />
              )}
              {filterAwareness === 'sweet-spot' ? 'Sweet Spots' : filterAwareness ? awarenessConfig[filterAwareness].label : 'Awareness'}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showAwarenessFilter && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--ca-dark)] border border-[var(--ca-gray)] rounded-lg shadow-xl z-10 py-1">
                <button
                  onClick={() => {
                    setFilterAwareness(null);
                    setShowAwarenessFilter(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] flex items-center gap-2 ${
                    !filterAwareness ? 'text-[var(--ca-gold)]' : ''
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  All Levels
                </button>
                <button
                  onClick={() => {
                    setFilterAwareness('sweet-spot');
                    setShowAwarenessFilter(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] flex items-center gap-2 ${
                    filterAwareness === 'sweet-spot' ? 'text-[#22C55E]' : ''
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#22C55E]" />
                  Sweet Spots Only
                </button>
                {(['hidden', 'emerging', 'known'] as const).map(level => {
                  const config = awarenessConfig[level];
                  const LevelIcon = config.Icon;
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        setFilterAwareness(level);
                        setShowAwarenessFilter(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] flex items-center gap-2`}
                      style={{ color: filterAwareness === level ? config.color : undefined }}
                    >
                      <LevelIcon className="w-4 h-4" style={{ color: config.color }} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Source Filter */}
          <div className="relative">
            <button
              onClick={() => setShowSourceFilter(!showSourceFilter)}
              className={`btn btn-secondary text-sm ${filterSource ? 'ring-1 ring-[var(--ca-gold)]' : ''}`}
            >
              <BookOpen className="w-4 h-4" />
              {filterSource ? (
                <span className="max-w-32 truncate">{filterSource}</span>
              ) : (
                'All Sources'
              )}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showSourceFilter && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--ca-dark)] border border-[var(--ca-gray)] rounded-lg shadow-xl z-10 py-1 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setFilterSource(null);
                    setShowSourceFilter(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] ${
                    !filterSource ? 'text-[var(--ca-gold)]' : ''
                  }`}
                >
                  All Sources
                </button>
                {uniqueSources.map(source => {
                  const Icon = sourceTypeIcons[source.type];
                  return (
                    <button
                      key={source.name}
                      onClick={() => {
                        setFilterSource(source.name);
                        setShowSourceFilter(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--ca-gray-dark)] flex items-center gap-2 ${
                        filterSource === source.name ? 'text-[var(--ca-gold)]' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{source.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sort Toggle */}
          <button
            onClick={() => {
              if (sortClaimsBy === 'surprise') setSortClaimsBy('momentum');
              else setSortClaimsBy('surprise');
            }}
            className="btn btn-secondary text-sm"
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort: {sortClaimsBy === 'surprise' ? 'Surprise Score' : 'Momentum'}
          </button>
        </div>
      )}

      {/* Results Grid */}
      <div className="space-y-4">
        {resultsView === 'claims' && (
          <>
            {sortedClaims.length === 0 ? (
              <p className="text-center text-[var(--ca-gray-light)] py-12">No claims found</p>
            ) : (
              sortedClaims.map(claim => (
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

        {resultsView === 'generated' && (
          <>
            {currentSessionGeneratedHooks.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-[var(--ca-gray-dark)] mx-auto mb-4" />
                <p className="text-[var(--ca-gray-light)] mb-2">No generated hooks yet</p>
                <p className="text-sm text-[var(--ca-gray)]">
                  Generate hooks from claims or create variations of existing hooks to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentSessionGeneratedHooks.map(hook => (
                  <HookCard
                    key={hook.id}
                    hook={hook}
                    sourceName={hook.sourceName || 'Unknown Source'}
                    sourceType={hook.sourceType || 'research'}
                    sourceUrl={hook.sourceUrl || '#'}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {resultsView === 'favorites' && (
          <>
            {favoriteClaimItems.length === 0 && favoriteHookItems.length === 0 && favoriteGeneratedItems.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-[var(--ca-gray-dark)] mx-auto mb-4" />
                <p className="text-[var(--ca-gray-light)] mb-2">No favorites yet</p>
                <p className="text-sm text-[var(--ca-gray)]">
                  Star claims and hooks to save them here for quick access.
                </p>
              </div>
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
                  <div className="mb-8">
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
                {favoriteGeneratedItems.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[var(--ca-gold)]" />
                      Favorite Generated ({favoriteGeneratedItems.length})
                    </h3>
                    <div className="space-y-4">
                      {favoriteGeneratedItems.map(hook => (
                        <HookCard
                          key={hook.id}
                          hook={hook}
                          sourceName={hook.sourceName || 'Unknown Source'}
                          sourceType={hook.sourceType || 'research'}
                          sourceUrl={hook.sourceUrl || '#'}
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
