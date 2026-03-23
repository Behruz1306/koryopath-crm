import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListTodo,
  Search,
  Filter,
  X,
  Calendar,
  User,
} from 'lucide-react';
import { format, differenceInDays, isToday, isTomorrow, isPast } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

import { useAuthStore } from '../store';
import { useDocumentTitle, useDebounce } from '../hooks';
import { Modal, EmptyState } from '../components/ui';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  Student,
} from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: TaskStatus[] = ['pending', 'in_progress', 'completed', 'overdue'];
const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
const TYPE_OPTIONS: TaskType[] = ['document', 'payment', 'submission', 'follow_up', 'interview', 'other'];

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-700' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  critical: { bg: 'bg-red-100', text: 'text-red-700' },
};

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  overdue: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
};

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariant = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDueDateLabel(dueDate: string): { label: string; color: string } {
  const date = new Date(dueDate);
  if (isPast(date) && !isToday(date)) {
    const overdueDays = Math.abs(differenceInDays(date, new Date()));
    return { label: `${overdueDays}d overdue`, color: 'text-red-600 font-semibold' };
  }
  if (isToday(date)) return { label: 'Today', color: 'text-orange-600 font-medium' };
  if (isTomorrow(date)) return { label: 'Tomorrow', color: 'text-yellow-600' };
  const days = differenceInDays(date, new Date());
  if (days <= 3) return { label: `${days}d left`, color: 'text-yellow-600' };
  return { label: format(date, 'd MMM'), color: 'text-gray-600' };
}

