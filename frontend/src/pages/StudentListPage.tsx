import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Plus,
  Download,
  Search,
  LayoutGrid,
  List,
  Users,
  Filter,
  X,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStudentStore, useAuthStore } from '../store';
import { useDebounce, useDocumentTitle } from '../hooks';
import {
  DataTable,
  StatusBadge,
  PriorityBadge,
  ProgressBar,
  Pagination,
  EmptyState,
} from '../components/ui';
import { TableSkeleton, CardSkeleton } from '../components/ui/LoadingSkeleton';
import KanbanBoard from '../components/students/KanbanBoard';
import type { Column } from '../components/ui/DataTable';
import type { Student, StudentStatus, Priority, TopikLevel } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: StudentStatus[] = [
  'new',
  'docs_collecting',
  'docs_ready',
  'submitted_to_uni',
  'accepted',
  'visa_processing',
  'visa_ready',
  'departed',
  'rejected',
  'on_hold',
];

const PRIORITY_OPTIONS: Priority[] = ['normal', 'high', 'urgent'];

const TOPIK_OPTIONS: TopikLevel[] = [
  'none',
  'level_1',
  'level_2',
  'level_3',
  'level_4',
  'level_5',
  'level_6',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDeadlineColor(deadline: string | null): string {
  if (!deadline) return 'text-gray-400';
  const days = differenceInDays(new Date(deadline), new Date());
  if (days < 3) return 'text-red-600 font-semibold';
  if (days <= 7) return 'text-yellow-600 font-medium';
  return 'text-green-600';
}

function getDeadlineBgColor(deadline: string | null): string {
  if (!deadline) return '';
  const days = differenceInDays(new Date(deadline), new Date());
  if (days < 3) return 'bg-red-50';
  if (days <= 7) return 'bg-yellow-50';
  return '';
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StudentListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sessionToken = useAuthStore((s) => s.sessionToken);

  useDocumentTitle(t('students.title', 'Students'));

  const {
    filters,
    viewMode,
    page,
    limit,
    setFilters,
    setViewMode,
    setPage,
  } = useStudentStore();

  // Local search state (debounced)
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const debouncedSearch = useDebounce(searchInput, 400);

  // Show/hide filter bar on mobile
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sync debounced search to store
  useEffect(() => {
    setFilters({ search: debouncedSearch || undefined });
  }, [debouncedSearch, setFilters]);

  // Convex reactive query for students
  const studentsData = useQuery(
    api.students.list,
    sessionToken
      ? {
          sessionToken,
          search: filters.search,
          status: filters.status,
          priority: filters.priority,
          topikLevel: filters.topikLevel,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          page,
          limit,
        }
      : "skip"
  );

  const students = studentsData?.students ?? [];
  const totalStudents = studentsData?.total ?? 0;
  const isLoading = studentsData === undefined;

  // Convex mutation for status updates
  const updateStudentMutation = useMutation(api.students.update);

  // ---- Export handler ----
  const handleExport = useCallback(async () => {
    try {
      // Use the already-loaded students data for export
      const data = students;
      if (data.length === 0) {
        toast.error(t('students.exportEmpty', 'No data to export'));
        return;
      }
      const csv = convertToCSV(data as Student[]);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `students_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('students.exportSuccess', 'Export completed'));
    } catch {
      toast.error(t('students.exportError', 'Export failed'));
    }
  }, [students, t]);

  // ---- Kanban status change ----
  const handleKanbanStatusChange = useCallback(
    async (studentId: string, newStatus: StudentStatus) => {
      if (!sessionToken) return;
      try {
        await updateStudentMutation({
          sessionToken,
          id: studentId as any,
          status: newStatus,
        });
        toast.success(t('students.statusUpdated', 'Status updated'));
      } catch {
        toast.error(t('students.statusUpdateError', 'Failed to update status'));
      }
    },
    [sessionToken, updateStudentMutation, t]
  );

  // ---- Table columns ----
  const columns: Column<Student & Record<string, unknown>>[] = useMemo(
    () => [
      {
        key: 'lastNameRu',
        label: t('students.name', 'Name'),
        sortable: true,
        width: '200px',
        render: (_: unknown, row: Student) => (
          <div>
            <p className="font-medium text-gray-900">
              {row.lastNameRu} {row.firstNameRu}
            </p>
            {row.lastNameEn && (
              <p className="text-xs text-gray-400">
                {row.lastNameEn} {row.firstNameEn}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        label: t('students.status', 'Status'),
        sortable: true,
        render: (_: unknown, row: Student) => (
          <StatusBadge status={row.status} size="sm" />
        ),
      },
      {
        key: 'topikLevel',
        label: t('students.topik', 'TOPIK'),
        sortable: true,
        width: '100px',
        render: (val: unknown) => {
          const level = val as TopikLevel;
          return (
            <span className="text-sm text-gray-700">
              {level === 'none' ? '-' : level.replace('level_', '')}
            </span>
          );
        },
      },
      {
        key: 'assignedUniversity',
        label: t('students.university', 'University'),
        render: (_: unknown, row: Student) => (
          <span className="text-sm text-gray-600">
            {row.assignedUniversity?.nameEn ?? '-'}
          </span>
        ),
      },
      {
        key: 'documentsReady',
        label: t('students.docs', 'Docs'),
        width: '140px',
        render: (_: unknown, row: Student) => {
          const ready = row.documentsReady ?? 0;
          const total = row.documentsTotal ?? 22;
          return (
            <div className="flex items-center gap-2">
              <ProgressBar
                value={ready}
                max={total}
                size="sm"
                color={ready === total ? 'bg-green-500' : 'bg-blue-500'}
              />
              <span className="text-xs text-gray-500">
                {ready}/{total}
              </span>
            </div>
          );
        },
      },
      {
        key: 'priority',
        label: t('students.priority', 'Priority'),
        sortable: true,
        width: '110px',
        render: (_: unknown, row: Student) => (
          <PriorityBadge priority={row.priority} />
        ),
      },
      {
        key: 'intakeDeadline',
        label: t('students.deadline', 'Deadline'),
        sortable: true,
        width: '120px',
        render: (_: unknown, row: Student) => {
          if (!row.intakeDeadline) return <span className="text-gray-400">-</span>;
          return (
            <span className={clsx('text-sm', getDeadlineColor(row.intakeDeadline))}>
              {format(new Date(row.intakeDeadline), 'd MMM yyyy')}
            </span>
          );
        },
      },
    ],
    [t]
  );

  // ---- Render ----

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('students.title', 'Students')}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {t('students.subtitle', '{{count}} total', { count: totalStudents })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={clsx(
                'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'table'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">{t('students.table', 'Table')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={clsx(
                'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'kanban'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">{t('students.kanban', 'Kanban')}</span>
            </button>
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('students.export', 'Export')}</span>
          </button>

          {/* Add student */}
          <button
            type="button"
            onClick={() => navigate('/students/new')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            {t('students.add', 'Add Student')}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('students.search', 'Search students...')}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Toggle filters on mobile */}
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 lg:hidden"
          >
            <Filter className="h-4 w-4" />
            {t('students.filters', 'Filters')}
          </button>

          {/* Filter dropdowns */}
          <div
            className={clsx(
              'flex flex-col gap-2 sm:flex-row sm:items-center',
              filtersOpen ? 'flex' : 'hidden lg:flex'
            )}
          >
            {/* Status */}
            <select
              value={filters.status ?? ''}
              onChange={(e) =>
                setFilters({
                  status: (e.target.value as StudentStatus) || undefined,
                })
              }
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">{t('students.allStatuses', 'All Statuses')}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}`)}
                </option>
              ))}
            </select>

            {/* Priority */}
            <select
              value={filters.priority ?? ''}
              onChange={(e) =>
                setFilters({
                  priority: (e.target.value as Priority) || undefined,
                })
              }
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">{t('students.allPriorities', 'All Priorities')}</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>

            {/* TOPIK Level */}
            <select
              value={filters.topikLevel ?? ''}
              onChange={(e) =>
                setFilters({
                  topikLevel: (e.target.value as TopikLevel) || undefined,
                })
              }
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">{t('students.allTopik', 'All TOPIK')}</option>
              {TOPIK_OPTIONS.map((tl) => (
                <option key={tl} value={tl}>
                  {tl === 'none' ? t('students.noTopik', 'None') : tl.replace('level_', 'Level ')}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={`${filters.sortBy ?? 'createdAt'}_${filters.sortOrder ?? 'desc'}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('_');
                setFilters({ sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
              }}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="createdAt_desc">{t('students.sortNewest', 'Newest First')}</option>
              <option value="createdAt_asc">{t('students.sortOldest', 'Oldest First')}</option>
              <option value="lastNameRu_asc">{t('students.sortNameAz', 'Name A-Z')}</option>
              <option value="lastNameRu_desc">{t('students.sortNameZa', 'Name Z-A')}</option>
              <option value="intakeDeadline_asc">{t('students.sortDeadline', 'Deadline Soonest')}</option>
              <option value="priority_desc">{t('students.sortPriority', 'Priority High-Low')}</option>
            </select>

            {/* Clear filters */}
            {(filters.status || filters.priority || filters.topikLevel || filters.search) && (
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    status: undefined,
                    priority: undefined,
                    topikLevel: undefined,
                    search: undefined,
                  });
                  setSearchInput('');
                }}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5" />
                {t('students.clearFilters', 'Clear')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        viewMode === 'table' ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <TableSkeleton rows={8} />
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-72 flex-shrink-0">
                <CardSkeleton />
              </div>
            ))}
          </div>
        )
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('students.emptyTitle', 'No students found')}
          description={t(
            'students.emptyDescription',
            'Try adjusting your filters or add a new student.'
          )}
          actionLabel={t('students.add', 'Add Student')}
          onAction={() => navigate('/students/new')}
        />
      ) : viewMode === 'table' ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <DataTable
            columns={columns as Column<Record<string, unknown>>[]}
            data={students as unknown as Record<string, unknown>[]}
            onRowClick={(row) => {
              const student = row as unknown as Student;
              navigate(`/students/${student.id}`);
            }}
          />
        </div>
      ) : (
        <KanbanBoard
          students={students as Student[]}
          onStatusChange={handleKanbanStatusChange}
          onCardClick={(student) => navigate(`/students/${student.id}`)}
        />
      )}

      {/* Pagination (table mode only) */}
      {viewMode === 'table' && !isLoading && students.length > 0 && (
        <Pagination
          page={page}
          limit={limit}
          total={totalStudents}
          onPageChange={setPage}
        />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// CSV export helper
// ---------------------------------------------------------------------------

function convertToCSV(data: Student[]): string {
  if (data.length === 0) return '';

  const headers = [
    'Last Name (Ru)',
    'First Name (Ru)',
    'Last Name (En)',
    'First Name (En)',
    'Status',
    'Priority',
    'TOPIK Level',
    'Phone',
    'Email',
    'Passport',
    'University',
    'Deadline',
    'Created',
  ];

  const rows = data.map((s) => [
    s.lastNameRu,
    s.firstNameRu,
    s.lastNameEn ?? '',
    s.firstNameEn ?? '',
    s.status,
    s.priority,
    s.topikLevel,
    s.phone ?? '',
    s.email ?? '',
    s.passportNumber ?? '',
    s.assignedUniversity?.nameEn ?? '',
    s.intakeDeadline ? format(new Date(s.intakeDeadline), 'yyyy-MM-dd') : '',
    format(new Date(s.createdAt), 'yyyy-MM-dd'),
  ]);

  const escape = (v: string) =>
    v.includes(',') || v.includes('"') || v.includes('\n')
      ? `"${v.replace(/"/g, '""')}"`
      : v;

  return [
    headers.join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n');
}
