import React from 'react';
import { cn } from '../../lib/utils/cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightElement, error, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full h-12 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 transition-all duration-150',
            'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 shadow-sm',
            'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            leftIcon ? 'pl-11' : 'pl-4',
            rightElement ? 'pr-12' : 'pr-4',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/10',
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center">
            {rightElement}
          </div>
        )}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
