'use client';

import { useApp } from '@/context/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { SavedProductURL } from '@/types';
import { Link2, Loader2, ChevronDown, ChevronUp, Trash2, Clock, Download, ExternalLink } from 'lucide-react';
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
  const [savedExpandedState, setSavedExpandedState] = useLocalStorage<boolean>('angle-finder-recent-products-expanded', true);
  const [showSaved, setShowSaved] = useState(savedExpandedState);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Save expanded state to localStorage when changed
  const toggleShowSaved = () => {
    const newState = !showSaved;
    setShowSaved(newState);
    setSavedExpandedState(newState);
  };

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
              Fetching...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Fetch
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      {/* Recent Products */}
      {savedProductURLs.length > 0 && (
        <div className="border-t border-[var(--ca-gray-dark)] pt-2 mt-3">
          <button
            onClick={toggleShowSaved}
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
            <div className="mt-2 flex flex-wrap gap-2">
              {savedProductURLs.map((saved) => (
                <div
                  key={saved.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--ca-gray-dark)]/50 hover:bg-[var(--ca-gray-dark)] transition-colors"
                >
                  <button
                    onClick={() => handleSelectSaved(saved)}
                    className="text-sm font-medium truncate max-w-[200px]"
                  >
                    {saved.productName}
                  </button>
                  <a
                    href={saved.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-0.5 rounded hover:bg-[var(--ca-gold)]/20 text-[var(--ca-gray-light)] hover:text-[var(--ca-gold)] transition-all"
                    title="Open URL"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(saved.id);
                    }}
                    className="p-0.5 rounded hover:bg-red-500/20 text-[var(--ca-gray-light)] hover:text-red-400 transition-all"
                    title="Remove"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md mx-4 animate-slide-up">
            <h3 className="text-lg font-semibold mb-2">Remove Product?</h3>
            <p className="text-sm text-[var(--ca-gray-light)] mb-6">
              This will remove this product from your recent products list.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeSavedProductURL(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="btn bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