function groupByDate(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {};
  for (const task of tasks) {
    const key = format(new Date(task.dueDate), 'yyyy-MM-dd');
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TaskListPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const isBoss = user?.role === 'boss';

  useDocumentTitle(t('tasks.title', 'Tasks'));

  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [typeFilter, setTypeFilter] = useState<TaskType | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [activeTab, setActiveTab] = useState<'all' | 'overdue'>('all');
  const [groupBy, setGroupBy] = useState<'date' | 'student'>('date');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Add task modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as TaskPriority,
    type: 'other' as TaskType,
    studentId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convex queries
  const tasks = useQuery(
    api.tasks.list,
    sessionToken
      ? {
          sessionToken,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          type: typeFilter || undefined,
        }
      : 'skip',
  ) as Task[] | undefined;

  const overdueTasks = useQuery(
    api.tasks.getOverdue,
    sessionToken ? { sessionToken } : 'skip',
  ) as Task[] | undefined;

  // Students for modal
  const studentsData = useQuery(
    api.students.list,
    sessionToken && showAddModal ? { sessionToken, limit: 200 } : 'skip',
  );
  const students: Student[] = (studentsData as any)?.students ?? [];

  const isLoading = tasks === undefined;

  // Convex mutations
  const createTaskMutation = useMutation(api.tasks.create);
  const updateTaskMutation = useMutation(api.tasks.update);

  // Submit task
  const handleCreateTask = async () => {
    if (!formData.title || !formData.dueDate) {
      toast.error(t('tasks.fillRequired', 'Fill in required fields'));
      return;
    }
    setIsSubmitting(true);
    try {
      await createTaskMutation({
        sessionToken: sessionToken!,
        title: formData.title,
        description: formData.description || null,
        dueDate: formData.dueDate,
        priority: formData.priority,
        type: formData.type,
        studentId: (formData.studentId || null) as Id<"students"> | null,
      });
      toast.success(t('tasks.created', 'Task created'));
      setShowAddModal(false);
      setFormData({ title: '', description: '', dueDate: '', priority: 'medium', type: 'other', studentId: '' });
    } catch {
      toast.error(t('tasks.createError', 'Failed to create task'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete task
  const handleComplete = async (taskId: string) => {
    try {
      await updateTaskMutation({
        sessionToken: sessionToken!,
        id: taskId as Id<"tasks">,
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      toast.success(t('tasks.completed', 'Task completed'));
    } catch {
      toast.error(t('tasks.completeError', 'Failed to complete task'));
    }
  };

  const handleOpenAddModal = () => {
    setShowAddModal(true);
  };

  // Filter tasks by search
  const allTasks = tasks ?? [];
  const allOverdue = overdueTasks ?? [];
  const filteredTasks = (activeTab === 'overdue' ? allOverdue : allTasks).filter((task) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      task.title.toLowerCase().includes(q) ||
      task.student?.firstNameRu?.toLowerCase().includes(q) ||
      task.student?.lastNameRu?.toLowerCase().includes(q)
    );
  });

  // Group tasks
  const grouped = groupBy === 'date' ? groupByDate(filteredTasks) : {};
  const groupedByStudent: Record<string, Task[]> = {};
  if (groupBy === 'student') {
    for (const task of filteredTasks) {
      const key = task.student
        ? `${task.student.lastNameRu} ${task.student.firstNameRu}`
        : t('tasks.noStudent', 'Unassigned');
      if (!groupedByStudent[key]) groupedByStudent[key] = [];
      groupedByStudent[key].push(task);
    }
  }

  const groups = groupBy === 'date' ? grouped : groupedByStudent;
  const sortedGroupKeys = Object.keys(groups).sort();

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('tasks.title', 'Tasks')}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t('tasks.subtitle', '{{count}} total', { count: allTasks.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {t('tasks.add', 'Add Task')}
        </button>
      </div>

      {/* Tabs: All / Overdue */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={clsx(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'all'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          )}
        >
          {t('tasks.all', 'All Tasks')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={clsx(
            'relative rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'overdue'
              ? 'bg-red-600 text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          )}
        >
          <AlertTriangle className="mr-1 inline h-4 w-4" />
          {t('tasks.overdue', 'Overdue')}
          {allOverdue.length > 0 && (
            <span
              className={clsx(
                'ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold',
                activeTab === 'overdue'
                  ? 'bg-white text-red-600'
                  : 'bg-red-100 text-red-700'
              )}
            >
              {allOverdue.length}
            </span>
          )}
        </button>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('tasks.search', 'Search tasks...')}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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

          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 lg:hidden dark:border-gray-600 dark:text-gray-300"
          >
            <Filter className="h-4 w-4" />
            {t('tasks.filters', 'Filters')}
          </button>

          <div
            className={clsx(
              'flex flex-col gap-2 sm:flex-row sm:items-center',
              filtersOpen ? 'flex' : 'hidden lg:flex'
            )}
          >
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="">{t('tasks.allStatuses', 'All Statuses')}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | '')}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="">{t('tasks.allPriorities', 'All Priorities')}</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TaskType | '')}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="">{t('tasks.allTypes', 'All Types')}</option>
              {TYPE_OPTIONS.map((tp) => (
                <option key={tp} value={tp}>{tp.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
              ))}
            </select>

            {/* Group by */}
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'date' | 'student')}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="date">{t('tasks.groupByDate', 'Group by Date')}</option>
              <option value="student">{t('tasks.groupByStudent', 'Group by Student')}</option>
            </select>

            {(statusFilter || priorityFilter || typeFilter || searchInput) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('');
                  setPriorityFilter('');
                  setTypeFilter('');
                  setSearchInput('');
                }}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <X className="h-3.5 w-3.5" />
                {t('tasks.clearFilters', 'Clear')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={t('tasks.emptyTitle', 'No tasks found')}
          description={t('tasks.emptyDescription', 'Try adjusting your filters or create a new task.')}
          actionLabel={t('tasks.add', 'Add Task')}
          onAction={handleOpenAddModal}
        />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
          {sortedGroupKeys.map((key) => (
            <motion.div key={key} variants={itemVariant}>
              {/* Group header */}
              <div className="mb-2 flex items-center gap-2">
                {groupBy === 'date' ? (
                  <Calendar className="h-4 w-4 text-gray-400" />
                ) : (
                  <User className="h-4 w-4 text-gray-400" />
                )}
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {groupBy === 'date'
                    ? isToday(new Date(key))
                      ? t('tasks.today', 'Today')
                      : isTomorrow(new Date(key))
                        ? t('tasks.tomorrow', 'Tomorrow')
                        : format(new Date(key), 'd MMMM yyyy')
                    : key}
                </h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {groups[key].length}
                </span>
              </div>

              {/* Task cards */}
              <div className="space-y-2">
                {groups[key].map((task) => {
                  const dueInfo = getDueDateLabel(task.dueDate);
                  const statusStyle = STATUS_COLORS[task.status];
                  const priorityStyle = PRIORITY_COLORS[task.priority];

                  return (
                    <div
                      key={task.id}
                      className={clsx(
                        'flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-gray-800',
                        task.status === 'overdue'
                          ? 'border-red-200 dark:border-red-800'
                          : 'border-gray-200 dark:border-gray-700'
                      )}
                    >
                      {/* Complete checkbox */}
                      {task.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleComplete(task.id)}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 text-gray-400 transition-colors hover:border-green-500 hover:text-green-500 dark:border-gray-600"
                        >
                          <CheckCircle2 className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      )}

                      {/* Task info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={clsx(
                              'truncate text-sm font-medium',
                              task.status === 'completed'
                                ? 'text-gray-400 line-through dark:text-gray-500'
                                : 'text-gray-900 dark:text-white'
                            )}
                          >
                            {task.title}
                          </p>
                        </div>
                        {task.student && (
                          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                            {task.student.lastNameRu} {task.student.firstNameRu}
                          </p>
                        )}
                        {isBoss && task.agent && (
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                            {t('tasks.assignedTo', 'Assigned to')}: {task.agent.nameRu}
                          </p>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex shrink-0 items-center gap-2">
                        {/* Priority */}
                        <span
                          className={clsx(
                            'hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline-flex',
                            priorityStyle.bg,
                            priorityStyle.text
                          )}
                        >
                          {task.priority}
                        </span>

                        {/* Status */}
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                            statusStyle.bg,
                            statusStyle.text
                          )}
                        >
                          <span className={clsx('h-1.5 w-1.5 rounded-full', statusStyle.dot)} />
                          {task.status.replace('_', ' ')}
                        </span>

                        {/* Due date */}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <span className={clsx('text-xs', dueInfo.color)}>
                            {dueInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add Task Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('tasks.addTask', 'Add Task')}
        size="lg"
      >
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('tasks.taskTitle', 'Title')} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('tasks.titlePlaceholder', 'Enter task title...')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('tasks.description', 'Description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Due date + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('tasks.dueDate', 'Due Date')} *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('tasks.priority', 'Priority')}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type + Student */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('tasks.type', 'Type')}
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TaskType })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {TYPE_OPTIONS.map((tp) => (
                  <option key={tp} value={tp}>
                    {tp.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('tasks.student', 'Student')}
              </label>
              <select
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('tasks.selectStudent', 'None')}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.lastNameRu} {s.firstNameRu}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleCreateTask}
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? t('common.saving', 'Saving...') : t('tasks.createTask', 'Create Task')}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
