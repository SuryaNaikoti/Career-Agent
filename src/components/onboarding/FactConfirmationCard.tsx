import React, { useState } from 'react';
import { ExtractedFact } from '../../types/onboarding.types.js';
import { Check, Edit3, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button.js';

interface FactConfirmationCardProps {
  facts: ExtractedFact[];
  onConfirm: (factIds: string[]) => void;
  onCorrect: (factId: string, newValue: string) => void;
  isLoading?: boolean;
}

export const FactConfirmationCard: React.FC<FactConfirmationCardProps> = ({
  facts,
  onConfirm,
  onCorrect,
  isLoading = false,
}) => {
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (facts.length === 0) {
    return null;
  }

  const handleStartEdit = (fact: ExtractedFact) => {
    setEditingFactId(fact.id);
    setEditValue(fact.displayValue);
  };

  const handleSaveEdit = (factId: string) => {
    if (editValue.trim()) {
      onCorrect(factId, editValue.trim());
    }
    setEditingFactId(null);
  };

  return (
    <div className="my-3 p-4 rounded-2xl bg-white border border-blue-100 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Verify Captured Facts ({facts.length})
        </h4>
      </div>

      <p className="text-xs text-slate-500">
        Please verify the information extracted from your answer before we add it to your profile:
      </p>

      <div className="space-y-2">
        {facts.map((fact) => (
          <div
            key={fact.id}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
          >
            {editingFactId === fact.id ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-blue-400 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <Button size="sm" variant="primary" onClick={() => handleSaveEdit(fact.id)}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingFactId(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">{fact.displayLabel}</span>
                  <span className="font-semibold text-slate-800">{fact.displayValue}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartEdit(fact)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
                  aria-label={`Edit ${fact.displayLabel}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2 flex gap-2">
        <Button
          fullWidth
          size="sm"
          variant="primary"
          isLoading={isLoading}
          leftIcon={<Check className="w-3.5 h-3.5" />}
          onClick={() => onConfirm(facts.map((f) => f.id))}
        >
          Confirm & Add to Profile
        </Button>
      </div>
    </div>
  );
};
