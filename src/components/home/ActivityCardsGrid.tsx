import React from 'react';
import { useRouter } from '../../app/router/index.js';
import { Search, Star, FileText, MessageSquare } from 'lucide-react';
import { ActivityMetric } from '../../types/candidate.js';
import { cn } from '../../lib/utils/cn.js';

export interface ActivityCardsGridProps {
  metrics: ActivityMetric[];
}

export const ActivityCardsGrid: React.FC<ActivityCardsGridProps> = ({ metrics }) => {
  const { navigate } = useRouter();

  const getIcon = (type: ActivityMetric['icon']) => {
    switch (type) {
      case 'search':
        return <Search className="w-4 h-4 text-blue-600" />;
      case 'star':
        return <Star className="w-4 h-4 text-indigo-600 fill-indigo-100" />;
      case 'file-text':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'message-circle':
        return <MessageSquare className="w-4 h-4 text-amber-600" />;
    }
  };

  const getTintStyle = (tint: ActivityMetric['tint']) => {
    switch (tint) {
      case 'blue':
        return 'bg-blue-50/80 border-blue-100/60 hover:border-blue-200';
      case 'purple':
        return 'bg-indigo-50/80 border-indigo-100/60 hover:border-indigo-200';
      case 'green':
        return 'bg-emerald-50/80 border-emerald-100/60 hover:border-emerald-200';
      case 'amber':
        return 'bg-amber-50/80 border-amber-100/60 hover:border-amber-200';
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">Today's activity</h3>
        <button
          onClick={() => navigate('/app/applications')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 min-h-[36px] flex items-center"
        >
          View all
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {metrics.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              if (item.tint === 'purple' || item.tint === 'blue') navigate('/app/jobs');
              else if (item.tint === 'amber') navigate('/app/tasks');
              else navigate('/app/applications');
            }}
            className={cn(
              'p-2 sm:p-3 rounded-2xl border transition-all cursor-pointer select-none active:scale-95 flex flex-col justify-between min-h-[92px] sm:min-h-[96px]',
              getTintStyle(item.tint)
            )}
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-white shadow-2xs flex items-center justify-center">
              {getIcon(item.icon)}
            </div>

            <div className="mt-1.5 sm:mt-2 min-w-0">
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight tabular-numbers">
                {item.count}
              </div>
              <div className="text-[9px] sm:text-[10px] font-medium text-slate-600 truncate mt-0.5">
                {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
