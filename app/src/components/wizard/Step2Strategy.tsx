'use client';

import { useApp } from '@/context/AppContext';
import { SourceStrategy } from '@/types';
import { ArrowLeft, ArrowRight, Shuffle, Target, Sparkles } from 'lucide-react';

export function Step2Strategy() {
  const { wizard, setStrategy, setStep } = useApp();

  const strategies: {
    id: SourceStrategy;
    title: string;
    icon: typeof Shuffle;
    description: string;
    benefits: string[];
  }[] = [
    {
      id: 'translocate',
      title: 'Translocate',
      icon: Shuffle,
      description:
        'Find marketing angles from completely unrelated fields to discover unique, unexpected connections.',
      benefits: [
        'Discover angles no competitor will find',
        'Create memorable, unique hooks',
        'Stand out in crowded markets',
      ],
    },
    {
      id: 'direct',
      title: 'Direct',
      icon: Target,
      description:
        'Find angles from directly related fields — content that\'s already in your wheelhouse but may have angles you haven\'t explored.',
      benefits: [
        'Scientifically backed claims',
        'Easier to establish credibility',
        'Clearer logical connections',
      ],
    },
  ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Choose Your Sourcing Strategy</h2>
        <p className="text-[var(--ca-gray-light)]">
          How do you want to find your breakthrough angles?
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {strategies.map(strategy => {
          const Icon = strategy.icon;
          const isSelected = wizard.strategy === strategy.id;

          return (
            <button
              key={strategy.id}
              onClick={() => setStrategy(strategy.id)}
              className={`card card-hover text-left transition-all ${
                isSelected ? 'card-selected' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isSelected
                      ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                      : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)]'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg">{strategy.title}</h3>
              </div>

              <p className="text-sm text-[var(--ca-gray-light)] mb-4">
                {strategy.description}
              </p>

              <ul className="space-y-2">
                {strategy.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--ca-gold)]" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep(1)} className="btn btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!wizard.strategy}
          className="btn btn-primary"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
