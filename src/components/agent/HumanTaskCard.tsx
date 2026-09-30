import React, { useState } from 'react';
import { ShieldAlert, Check } from 'lucide-react';
import { HumanTask } from '../../types/agent.js';
import { Button } from '../ui/Button.js';
import { cn } from '../../lib/utils/cn.js';

export interface HumanTaskCardProps {
  task: HumanTask;
  onComplete?: (selectedOption: string) => void;
}

export const HumanTaskCard: React.FC<HumanTaskCardProps> = ({ task, onComplete }) => {
  const [selected, setSelected] = useState<string>(task.selectedOption || task.options[0]);
  const [isSaved, setIsSaved] = useState<boolean>(task.isCompleted);

  const handleSave = () => {
    setIsSaved(true);
    onComplete?.(selected);
  };

  return (
    <div className="rounded-[22px] bg-white border border-amber-200/80 p-5 shadow-[0_6px_20px_rgba(245,158,11,0.06)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900 tracking-tight">{task.title}</h4>
          <p className="text-[11px] text-slate-500">{task.companyName} requires verification</p>
        </div>
      </div>

      {/* Question prompt */}
      <p className="text-sm font-semibold text-slate-800 leading-snug mb-3">
        "{task.question}"
      </p>

      {/* Options radio group */}
      <div className="space-y-2 mb-4">
        {task.options.map((option) => {
          const isSelected = selected === option;
          return (
            <label
              key={option}
              onClick={() => {
                if (!isSaved) setSelected(option);
              }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all',
                isSelected
                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                isSaved && 'pointer-events-none opacity-80'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full border flex items-center justify-center transition-all',
                  isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                )}
              >
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span>{option}</span>
            </label>
          );
        })}
      </div>

      {/* Button */}
      {isSaved ? (
        <div className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200/60">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Answer Verified & Saved</span>
        </div>
      ) : (
        <Button fullWidth size="md" variant="primary" onClick={handleSave}>
          Save Answer
        </Button>
      )}
    </div>
  );
};
