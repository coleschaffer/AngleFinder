'use client';

import { useApp } from '@/context/AppContext';
import { AnalysisResult, Source } from '@/types';
import { NICHES } from '@/data/niches';
import { Loader2, CheckCircle, XCircle, AlertCircle, Zap } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

export function Step6Analysis() {
  const {
    wizard,
    setStep,
    setIsAnalyzing,
    setAnalysisProgress,
    setResults,
    saveSession,
    preAnalyzedResults,
    clearPreAnalyzedResults,
    pendingAnalysis,
    addPreAnalyzedResult,
  } = useApp();

  const [statusMessages, setStatusMessages] = useState<
    { id: string; message: string; status: 'pending' | 'analyzing' | 'success' | 'error' | 'pre-analyzed' }[]
  >([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const hasStarted = useRef(false);

  const getNicheName = () => {
    if (wizard.niche === 'other') return wizard.customNiche;
    return NICHES.find(n => n.id === wizard.niche)?.name || '';
  };

  const getSelectedSources = (): Source[] => {
    return wizard.discoveredSources.filter(s => wizard.selectedSources.includes(s.id));
  };

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const runAnalysis = async () => {
      setIsAnalyzing(true);
      const sources = getSelectedSources();
      const allResults: AnalysisResult[] = [];

      // Check which sources are already pre-analyzed, pending, or need analysis
      const preAnalyzedSources: Source[] = [];
      const pendingSources: Source[] = [];
      const needsAnalysis: Source[] = [];

      for (const source of sources) {
        if (preAnalyzedResults.has(source.id)) {
          preAnalyzedSources.push(source);
          const result = preAnalyzedResults.get(source.id)!;
          allResults.push(result);
        } else if (pendingAnalysis.has(source.id)) {
          // Source is being analyzed in background - wait for it
          pendingSources.push(source);
        } else {
          needsAnalysis.push(source);
        }
      }

      // Initialize status messages
      setStatusMessages([
        ...preAnalyzedSources.map(s => {
          const result = preAnalyzedResults.get(s.id)!;
          return {
            id: s.id,
            message: `Pre-analyzed: ${result.claims.length} claims, ${result.hooks.length} hooks`,
            status: 'pre-analyzed' as const,
          };
        }),
        ...pendingSources.map(s => ({
          id: s.id,
          message: `Waiting for background analysis: ${s.title.slice(0, 50)}...`,
          status: 'analyzing' as const,
        })),
        ...needsAnalysis.map(s => ({
          id: s.id,
          message: `Waiting to analyze: ${s.title.slice(0, 50)}...`,
          status: 'pending' as const,
        })),
      ]);

      // Wait for pending background analysis to complete
      // Poll every 500ms until all pending sources are in preAnalyzedResults or no longer pending
      const waitForPending = async () => {
        for (const source of pendingSources) {
          // Poll until this source is no longer pending
          while (pendingAnalysis.has(source.id) && !preAnalyzedResults.has(source.id)) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Check if it completed successfully
          if (preAnalyzedResults.has(source.id)) {
            const result = preAnalyzedResults.get(source.id)!;
            allResults.push(result);
            setStatusMessages(prev =>
              prev.map(s =>
                s.id === source.id
                  ? {
                      ...s,
                      message: `Pre-analyzed: ${result.claims.length} claims, ${result.hooks.length} hooks`,
                      status: 'pre-analyzed' as const,
                    }
                  : s
              )
            );
          } else {
            // Background analysis failed or was cancelled - need to re-analyze
            needsAnalysis.push(source);
            setStatusMessages(prev =>
              prev.map(s =>
                s.id === source.id
                  ? {
                      ...s,
                      message: `Waiting to analyze: ${source.title.slice(0, 50)}...`,
                      status: 'pending' as const,
                    }
                  : s
              )
            );
          }
        }
      };

      await waitForPending();

      // If all sources were pre-analyzed (or completed from pending), skip to results
      if (needsAnalysis.length === 0) {
        setIsAnalyzing(false);
        setResults(allResults);

        // Quick transition to results
        setTimeout(() => {
          clearPreAnalyzedResults();
          setStep(7);
        }, 500);
        return;
      }

      // Rolling concurrent pool - maintains N active tasks at all times
      // As each completes, immediately starts the next one
      // Reduced from 20 to 3 to avoid hitting Anthropic rate limits
      const concurrencyLimit = 3;
      const queue = [...needsAnalysis];
      const activeIds = new Set<string>();
      const executing = new Map<string, Promise<void>>();

      const analyzeSource = async (source: Source) => {
        activeIds.add(source.id);
        setAnalyzingIds(new Set(activeIds));

        // Mark as analyzing
        setStatusMessages(prev =>
          prev.map(s =>
            s.id === source.id
              ? { ...s, message: `Analyzing: ${source.title.slice(0, 50)}...`, status: 'analyzing' as const }
              : s
          )
        );

        try {
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source,
              niche: getNicheName(),
              product: wizard.productDescription,
              strategy: wizard.strategy,
            }),
          });

          if (!response.ok) {
            throw new Error('Analysis failed');
          }

          const result: AnalysisResult = await response.json();

          // Update status to success
          setStatusMessages(prev =>
            prev.map(s =>
              s.id === source.id
                ? {
                    ...s,
                    message: `Completed: ${result.claims.length} claims, ${result.hooks.length} hooks`,
                    status: 'success' as const,
                  }
                : s
            )
          );

          allResults.push(result);
        } catch (error) {
          console.error('Analysis error for source:', source.id, error);

          // Update status to error
          setStatusMessages(prev =>
            prev.map(s =>
              s.id === source.id
                ? { ...s, message: `Failed: ${source.title.slice(0, 40)}...`, status: 'error' as const }
                : s
            )
          );
        } finally {
          activeIds.delete(source.id);
          executing.delete(source.id);
          setAnalyzingIds(new Set(activeIds));
        }
      };

      // Start initial batch up to concurrency limit
      while (queue.length > 0 && executing.size < concurrencyLimit) {
        const source = queue.shift()!;
        const promise = analyzeSource(source);
        executing.set(source.id, promise);
      }

      // As each completes, start the next one
      while (executing.size > 0) {
        // Wait for any one to complete
        await Promise.race(executing.values());

        // Start new tasks up to the limit
        while (queue.length > 0 && executing.size < concurrencyLimit) {
          const source = queue.shift()!;
          const promise = analyzeSource(source);
          executing.set(source.id, promise);
        }
      }

      setIsAnalyzing(false);
      setAnalyzingIds(new Set());
      setResults(allResults);

      // Clear pre-analyzed results after we've used them
      clearPreAnalyzedResults();

      // Auto-save session and advance to results
      if (allResults.length > 0) {
        // Small delay before advancing
        setTimeout(() => {
          setStep(7);
        }, 1000);
      }
    };

    runAnalysis();
  }, []); // Only run once on mount

  const preAnalyzedCount = statusMessages.filter(s => s.status === 'pre-analyzed').length;
  const completedCount = statusMessages.filter(s => s.status === 'success').length;
  const errorCount = statusMessages.filter(s => s.status === 'error').length;
  const totalCount = statusMessages.length;
  const progress = totalCount > 0 ? Math.round((preAnalyzedCount + completedCount + errorCount) / totalCount * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-[var(--ca-gold)] mx-auto mb-4 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[var(--ca-black)] animate-spin" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Analyzing Sources</h2>
        <p className="text-[var(--ca-gray-light)]">
          Extracting claims and generating hooks from your selected content
        </p>
      </div>

      {/* Pre-analyzed boost indicator */}
      {preAnalyzedCount > 0 && (
        <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-xs text-green-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>
              <strong>{preAnalyzedCount} source{preAnalyzedCount !== 1 ? 's' : ''}</strong> were pre-analyzed while you browsed — instant results!
            </span>
          </p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[var(--ca-gray-light)]">Progress</span>
          <span className="text-[var(--ca-gold)]">{progress}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-2 text-[var(--ca-gray-light)]">
          <span>
            {preAnalyzedCount > 0 && `${preAnalyzedCount} pre-analyzed, `}
            {completedCount} completed
          </span>
          {errorCount > 0 && <span className="text-red-400">{errorCount} failed</span>}
          <span>{totalCount - preAnalyzedCount - completedCount - errorCount} remaining</span>
        </div>
      </div>

      {/* Status Messages */}
      <div className="space-y-2">
        {statusMessages.map(status => {
          const isAnalyzing = status.status === 'analyzing';
          const isPreAnalyzed = status.status === 'pre-analyzed';
          return (
            <div
              key={status.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                status.status === 'success'
                  ? 'bg-green-500/10 border border-green-500/20'
                  : isPreAnalyzed
                  ? 'bg-green-500/10 border border-green-500/20'
                  : status.status === 'error'
                  ? 'bg-red-500/10 border border-red-500/20'
                  : isAnalyzing
                  ? 'bg-[var(--ca-gold)]/10 border border-[var(--ca-gold)]/20'
                  : 'bg-[var(--ca-gray-dark)] border border-transparent'
              }`}
            >
              {status.status === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : isPreAnalyzed ? (
                <Zap className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : status.status === 'error' ? (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              ) : isAnalyzing ? (
                <Loader2 className="w-5 h-5 text-[var(--ca-gold)] animate-spin flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-[var(--ca-gray)] flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  status.status === 'success' || isPreAnalyzed
                    ? 'text-green-400'
                    : status.status === 'error'
                    ? 'text-red-400'
                    : isAnalyzing
                    ? 'text-[var(--ca-gold)]'
                    : 'text-[var(--ca-gray-light)]'
                }`}
              >
                {status.message}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tips while waiting */}
      <div className="mt-8 p-4 bg-[var(--ca-gray-dark)] rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--ca-gold)] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium mb-1">Analysis in Progress</h4>
            <p className="text-xs text-[var(--ca-gray-light)]">
              We&apos;re extracting transcripts, identifying claims, and generating
              breakthrough angles. This may take a few minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
