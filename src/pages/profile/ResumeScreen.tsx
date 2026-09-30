import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { TopBar } from '../../components/navigation/TopBar.js';
import { FileText, ShieldCheck, CheckCircle2, Upload, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { DEMO_CANDIDATE } from '../../../mock/demo-data/candidate.js';

export const ResumeScreen: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <TopBar showBack title="Resume & Truth Layer" />

      <main className="max-w-[430px] mx-auto w-full px-4 pt-4 space-y-4">
        {/* Candidate Truth Layer Banner */}
        <div className="rounded-[22px] bg-blue-50/70 border border-blue-200/80 p-5 space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Candidate Truth Layer Rule</span>
          </div>
          <p className="text-xs text-blue-900/80 leading-relaxed">
            Career Agent distinguishes verified candidate facts from AI phrasing. The AI tailors wording and matches keywords, but strictly never invents companies, dates, or skills.
          </p>
        </div>

        {/* Current Active Resume */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {DEMO_CANDIDATE.resumeFileName}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Updated {DEMO_CANDIDATE.resumeLastUpdated} · 5.5 Years Exp
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              Verified
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              fullWidth
              onClick={() => alert('Resume viewer will be wired in Module 06.')}
            >
              Preview Document
            </Button>
            <Button
              size="sm"
              variant="primary"
              fullWidth
              onClick={() => alert('Resume upload engine in Module 06.')}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
            >
              Replace
            </Button>
          </div>
        </div>

        {/* Verified Skills */}
        <div className="rounded-[22px] bg-white border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Verified Skills Profile
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_CANDIDATE.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {skill}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
