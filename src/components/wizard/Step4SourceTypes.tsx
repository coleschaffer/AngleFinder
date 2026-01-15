'use client';

import { useApp } from '@/context/AppContext';
import { SourceType } from '@/types';
import { ArrowLeft, ArrowRight, Youtube, Radio, MessageSquare, BookOpen, Check } from 'lucide-react';

export function Step4SourceTypes() {
  const { wizard, toggleSourceType, setStep } = useApp();

  const sourceTypes: {
    id: SourceType;
    name: string;
    icon: typeof Youtube;
    description: string;
    available: boolean;
  }[] = [
    {
      id: 'youtube',
      name: 'YouTube',
      icon: Youtube,
      description: 'Search videos and extract transcripts from YouTube',
      available: true,
    },
    {
      id: 'podcast',
      name: 'Podcasts',
      icon: Radio,
      description: 'Find long-form podcast episodes (30+ min) on YouTube',
      available: true,
    },
    {
      id: 'reddit',
      name: 'Reddit',
      icon: MessageSquare,
      description: 'Analyze discussions from relevant subreddits',
      available: true,
    },
    {
      id: 'pubmed',
      name: 'PubMed',
      icon: BookOpen,
      description: 'Search scientific papers and research studies',
      available: true,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Select Source Types</h2>
        <p className="text-[var(--ca-gray-light)]">
          Choose where to find inspiration for your angles
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {sourceTypes.map(source => {
          const Icon = source.icon;
          const isSelected = wizard.selectedSourceTypes.includes(source.id);
          const isDisabled = !source.available;

          return (
            <button
              key={source.id}
              onClick={() => !isDisabled && toggleSourceType(source.id)}
              disabled={isDisabled}
              className={`p-5 rounded-xl border text-left transition-all ${
                isDisabled
                  ? 'opacity-50 cursor-not-allowed bg-[var(--ca-gray-dark)] border-[var(--ca-gray)]'
                  : isSelected
                  ? 'bg-[rgba(212,175,55,0.1)] border-[var(--ca-gold)]'
                  : 'bg-[var(--ca-dark)] border-[var(--ca-gray-dark)] hover:border-[var(--ca-gray)]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                        : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold">{source.name}</span>
                </div>
                {isSelected && <Check className="w-5 h-5 text-[var(--ca-gold)]" />}
              </div>
              <p className="text-sm text-[var(--ca-gray-light)]">{source.description}</p>
              {isDisabled && (
                <span className="text-xs text-[var(--ca-gray)] mt-2 block">Coming soon</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Count */}
      {wizard.selectedSourceTypes.length > 0 && (
        <div className="text-center mb-6">
          <span className="tag tag-gold">
            {wizard.selectedSourceTypes.length} source type
            {wizard.selectedSourceTypes.length === 1 ? '' : 's'} selected
          </span>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={() => setStep(3)} className="btn btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setStep(5)}
          disabled={wizard.selectedSourceTypes.length === 0}
          className="btn btn-primary"
        >
          Search Sources
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
