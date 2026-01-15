'use client';

import { useApp } from '@/context/AppContext';
import { AnalysisResult, Source } from '@/types';
import { NICHES } from '@/data/niches';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

export function Step6Analysis() {
  const {
    wizard,
    setStep,
    setIsAnalyzing,
    setAnalysisProgress,
    setResults,
    saveSession,
  } = useApp();

  const [statusMessages, setStatusMessages] = useState<
    { id: string; message: string; status: 'pending' | 'analyzing' | 'success' | 'error' }[]
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

      // Initialize status messages
      setStatusMessages(
        sources.map(s => ({
          id: s.id,
          message: `Waiting to analyze: ${s.title.slice(0, 50)}...`,
          status: 'pending' as const,
        }))
      );

      // Analyze sources in parallel batches of 3
      const batchSize = 3;
      for (let i = 0; i < sources.length; i += batchSize) {
        const batch = sources.slice(i, i + batchSize);
        const batchIds = new Set(batch.map(s => s.id));

        // Mark all sources in this batch as "analyzing"
        setAnalyzingIds(batchIds);
        setStatusMessages(prev =>
          prev.map(s =>
            batchIds.has(s.id)
              ? { ...s, message: `Analyzing: ${sources.find(src => src.id === s.id)?.title.slice(0, 50)}...`, status: 'analyzing' as const }
              : s
          )
        );

        const batchResults = await Promise.all(
          batch.map(async source => {
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

              return result;
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

              return null;
            }
          })
        );

        // Add successful results
        const successfulResults = batchResults.filter((r): r is AnalysisResult => r !== null);
        allResults.push(...successfulResults);
      }

      setIsAnalyzing(false);
      setAnalyzingIds(new Set());
      setResults(allResults);

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

  const completedCount = statusMessages.filter(s => s.status === 'success').length;
  const errorCount = statusMessages.filter(s => s.status === 'error').length;
  const totalCount = statusMessages.length;
  const progress = totalCount > 0 ? Math.round((completedCount + errorCount) / totalCount * 100) : 0;

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
          <span>{completedCount} completed</span>
          {errorCount > 0 && <span className="text-red-400">{errorCount} failed</span>}
          <span>{totalCount - completedCount - errorCount} remaining</span>
        </div>
      </div>

      {/* Status Messages */}
      <div className="space-y-2">
        {statusMessages.map(status => {
          const isAnalyzing = status.status === 'analyzing';
          return (
            <div
              key={status.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                status.status === 'success'
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
              ) : status.status === 'error' ? (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              ) : isAnalyzing ? (
                <Loader2 className="w-5 h-5 text-[var(--ca-gold)] animate-spin flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-[var(--ca-gray)] flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  status.status === 'success'
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
