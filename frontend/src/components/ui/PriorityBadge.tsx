import clsx from 'clsx';
import { Flame } from 'lucide-react';
import type { Priority } from '../../types';

interface PriorityBadgeProps {
  priority: Priority;
}

const priorityStyles: Record<Priority, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Normal' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
  urgent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgent' },
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const style = priorityStyles[priority];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        style.bg,
        style.text
      )}
    >
      {priority === 'urgent' && <Flame className="h-3 w-3" />}
      {style.label}
    </span>
  );
}
