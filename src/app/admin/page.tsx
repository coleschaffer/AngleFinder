'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MessageSquare, Trash2, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface FeedbackItem {
  id: string;
  email: string;
  message: string;
  date: string;
  userAgent: string;
}

export default function AdminPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFeedback = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/feedback');
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback || []);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadFeedback();
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

  return (
    <div className="min-h-dvh bg-[var(--ca-black)] text-white p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="btn btn-ghost p-2 sm:px-4 sm:py-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to App</span>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Feedback Admin</h1>
              <p className="text-xs sm:text-sm text-[var(--ca-gray-light)]">
                {feedback.length} feedback item{feedback.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadFeedback} className="btn btn-secondary flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4" />
              <span className="sm:inline">Refresh</span>
            </button>
            {feedback.length > 0 && (
              <button onClick={clearAllFeedback} className="btn btn-ghost text-red-400 hover:bg-red-500/10 flex-1 sm:flex-none">
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback List */}
        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-[var(--ca-gray-light)]">Loading...</p>
          </div>
        ) : feedback.length === 0 ? (
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
    </div>
  );
}
