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
} from 'lucide-react';
import { NICHES } from '@/data/niches';

export function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    sessions,
    currentSession,
    loadSession,
    resetWizard,
  } = useApp();

  const getNicheName = (nicheId: string) => {
    const niche = NICHES.find(n => n.id === nicheId);
    return niche?.name || nicheId;
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
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`tag text-[10px] py-0.5 px-1.5 ${
                              session.strategy === 'translocate' ? 'tag-gold' : ''
                            }`}>
                              {session.strategy === 'translocate' ? 'Translocate' : 'Direct'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--ca-gray-light)]">
                              <span className="flex items-center gap-0.5">
                                <Zap className="w-3 h-3" />
                                {totalHooks}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Lightbulb className="w-3 h-3" />
                                {totalClaims}
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-[var(--ca-gray)] mt-1.5">
                            {format(new Date(session.date), 'MMM d, yyyy · h:mm a')}
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
            <p className="text-xs text-[var(--ca-gray-light)] text-center">
              Powered by{' '}
              <a
                href="https://www.copyaccelerator.com/info"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--ca-gold)] hover:underline"
              >
                CA Pro
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
