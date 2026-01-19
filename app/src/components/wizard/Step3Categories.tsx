'use client';

import { useApp } from '@/context/AppContext';
import { CATEGORIES } from '@/data/categories';
import { SourceCategory } from '@/types';
import { ArrowLeft, ArrowRight, Plus, X, Check } from 'lucide-react';
import { useState } from 'react';

export function Step3Categories() {
  const {
    wizard,
    toggleCategory,
    setStep,
    customCategories,
    addCustomCategory,
    removeCustomCategory,
  } = useApp();
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  if (!wizard.niche || !wizard.strategy) return null;

  const builtInCategories = CATEGORIES[wizard.niche]?.[wizard.strategy] || [];
  const allCategories = [...builtInCategories, ...customCategories];

  const handleAddCustomCategory = () => {
    if (!customCategoryName.trim()) return;

    const newCategoryId = `custom-${Date.now()}`;
    const newCategory: SourceCategory = {
      id: newCategoryId,
      name: customCategoryName.trim(),
      isCustom: true,
    };

    addCustomCategory(newCategory);
    // Auto-select the newly created category
    toggleCategory(newCategoryId);
    setCustomCategoryName('');
    setShowAddCustom(false);
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Select Source Categories</h2>
        <p className="text-[var(--ca-gray-light)]">
          Choose the topics you want to explore for{' '}
          <span className="text-[var(--ca-gold)]">
            {wizard.strategy === 'translocate' ? 'unexpected' : 'direct'}
          </span>{' '}
          angle inspiration
        </p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {allCategories.map(category => {
          const isSelected = wizard.selectedCategories.includes(category.id);

          return (
            <div
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleCategory(category.id);
                }
              }}
              className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[rgba(212,175,55,0.1)] border-[var(--ca-gold)]'
                  : 'bg-[var(--ca-dark)] border-[var(--ca-gray-dark)] hover:border-[var(--ca-gray)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate" title={category.name}>
                  {category.name.length > 24 ? `${category.name.slice(0, 24)}...` : category.name}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {category.isCustom && !isSelected && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeCustomCategory(category.id);
                      }}
                      className="p-0.5 rounded hover:bg-[var(--ca-gray-dark)]"
                    >
                      <X className="w-3 h-3 text-[var(--ca-gray-light)]" />
                    </button>
                  )}
                  {isSelected && (
                    <Check className="w-4 h-4 text-[var(--ca-gold)]" />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Custom Category Button */}
        <button
          onClick={() => setShowAddCustom(true)}
          className="p-4 rounded-xl border border-dashed border-[var(--ca-gray)] text-left hover:border-[var(--ca-gold)] hover:bg-[var(--ca-dark)] transition-all"
        >
          <div className="flex items-center gap-2 text-[var(--ca-gray-light)]">
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Custom</span>
          </div>
        </button>
      </div>

      {/* Add Custom Category Modal */}
      {showAddCustom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md mx-4 animate-slide-up">
            <h3 className="text-lg font-semibold mb-4">Add Custom Category</h3>
            <input
              type="text"
              value={customCategoryName}
              onChange={e => setCustomCategoryName(e.target.value)}
              placeholder="Enter category name..."
              className="input mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddCustom(false);
                  setCustomCategoryName('');
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomCategory}
                disabled={!customCategoryName.trim()}
                className="btn btn-primary"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Count */}
      {wizard.selectedCategories.length > 0 && (
        <div className="text-center mb-6">
          <span className="tag tag-gold">
            {wizard.selectedCategories.length} categor
            {wizard.selectedCategories.length === 1 ? 'y' : 'ies'} selected
          </span>
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={() => setStep(2)} className="btn btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setStep(4)}
          disabled={wizard.selectedCategories.length === 0}
          className="btn btn-primary"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
