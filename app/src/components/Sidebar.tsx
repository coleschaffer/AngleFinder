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
  Menu,
} from 'lucide-react';
import { NICHES } from '@/data/niches';
import { useState, useEffect, useRef } from 'react';

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
    generatedHooks,
  } = useApp();

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const initialMobileCheck = useRef(false);

  // Detect mobile viewport and close sidebar on mobile initial load
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Close sidebar on first mobile detection (initial page load)
      if (!initialMobileCheck.current && mobile) {
        setSidebarOpen(false);
      }
      initialMobileCheck.current = true;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setSidebarOpen]);

  // Prevent body scroll when feedback modal is open
  useEffect(() => {
    if (showFeedback) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showFeedback]);

  // Close sidebar on mobile when clicking a session
  const handleLoadSession = (sessionId: string) => {
    loadSession(sessionId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Close sidebar on mobile after starting new research
  const handleNewResearch = () => {
    resetWizard();
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const getNicheName = (nicheId: string) => {
    const niche = NICHES.find(n => n.id === nicheId);
    return niche?.name || nicheId;
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || !feedbackEmail.trim()) return;

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: feedbackEmail.trim(),
          message: feedbackText.trim(),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        }),
      });

      if (!response.ok) throw new Error('Failed to submit feedback');

      setFeedbackEmail('');
      setFeedbackText('');
      setFeedbackSent(true);
      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackSent(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Feedback Modal JSX - inlined to prevent remounting on state changes
  const feedbackModalContent = showFeedback && (
    <div
      className="fixed inset-0 feedback-backdrop flex items-start sm:items-center justify-center z-[100] p-4 pt-16 sm:pt-4 overflow-y-auto"
      onClick={() => setShowFeedback(false)}
    >
      <div
        className="feedback-modal w-full max-w-md sm:max-w-lg bg-gradient-to-b from-[var(--ca-dark)] to-[var(--ca-black)] border border-[var(--ca-gray-dark)] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden mb-[50vh] sm:mb-0 sm:my-0 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {feedbackSent ? (
          /* Success State */
          <div className="py-10 sm:py-12 px-6 sm:px-8">
            <div className="flex flex-col items-center">
              <div className="success-circle w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--ca-gold)] flex items-center justify-center">
                <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none">
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

              <h3 className="text-lg sm:text-xl font-bold mt-4 mb-2">
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
            <div className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <div className="flex items-start justify-between">
                <h3 className="text-lg sm:text-xl font-semibold">Send Feedback</h3>
                <button
                  onClick={() => setShowFeedback(false)}
                  className="p-2 rounded-lg hover:bg-[var(--ca-gray-dark)] transition-colors group"
                >
                  <X className="w-5 h-5 text-[var(--ca-gray)] group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
              <input
                type="email"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
                placeholder="Your email"
                className="input"
              />
              <div className="relative">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or report issues..."
                  className="feedback-textarea w-full min-h-[100px] sm:min-h-[120px] p-3 sm:p-4 bg-[var(--ca-gray-dark)] border border-[var(--ca-gray)] rounded-lg text-white placeholder:text-[var(--ca-gray-light)] resize-none transition-all duration-200 focus:outline-none"
                />
              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
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
          </>
        )}
      </div>
    </div>
  );

  // Sidebar content (shared between mobile and desktop) - inlined to prevent remounting
  const sidebarContent = (
    <div className="flex flex-col h-full">
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
          {isMobile ? (
            <X className="w-5 h-5 text-[var(--ca-gray-light)]" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-[var(--ca-gray-light)]" />
          )}
        </button>
      </div>

      {/* New Research Button */}
      <div className="p-4">
        <button
          onClick={handleNewResearch}
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
              // Get source IDs for this session to find its generated hooks
              const sessionSourceIds = new Set(session.results.map(r => r.sourceId));
              // Count favorites by checking against the actual favorites arrays
              const hookAndClaimFavorites = session.results.reduce((acc, r) =>
                acc + r.hooks.filter(h => favoriteHooks.includes(h.id)).length + r.claims.filter(c => favoriteClaims.includes(c.id)).length, 0
              );
              // Count favorited generated hooks that belong to this session
              const generatedFavorites = generatedHooks.filter(h =>
                sessionSourceIds.has(h.sourceId) && favoriteHooks.includes(h.id)
              ).length;
              const totalFavorites = hookAndClaimFavorites + generatedFavorites;
              const isActive = currentSession?.id === session.id;

              return (
                <div
                  key={session.id}
                  className={`relative rounded-lg p-3 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[rgba(212,175,55,0.1)] border border-[var(--ca-gold)]'
                      : 'bg-[var(--ca-gray-dark)]/50 border border-transparent hover:bg-[var(--ca-gray-dark)] hover:border-[var(--ca-gray)]'
                  }`}
                  onClick={() => handleLoadSession(session.id)}
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
                      <p className="text-[10px] text-[var(--ca-gray-light)] mt-1.5">
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
          className="w-full btn btn-ghost text-sm py-2.5"
        >
          <MessageSquare className="w-4 h-4" />
          Send Feedback
        </button>
      </div>
    </div>
  );

  // Mobile: Overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile Header Bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--ca-dark)] border-b border-[var(--ca-gray-dark)] px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-[var(--ca-gray-dark)] transition-colors"
            title="Open menu"
          >
            <Menu className="w-5 h-5 text-[var(--ca-gray-light)]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--ca-gold)] flex items-center justify-center">
              <span className="text-[var(--ca-black)] font-bold text-xs">AF</span>
            </div>
            <span className="font-semibold text-sm">Angle Finder</span>
          </div>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Mobile Drawer Backdrop */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40 animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Drawer */}
        <div
          className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[var(--ca-dark)] border-r border-[var(--ca-gray-dark)] transform transition-transform duration-300 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>

        {/* Feedback Modal - rendered outside drawer */}
        {feedbackModalContent}
      </>
    );
  }

  // Desktop: Standard sidebar with toggle
  return (
    <>
      <div
        className={`hidden md:flex border-r border-[var(--ca-gray-dark)] bg-[var(--ca-dark)] flex-col h-full transition-[width] duration-200 ease-out ${
          sidebarOpen ? 'w-72' : 'w-12'
        }`}
      >
        {/* Collapsed State */}
        {!sidebarOpen && (
          <div className="flex flex-col items-center py-4 h-full">
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
        {sidebarOpen && sidebarContent}
      </div>

      {/* Feedback Modal - rendered outside sidebar */}
      {feedbackModalContent}
    </>
  );
}
