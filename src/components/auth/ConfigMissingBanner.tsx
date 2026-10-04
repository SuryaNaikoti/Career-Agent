import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

export const ConfigMissingBanner: React.FC = () => {
  return (
    <div className="p-4 md:p-5 rounded-2xl bg-amber-50/95 border border-amber-200 text-left space-y-2.5">
      <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Supabase connection required</span>
      </div>
      <p className="text-xs text-amber-800 leading-relaxed">
        Authentication requires project environment variables to connect to Supabase PostgreSQL. Configure your credentials in your deployment environment or <code className="bg-amber-100/90 px-1.5 py-0.5 rounded font-mono text-[11px] text-amber-950">.env</code>:
      </p>
      <div className="bg-amber-100/70 p-3 rounded-xl font-mono text-xs text-amber-950 space-y-1 overflow-x-auto">
        <div>VITE_SUPABASE_URL="https://your-project.supabase.co"</div>
        <div>VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"</div>
      </div>
      <p className="text-[11px] text-amber-700">
        Refer to <span className="font-semibold text-amber-950">docs/AUTHENTICATION_SPEC.md</span> for setup instructions. In offline development, backend services fail closed with <code className="font-mono text-[10px] bg-amber-100 px-1 rounded">DATABASE_NOT_CONFIGURED</code> (HTTP 503).
      </p>
    </div>
  );
};
