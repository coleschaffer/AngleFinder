'use client';

import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function StepIndicator({ currentStep, totalSteps, stepLabels }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={stepNum} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  isCompleted
                    ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                    : isCurrent
                    ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                    : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)] border border-[var(--ca-gray)]'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span
                className={`text-xs mt-1 ${
                  isCurrent ? 'text-[var(--ca-gold)]' : 'text-[var(--ca-gray-light)]'
                }`}
              >
                {stepLabels[i]}
              </span>
            </div>
            {stepNum < totalSteps && (
              <div
                className={`w-12 h-0.5 mx-2 ${
                  isCompleted ? 'bg-[var(--ca-gold)]' : 'bg-[var(--ca-gray-dark)]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
