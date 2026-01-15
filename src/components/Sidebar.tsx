'use client';

import { useApp } from '@/context/AppContext';
import { format } from 'date-fns';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  History,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { NICHES } from '@/data/niches';

export function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    sessions,
    currentSession,
    loadSession,
    deleteSession,
    resetWizard,
  } = useApp();

  const getNicheName = (nicheId: string) => {
    const niche = NICHES.find(n => n.id === nicheId);
    return niche?.name || nicheId;
  };

  if (!sidebarOpen) {
    return (
      <div className="w-12 border-r border-[var(--ca-gray-dark)] bg-[var(--ca-dark)] flex flex-col items-center py-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-[var(--ca-gray-dark)] transition-colors"
          title="Open sidebar"
        >
          <PanelLeft className="w-5 h-5 text-[var(--ca-gray-light)]" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 border-r border-[var(--ca-gray-dark)] bg-[var(--ca-dark)] flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--ca-gray-dark)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--ca-gold)] flex items-center justify-center">
            <span className="text-[var(--ca-black)] font-bold text-sm">AF</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm">Angle Finder</h1>
            <p className="text-xs text-[var(--ca-gray-light)]">CA Pro</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-2 rounded-lg hover:bg-[var(--ca-gray-dark)] transition-colors"
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
          <div className="space-y-1 px-2">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`group relative rounded-lg p-3 cursor-pointer transition-colors ${
                  currentSession?.id === session.id
                    ? 'bg-[var(--ca-gray-dark)] border border-[var(--ca-gold)]'
                    : 'hover:bg-[var(--ca-gray-dark)] border border-transparent'
                }`}
                onClick={() => loadSession(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.customNiche || getNicheName(session.niche)}
                    </p>
                    <p className="text-xs text-[var(--ca-gray-light)] mt-0.5">
                      {format(new Date(session.date), 'MMM d, yyyy')}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="tag text-[10px] py-0.5 px-1.5">
                        {session.strategy === 'translocate' ? 'Translocate' : 'Direct'}
                      </span>
                      <span className="text-[10px] text-[var(--ca-gray-light)]">
                        {session.results.reduce((acc, r) => acc + r.hooks.length, 0)} hooks
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--ca-gray)] transition-all"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[var(--ca-gray-light)]" />
                  </button>
                </div>
                {currentSession?.id === session.id && (
                  <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ca-gold)]" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--ca-gray-dark)]">
        <p className="text-xs text-[var(--ca-gray-light)] text-center">
          Powered by Stefan Georgi&apos;s<br />Breakthrough Ideas Framework
        </p>
      </div>
    </div>
  );
}
