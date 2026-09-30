import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

export const ConfigMissingBanner: React.FC = () => {
  return (
    <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-left space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Supabase Configuration Required</span>
      </div>
      <p className="text-[11px] text-amber-800 leading-relaxed">
        To activate real authentication, add your project credentials to your environment variables or <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[10px]">.env</code>:
      </p>
      <div className="bg-amber-100/60 p-2 rounded-xl font-mono text-[10px] text-amber-950 space-y-1">
        <div>VITE_SUPABASE_URL="https://your-project.supabase.co"</div>
        <div>VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"</div>
      </div>
      <p className="text-[10px] text-amber-700">
        Refer to <span className="font-semibold text-amber-900">docs/AUTHENTICATION_SPEC.md</span> for the setup guide.
      </p>
    </div>
  );
};
