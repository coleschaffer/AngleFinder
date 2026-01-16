'use client';

import { useApp } from '@/context/AppContext';
import { NICHES } from '@/data/niches';
import { Niche } from '@/types';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { ProductURLInput } from './ProductURLInput';

export function Step1Niche() {
  const { wizard, setNiche, setCustomNiche, setProductDescription, setStep } = useApp();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedNiche = NICHES.find(n => n.id === wizard.niche);

  const handleNicheSelect = (nicheId: Niche) => {
    setNiche(nicheId);
    setIsDropdownOpen(false);
  };

  const canProceed = wizard.niche && (wizard.niche !== 'other' || wizard.customNiche.trim());

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Select Your Niche</h2>
        <p className="text-[var(--ca-gray-light)]">
          Choose the market you&apos;re creating content for
        </p>
      </div>

      {/* Product URL Input */}
      <ProductURLInput />

      {/* Niche Dropdown */}
      <div className="relative mb-6">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="input flex items-center justify-between cursor-pointer"
        >
          <span className={selectedNiche ? 'text-white' : 'text-[var(--ca-gray-light)]'}>
            {selectedNiche?.name || 'Choose your niche...'}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-[var(--ca-gray-light)] transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-2 py-2 bg-[var(--ca-dark)] border border-[var(--ca-gray)] rounded-lg shadow-xl max-h-80 overflow-y-auto">
            {NICHES.map(niche => (
              <button
                key={niche.id}
                onClick={() => handleNicheSelect(niche.id)}
                className={`w-full px-4 py-3 text-left hover:bg-[var(--ca-gray-dark)] transition-colors ${
                  wizard.niche === niche.id
                    ? 'bg-[var(--ca-gray-dark)] text-[var(--ca-gold)]'
                    : 'text-white'
                }`}
              >
                {niche.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom Niche Input */}
      {wizard.niche === 'other' && (
        <div className="mb-6 animate-slide-up">
          <label className="block text-sm font-medium mb-2">
            Describe Your Niche
          </label>
          <input
            type="text"
            value={wizard.customNiche}
            onChange={e => setCustomNiche(e.target.value)}
            placeholder="e.g., Sustainable fashion for millennials"
            className="input"
          />
        </div>
      )}

      {/* Product Description */}
      {wizard.niche && (
        <div className="mb-8 animate-slide-up">
          <label className="block text-sm font-medium mb-2">
            Describe Your Product
          </label>
          <textarea
            value={wizard.productDescription}
            onChange={e => setProductDescription(e.target.value)}
            placeholder={
              wizard.niche === 'other'
                ? 'Describe your product, target audience, key benefits, and what makes it unique...'
                : selectedNiche?.placeholderProduct
            }
            className="input textarea"
            rows={5}
          />
          <p className="text-xs text-[var(--ca-gray-light)] mt-2">
            Be specific about your product, target audience, and key differentiators
          </p>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setStep(2)}
          disabled={!canProceed}
          className="btn btn-primary"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
