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
  HardDrive,
  CheckCircle,
  Copy,
  CheckSquare,
  Square,
} from 'lucide-react';
import Link from 'next/link';

interface FeedbackItem {
  id: string;
  email: string;
  message: string;
  date: string;
  userAgent: string;
}

interface ViralityScore {
  easyToUnderstand: number;
  emotional: number;
  curiosityInducing: number;
  contrarian: number;
  provable: number;
  total: number;
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
  productDescription?: string;
  strategy?: string;
  sourceUrl?: string;
  sourceName?: string;
  // Rich hook data
  bridge?: string;
  bridgeDistance?: string;
  angleTypes?: string[];
  bigIdeaSummary?: string;
  viralityScores?: ViralityScore;
  sampleAdOpener?: string;
  awarenessReasoning?: string;
  momentumSignals?: string[];
  sourceClaim?: string;
  // Rich claim data
  exactQuote?: string;
  surpriseScore?: number;
  mechanism?: string;
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

interface ContentCacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  totalHits: number;
  bySourceType: Record<string, { count: number; sizeBytes: number; hits: number }>;
  avgFetchDurationMs: number;
  oldestEntry: string | null;
  newestEntry: string | null;
  expiredCount: number;
}

// Timeframe-based usage summary for consolidated Usage tab
type UsageTimeframe = 'day' | 'week' | 'month' | 'all';

interface TimeframeUsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  avgRequestDuration: number;
  rateLimitedRequests: number;
  byEndpoint: Record<string, number>;
  primaryKeyUsage: number;
  secondaryKeyUsage: number;
}

interface TimeframeUsageSummary {
  timeframe: UsageTimeframe;
  stats: TimeframeUsageStats;
  activeSessions: number;
  recentRequests: UsageEntry[];
}

