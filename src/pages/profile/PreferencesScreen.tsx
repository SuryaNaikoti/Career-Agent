import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { Sliders, MapPin, IndianRupee, Briefcase, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { DEMO_CANDIDATE } from '../../../mock/demo-data/candidate.js';

export const PreferencesScreen: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 lg:pb-12">
      <TopBar showBack title="Job Preferences" />

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6 space-y-5">
        {/* Target Roles */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Target Titles</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_CANDIDATE.targetRoles.map((role) => (
              <span
                key={role}
                className="text-xs font-semibold px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100"
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* Location & Work Mode */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <MapPin className="w-3.5 h-3.5" />
            <span>Preferred Locations</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_CANDIDATE.preferredLocations.map((loc) => (
              <span
                key={loc}
                className="text-xs font-medium px-3 py-1 rounded-xl bg-slate-100 text-slate-800"
              >
                {loc}
              </span>
            ))}
          </div>

          <div className="pt-2 text-xs text-slate-500 font-medium">
            Work Modes: <strong className="text-slate-800">{DEMO_CANDIDATE.workModePreferences.join(', ')}</strong>
          </div>
        </div>

        {/* Compensation Threshold */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Minimum Target CTC</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {DEMO_CANDIDATE.expectedSalaryDisplay}
          </div>
          <p className="text-[11px] text-slate-400">
            Career Agent automatically filters out roles below this baseline.
          </p>
        </div>

        <Button
          fullWidth
          variant="primary"
          onClick={() => {
            alert('Preferences editor will be fully interactive in Module 05.');
          }}
        >
          Save Preferences
        </Button>
      </main>
    </div>
  );
};
