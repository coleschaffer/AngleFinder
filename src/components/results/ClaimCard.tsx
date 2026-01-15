'use client';

import { Claim, SourceType } from '@/types';
import { useApp } from '@/context/AppContext';
import { Star, ChevronDown, ChevronUp, Copy, Check, Youtube, Radio, MessageSquare, BookOpen } from 'lucide-react';
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
  pubmed: BookOpen,
};

export function ClaimCard({ claim, sourceName, sourceType, sourceUrl }: ClaimCardProps) {
  const { favoriteClaims, toggleClaimFavorite } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isFavorite = favoriteClaims.includes(claim.id);
  const Icon = sourceIcons[sourceType];

  const handleCopy = async () => {
    const text = `CLAIM: ${claim.claim}\n\nEXACT QUOTE: "${claim.exactQuote}"\n\nMECHANISM: ${claim.mechanism}\n\nSOURCE: ${sourceName} (${sourceUrl})`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreClass = (score: number) => {
    if (score >= 8) return 'score-high';
    if (score >= 5) return 'score-medium';
    return 'score-low';
  };

  return (
    <div className="card animate-slide-up">
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
            onClick={() => toggleClaimFavorite(claim.id)}
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
          {sourceType === 'youtube'
            ? 'YouTube'
            : sourceType === 'podcast'
            ? 'Podcast'
            : sourceType === 'reddit'
            ? 'Reddit'
            : 'PubMed'}
        </span>
        <span className="text-xs text-[var(--ca-gray-light)]">Surprise Score: {claim.surpriseScore}/10</span>
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
        <div className="space-y-4 pt-4 border-t border-[var(--ca-gray-dark)] animate-fade-in">
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

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="btn btn-secondary text-sm w-full"
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
        </div>
      )}
    </div>
  );
}
