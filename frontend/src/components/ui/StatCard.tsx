import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { useCountUp } from '../../hooks';
import { StatCardSkeleton } from './LoadingSkeleton';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: number;
  color?: string;
  isLoading?: boolean;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  isLoading = false,
}: StatCardProps) {
  const animatedValue = useCountUp(value, 800);

  if (isLoading) {
    return <StatCardSkeleton />;
  }

  const colorMap: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    green: { bg: 'bg-green-100', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', icon: 'text-orange-600' },
    red: { bg: 'bg-red-100', icon: 'text-red-600' },
    indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600' },
    teal: { bg: 'bg-teal-100', icon: 'text-teal-600' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
  };

  const c = colorMap[color] ?? colorMap.blue;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {animatedValue.toLocaleString()}
          </p>
        </div>
        <div
          className={clsx(
            'flex h-12 w-12 items-center justify-center rounded-full',
            c.bg
          )}
        >
          <Icon className={clsx('h-6 w-6', c.icon)} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          {trend >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span
            className={clsx(
              'text-sm font-medium',
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {trend > 0 ? '+' : ''}
            {trend}%
          </span>
        </div>
      )}
    </div>
  );
}
