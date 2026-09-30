import React from 'react';
import { cn } from '../../lib/utils/cn.js';

export interface ProgressProps {
  value: number; // 0 to 100
  max?: number;
  className?: string;
  indicatorClassName?: string;
  showLabel?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  className,
  indicatorClassName,
  showLabel = false,
}) => {
  const percentage = Math.min(Math.max(0, Math.round((value / max) * 100)), 100);

  return (
    <div className={cn('w-full', className)}>
      <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full bg-blue-600 rounded-full transition-all duration-300 ease-out',
            indicatorClassName
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center mt-1 text-[11px] text-slate-500 font-medium">
          <span>Progress</span>
          <span className="tabular-numbers">{percentage}%</span>
        </div>
      )}
    </div>
  );
};

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-slate-200/80', className)}
      {...props}
    />
  );
};
