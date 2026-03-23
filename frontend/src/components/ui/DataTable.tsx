import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { TableSkeleton } from './LoadingSkeleton';

export interface Column<T> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

type SortDirection = 'asc' | 'desc';

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey]
  );

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = getNestedValue(a, sortKey);
      const bVal = getNestedValue(b, sortKey);

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = String(aVal).localeCompare(String(bVal), undefined, {
        numeric: true,
      });
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDir]);

  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={clsx(
                  'px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500',
                  col.sortable && 'cursor-pointer select-none hover:text-gray-700'
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                'border-b border-gray-100 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-gray-50'
              )}
            >
              {columns.map((col) => {
                const cellValue = getNestedValue(row, col.key);
                return (
                  <td key={col.key} className="px-4 py-3 text-gray-700">
                    {col.render ? col.render(cellValue, row) : String(cellValue ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
