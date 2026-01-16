'use client';

import { useApp } from '@/context/AppContext';
import { StepIndicator } from './StepIndicator';
import { Step1Niche } from './Step1Niche';
import { Step2Strategy } from './Step2Strategy';
import { Step3Categories } from './Step3Categories';
import { Step4SourceTypes } from './Step4SourceTypes';
import { Step5Discovery } from './Step5Discovery';
import { Step6Analysis } from './Step6Analysis';
import { Step7Results } from './Step7Results';

const STEP_LABELS = ['Niche', 'Strategy', 'Categories', 'Sources', 'Discover', 'Analyze', 'Results'];

export function Wizard() {
  const { wizard } = useApp();

  const renderStep = () => {
    switch (wizard.step) {
      case 1:
        return <Step1Niche />;
      case 2:
        return <Step2Strategy />;
      case 3:
        return <Step3Categories />;
      case 4:
        return <Step4SourceTypes />;
      case 5:
        return <Step5Discovery />;
      case 6:
        return <Step6Analysis />;
      case 7:
        return <Step7Results />;
      default:
        return <Step1Niche />;
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      {/* Step Indicator - hide on analysis and results */}
      {wizard.step < 6 && (
        <StepIndicator
          currentStep={wizard.step}
          totalSteps={5}
          stepLabels={STEP_LABELS.slice(0, 5)}
        />
      )}

      {/* Step Content */}
      <div className="max-w-5xl mx-auto">{renderStep()}</div>
    </div>
  );
}
