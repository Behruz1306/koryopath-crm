import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  GraduationCap,
  CheckCircle,
  Plane,
  AlertTriangle,
  Clock,
  Plus,
  BarChart3,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useAction } from 'convex/react';
import { api } from '@convex/_generated/api';

import { useAuthStore } from '../store';
import { StatCard, ProgressBar, StatusBadge } from '../components/ui';
import { useDocumentTitle } from '../hooks';
import type { ExchangeRates } from '../types';

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const token = useAuthStore((s) => s.sessionToken);

  useDocumentTitle('Dashboard');

  const isBoss = user?.role === 'boss';

  // ---------- Convex queries ----------

  const stats = useQuery(
    api.students.getStats,
    token ? { sessionToken: token } : 'skip',
  );

  const overdueTasks = useQuery(
    api.tasks.getOverdue,
    token ? { sessionToken: token } : 'skip',
  );

  const seasonGoal = useQuery(
    api.gamification.getSeasonGoal,
    token ? { sessionToken: token } : 'skip',
  );

  const recentStudentsData = useQuery(
    api.students.list,
    token ? { sessionToken: token, limit: 5, page: 1 } : 'skip',
  );

  const myTasks = useQuery(
    api.tasks.list,
    token ? { sessionToken: token } : 'skip',
  );

  const dailyAnalytics = useQuery(
    api.analytics.daily,
    token && isBoss ? { sessionToken: token } : 'skip',
  );

  const penaltiesData = useQuery(
    api.penalties.list,
    token && user?.role === 'branch_agent' ? { sessionToken: token } : 'skip',
  );

  // Exchange rates via action
  const getRates = useAction(api.exchange.getRates);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);

  useEffect(() => {
    if (!token || !isBoss) return;
    let cancelled = false;
    getRates({ sessionToken: token })
      .then((d) => {
        if (!cancelled) setExchangeRates(d as ExchangeRates);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, isBoss, getRates]);

  // ---------- Derived data ----------

  const recentStudents = recentStudentsData?.students ?? [];

  const upcomingTasks = (myTasks ?? [])
    .filter((t) => t.dueDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const myPenalties = (penaltiesData ?? []).filter((p) => p.agentId === user?.id);

  // Loading states — useQuery returns undefined while loading
  const loading =
    stats === undefined ||
    overdueTasks === undefined ||
    seasonGoal === undefined ||
    myTasks === undefined;

  // Derive counts from stats
  const totalStudents =
    stats?.byStatus.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const activeApplications =
    stats?.byStatus
      .filter((s) =>
        ['docs_collecting', 'docs_ready', 'submitted_to_uni', 'visa_processing'].includes(s.status),
      )
      .reduce((sum, s) => sum + s.count, 0) ?? 0;
  const acceptedCount =
    stats?.byStatus.find((s) => s.status === 'accepted')?.count ?? 0;
  const departedCount =
    stats?.byStatus.find((s) => s.status === 'departed')?.count ?? 0;

  // Agent KPI helpers
  const myStudents = totalStudents;
  const completedTasksCount =
    upcomingTasks.length; // placeholder; real count from stats
  const pendingDocs =
    stats?.byStatus.find((s) => s.status === 'docs_collecting')?.count ?? 0;
  const warningCount = myPenalties.filter(
    (p) => p.type === 'warning_1' || p.type === 'warning_2',
  ).length;
  const activePenalties = myPenalties.filter((p) => !p.acknowledgedAt);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page title */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('dashboard.title', 'Dashboard')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('dashboard.welcome', 'Welcome back, {{name}}', {
              name: user?.nameRu ?? '',
            })}
          </p>
        </div>
        <p className="hidden text-sm text-gray-400 sm:block">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </motion.div>

      {/* ---------- BOSS DASHBOARD ---------- */}
      {isBoss && (
        <AnimatePresence mode="wait">
          <motion.div key="boss" variants={stagger} initial="hidden" animate="show" className="space-y-6">
            {/* Stat cards */}
            <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title={t('dashboard.totalStudents', 'Total Students')}
                value={totalStudents}
                icon={Users}
                trend={5}
                color="blue"
                isLoading={loading}
              />
              <StatCard
                title={t('dashboard.activeApplications', 'Active Applications')}
                value={activeApplications}
                icon={GraduationCap}
                trend={12}
                color="purple"
                isLoading={loading}
              />
              <StatCard
                title={t('dashboard.accepted', 'Accepted')}
                value={acceptedCount}
                icon={CheckCircle}
                trend={8}
                color="green"
                isLoading={loading}
              />
              <StatCard
                title={t('dashboard.departed', 'Departed')}
                value={departedCount}
                icon={Plane}
                trend={3}
                color="teal"
                isLoading={loading}
              />
            </motion.div>

            {/* Season progress + Exchange rates row */}
            <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-2">
              {/* Season goal */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {t('dashboard.seasonGoal', 'Season Goal')}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {seasonGoal
                      ? `${seasonGoal.semester} ${seasonGoal.year}`
                      : '---'}
                  </span>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
                  </div>
                ) : seasonGoal ? (
                  <>
                    <div className="mb-2 flex items-end justify-between">
                      <span className="text-2xl font-bold text-gray-900">
                        {seasonGoal.currentCount}
                      </span>
                      <span className="text-sm text-gray-500">
                        / {seasonGoal.targetCount} {t('dashboard.students', 'students')}
                      </span>
                    </div>
                    <ProgressBar
                      value={seasonGoal.currentCount}
                      max={seasonGoal.targetCount}
                      color="bg-indigo-500"
                      showLabel
                      size="lg"
                    />
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    {t('dashboard.noGoal', 'No season goal set')}
                  </p>
                )}
              </div>

              {/* Exchange rates */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    {t('dashboard.exchangeRates', 'Exchange Rates')}
                  </h3>
                </div>
                {exchangeRates === null ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                    ))}
                  </div>
                ) : exchangeRates ? (
                  <div className="space-y-3">
                    <RateRow label="USD" value={exchangeRates.USD} symbol="$" />
                    <RateRow label="KRW" value={exchangeRates.KRW} symbol="₩" />
                    <RateRow label="UZS" value={exchangeRates.UZS} symbol="сум" />
                    <p className="mt-2 text-xs text-gray-400">
                      {t('dashboard.updatedAt', 'Updated')}{' '}
                      {format(new Date(exchangeRates.updatedAt), 'HH:mm, d MMM')}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    {t('dashboard.noRates', 'Rates unavailable')}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Overdue tasks alert */}
            {!loading && overdueTasks && overdueTasks.length > 0 && (
              <motion.div
                variants={fadeUp}
                className="rounded-xl border border-red-200 bg-red-50 p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-700">
                    {t('dashboard.overdueTasks', 'Overdue Tasks')} ({overdueTasks.length})
                  </h3>
                </div>
                <ul className="space-y-2">
                  {overdueTasks.slice(0, 5).map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between rounded-lg bg-white/70 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('dashboard.due', 'Due')}: {format(new Date(task.dueDate), 'd MMM yyyy')}
                        </p>
                      </div>
                      <span className="ml-3 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {task.priority}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Recent students + Upcoming deadlines + Activity feed */}
            <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-3">
              {/* Recent students */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {t('dashboard.recentStudents', 'Recent Students')}
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigate('/students')}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {t('dashboard.viewAll', 'View All')} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                {recentStudentsData === undefined ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
                          <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentStudents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                          <th className="pb-2">{t('dashboard.name', 'Name')}</th>
                          <th className="pb-2">{t('dashboard.status', 'Status')}</th>
                          <th className="pb-2 text-right">{t('dashboard.date', 'Date')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {recentStudents.map((s) => (
                          <tr
                            key={s.id}
                            className="cursor-pointer transition hover:bg-gray-50"
                            onClick={() => navigate(`/students/${s.id}`)}
                          >
                            <td className="py-2.5 font-medium text-gray-800">
                              {s.lastNameRu} {s.firstNameRu}
                            </td>
                            <td className="py-2.5">
                              <StatusBadge status={s.status} size="sm" />
                            </td>
                            <td className="py-2.5 text-right text-xs text-gray-400">
                              {format(new Date(s.createdAt), 'd MMM')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    {t('dashboard.noStudents', 'No students yet')}
                  </p>
                )}
              </div>

              {/* Upcoming deadlines */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    {t('dashboard.upcomingDeadlines', 'Upcoming Deadlines')}
                  </h3>
                </div>
                {myTasks === undefined ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 animate-pulse rounded bg-gray-200" />
                    ))}
                  </div>
                ) : upcomingTasks.length > 0 ? (
                  <ul className="space-y-3">
                    {upcomingTasks.map((task) => (
                      <li
                        key={task.id}
                        className="rounded-lg border border-gray-100 px-3 py-2"
                      >
                        <p className="truncate text-sm font-medium text-gray-800">
                          {task.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.dueDate), 'd MMM yyyy')}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">
                    {t('dashboard.noDeadlines', 'No upcoming deadlines')}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Activity feed + Branch comparison */}
            <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-2">
              {/* Activity feed */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    {t('dashboard.activityFeed', 'Activity Feed')}
                  </h3>
                </div>
                {dailyAnalytics === undefined ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-6 w-6 animate-pulse rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                          <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : dailyAnalytics ? (
                  <ul className="space-y-3">
                    <ActivityItem
                      icon={<Users className="h-4 w-4 text-blue-500" />}
                      text={t('dashboard.actNewStudents', '{{count}} new students today', {
                        count: dailyAnalytics.newStudents,
                      })}
                    />
                    <ActivityItem
                      icon={<CheckCircle className="h-4 w-4 text-green-500" />}
                      text={t('dashboard.actDocsUploaded', '{{count}} documents uploaded', {
                        count: dailyAnalytics.documentsUploaded,
                      })}
                    />
                    {dailyAnalytics.agentActivity.slice(0, 3).map((a) => (
                      <ActivityItem
                        key={a.userId}
                        icon={<TrendingUp className="h-4 w-4 text-indigo-500" />}
                        text={`${a.nameRu}: ${a.actionsToday} ${t('dashboard.actions', 'actions')}`}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">
                    {t('dashboard.noActivity', 'No activity data')}
                  </p>
                )}
              </div>

              {/* Branch comparison placeholder */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    {t('dashboard.branchComparison', 'Branch Comparison')}
                  </h3>
                </div>
                <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
                  <div className="text-center">
                    <BarChart3 className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-400">
                      {t('dashboard.chartPlaceholder', 'Recharts BarChart')}
                    </p>
                    <p className="text-xs text-gray-300">
                      {t('dashboard.comingSoon', 'Coming soon')}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick actions */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <QuickAction
                icon={<Plus className="h-4 w-4" />}
                label={t('dashboard.addStudent', 'Add Student')}
                onClick={() => navigate('/students/new')}
              />
              <QuickAction
                icon={<Clock className="h-4 w-4" />}
                label={t('dashboard.viewTasks', 'View Tasks')}
                onClick={() => navigate('/tasks')}
                variant="secondary"
              />
              <QuickAction
                icon={<BarChart3 className="h-4 w-4" />}
                label={t('dashboard.viewAnalytics', 'View Analytics')}
                onClick={() => navigate('/analytics')}
                variant="secondary"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ---------- AGENT DASHBOARD ---------- */}
      {!isBoss && (
        <AnimatePresence mode="wait">
          <motion.div key="agent" variants={stagger} initial="hidden" animate="show" className="space-y-6">
            {/* Penalty warning banner */}
            {!loading && activePenalties.length > 0 && (
              <motion.div
                variants={fadeUp}
                className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">
                      {t('dashboard.penaltyWarning', 'Active Penalties')} ({activePenalties.length})
                    </h3>
                    <p className="mt-0.5 text-xs text-red-600">
                      {activePenalties.map((p) => p.reason).join('; ')}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Agent KPI cards */}
            <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title={t('dashboard.myStudents', 'My Students')}
                value={myStudents}
                icon={Users}
                color="blue"
                isLoading={loading}
              />
              <StatCard
                title={t('dashboard.completedTasks', 'Completed Tasks')}
                value={completedTasksCount}
                icon={CheckCircle}
                color="green"
                isLoading={loading}
              />
              <StatCard
                title={t('dashboard.pendingDocs', 'Pending Docs')}
                value={pendingDocs}
                icon={Clock}
                color="orange"
                isLoading={loading}
              />
              <StatCard
                title={t('dashboard.warnings', 'Warnings')}
                value={warningCount}
                icon={AlertTriangle}
                color="red"
                isLoading={loading}
              />
            </motion.div>

            {/* Overdue tasks */}
            {!loading && overdueTasks && overdueTasks.length > 0 && (
              <motion.div
                variants={fadeUp}
                className="rounded-xl border border-red-200 bg-red-50 p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-700">
                    {t('dashboard.myOverdueTasks', 'My Overdue Tasks')} ({overdueTasks.length})
                  </h3>
                </div>
                <ul className="space-y-2">
                  {overdueTasks.slice(0, 5).map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between rounded-lg bg-white/70 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {task.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('dashboard.due', 'Due')}: {format(new Date(task.dueDate), 'd MMM yyyy')}
                        </p>
                      </div>
                      <span className="ml-3 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {task.priority}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Upcoming deadlines */}
            <motion.div variants={fadeUp}>
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    {t('dashboard.myUpcomingDeadlines', 'My Upcoming Deadlines')}
                  </h3>
                </div>
                {myTasks === undefined ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 animate-pulse rounded bg-gray-200" />
                    ))}
                  </div>
                ) : upcomingTasks.length > 0 ? (
                  <ul className="space-y-3">
                    {upcomingTasks.map((task) => (
                      <li
                        key={task.id}
                        className="rounded-lg border border-gray-100 px-3 py-2"
                      >
                        <p className="truncate text-sm font-medium text-gray-800">
                          {task.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.dueDate), 'd MMM yyyy')}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">
                    {t('dashboard.noDeadlines', 'No upcoming deadlines')}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Quick actions */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <QuickAction
                icon={<Plus className="h-4 w-4" />}
                label={t('dashboard.addStudent', 'Add Student')}
                onClick={() => navigate('/students/new')}
              />
              <QuickAction
                icon={<Clock className="h-4 w-4" />}
                label={t('dashboard.myTasks', 'My Tasks')}
                onClick={() => navigate('/tasks')}
                variant="secondary"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RateRow({
  label,
  value,
  symbol,
}: {
  label: string;
  value: number;
  symbol: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-800">
        {symbol} {value.toLocaleString()}
      </span>
    </div>
  );
}

function ActivityItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span className="text-sm text-gray-700">{text}</span>
    </li>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  variant = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition ${
        variant === 'primary'
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
