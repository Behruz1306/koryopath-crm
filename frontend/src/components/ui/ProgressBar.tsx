import { motion } from 'framer-motion';
import clsx from 'clsx';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function ProgressBar({
  value,
  max,
  color = 'bg-blue-500',
  showLabel = false,
  size = 'md',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;

  return (
    <div className="w-full">
      <div
        className={clsx(
          'w-full overflow-hidden rounded-full bg-gray-200',
          sizeStyles[size]
        )}
      >
        <motion.div
          className={clsx('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <span className="mt-1 block text-right text-xs text-gray-500">
          {percentage}%
        </span>
      )}
    </div>
  );
}
