'use client';

import { useApp } from '@/context/AppContext';
import { SavedProductURL } from '@/types';
import { Link2, Loader2, ChevronDown, ChevronUp, Trash2, Clock, Sparkles } from 'lucide-react';
import { useState } from 'react';

export function ProductURLInput() {
  const {
    setNiche,
    setCustomNiche,
    setProductDescription,
    savedProductURLs,
    addSavedProductURL,
    removeSavedProductURL,
  } = useApp();

  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const handleAnalyzeURL = async () => {
    if (!urlInput.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze URL');
      }

      const result = await response.json();

      // Auto-populate niche and description
      setNiche(result.detectedNiche);
      if (result.customNiche) {
        setCustomNiche(result.customNiche);
      }
      setProductDescription(result.productDescription);

      // Save for quick reselection
      const saved: SavedProductURL = {
        id: crypto.randomUUID(),
        url: urlInput.trim(),
        productName: result.productName,
        detectedNiche: result.detectedNiche,
        customNiche: result.customNiche || '',
        productDescription: result.productDescription,
        lastUsed: new Date().toISOString(),
      };
      addSavedProductURL(saved);

      setUrlInput('');
    } catch (err) {
      console.error('URL analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze URL');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectSaved = (saved: SavedProductURL) => {
    setNiche(saved.detectedNiche);
    if (saved.customNiche) {
      setCustomNiche(saved.customNiche);
    }
    setProductDescription(saved.productDescription);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAnalyzing) {
      e.preventDefault();
      handleAnalyzeURL();
    }
  };

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-5 h-5 text-[var(--ca-gold)]" />
        <h3 className="font-medium">Quick Start with Product URL</h3>
        <span className="text-xs text-[var(--ca-gray-light)] ml-auto">Optional</span>
      </div>

      <p className="text-sm text-[var(--ca-gray-light)] mb-4">
        Paste your product URL and we&apos;ll automatically detect your niche and fill in the product description.
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://your-product-page.com"
          className="input flex-1"
          disabled={isAnalyzing}
        />
        <button
          onClick={handleAnalyzeURL}
          disabled={!urlInput.trim() || isAnalyzing}
          className="btn btn-primary whitespace-nowrap"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Analyze
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      {/* Recent Products */}
      {savedProductURLs.length > 0 && (
        <div className="border-t border-[var(--ca-gray-dark)] pt-3 mt-3">
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="flex items-center gap-2 text-sm text-[var(--ca-gray-light)] hover:text-[var(--ca-gold)] transition-colors w-full"
          >
            <Clock className="w-4 h-4" />
            <span>Recent Products ({savedProductURLs.length})</span>
            {showSaved ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>

          {showSaved && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {savedProductURLs.map((saved) => (
                <div
                  key={saved.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[var(--ca-gray-dark)]/50 hover:bg-[var(--ca-gray-dark)] transition-colors group"
                >
                  <button
                    onClick={() => handleSelectSaved(saved)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-medium truncate">{saved.productName}</p>
                    <p className="text-xs text-[var(--ca-gray-light)] truncate">{saved.url}</p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSavedProductURL(saved.id);
                    }}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-[var(--ca-gray-light)] hover:text-red-400 transition-all"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
