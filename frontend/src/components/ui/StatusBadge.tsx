import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { StudentStatus } from '../../types';

interface StatusBadgeProps {
  status: StudentStatus;
  size?: 'sm' | 'md';
}

const statusStyles: Record<StudentStatus, { bg: string; text: string; dot: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  docs_collecting: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  docs_ready: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  submitted_to_uni: { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  accepted: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  visa_processing: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  visa_ready: { bg: 'bg-teal-100', text: 'text-teal-800', dot: 'bg-teal-500' },
  departed: { bg: 'bg-green-200', text: 'text-green-900', dot: 'bg-green-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  on_hold: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { t } = useTranslation();
  const style = statusStyles[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        style.bg,
        style.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      )}
    >
      <span
        className={clsx(
          'rounded-full',
          style.dot,
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
        )}
      />
      {t(`statuses.${status}`)}
    </span>
  );
}
