'use client';

import { Hook, SourceType, BridgeDistance, AngleType } from '@/types';
import { useApp } from '@/context/AppContext';
import {
  Star,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  Youtube,
  Radio,
  MessageSquare,
  BookOpen,
  Sparkles,
  RefreshCw,
  Loader2,
  Newspaper,
  GraduationCap,
  FileText,
  FlaskConical,
} from 'lucide-react';
import { useState } from 'react';

interface HookCardProps {
  hook: Hook;
  sourceName: string;
  sourceType: SourceType;
  sourceUrl: string;
}

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

const bridgeDistanceColors: Record<BridgeDistance, string> = {
  Aggressive: 'bg-red-500/15 text-red-400 border-red-500/30',
  Moderate: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Conservative: 'bg-green-500/15 text-green-400 border-green-500/30',
};

export function HookCard({ hook, sourceName, sourceType, sourceUrl }: HookCardProps) {
  const { favoriteHooks, toggleHookFavorite, addHookVariation } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showVariationInput, setShowVariationInput] = useState(false);
  const [variationFeedback, setVariationFeedback] = useState('');
  const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);

  const isFavorite = favoriteHooks.includes(hook.id);
  const Icon = sourceIcons[sourceType];

  const handleCopy = async () => {
    const text = `HEADLINE: ${hook.headline}\n\nSOURCE CLAIM: ${hook.sourceClaim}\n\nTHE BRIDGE: ${hook.bridge}\n\nBIG IDEA: ${hook.bigIdeaSummary}\n\nSAMPLE AD OPENER:\n${hook.sampleAdOpener}\n\nSOURCE: ${sourceName} (${sourceUrl})`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    let content = `# Hook Export\n\n`;
    content += `## ${hook.headline}\n\n`;
    content += `**Virality Score:** ${hook.viralityScore.total}/50\n\n`;
    content += `**Bridge Distance:** ${hook.bridgeDistance}\n\n`;
    content += `**Angle Types:** ${hook.angleTypes.join(', ')}\n\n`;
    content += `### Source Claim\n${hook.sourceClaim}\n\n`;
    content += `### The Bridge\n${hook.bridge}\n\n`;
    content += `### Big Idea Summary\n${hook.bigIdeaSummary}\n\n`;
    content += `### Sample Ad Opener\n${hook.sampleAdOpener}\n\n`;
    content += `### Virality Breakdown\n`;
    content += `- Easy to Understand: ${hook.viralityScore.easyToUnderstand}/10\n`;
    content += `- Emotional: ${hook.viralityScore.emotional}/10\n`;
    content += `- Curiosity: ${hook.viralityScore.curiosityInducing}/10\n`;
    content += `- Contrarian: ${hook.viralityScore.contrarian}/10\n`;
    content += `- Provable: ${hook.viralityScore.provable}/10\n\n`;
    content += `**Source:** [${sourceName}](${sourceUrl})\n`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    const hookSlug = hook.headline.toLowerCase().slice(0, 30).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    a.download = `hook-${hookSlug}-${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateVariation = async () => {
    if (!variationFeedback.trim()) return;

    setIsGeneratingVariation(true);
    try {
      const response = await fetch('/api/variation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook,
          feedback: variationFeedback,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate variation');

      const data = await response.json();
      // Add the variation as a new hook (keeps original)
      const variationHook: Hook = {
        ...data.hook,
        isVariation: true,
        parentHookId: hook.id,
      };
      addHookVariation(hook.sourceId, hook.id, variationHook);
      setShowVariationInput(false);
      setVariationFeedback('');
    } catch (error) {
      console.error('Variation error:', error);
    } finally {
      setIsGeneratingVariation(false);
    }
  };

  const getScoreClass = (score: number) => {
    if (score >= 40) return 'score-high';
    if (score >= 25) return 'score-medium';
    return 'score-low';
  };


  return (
    <div className="card animate-slide-up cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-base leading-tight">{hook.headline}</h3>
          {hook.isVariation && (
            <span className="text-xs text-[var(--ca-gold)] mt-1 block">Generated Variation</span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className={`score-badge ${getScoreClass(hook.viralityScore.total)}`}>
            {hook.viralityScore.total}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggleHookFavorite(hook.id); }}
            className={`p-2 rounded-lg transition-colors ${
              isFavorite
                ? 'text-[var(--ca-gold)] bg-[var(--ca-gold)]/10'
                : 'text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray-dark)]'
            }`}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="tag">
          <Icon className="w-3 h-3" />
          {sourceType === 'youtube' ? 'YouTube'
            : sourceType === 'podcast' ? 'Podcast'
            : sourceType === 'reddit' ? 'Reddit'
            : sourceType === 'research' ? 'Research'
            : sourceType === 'sciencedaily' ? 'ScienceDaily'
            : sourceType === 'scholar' ? 'Scholar'
            : sourceType === 'arxiv' ? 'arXiv'
            : sourceType === 'preprint' ? 'Preprint'
            : sourceType}
        </span>
        <span className={`tag border ${bridgeDistanceColors[hook.bridgeDistance]}`}>
          Bridge: {hook.bridgeDistance}
        </span>
        {hook.angleTypes.map(type => (
          <span key={type} className="tag tag-gold">
            {type}
          </span>
        ))}
      </div>

      {/* Expand/Collapse Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-[var(--ca-gold)] hover:underline mb-4"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide Details
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Show Details
          </>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-6 pt-4 border-t border-[var(--ca-gray-dark)] animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {/* Source Claim */}
          <div>
            <h4 className="text-xs font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-2">
              Source Claim
            </h4>
            <p className="text-sm text-[var(--ca-off-white)]">{hook.sourceClaim}</p>
          </div>

          {/* The Bridge */}
          <div>
            <h4 className="text-xs font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-2">
              The Bridge
            </h4>
            <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
              <p className="text-sm text-[var(--ca-off-white)]">{hook.bridge}</p>
            </div>
          </div>

          {/* Big Idea Summary */}
          <div>
            <h4 className="text-xs font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-2">
              Big Idea Summary
            </h4>
            <p className="text-sm text-[var(--ca-off-white)]">{hook.bigIdeaSummary}</p>
          </div>

          {/* Virality Scores */}
          <div>
            <h4 className="text-xs font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-3">
              Virality Score Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Easy to Understand', value: hook.viralityScore.easyToUnderstand },
                { label: 'Emotional', value: hook.viralityScore.emotional },
                { label: 'Curiosity', value: hook.viralityScore.curiosityInducing },
                { label: 'Contrarian', value: hook.viralityScore.contrarian },
                { label: 'Provable', value: hook.viralityScore.provable },
              ].map(item => (
                <div
                  key={item.label}
                  className="bg-[var(--ca-gray-dark)] rounded-lg p-3 text-center"
                >
                  <div className="text-lg font-bold text-[var(--ca-gold)]">{item.value}</div>
                  <div className="text-xs text-[var(--ca-gray-light)]">{item.label}</div>
                </div>
              ))}
              <div className="bg-[var(--ca-gold)]/10 border border-[var(--ca-gold)]/30 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-[var(--ca-gold)]">
                  {hook.viralityScore.total}
                </div>
                <div className="text-xs text-[var(--ca-gold)]">Total</div>
              </div>
            </div>
          </div>

          {/* Sample Ad Opener */}
          <div>
            <h4 className="text-xs font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-2">
              Sample Ad Opener
            </h4>
            <div className="bg-[var(--ca-gold)]/5 border border-[var(--ca-gold)]/20 rounded-lg p-4">
              <p className="text-sm text-[var(--ca-off-white)] whitespace-pre-line">
                {hook.sampleAdOpener}
              </p>
            </div>
          </div>

          {/* Source */}
          <div>
            <h4 className="text-xs font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-2">
              Source
            </h4>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--ca-gold)] hover:underline truncate block"
            >
              {sourceName}
            </a>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button onClick={handleCopy} className="btn btn-secondary flex-1">
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Hook
                </>
              )}
            </button>
            <button onClick={handleExport} className="btn btn-secondary flex-1">
              <Download className="w-4 h-4" />
              Export Hook
            </button>
            <button
              onClick={() => setShowVariationInput(!showVariationInput)}
              className="btn btn-secondary flex-1"
            >
              <RefreshCw className="w-4 h-4" />
              Generate Variation
            </button>
          </div>

          {/* Variation Input */}
          {showVariationInput && (
            <div className="animate-slide-up">
              <label className="block text-sm font-medium mb-2">
                Describe the variation you want
              </label>
              <textarea
                value={variationFeedback}
                onChange={e => setVariationFeedback(e.target.value)}
                placeholder="e.g., Make it more aggressive, focus on fear of missing out, target younger audience..."
                className="input textarea mb-3"
                rows={3}
              />
              <button
                onClick={handleGenerateVariation}
                disabled={!variationFeedback.trim() || isGeneratingVariation}
                className="btn btn-primary w-full"
              >
                {isGeneratingVariation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Variation
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
