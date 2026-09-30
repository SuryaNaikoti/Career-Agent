import React from 'react';
import { cn } from '../../lib/utils/cn.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'match' | 'active' | 'blue' | 'purple' | 'neutral' | 'warning' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'sm', icon, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center font-medium tracking-tight whitespace-nowrap select-none shrink-0';

    const variants = {
      match: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold',
      active: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      blue: 'bg-blue-50 text-blue-700 border border-blue-100',
      purple: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
      warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
      neutral: 'bg-slate-100 text-slate-700',
      outline: 'border border-slate-200 text-slate-600',
    };

    const sizes = {
      sm: 'text-[11px] px-2 py-0.5 rounded-md gap-1',
      md: 'text-xs px-2.5 py-1 rounded-lg gap-1.5',
    };

    return (
      <span ref={ref} className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </span>
    );
  }
);

Badge.displayName = 'Badge';