type Tab = 'feedback' | 'analytics' | 'errors' | 'usage' | 'cache';

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
  const [usageData, setUsageData] = useState<TimeframeUsageSummary | null>(null);
  const [usageTimeframe, setUsageTimeframe] = useState<UsageTimeframe>('day');
  const [cacheData, setCacheData] = useState<ContentCacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedErrorIds, setSelectedErrorIds] = useState<Set<string>>(new Set());
  const [copySuccess, setCopySuccess] = useState(false);

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

  const loadUsage = async (timeframe: UsageTimeframe = usageTimeframe) => {
    try {
      const response = await fetch(`/api/usage?timeframe=${timeframe}`);
      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
      }
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  // Handle timeframe change
  const handleTimeframeChange = async (newTimeframe: UsageTimeframe) => {
    setUsageTimeframe(newTimeframe);
    await loadUsage(newTimeframe);
  };

  const loadCache = async () => {
    try {
      const response = await fetch('/api/cache');
      if (response.ok) {
        const data = await response.json();
        setCacheData(data);
      }
    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadFeedback(), loadAnalytics(), loadErrors(), loadUsage(), loadCache()]);
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

  const cleanupExpiredCache = async () => {
    try {
      const response = await fetch('/api/cache', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        alert(`Cleaned up ${data.cleared} expired cache entries`);
        loadCache();
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  };

  const clearAllCache = async () => {
    if (confirm('Are you sure you want to clear ALL cached content? This will cause all sources to be re-fetched on next analysis.')) {
      try {
        const response = await fetch('/api/cache', { method: 'DELETE' });
        if (response.ok) {
          setCacheData(null);
          loadCache();
        }
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }
  };

  // Error selection helpers
  const toggleErrorSelection = (errorId: string) => {
    setSelectedErrorIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const toggleSelectAllErrors = () => {
    if (!errorsData) return;
    if (selectedErrorIds.size === errorsData.errors.length) {
      setSelectedErrorIds(new Set());
    } else {
      setSelectedErrorIds(new Set(errorsData.errors.map(e => e.id)));
    }
  };

  const copySelectedErrors = async () => {
    if (!errorsData || selectedErrorIds.size === 0) return;

    const selectedErrors = errorsData.errors.filter(e => selectedErrorIds.has(e.id));
    const formattedErrors = selectedErrors.map(error => {
      let text = `=== Error: ${error.endpoint} ===\n`;
      text += `Type: ${error.errorType}\n`;
      text += `Status: ${error.statusCode || 'N/A'}\n`;
      text += `Time: ${format(new Date(error.timestamp), 'MMM d, yyyy · h:mm:ss a')}\n`;
      text += `Message: ${error.message}\n`;
      if (error.requestData) {
        text += `\nRequest Data:\n${error.requestData}\n`;
      }
      return text;
    }).join('\n\n');

    try {
      await navigator.clipboard.writeText(formattedErrors);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: create a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = formattedErrors;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
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

  // Format bytes for display
  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
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
          <button
            onClick={() => setActiveTab('cache')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'cache'
                ? 'border-[var(--ca-gold)] text-[var(--ca-gold)]'
                : 'border-transparent text-[var(--ca-gray-light)] hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Cache
            {cacheData && cacheData.totalEntries > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                {cacheData.totalEntries}
              </span>
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-[var(--ca-gray-light)]">Loading...</p>
          </div>
        ) : activeTab === 'cache' ? (
          /* Cache Tab */
          <div>
            {!cacheData || cacheData.totalEntries === 0 ? (
              <div className="text-center py-20">
                <HardDrive className="w-12 h-12 text-[var(--ca-gray)] mx-auto mb-4" />
                <p className="text-[var(--ca-gray-light)]">No cached content yet</p>
                <p className="text-sm text-[var(--ca-gray)] mt-1">
                  Source content will be cached here to speed up repeat analyses
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cache Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-[var(--ca-gray-light)]">Cached Sources</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-400">{cacheData.totalEntries}</div>
                    <div className="text-xs text-[var(--ca-gray)] mt-1">Active entries</div>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-[var(--ca-gray-light)]">Total Size</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-400">{formatBytes(cacheData.totalSizeBytes)}</div>
                    <div className="text-xs text-[var(--ca-gray)] mt-1">Stored content</div>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-[var(--ca-gray-light)]">Cache Hits</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">{cacheData.totalHits}</div>
                    <div className="text-xs text-[var(--ca-gray)] mt-1">Times served from cache</div>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-[var(--ca-gold)]" />
                      <span className="text-xs text-[var(--ca-gray-light)]">Avg Fetch Time</span>
                    </div>
                    <div className="text-2xl font-bold text-[var(--ca-gold)]">{formatDuration(cacheData.avgFetchDurationMs)}</div>
                    <div className="text-xs text-[var(--ca-gray)] mt-1">Time saved per hit</div>
                  </div>
                </div>

                {/* Cache by Source Type */}
                {Object.keys(cacheData.bySourceType).length > 0 && (
                  <div className="card">
                    <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                      Cache by Source Type
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(cacheData.bySourceType)
                        .sort(([, a], [, b]) => b.count - a.count)
                        .map(([sourceType, stats]) => (
                          <div key={sourceType} className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium capitalize">{sourceType}</span>
                              <span className="text-purple-400 font-bold">{stats.count} sources</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-[var(--ca-gray-light)]">
                              <span>Size: {formatBytes(stats.sizeBytes)}</span>
                              <span>·</span>
                              <span>Hits: {stats.hits}</span>
                              <span>·</span>
                              <span>Avg: {formatBytes(stats.count > 0 ? stats.sizeBytes / stats.count : 0)}/source</span>
                            </div>
                            <div className="h-2 bg-[var(--ca-black)] rounded-full overflow-hidden mt-2">
                              <div
                                className="h-full bg-purple-400 rounded-full"
                                style={{
                                  width: `${Math.min(100, (stats.count / cacheData.totalEntries) * 100)}%`
                                }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Cache Timeline */}
                <div className="card">
                  <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                    Cache Timeline
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
                      <div className="text-xs text-[var(--ca-gray-light)] mb-1">Oldest Entry</div>
                      <div className="text-sm font-medium">
                        {cacheData.oldestEntry
                          ? format(new Date(cacheData.oldestEntry), 'MMM d, yyyy · h:mm a')
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
                      <div className="text-xs text-[var(--ca-gray-light)] mb-1">Newest Entry</div>
                      <div className="text-sm font-medium">
                        {cacheData.newestEntry
                          ? format(new Date(cacheData.newestEntry), 'MMM d, yyyy · h:mm a')
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cache Actions */}
                <div className="card">
                  <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                    Cache Management
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={cleanupExpiredCache}
                      className="btn btn-secondary"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Cleanup Expired ({cacheData.expiredCount})
                    </button>
                    <button
                      onClick={clearAllCache}
                      className="btn btn-ghost text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear All Cache
                    </button>
                  </div>
                  <p className="text-xs text-[var(--ca-gray)] mt-3">
                    Cached content is kept permanently until manually cleared.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'usage' ? (
          /* Usage Tab - Consolidated with Timeframe Selector */
          <div>
            {!usageData || usageData.stats.totalRequests === 0 ? (
              <div className="text-center py-20">
                <Gauge className="w-12 h-12 text-[var(--ca-gray)] mx-auto mb-4" />
                <p className="text-[var(--ca-gray-light)]">No usage data yet</p>
                <p className="text-sm text-[var(--ca-gray)] mt-1">
                  API requests and token usage will be tracked here
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Timeframe Selector */}
                <div className="flex gap-2 border-b border-[var(--ca-gray-dark)] pb-4">
                  {(['day', 'week', 'month', 'all'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => handleTimeframeChange(tf)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        usageTimeframe === tf
                          ? 'bg-[var(--ca-gold)] text-black'
                          : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)] hover:bg-[var(--ca-gray)] hover:text-white'
                      }`}
                    >
                      {tf === 'day' ? 'Day' : tf === 'week' ? 'Week' : tf === 'month' ? 'Month' : 'All Time'}
                    </button>
                  ))}
                </div>

                {/* Unified Stats Grid */}
                <div className="card">
                  <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                    Usage Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4 text-center">
                      <Activity className="w-5 h-5 text-[var(--ca-gold)] mx-auto mb-2" />
                      <div className="text-2xl font-bold text-[var(--ca-gold)]">{usageData.stats.totalRequests.toLocaleString()}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Total Requests</div>
                    </div>
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4 text-center">
                      <ArrowUpRight className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-400">{formatTokens(usageData.stats.totalInputTokens)}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Input Tokens</div>
                    </div>
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4 text-center">
                      <ArrowDownRight className="w-5 h-5 text-green-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-400">{formatTokens(usageData.stats.totalOutputTokens)}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Output Tokens</div>
                    </div>
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4 text-center">
                      <HardDrive className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-purple-400">{cacheData?.totalEntries || 0}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Sources Cached</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4 text-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
                      <div className="text-xl font-bold text-green-400">{cacheData?.totalHits || 0}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Cache Hits</div>
                    </div>
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4 text-center">
                      <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                      <div className="text-xl font-bold">{formatDuration(usageData.stats.avgRequestDuration)}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Avg Duration</div>
                    </div>
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4 text-center">
                      <AlertTriangle className="w-5 h-5 text-orange-400 mx-auto mb-2" />
                      <div className="text-xl font-bold text-orange-400">{usageData.stats.rateLimitedRequests}</div>
                      <div className="text-xs text-[var(--ca-gray-light)]">Rate Limited</div>
                    </div>
                  </div>
                </div>

                {/* API Key Distribution */}
                <div className="card">
                  <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                    API Key Distribution
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Primary Key (Tier 4)</span>
                        <span className="text-[var(--ca-gold)] font-bold">{usageData.stats.primaryKeyUsage}</span>
                      </div>
                      <div className="h-2 bg-[var(--ca-black)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--ca-gold)] rounded-full"
                          style={{
                            width: `${Math.min(100, (usageData.stats.primaryKeyUsage / Math.max(usageData.stats.primaryKeyUsage + usageData.stats.secondaryKeyUsage, 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-[var(--ca-gray-dark)] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Secondary Key (Tier 2)</span>
                        <span className="text-purple-400 font-bold">{usageData.stats.secondaryKeyUsage}</span>
                      </div>
                      <div className="h-2 bg-[var(--ca-black)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-400 rounded-full"
                          style={{
                            width: `${Math.min(100, (usageData.stats.secondaryKeyUsage / Math.max(usageData.stats.primaryKeyUsage + usageData.stats.secondaryKeyUsage, 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requests by Endpoint */}
                {Object.keys(usageData.stats.byEndpoint).length > 0 && (
                  <div className="card">
                    <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider mb-4">
                      Requests by Endpoint
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(usageData.stats.byEndpoint)
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

                {/* Recent Requests - Always shows last 50 */}
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
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-medium text-[var(--ca-gray-light)] uppercase tracking-wider">
                        Recent Errors
                      </h3>
                      {errorsData.errors.length > 0 && (
                        <button
                          onClick={toggleSelectAllErrors}
                          className="btn btn-ghost text-xs py-1 px-2 text-[var(--ca-gray-light)] hover:text-white"
                          title={selectedErrorIds.size === errorsData.errors.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedErrorIds.size === errorsData.errors.length ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                          <span className="ml-1">
                            {selectedErrorIds.size === errorsData.errors.length ? 'Deselect All' : 'Select All'}
                          </span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedErrorIds.size > 0 && (
                        <button
                          onClick={copySelectedErrors}
                          className={`btn text-xs py-1 px-2 ${
                            copySuccess
                              ? 'btn-primary bg-green-600 hover:bg-green-700'
                              : 'btn-secondary'
                          }`}
                        >
                          {copySuccess ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy {selectedErrorIds.size} Selected
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={clearAllErrors}
                        className="btn btn-ghost text-red-400 hover:bg-red-500/10 text-xs py-1 px-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {errorsData.errors.map((error) => (
                      <div
                        key={error.id}
                        className={`bg-[var(--ca-gray-dark)]/50 rounded-lg ${
                          selectedErrorIds.has(error.id) ? 'ring-2 ring-[var(--ca-gold)]' : ''
                        }`}
                      >
                        <details className="group">
                          <summary className="flex items-center justify-between p-3 cursor-pointer list-none hover:bg-[var(--ca-gray-dark)] rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleErrorSelection(error.id);
                                }}
                                className="p-1 hover:bg-[var(--ca-gray)] rounded transition-colors"
                              >
                                {selectedErrorIds.has(error.id) ? (
                                  <CheckSquare className="w-4 h-4 text-[var(--ca-gold)]" />
                                ) : (
                                  <Square className="w-4 h-4 text-[var(--ca-gray-light)]" />
                                )}
                              </button>
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
                                <pre className="text-xs text-[var(--ca-gray)] font-mono bg-[var(--ca-black)] p-2 rounded overflow-x-auto max-h-[300px] overflow-y-auto">
                                  {error.requestData}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
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
                          <div className="px-3 pb-3 pt-2 border-t border-[var(--ca-gray-dark)] space-y-3">
                            {/* Content (Hook headline or Claim) */}
                            {event.content && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">
                                  {event.itemType === 'hook' ? 'Hook Headline' : 'Claim'}
                                </p>
                                <p className="text-sm text-white font-medium">
                                  &ldquo;{event.content}&rdquo;
                                </p>
                              </div>
                            )}

                            {/* Classification & Scores */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="bg-[var(--ca-black)] rounded-lg p-2 text-center">
                                <p className="text-xs text-[var(--ca-gray)] mb-1">Awareness</p>
                                <p className="text-sm font-medium capitalize" style={{ color: config.color }}>{event.awarenessLevel}</p>
                              </div>
                              <div className="bg-[var(--ca-black)] rounded-lg p-2 text-center">
                                <p className="text-xs text-[var(--ca-gray)] mb-1">Momentum</p>
                                <p className="text-sm font-medium text-[var(--ca-gold)]">{event.momentumScore}/10</p>
                              </div>
                              {event.viralityScores && (
                                <div className="bg-[var(--ca-black)] rounded-lg p-2 text-center">
                                  <p className="text-xs text-[var(--ca-gray)] mb-1">Virality</p>
                                  <p className="text-sm font-medium text-green-400">{event.viralityScores.total}/50</p>
                                </div>
                              )}
                              {event.bridgeDistance && (
                                <div className="bg-[var(--ca-black)] rounded-lg p-2 text-center">
                                  <p className="text-xs text-[var(--ca-gray)] mb-1">Bridge</p>
                                  <p className="text-sm font-medium text-purple-400">{event.bridgeDistance}</p>
                                </div>
                              )}
                              {event.surpriseScore !== undefined && (
                                <div className="bg-[var(--ca-black)] rounded-lg p-2 text-center">
                                  <p className="text-xs text-[var(--ca-gray)] mb-1">Surprise</p>
                                  <p className="text-sm font-medium text-blue-400">{event.surpriseScore}/10</p>
                                </div>
                              )}
                            </div>

                            {/* Angle Types */}
                            {event.angleTypes && event.angleTypes.length > 0 && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Angle Types</p>
                                <div className="flex flex-wrap gap-1">
                                  {event.angleTypes.map((type, i) => (
                                    <span key={i} className="px-2 py-0.5 text-xs bg-[var(--ca-gold)]/20 text-[var(--ca-gold)] rounded-full">
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Source Claim (for hooks) */}
                            {event.sourceClaim && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Source Claim</p>
                                <p className="text-sm text-[var(--ca-gray-light)]">{event.sourceClaim}</p>
                              </div>
                            )}

                            {/* The Bridge (for hooks) */}
                            {event.bridge && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">The Bridge</p>
                                <div className="bg-[var(--ca-black)] rounded-lg p-3">
                                  <p className="text-sm text-[var(--ca-gray-light)]">{event.bridge}</p>
                                </div>
                              </div>
                            )}

                            {/* Big Idea Summary (for hooks) */}
                            {event.bigIdeaSummary && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Big Idea Summary</p>
                                <p className="text-sm text-[var(--ca-gray-light)]">{event.bigIdeaSummary}</p>
                              </div>
                            )}

                            {/* Exact Quote (for claims) */}
                            {event.exactQuote && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Exact Quote</p>
                                <blockquote className="text-sm italic text-[var(--ca-gray-light)] pl-3 border-l-2 border-[var(--ca-gold)]">
                                  &ldquo;{event.exactQuote}&rdquo;
                                </blockquote>
                              </div>
                            )}

                            {/* Mechanism (for claims) */}
                            {event.mechanism && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Mechanism</p>
                                <p className="text-sm text-[var(--ca-gray-light)]">{event.mechanism}</p>
                              </div>
                            )}

                            {/* Awareness Reasoning */}
                            {event.awarenessReasoning && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Awareness Reasoning</p>
                                <p className="text-sm text-[var(--ca-gray-light)]">{event.awarenessReasoning}</p>
                              </div>
                            )}

                            {/* Momentum Signals */}
                            {event.momentumSignals && event.momentumSignals.length > 0 && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Momentum Signals</p>
                                <ul className="space-y-1">
                                  {event.momentumSignals.map((signal, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--ca-gray-light)]">
                                      <span className="text-[var(--ca-gold)] mt-0.5">•</span>
                                      {signal}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Virality Score Breakdown (for hooks) */}
                            {event.viralityScores && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-2">Virality Breakdown</p>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                  <div className="bg-[var(--ca-black)] rounded p-2 text-center">
                                    <div className="text-sm font-bold text-[var(--ca-gold)]">{event.viralityScores.easyToUnderstand}</div>
                                    <div className="text-[10px] text-[var(--ca-gray)]">Easy</div>
                                  </div>
                                  <div className="bg-[var(--ca-black)] rounded p-2 text-center">
                                    <div className="text-sm font-bold text-[var(--ca-gold)]">{event.viralityScores.emotional}</div>
                                    <div className="text-[10px] text-[var(--ca-gray)]">Emotion</div>
                                  </div>
                                  <div className="bg-[var(--ca-black)] rounded p-2 text-center">
                                    <div className="text-sm font-bold text-[var(--ca-gold)]">{event.viralityScores.curiosityInducing}</div>
                                    <div className="text-[10px] text-[var(--ca-gray)]">Curiosity</div>
                                  </div>
                                  <div className="bg-[var(--ca-black)] rounded p-2 text-center">
                                    <div className="text-sm font-bold text-[var(--ca-gold)]">{event.viralityScores.contrarian}</div>
                                    <div className="text-[10px] text-[var(--ca-gray)]">Contrarian</div>
                                  </div>
                                  <div className="bg-[var(--ca-black)] rounded p-2 text-center">
                                    <div className="text-sm font-bold text-[var(--ca-gold)]">{event.viralityScores.provable}</div>
                                    <div className="text-[10px] text-[var(--ca-gray)]">Provable</div>
                                  </div>
                                  <div className="bg-[var(--ca-gold)]/20 rounded p-2 text-center">
                                    <div className="text-sm font-bold text-[var(--ca-gold)]">{event.viralityScores.total}</div>
                                    <div className="text-[10px] text-[var(--ca-gold)]">Total</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Sample Ad Opener (for hooks) */}
                            {event.sampleAdOpener && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Sample Ad Opener</p>
                                <div className="bg-[var(--ca-gold)]/5 border border-[var(--ca-gold)]/20 rounded-lg p-3">
                                  <p className="text-sm text-[var(--ca-gray-light)] whitespace-pre-line">{event.sampleAdOpener}</p>
                                </div>
                              </div>
                            )}

                            {/* User Query Context */}
                            <div className="grid grid-cols-2 gap-3">
                              {event.niche && (
                                <div>
                                  <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Niche</p>
                                  <p className="text-sm text-[var(--ca-gray-light)]">{event.niche}</p>
                                </div>
                              )}
                              {event.strategy && (
                                <div>
                                  <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Strategy</p>
                                  <p className="text-sm text-[var(--ca-gray-light)] capitalize">{event.strategy}</p>
                                </div>
                              )}
                              {event.sourceType && (
                                <div>
                                  <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Source Type</p>
                                  <p className="text-sm text-[var(--ca-gray-light)] capitalize">{event.sourceType}</p>
                                </div>
                              )}
                            </div>

                            {/* Product Description */}
                            {event.productDescription && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Product</p>
                                <p className="text-sm text-[var(--ca-gray-light)]">{event.productDescription}</p>
                              </div>
                            )}

                            {/* Source Info */}
                            {(event.sourceName || event.sourceUrl) && (
                              <div>
                                <p className="text-xs text-[var(--ca-gray)] uppercase tracking-wide mb-1">Source</p>
                                {event.sourceUrl ? (
                                  <a
                                    href={event.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-[var(--ca-gold)] hover:underline"
                                  >
                                    {event.sourceName || event.sourceUrl}
                                  </a>
                                ) : (
                                  <p className="text-sm text-[var(--ca-gray-light)]">{event.sourceName}</p>
                                )}
                              </div>
                            )}

                            {/* No content fallback */}
                            {!event.content && !event.productDescription && !event.sourceName && !event.bridge && !event.exactQuote && (
                              <p className="text-xs text-[var(--ca-gray)]">
                                Detailed context not available (older event)
                              </p>
                            )}
                          </div>
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
