import React from 'react';
import { cn } from '../../lib/utils/cn.js';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'ai' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseStyles = 'rounded-[20px] transition-all duration-200 text-slate-900';

    const variants = {
      default: 'bg-white border border-slate-200/80 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]',
      elevated:
        'bg-white border border-slate-100 shadow-[0_10px_25px_-4px_rgba(37,99,235,0.08),0_4px_10px_-2px_rgba(15,23,42,0.03)]',
      subtle: 'bg-slate-50/80 border border-slate-100',
      ai: 'bg-gradient-to-b from-blue-50/60 to-white border border-blue-100/80 shadow-[0_8px_20px_-4px_rgba(37,99,235,0.08)]',
      interactive:
        'bg-white border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.04)] hover:border-blue-300 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] cursor-pointer active:scale-[0.99]',
    };

    const paddings = {
      none: '',
      sm: 'p-3.5',
      md: 'p-4 sm:p-5',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
