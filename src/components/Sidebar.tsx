'use client';

import { useApp } from '@/context/AppContext';
import { format } from 'date-fns';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  History,
  ChevronRight,
  Zap,
  Lightbulb,
  Star,
  Shuffle,
  Target,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import { NICHES } from '@/data/niches';
import { useState } from 'react';

interface FeedbackItem {
  id: string;
  email: string;
  message: string;
  date: string;
  userAgent: string;
}

export function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    sessions,
    currentSession,
    loadSession,
    resetWizard,
    favoriteClaims,
    favoriteHooks,
  } = useApp();

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const getNicheName = (nicheId: string) => {
    const niche = NICHES.find(n => n.id === nicheId);
    return niche?.name || nicheId;
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim() || !feedbackEmail.trim()) return;

    const feedback: FeedbackItem = {
      id: crypto.randomUUID(),
      email: feedbackEmail.trim(),
      message: feedbackText.trim(),
      date: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    // Store in localStorage
    const existingFeedback = JSON.parse(localStorage.getItem('angle-finder-feedback') || '[]');
    localStorage.setItem('angle-finder-feedback', JSON.stringify([feedback, ...existingFeedback]));

    setFeedbackEmail('');
    setFeedbackText('');
    setFeedbackSent(true);
    setTimeout(() => {
      setShowFeedback(false);
      setFeedbackSent(false);
    }, 2000);
  };

  return (
    <div
      className={`border-r border-[var(--ca-gray-dark)] bg-[var(--ca-dark)] flex flex-col h-full transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'w-72' : 'w-12'
      }`}
    >
      {/* Collapsed State */}
      {!sidebarOpen && (
        <div className="flex flex-col items-center py-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-[var(--ca-gray-dark)] transition-colors"
            title="Open sidebar"
          >
            <PanelLeft className="w-5 h-5 text-[var(--ca-gray-light)]" />
          </button>
        </div>
      )}

      {/* Expanded State */}
      {sidebarOpen && (
        <div className="flex flex-col h-full animate-fade-in">
          {/* Header */}
          <div className="p-4 border-b border-[var(--ca-gray-dark)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--ca-gold)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--ca-black)] font-bold text-sm">AF</span>
              </div>
              <div className="overflow-hidden">
                <h1 className="font-semibold text-sm whitespace-nowrap">Angle Finder</h1>
                <p className="text-xs text-[var(--ca-gray-light)] whitespace-nowrap">CA Pro</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-[var(--ca-gray-dark)] transition-colors flex-shrink-0"
              title="Close sidebar"
            >
              <PanelLeftClose className="w-5 h-5 text-[var(--ca-gray-light)]" />
            </button>
          </div>

          {/* New Research Button */}
          <div className="p-4">
            <button
              onClick={resetWizard}
              className="btn btn-primary w-full"
            >
              <Plus className="w-4 h-4" />
              New Research
            </button>
          </div>

          {/* History Section */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2 flex items-center gap-2 text-xs font-medium text-[var(--ca-gray-light)] uppercase tracking-wider">
              <History className="w-3.5 h-3.5" />
              History
            </div>

            {sessions.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-[var(--ca-gray-light)]">No saved sessions yet</p>
                <p className="text-xs text-[var(--ca-gray)] mt-1">
                  Your research history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2 px-2">
                {sessions.map(session => {
                  const totalHooks = session.results.reduce((acc, r) => acc + r.hooks.length, 0);
                  const totalClaims = session.results.reduce((acc, r) => acc + r.claims.length, 0);
                  // Count favorites by checking against the actual favorites arrays
                  const totalFavorites = session.results.reduce((acc, r) =>
                    acc + r.hooks.filter(h => favoriteHooks.includes(h.id)).length + r.claims.filter(c => favoriteClaims.includes(c.id)).length, 0
                  );
                  const isActive = currentSession?.id === session.id;

                  return (
                    <div
                      key={session.id}
                      className={`relative rounded-lg p-3 cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[rgba(212,175,55,0.1)] border border-[var(--ca-gold)]'
                          : 'bg-[var(--ca-gray-dark)]/50 border border-transparent hover:bg-[var(--ca-gray-dark)] hover:border-[var(--ca-gray)]'
                      }`}
                      onClick={() => loadSession(session.id)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isActive ? 'text-[var(--ca-gold)]' : ''}`}>
                            {session.customNiche || getNicheName(session.niche)}
                          </p>
                          <p className="text-[10px] text-[var(--ca-gray-light)] mt-0.5 truncate">
                            {session.productDescription?.slice(0, 40) || 'No product description'}
                            {session.productDescription?.length > 40 ? '...' : ''}
                          </p>
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[var(--ca-gray-light)]">
                            {session.strategy === 'translocate' ? (
                              <>
                                <Shuffle className="w-3 h-3" />
                                <span>Translocate</span>
                              </>
                            ) : (
                              <>
                                <Target className="w-3 h-3" />
                                <span>Direct</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--ca-gray-light)]">
                            <span className="flex items-center gap-0.5">
                              <Zap className="w-3 h-3" />
                              {totalHooks}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Lightbulb className="w-3 h-3" />
                              {totalClaims}
                            </span>
                            <span className={`flex items-center gap-0.5 ${totalFavorites > 0 ? 'text-[var(--ca-gold)]' : ''}`}>
                              <Star className={`w-3 h-3 ${totalFavorites > 0 ? 'fill-current' : ''}`} />
                              {totalFavorites}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--ca-gray)] mt-1.5">
                            {format(new Date(session.date), 'M/d/yyyy - h:mm a')}
                          </p>
                        </div>
                        {isActive && (
                          <ChevronRight className="w-4 h-4 text-[var(--ca-gold)] flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--ca-gray-dark)]">
            <button
              onClick={() => setShowFeedback(true)}
              className="w-full btn btn-ghost text-xs py-2"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Send Feedback
            </button>
          </div>

          {/* Feedback Modal */}
          {showFeedback && (
            <div className="fixed inset-0 feedback-backdrop flex items-center justify-center z-50 p-4">
              <div
                className="feedback-modal w-full max-w-lg bg-gradient-to-b from-[var(--ca-dark)] to-[var(--ca-black)] border border-[var(--ca-gray-dark)] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {feedbackSent ? (
                  /* Success State */
                  <div className="py-12 px-8">
                    <div className="flex flex-col items-center">
                      <div className="success-circle w-16 h-16 rounded-full bg-[var(--ca-gold)] flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <path
                            className="success-check"
                            d="M5 13l4 4L19 7"
                            stroke="var(--ca-black)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <h3 className="text-xl font-bold mt-4 mb-2">
                        Thank You!
                      </h3>
                      <p className="text-[var(--ca-gray-light)] text-center text-sm">
                        Your feedback has been submitted.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Form State */
                  <>
                    {/* Header */}
                    <div className="relative px-6 pt-6 pb-4">
                      <div className="flex items-start justify-between">
                        <h3 className="text-xl font-semibold">Send Feedback</h3>
                        <button
                          onClick={() => setShowFeedback(false)}
                          className="p-2 rounded-lg hover:bg-[var(--ca-gray-dark)] transition-colors group"
                        >
                          <X className="w-5 h-5 text-[var(--ca-gray)] group-hover:text-white transition-colors" />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 pb-6 space-y-4">
                      <input
                        type="email"
                        value={feedbackEmail}
                        onChange={(e) => setFeedbackEmail(e.target.value)}
                        placeholder="Your email"
                        className="input"
                        autoFocus
                      />
                      <div className="relative">
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Share your thoughts, suggestions, or report issues..."
                          className="feedback-textarea w-full min-h-[120px] p-4 bg-[var(--ca-gray-dark)] border border-[var(--ca-gray)] rounded-lg text-white placeholder:text-[var(--ca-gray-light)] resize-none transition-all duration-200 focus:outline-none"
                        />
                      </div>

                      {/* Footer */}
                      <div className="flex justify-end pt-2">
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowFeedback(false)}
                            className="btn btn-ghost"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSubmitFeedback}
                            disabled={!feedbackText.trim() || !feedbackEmail.trim()}
                            className="btn btn-primary"
                          >
                            <Send className="w-4 h-4" />
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
