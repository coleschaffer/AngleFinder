'use client';

import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function StepIndicator({ currentStep, totalSteps, stepLabels }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 md:mb-8 overflow-x-auto px-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={stepNum} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all ${
                  isCompleted
                    ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                    : isCurrent
                    ? 'bg-[var(--ca-gold)] text-[var(--ca-black)]'
                    : 'bg-[var(--ca-gray-dark)] text-[var(--ca-gray-light)] border border-[var(--ca-gray)]'
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : stepNum}
              </div>
              {/* Hide labels on mobile, show on sm+ */}
              <span
                className={`hidden sm:block text-xs mt-1 whitespace-nowrap ${
                  isCurrent ? 'text-[var(--ca-gold)]' : 'text-[var(--ca-gray-light)]'
                }`}
              >
                {stepLabels[i]}
              </span>
            </div>
            {stepNum < totalSteps && (
              <div
                className={`w-4 sm:w-8 md:w-12 h-0.5 mx-1 sm:mx-2 ${
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
