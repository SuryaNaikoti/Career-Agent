import React from 'react';
import { ExtractedFact } from '../../types/onboarding.types.js';
import { Button } from '../ui/Button.js';
import { CheckCircle2, ShieldCheck, Briefcase, GraduationCap, Award, MapPin, DollarSign } from 'lucide-react';

interface ProfileReviewCardProps {
  confirmedFacts: ExtractedFact[];
  onFinalConfirm: () => void;
  isLoading?: boolean;
}

export const ProfileReviewCard: React.FC<ProfileReviewCardProps> = ({
  confirmedFacts,
  onFinalConfirm,
  isLoading = false,
}) => {
  const targetRoles = confirmedFacts.filter((f) => f.category === 'target_role');
  const skills = confirmedFacts.filter((f) => f.category === 'skill');
  const experience = confirmedFacts.filter((f) => f.category === 'experience');
  const education = confirmedFacts.filter((f) => f.category === 'education');
  const preferences = confirmedFacts.filter((f) => f.category === 'preference');

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5 text-blue-600">
        <ShieldCheck className="w-5 h-5 shrink-0" />
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
          Career Profile Truth Layer Summary
        </h3>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        The following facts are verified and confirmed by you. Your Career Agent will only use these confirmed qualifications for job matching and tailored applications.
      </p>

      {/* Target Roles */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          <span>Target Roles</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {targetRoles.length > 0 ? (
            targetRoles.map((r) => (
              <span key={r.id} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium text-xs border border-blue-100">
                {r.displayValue}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">None specified</span>
          )}
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Award className="w-3.5 h-3.5 text-slate-400" />
          <span>Confirmed Skills ({skills.length})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {skills.length > 0 ? (
            skills.map((s) => (
              <span key={s.id} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium text-xs border border-slate-200/60">
                {s.displayValue}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">None specified</span>
          )}
        </div>
      </div>

      {/* Experience & Education */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Experience
          </span>
          {experience.length > 0 ? (
            experience.map((e) => (
              <p key={e.id} className="text-xs font-medium text-slate-800 truncate">
                {e.displayValue}
              </p>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">Not provided</p>
          )}
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> Education
          </span>
          {education.length > 0 ? (
            education.map((ed) => (
              <p key={ed.id} className="text-xs font-medium text-slate-800 truncate">
                {ed.displayValue}
              </p>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">Not provided</p>
          )}
        </div>
      </div>

      {/* Preferences */}
      {preferences.length > 0 && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-3 text-xs text-slate-600">
          {preferences.map((p) => (
            <div key={p.id} className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/50">
              <span className="text-slate-400">{p.displayLabel}:</span>
              <span className="font-semibold text-slate-800">{p.displayValue}</span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-3">
        <Button
          fullWidth
          size="lg"
          variant="primary"
          isLoading={isLoading}
          leftIcon={<CheckCircle2 className="w-4 h-4" />}
          onClick={onFinalConfirm}
        >
          Confirm & Complete Setup
        </Button>
      </div>
    </div>
  );
};
