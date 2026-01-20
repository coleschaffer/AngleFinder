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
  AlertTriangle,
  Server,
  Gauge,
  Clock,
  Users,
  Database,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
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
  niche: string;
  sourceType: string;
  content?: string;
  timestamp: string;
}

interface AnalyticsSummary {
  totalEvents: number;
  byAwarenessLevel: {
    hidden: number;
    emerging: number;
    known: number;
  };
  byEventType: Record<string, number>;
  recentEvents: AnalyticsEvent[];
}

interface ErrorLogEntry {
  id: string;
  endpoint: string;
  errorType: string;
  message: string;
  statusCode?: number;
  requestData?: string;
  timestamp: string;
}

interface ErrorStats {
  total: number;
  byEndpoint: Record<string, number>;
  byErrorType: Record<string, number>;
  last24h: number;
}

interface ErrorsData {
  errors: ErrorLogEntry[];
  stats: ErrorStats;
}

interface UsageEntry {
  id: string;
  endpoint: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
  requestDurationMs: number;
  apiKeyUsed: 'primary' | 'secondary';
  wasRateLimited: boolean;
  sessionId?: string;
  timestamp: string;
}

interface UsageSummary {
  currentHour: {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheReadTokens: number;
    totalCacheCreationTokens: number;
    avgRequestDuration: number;
    rateLimitedRequests: number;
    byEndpoint: Record<string, number>;
    byModel: Record<string, { requests: number; inputTokens: number; outputTokens: number }>;
  };
  last24Hours: {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheReadTokens: number;
    rateLimitedRequests: number;
    requestsPerHour: { hour: string; requests: number; tokens: number }[];
  };
  allTime: {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheReadTokens: number;
    totalCacheCreationTokens: number;
  };
  activeSessions: number;
  rateLimits: {
    primaryKeyUsage: number;
    secondaryKeyUsage: number;
    rateLimitHitsLast24h: number;
  };
  recentRequests: UsageEntry[];
}

