import React, { useState } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';
import { cn } from '../../lib/utils/cn.js';

export interface AgentInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const AgentInput: React.FC<AgentInputProps> = ({
  onSend,
  placeholder = 'Ask your Career Agent...',
  disabled = false,
}) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center w-full bg-white rounded-2xl border border-slate-200 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 p-1.5 transition-all"
    >
      <div className="pl-3 text-blue-600 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 fill-blue-600" />
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />

      <button
        type="submit"
        disabled={!value.trim() || disabled}
        aria-label="Send message"
        className={cn(
          'w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center transition-all shrink-0',
          value.trim() && !disabled
            ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700 active:scale-95'
            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
        )}
      >
        <ArrowUp className="w-4 h-4 stroke-[2.5]" />
      </button>
    </form>
  );
};
