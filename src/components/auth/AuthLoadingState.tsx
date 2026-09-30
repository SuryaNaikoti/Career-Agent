import React from 'react';
import { Sparkles } from 'lucide-react';

export const AuthLoadingState: React.FC<{ message?: string }> = ({
  message = 'Preparing your workspace...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-md mx-auto text-center select-none bg-slate-50">
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-5 animate-pulse">
        <Sparkles className="w-8 h-8 fill-white" />
      </div>

      <h2 className="text-base font-bold text-slate-900 tracking-tight">
        Career <span className="text-blue-600">Agent</span>
      </h2>

      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
        <span>{message}</span>
      </div>
    </div>
  );
};
