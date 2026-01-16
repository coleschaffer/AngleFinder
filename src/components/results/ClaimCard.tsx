'use client';

import { Claim, SourceType, Hook } from '@/types';
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
  Newspaper,
  GraduationCap,
  FileText,
  FlaskConical,
  Zap,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';

interface ClaimCardProps {
  claim: Claim;
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

export function ClaimCard({ claim, sourceName, sourceType, sourceUrl }: ClaimCardProps) {
  const { favoriteClaims, toggleClaimFavorite, addGeneratedHook, setResultsView, wizard } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isFavorite = favoriteClaims.includes(claim.id);
  const Icon = sourceIcons[sourceType];

  const handleGenerateHook = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim,
          sourceName,
          sourceType,
          sourceUrl,
          niche: wizard.customNiche || wizard.niche,
          product: wizard.productDescription,
          strategy: wizard.strategy,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate hook');

      const data = await response.json();
      const generatedHook: Hook = {
        ...data.hook,
        fromClaimId: claim.id,
        sourceName,
        sourceType,
        sourceUrl,
      };
      addGeneratedHook(generatedHook);
      setResultsView('generated');
    } catch (error) {
      console.error('Generate hook error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    const text = `CLAIM: ${claim.claim}\n\nEXACT QUOTE: "${claim.exactQuote}"\n\nMECHANISM: ${claim.mechanism}\n\nSOURCE: ${sourceName} (${sourceUrl})`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    let content = `# Claim Export\n\n`;
    content += `## ${claim.claim}\n\n`;
    content += `**Surprise Score:** ${claim.surpriseScore}/10\n\n`;
    content += `### Exact Quote\n> "${claim.exactQuote}"\n\n`;
    content += `### Mechanism\n${claim.mechanism}\n\n`;
    content += `**Source:** [${sourceName}](${sourceUrl})\n`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    const claimSlug = claim.claim.toLowerCase().slice(0, 30).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    a.download = `claim-${claimSlug}-${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreClass = (score: number) => {
    if (score >= 8) return 'score-high';
    if (score >= 5) return 'score-medium';
    return 'score-low';
  };

  return (
    <div className="card animate-slide-up cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="font-medium text-sm">{claim.claim}</p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className={`score-badge ${getScoreClass(claim.surpriseScore)}`}>
            {claim.surpriseScore}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggleClaimFavorite(claim.id); }}
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
        <div className="space-y-4 pt-4 border-t border-[var(--ca-gray-dark)] animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {/* Exact Quote */}
          <div>
            <h4 className="text-xs font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-2">
              Exact Quote
            </h4>
            <blockquote className="text-sm italic text-[var(--ca-off-white)] pl-4 border-l-2 border-[var(--ca-gold)]">
              &ldquo;{claim.exactQuote}&rdquo;
            </blockquote>
          </div>

          {/* Mechanism */}
          <div>
            <h4 className="text-xs font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-2">
              Mechanism
            </h4>
            <p className="text-sm text-[var(--ca-off-white)]">{claim.mechanism}</p>
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
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="btn btn-secondary text-sm flex-1"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Claim
                </>
              )}
            </button>
            <button
              onClick={handleExport}
              className="btn btn-secondary text-sm flex-1"
            >
              <Download className="w-4 h-4" />
              Export Claim
            </button>
            <button
              onClick={handleGenerateHook}
              disabled={isGenerating}
              className="btn btn-primary text-sm flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Hook
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