type Tab = 'feedback' | 'analytics' | 'errors' | 'usage';

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
  const [errorsData, setErrorsData] = useState<ErrorsData | null>(null);
  const [usageData, setUsageData] = useState<UsageSummary | null>(null);
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

  const loadErrors = async () => {
    try {
      const response = await fetch('/api/errors');
      if (response.ok) {
        const data = await response.json();
        setErrorsData(data);
      }
    } catch (error) {
      console.error('Error loading errors:', error);
    }
  };

  const loadUsage = async () => {
    try {
      const response = await fetch('/api/usage');
      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
      }
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadFeedback(), loadAnalytics(), loadErrors(), loadUsage()]);
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
            byEventType: {},
            recentEvents: [],
          });
        }
      } catch (error) {
        console.error('Error clearing analytics:', error);
      }
    }
  };

  const clearAllErrors = async () => {
    if (confirm('Are you sure you want to clear all error logs?')) {
      try {
        const response = await fetch('/api/errors', { method: 'DELETE' });
        if (response.ok) {
          setErrorsData({
            errors: [],
            stats: { total: 0, byEndpoint: {}, byErrorType: {}, last24h: 0 },
          });
        }
      } catch (error) {
        console.error('Error clearing error logs:', error);
      }
    }
  };

  const clearAllUsage = async () => {
    if (confirm('Are you sure you want to clear all usage data?')) {
      try {
        const response = await fetch('/api/usage', { method: 'DELETE' });
        if (response.ok) {
          setUsageData(null);
          loadUsage();
        }
      } catch (error) {
        console.error('Error clearing usage data:', error);
      }
    }
  };

  // Format token counts for display
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  // Format duration for display
  const formatDuration = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
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
          <button
            onClick={() => setActiveTab('errors')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'errors'
                ? 'border-[var(--ca-gold)] text-[var(--ca-gold)]'
                : 'border-transparent text-[var(--ca-gray-light)] hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Errors
            {errorsData && errorsData.stats.last24h > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
                {errorsData.stats.last24h}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'usage'
                ? 'border-[var(--ca-gold)] text-[var(--ca-gold)]'
                : 'border-transparent text-[var(--ca-gray-light)] hover:text-white'
            }`}
          >
            <Gauge className="w-4 h-4" />
            Usage
            {usageData && usageData.activeSessions > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                {usageData.activeSessions} active
              </span>
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-[var(--ca-gray-light)]">Loading...</p>
          </div>
        ) : activeTab === 'usage' ? (
          /* Usage Tab */
          <div>
            {!usageData || usageData.allTime.totalRequests === 0 ? (
              <div className="text-center py-20">
                <Gauge className="w-12 h-12 text-[var(--ca-gray)] mx-auto mb-4" />
                <p className="text-[var(--ca-gray-light)]">No usage data yet</p>
                <p className="text-sm text-[var(--ca-gray)] mt-1">
                  API requests and token usage will be tracked here
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Real-time Status */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-[var(--ca-gray-light)]">Active Sessions</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">{usageData.activeSessions}</div>
                    <div className="text-xs text-[var(--ca-gray)] mt-1">Last 15 min</div>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-[var(--ca-gold)]" />
                      <span className="text-xs text-[var(--ca-gray-light)]">Requests/Hour</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--ca-gold)]">{usageData.currentHour.totalRequests}</div>
                    <div className="text-xs text-[var(--ca-gray)] mt-1">Current hour</div>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-[var(--ca-gray-light)]">Avg Duration</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-400">{formatDuration(usageData.currentHour.avgRequestDuration)}</div>
                    <div className="text-xs text-[var(--ca-gray)] mt-1">Per request</div>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      <span className="text-xs text-[var(--ca-gray-light)]">Rate Limits</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-400">{usageData.rateLimits.rateLimitHitsLast24h}</div>
                    <div className="text-xs text-[var(--ca-gray)] mt-1">Last 24h</div>
                  </div>
                </div>

                {/* Token Usage - Current Hour */}
                <div className="card">
                  <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                    Token Usage (Current Hour)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ArrowUpRight className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-[var(--ca-gray-light)]">Input Tokens</span>
                      </div>
                      <div className="text-xl font-bold">{formatTokens(usageData.currentHour.totalInputTokens)}</div>
                    </div>
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ArrowDownRight className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-[var(--ca-gray-light)]">Output Tokens</span>
                      </div>
                      <div className="text-xl font-bold">{formatTokens(usageData.currentHour.totalOutputTokens)}</div>
                    </div>
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-[var(--ca-gray-light)]">Cache Read</span>
                      </div>
                      <div className="text-xl font-bold">{formatTokens(usageData.currentHour.totalCacheReadTokens)}</div>
                    </div>
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-[var(--ca-gray-light)]">Cache Created</span>
                      </div>
                      <div className="text-xl font-bold">{formatTokens(usageData.currentHour.totalCacheCreationTokens)}</div>
                    </div>
                  </div>
                </div>

                {/* API Key Usage */}
                <div className="card">
                  <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                    API Key Distribution (Current Hour)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Primary Key (Tier 4)</span>
                        <span className="text-[var(--ca-gold)] font-bold">{usageData.rateLimits.primaryKeyUsage}</span>
                      </div>
                      <div className="h-2 bg-[var(--ca-black)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--ca-gold)] rounded-full"
                          style={{
                            width: `${Math.min(100, (usageData.rateLimits.primaryKeyUsage / 200) * 100)}%`
                          }}
                        />
                      </div>
                      <div className="text-xs text-[var(--ca-gray)] mt-1">Target: ~200 req/min capacity</div>
                    </div>
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Secondary Key (Tier 2)</span>
                        <span className="text-purple-400 font-bold">{usageData.rateLimits.secondaryKeyUsage}</span>
                      </div>
                      <div className="h-2 bg-[var(--ca-black)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-400 rounded-full"
                          style={{
                            width: `${Math.min(100, (usageData.rateLimits.secondaryKeyUsage / 45) * 100)}%`
                          }}
                        />
                      </div>
                      <div className="text-xs text-[var(--ca-gray)] mt-1">Target: ~45 req/min capacity</div>
                    </div>
                  </div>
                </div>

                {/* Requests by Endpoint */}
                {Object.keys(usageData.currentHour.byEndpoint).length > 0 && (
                  <div className="card">
                    <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                      Requests by Endpoint (Current Hour)
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(usageData.currentHour.byEndpoint)
                        .sort(([, a], [, b]) => b - a)
                        .map(([endpoint, count]) => (
                          <div key={endpoint} className="flex items-center justify-between bg-[var(--ca-gray-dark)] rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <Server className="w-4 h-4 text-[var(--ca-gray-light)]" />
                              <span className="text-sm font-mono">{endpoint}</span>
                            </div>
                            <span className="text-[var(--ca-gold)] font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 24 Hour Summary */}
                <div className="card">
                  <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                    Last 24 Hours Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[var(--ca-gold)]">{usageData.last24Hours.totalRequests}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Total Requests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{formatTokens(usageData.last24Hours.totalInputTokens)}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Input Tokens</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{formatTokens(usageData.last24Hours.totalOutputTokens)}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Output Tokens</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{formatTokens(usageData.last24Hours.totalCacheReadTokens)}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Cache Hits</div>
                    </div>
                  </div>
                </div>

                {/* All Time Stats */}
                <div className="card">
                  <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                    All Time Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold">{usageData.allTime.totalRequests.toLocaleString()}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Total Requests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">{formatTokens(usageData.allTime.totalInputTokens)}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Input Tokens</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">{formatTokens(usageData.allTime.totalOutputTokens)}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Output Tokens</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">{formatTokens(usageData.allTime.totalCacheReadTokens)}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Cache Read</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">{formatTokens(usageData.allTime.totalCacheCreationTokens)}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Cache Created</div>
                    </div>
                  </div>
                </div>

                {/* Recent Requests */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider">
                      Recent Requests
                    </h3>
                    <button
                      onClick={clearAllUsage}
                      className="btn btn-ghost text-red-400 hover:bg-red-500/10 text-xs py-1 px-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {usageData.recentRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between bg-[var(--ca-gray-dark)]/50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Cpu className="w-4 h-4 text-[var(--ca-gray-light)]" />
                          <div>
                            <div className="text-sm font-mono">{request.endpoint}</div>
                            <div className="flex items-center gap-2 text-xs text-[var(--ca-gray-light)]">
                              <span>{request.model}</span>
                              <span>·</span>
                              <span>{formatTokens(request.inputTokens)} in / {formatTokens(request.outputTokens)} out</span>
                              {request.cacheReadTokens > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-purple-400">{formatTokens(request.cacheReadTokens)} cached</span>
                                </>
                              )}
                              {request.wasRateLimited && (
                                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                                  Rate Limited
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[var(--ca-gray-light)]">
                            {format(new Date(request.timestamp), 'h:mm:ss a')}
                          </div>
                          <div className="text-xs text-[var(--ca-gray)]">
                            {formatDuration(request.requestDurationMs)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'errors' ? (
          /* Errors Tab */
          <div>
            {!errorsData || errorsData.stats.total === 0 ? (
              <div className="text-center py-20">
                <AlertTriangle className="w-12 h-12 text-[var(--ca-gray)] mx-auto mb-4" />
                <p className="text-[var(--ca-gray-light)]">No errors logged yet</p>
                <p className="text-sm text-[var(--ca-gray)] mt-1">
                  API errors and failures will be tracked here
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Error Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card">
                    <div className="text-2xl font-bold text-red-400">{errorsData.stats.total}</div>
                    <div className="text-xs text-[var(--ca-gray-light)] mt-1">Total Errors</div>
                  </div>
                  <div className="card">
                    <div className="text-2xl font-bold text-orange-400">{errorsData.stats.last24h}</div>
                    <div className="text-xs text-[var(--ca-gray-light)] mt-1">Last 24 Hours</div>
                  </div>
                  <div className="card">
                    <div className="text-2xl font-bold text-[var(--ca-gold)]">
                      {Object.keys(errorsData.stats.byEndpoint).length}
                    </div>
                    <div className="text-xs text-[var(--ca-gray-light)] mt-1">Affected Endpoints</div>
                  </div>
                  <div className="card">
                    <div className="text-2xl font-bold text-purple-400">
                      {errorsData.stats.byErrorType['rate_limit'] || 0}
                    </div>
                    <div className="text-xs text-[var(--ca-gray-light)] mt-1">Rate Limit Errors</div>
                  </div>
                </div>

                {/* Errors by Endpoint */}
                {Object.keys(errorsData.stats.byEndpoint).length > 0 && (
                  <div className="card">
                    <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                      Errors by Endpoint
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(errorsData.stats.byEndpoint)
                        .sort(([, a], [, b]) => b - a)
                        .map(([endpoint, count]) => (
                          <div key={endpoint} className="flex items-center justify-between bg-[var(--ca-gray-dark)] rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <Server className="w-4 h-4 text-[var(--ca-gray-light)]" />
                              <span className="text-sm font-mono">{endpoint}</span>
                            </div>
                            <span className="text-red-400 font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Recent Errors */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider">
                      Recent Errors
                    </h3>
                    <button
                      onClick={clearAllErrors}
                      className="btn btn-ghost text-red-400 hover:bg-red-500/10 text-xs py-1 px-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {errorsData.errors.map((error) => (
                      <details
                        key={error.id}
                        className="group bg-[var(--ca-gray-dark)]/50 rounded-lg"
                      >
                        <summary className="flex items-center justify-between p-3 cursor-pointer list-none hover:bg-[var(--ca-gray-dark)] rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className={`w-4 h-4 ${
                              error.errorType === 'rate_limit' ? 'text-orange-400' : 'text-red-400'
                            }`} />
                            <div>
                              <div className="text-sm font-mono">{error.endpoint}</div>
                              <div className="flex items-center gap-2 text-xs text-[var(--ca-gray-light)]">
                                <span className={`px-1.5 py-0.5 rounded ${
                                  error.errorType === 'rate_limit'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {error.errorType}
                                </span>
                                {error.statusCode && (
                                  <span>Status: {error.statusCode}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-[var(--ca-gray-light)]">
                            {format(new Date(error.timestamp), 'MMM d · h:mm a')}
                          </div>
                        </summary>
                        <div className="px-3 pb-3 pt-1 border-t border-[var(--ca-gray-dark)] space-y-2">
                          <div>
                            <p className="text-xs text-[var(--ca-gray-light)] mb-1">Message:</p>
                            <p className="text-sm text-red-300 font-mono text-xs break-all">
                              {error.message.slice(0, 500)}
                              {error.message.length > 500 && '...'}
                            </p>
                          </div>
                          {error.requestData && (
                            <div>
                              <p className="text-xs text-[var(--ca-gray-light)] mb-1">Request Data:</p>
                              <pre className="text-xs text-[var(--ca-gray)] font-mono bg-[var(--ca-black)] p-2 rounded overflow-x-auto">
                                {error.requestData}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
                  <div className="card">
                    <div className="text-2xl font-bold text-[#EF4444]">{analytics.byAwarenessLevel.known}</div>
                    <div className="flex items-center gap-1 text-xs text-[var(--ca-gray-light)] mt-1">
                      <Eye className="w-3 h-3" />
                      Known Ideas
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
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {analytics.recentEvents.map((event) => {
                      const config = awarenessConfig[event.awarenessLevel];
                      const eventConfig = eventTypeLabels[event.eventType] || { label: event.eventType, Icon: Activity };
                      const EventIcon = eventConfig.Icon;
                      const LevelIcon = config.Icon;

                      return (
                        <details
                          key={event.id}
                          className="group bg-[var(--ca-gray-dark)]/50 rounded-lg"
                        >
                          <summary className="flex items-center justify-between p-3 cursor-pointer list-none hover:bg-[var(--ca-gray-dark)] rounded-lg transition-colors">
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
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-[var(--ca-gray-light)]">
                              {format(new Date(event.timestamp), 'MMM d · h:mm a')}
                            </div>
                          </summary>
                          {event.content && (
                            <div className="px-3 pb-3 pt-1 border-t border-[var(--ca-gray-dark)]">
                              <p className="text-sm text-[var(--ca-gray-light)] italic">
                                &ldquo;{event.content}&rdquo;
                              </p>
                              {event.niche && (
                                <p className="text-xs text-[var(--ca-gray)] mt-2">
                                  Niche: {event.niche}
                                </p>
                              )}
                            </div>
                          )}
                          {!event.content && (
                            <div className="px-3 pb-3 pt-1 border-t border-[var(--ca-gray-dark)]">
                              <p className="text-xs text-[var(--ca-gray)]">
                                Content not available (older event)
                              </p>
                            </div>
                          )}
                        </details>
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
