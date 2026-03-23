import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

function getVisiblePages(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < totalPages - 2) {
    pages.push('ellipsis');
  }

  pages.push(totalPages);
  return pages;
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);

  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-2 py-3">
      {/* Total count - hidden on mobile */}
      <span className="hidden text-sm text-gray-500 sm:block">
        {from}&ndash;{to} of {total}
      </span>

      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center rounded-lg px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page numbers - simplified on mobile */}
        <div className="hidden items-center gap-1 sm:flex">
          {visiblePages.map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                &hellip;
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={clsx(
                  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
                  p === page
                    ? 'bg-blue-600 font-medium text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Mobile: show current / total */}
        <span className="px-3 text-sm text-gray-600 sm:hidden">
          {page} / {totalPages}
        </span>

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center rounded-lg px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
