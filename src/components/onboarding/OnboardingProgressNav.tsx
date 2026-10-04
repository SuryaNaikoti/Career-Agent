import React from 'react';
import { OnboardingStage, ORDERED_ONBOARDING_STAGES } from '../../types/onboarding.types.js';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils/cn.js';

interface OnboardingProgressNavProps {
  currentStage: OnboardingStage;
  completedStages: OnboardingStage[];
  onSelectStage?: (stage: OnboardingStage) => void;
  variant?: 'mobile' | 'desktop';
}

const STAGE_LABELS: Record<OnboardingStage, string> = {
  NOT_STARTED: 'Not Started',
  INTRO: 'Introduction',
  BASIC_INFORMATION: 'Basic Information',
  CAREER_TARGET: 'Target Roles',
  EXPERIENCE: 'Work History',
  SKILLS: 'Key Skills',
  EDUCATION: 'Education',
  WORK_PREFERENCES: 'Work Style',
  COMPENSATION: 'Compensation',
  CAREER_GOALS: 'Career Goals',
  PROFILE_REVIEW: 'Review Profile',
  CONFIRMATION: 'Confirmation',
  COMPLETED: 'Completed',
};

export const OnboardingProgressNav: React.FC<OnboardingProgressNavProps> = ({
  currentStage,
  completedStages,
  variant = 'mobile',
}) => {
  const currentIndex = Math.max(0, ORDERED_ONBOARDING_STAGES.indexOf(currentStage));
  const totalStages = ORDERED_ONBOARDING_STAGES.length - 1; // excluding completed
  const progressPercent = Math.min(100, Math.round(((currentIndex + 1) / totalStages) * 100));

  if (variant === 'desktop') {
    return (
      <div className="w-64 bg-white border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0">
        <div>
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Onboarding Progress</span>
            <h3 className="text-sm font-semibold text-slate-800 mt-1">Verified Career Intake</h3>
            <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">{progressPercent}% Completed</span>
          </div>

          <nav className="space-y-1">
            {ORDERED_ONBOARDING_STAGES.filter((s) => s !== 'COMPLETED').map((stage, idx) => {
              const isCompleted = completedStages.includes(stage);
              const isCurrent = stage === currentStage;

              return (
                <div
                  key={stage}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                    isCurrent
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : isCompleted
                      ? 'text-slate-700 hover:bg-slate-50'
                      : 'text-slate-400'
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0',
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-100'
                        : 'border border-slate-300 text-slate-400'
                    )}
                  >
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                  </span>
                  <span className="truncate">{STAGE_LABELS[stage]}</span>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
          Strictly grounded in your answers. Nothing added without your confirmation.
        </div>
      </div>
    );
  }

  // Mobile compact progress indicator
  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span className="text-blue-600">{STAGE_LABELS[currentStage] || 'Profile Setup'}</span>
        <span className="tabular-numbers text-slate-400">
          {currentIndex + 1} of {totalStages}
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
