'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  MessageSquare,
  Trash2,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  Eye,
  EyeOff,
  TrendingUp,
  Sparkles,
  Star,
  Download,
  Zap,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

interface FeedbackItem {
  id: string;
  email: string;
  message: string;
  date: string;
  userAgent: string;
}

interface AnalyticsEvent {
  id: string;
  eventType: string;
  itemId: string;
  itemType: 'claim' | 'hook';
  awarenessLevel: 'hidden' | 'emerging' | 'known';
  momentumScore: number;
  isSweetSpot: boolean;
  niche: string;
  sourceType: string;
  timestamp: string;
}

interface AnalyticsSummary {
  totalEvents: number;
  byAwarenessLevel: {
    hidden: number;
    emerging: number;
    known: number;
  };
  sweetSpotRate: number;
  byEventType: Record<string, number>;
  recentEvents: AnalyticsEvent[];
}

type Tab = 'feedback' | 'analytics';

const awarenessConfig = {
  hidden: { label: 'Hidden', color: '#22C55E', Icon: EyeOff },
  emerging: { label: 'Emerging', color: '#EAB308', Icon: TrendingUp },
  known: { label: 'Known', color: '#EF4444', Icon: Eye },
};

const eventTypeLabels: Record<string, { label: string; Icon: typeof Star }> = {
  claim_favorited: { label: 'Claim Favorited', Icon: Star },
  claim_unfavorited: { label: 'Claim Unfavorited', Icon: Star },
  claim_exported: { label: 'Claim Exported', Icon: Download },
  hook_favorited: { label: 'Hook Favorited', Icon: Star },
  hook_unfavorited: { label: 'Hook Unfavorited', Icon: Star },
  hook_exported: { label: 'Hook Exported', Icon: Download },
  hook_generated_from_claim: { label: 'Hook Generated', Icon: Zap },
  hook_variation_generated: { label: 'Variation Generated', Icon: RefreshCw },
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('feedback');
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadFeedback = async () => {
    try {
      const response = await fetch('/api/feedback');
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback || []);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadFeedback(), loadAnalytics()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteFeedback = async (id: string) => {
    try {
      const response = await fetch(`/api/feedback?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setFeedback(prev => prev.filter(f => f.id !== id));
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
    }
  };

  const clearAllFeedback = async () => {
    if (confirm('Are you sure you want to delete all feedback?')) {
      try {
        const response = await fetch('/api/feedback?clearAll=true', { method: 'DELETE' });
        if (response.ok) {
          setFeedback([]);
        }
      } catch (error) {
        console.error('Error clearing feedback:', error);
      }
    }
  };

  const clearAllAnalytics = async () => {
    if (confirm('Are you sure you want to clear all analytics data?')) {
      try {
        const response = await fetch('/api/analytics', { method: 'DELETE' });
        if (response.ok) {
          setAnalytics({
            totalEvents: 0,
            byAwarenessLevel: { hidden: 0, emerging: 0, known: 0 },
            sweetSpotRate: 0,
            byEventType: {},
            recentEvents: [],
          });
        }
      } catch (error) {
        console.error('Error clearing analytics:', error);
      }
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--ca-black)] text-white p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="btn btn-ghost p-2 sm:px-4 sm:py-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to App</span>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-[var(--ca-gray-light)]">
                Manage feedback and view analytics
              </p>
            </div>
          </div>
          <button onClick={loadData} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4" />
            <span className="sm:inline">Refresh All</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-[var(--ca-gray-dark)]">
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'feedback'
                ? 'border-[var(--ca-gold)] text-[var(--ca-gold)]'
                : 'border-transparent text-[var(--ca-gray-light)] hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Feedback
            {feedback.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-[var(--ca-gray-dark)] rounded-full">
                {feedback.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'analytics'
                ? 'border-[var(--ca-gold)] text-[var(--ca-gold)]'
                : 'border-transparent text-[var(--ca-gray-light)] hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
            {analytics && analytics.totalEvents > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-[var(--ca-gray-dark)] rounded-full">
                {analytics.totalEvents}
              </span>
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-[var(--ca-gray-light)]">Loading...</p>
          </div>
        ) : activeTab === 'feedback' ? (
          /* Feedback Tab */
          <div>
            {/* Feedback Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[var(--ca-gray-light)]">
                {feedback.length} feedback item{feedback.length !== 1 ? 's' : ''}
              </p>
              {feedback.length > 0 && (
                <button
                  onClick={clearAllFeedback}
                  className="btn btn-ghost text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              )}
            </div>

            {/* Feedback List */}
            {feedback.length === 0 ? (
              <div className="text-center py-20">
                <MessageSquare className="w-12 h-12 text-[var(--ca-gray)] mx-auto mb-4" />
                <p className="text-[var(--ca-gray-light)]">No feedback yet</p>
                <p className="text-sm text-[var(--ca-gray)] mt-1">
                  Feedback submitted by users will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {feedback.map((item) => (
                  <div key={item.id} className="card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-[var(--ca-gold)] truncate">{item.email}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{item.message}</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 text-xs text-[var(--ca-gray-light)]">
                          <span>{format(new Date(item.date), 'MMM d, yyyy · h:mm a')}</span>
                          <span className="hidden sm:inline text-[var(--ca-gray)]">·</span>
                          <span className="hidden sm:inline truncate max-w-xs" title={item.userAgent}>
                            {item.userAgent?.includes('Mac') ? 'Mac' :
                             item.userAgent?.includes('Windows') ? 'Windows' :
                             item.userAgent?.includes('iPhone') ? 'iPhone' :
                             item.userAgent?.includes('Android') ? 'Android' : 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteFeedback(item.id)}
                        className="p-2 rounded hover:bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)] hover:text-red-400 transition-colors flex-shrink-0"
                        title="Delete feedback"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Analytics Tab */
          <div>
            {!analytics || analytics.totalEvents === 0 ? (
              <div className="text-center py-20">
                <BarChart3 className="w-12 h-12 text-[var(--ca-gray)] mx-auto mb-4" />
                <p className="text-[var(--ca-gray-light)]">No analytics data yet</p>
                <p className="text-sm text-[var(--ca-gray)] mt-1">
                  User interactions with claims and hooks will be tracked here
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card">
                    <div className="text-2xl font-bold text-[var(--ca-gold)]">{analytics.totalEvents}</div>
                    <div className="text-xs text-[var(--ca-gray-light)] mt-1">Total Events</div>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#22C55E]" />
                      <span className="text-2xl font-bold text-[#22C55E]">
                        {analytics.sweetSpotRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-[var(--ca-gray-light)] mt-1">Sweet Spot Rate</div>
                  </div>
                  <div className="card">
                    <div className="text-2xl font-bold text-[#22C55E]">{analytics.byAwarenessLevel.hidden}</div>
                    <div className="flex items-center gap-1 text-xs text-[var(--ca-gray-light)] mt-1">
                      <EyeOff className="w-3 h-3" />
                      Hidden Ideas
                    </div>
                  </div>
                  <div className="card">
                    <div className="text-2xl font-bold text-[#EAB308]">{analytics.byAwarenessLevel.emerging}</div>
                    <div className="flex items-center gap-1 text-xs text-[var(--ca-gray-light)] mt-1">
                      <TrendingUp className="w-3 h-3" />
                      Emerging Ideas
                    </div>
                  </div>
                </div>

                {/* Awareness Level Breakdown */}
                <div className="card">
                  <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                    Awareness Level Distribution
                  </h3>
                  <div className="space-y-3">
                    {(['hidden', 'emerging', 'known'] as const).map((level) => {
                      const config = awarenessConfig[level];
                      const count = analytics.byAwarenessLevel[level];
                      const total = analytics.byAwarenessLevel.hidden + analytics.byAwarenessLevel.emerging + analytics.byAwarenessLevel.known;
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      const LevelIcon = config.Icon;

                      return (
                        <div key={level}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                              <LevelIcon className="w-4 h-4" style={{ color: config.color }} />
                              <span style={{ color: config.color }}>{config.label}</span>
                            </div>
                            <span className="text-[var(--ca-gray-light)]">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 bg-[var(--ca-gray-dark)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: config.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Event Type Breakdown */}
                <div className="card">
                  <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                    Events by Type
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Object.entries(analytics.byEventType).map(([type, count]) => {
                      const typeConfig = eventTypeLabels[type] || { label: type, Icon: Activity };
                      const TypeIcon = typeConfig.Icon;
                      return (
                        <div key={type} className="bg-[var(--ca-gray-dark)] rounded-lg p-3 text-center">
                          <TypeIcon className="w-4 h-4 mx-auto mb-1 text-[var(--ca-gold)]" />
                          <div className="text-lg font-bold">{count}</div>
                          <div className="text-xs text-[var(--ca-gray-light)]">{typeConfig.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Events */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider">
                      Recent Events
                    </h3>
                    <button
                      onClick={clearAllAnalytics}
                      className="btn btn-ghost text-red-400 hover:bg-red-500/10 text-xs py-1 px-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {analytics.recentEvents.map((event) => {
                      const config = awarenessConfig[event.awarenessLevel];
                      const eventConfig = eventTypeLabels[event.eventType] || { label: event.eventType, Icon: Activity };
                      const EventIcon = eventConfig.Icon;
                      const LevelIcon = config.Icon;

                      return (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-2 bg-[var(--ca-gray-dark)]/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <EventIcon className="w-4 h-4 text-[var(--ca-gold)]" />
                            <div>
                              <div className="text-sm">{eventConfig.label}</div>
                              <div className="flex items-center gap-2 text-xs text-[var(--ca-gray-light)]">
                                <span className="capitalize">{event.itemType}</span>
                                <span>·</span>
                                <span className="flex items-center gap-1" style={{ color: config.color }}>
                                  <LevelIcon className="w-3 h-3" />
                                  {config.label}
                                </span>
                                {event.isSweetSpot && (
                                  <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1 text-[#22C55E]">
                                      <Sparkles className="w-3 h-3" />
                                      Sweet Spot
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-[var(--ca-gray-light)]">
                            {format(new Date(event.timestamp), 'MMM d · h:mm a')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
