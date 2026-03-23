import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Users,
  AlertTriangle,
  FileUp,
  Clock,
  TrendingUp,
  DollarSign,
  GraduationCap,
  Calendar,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

import { useAuthStore } from '../store';
import { useDocumentTitle } from '../hooks';
import { StatCard, ProgressBar } from '../components/ui';
import { CardSkeleton, StatCardSkeleton } from '../components/ui/LoadingSkeleton';
import type { DailyAnalytics, WeeklyAnalytics, MonthlyAnalytics, StudentStatus } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#06b6d4',
];

const STATUS_LABELS: Record<StudentStatus, string> = {
  new: 'New',
  docs_collecting: 'Docs Collecting',
  docs_ready: 'Docs Ready',
  submitted_to_uni: 'Submitted',
  accepted: 'Accepted',
  visa_processing: 'Visa Processing',
  visa_ready: 'Visa Ready',
  departed: 'Departed',
  rejected: 'Rejected',
  on_hold: 'On Hold',
};

type AnalyticsTab = 'daily' | 'weekly' | 'monthly';

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  icon: Icon,
  iconColor,
  children,
  className,
}: {
  title: string;
  icon: typeof BarChart3;
  iconColor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={itemVariant}
      className={clsx(
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
        <Icon className={clsx('h-5 w-5', iconColor)} />
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Daily Tab
// ---------------------------------------------------------------------------

function DailyTab({ data, isLoading, t }: { data: DailyAnalytics | null | undefined; isLoading: boolean; t: (k: string, f?: string) => string }) {
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      {/* Stat cards */}
      <motion.div variants={itemVariant} className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={t('analytics.newStudentsToday', 'New Students Today')}
          value={data.newStudents}
          icon={Users}
          color="blue"
        />
        <StatCard
          title={t('analytics.overdueTasks', 'Overdue Tasks')}
          value={data.overdueTasks.length}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title={t('analytics.docsUploaded', 'Docs Uploaded')}
          value={data.documentsUploaded}
          icon={FileUp}
          color="green"
        />
      </motion.div>

      {/* Agent Activity Table */}
      <SectionCard title={t('analytics.agentActivity', 'Agent Activity')} icon={Activity} iconColor="text-indigo-500">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('analytics.agent', 'Agent')}</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('analytics.lastLogin', 'Last Login')}</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('analytics.actionsToday', 'Actions Today')}</th>
              </tr>
            </thead>
            <tbody>
              {data.agentActivity.map((agent) => (
                <tr key={agent.userId} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{agent.nameRu}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {agent.lastLogin ? format(new Date(agent.lastLogin), 'HH:mm') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      agent.actionsToday > 10 ? 'bg-green-100 text-green-700' :
                      agent.actionsToday > 0 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    )}>
                      {agent.actionsToday}
                    </span>
                  </td>
                </tr>
              ))}
              {data.agentActivity.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                    {t('analytics.noActivity', 'No activity data')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Overdue Tasks */}
      {data.overdueTasks.length > 0 && (
        <SectionCard title={t('analytics.overdueList', 'Overdue Tasks')} icon={AlertTriangle} iconColor="text-red-500">
          <div className="space-y-2">
            {data.overdueTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg border border-red-100 px-4 py-3 dark:border-red-800">
                <span className="text-sm text-gray-900 dark:text-white">{task.title}</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {task.daysOverdue}d {t('analytics.overdue', 'overdue')}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Weekly Tab
// ---------------------------------------------------------------------------

function WeeklyTab({ data, isLoading, t }: { data: WeeklyAnalytics | null | undefined; isLoading: boolean; t: (k: string, f?: string) => string }) {
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  // Conversion funnel data
  const funnelData = Object.entries(data.conversionFunnel)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status as StudentStatus] ?? status,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  const maxFunnel = Math.max(...funnelData.map((d) => d.value), 1);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      {/* Conversion Funnel */}
      <SectionCard title={t('analytics.conversionFunnel', 'Conversion Funnel')} icon={TrendingUp} iconColor="text-indigo-500">
        <div className="space-y-3">
          {funnelData.map((item, idx) => (
            <div key={item.name} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-xs font-medium text-gray-600 dark:text-gray-400">
                {item.name}
              </span>
              <div className="flex-1">
                <motion.div
                  className="h-6 rounded-md"
                  style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / maxFunnel) * 100}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.05 }}
                />
              </div>
              <span className="w-10 text-right text-sm font-semibold text-gray-900 dark:text-white">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Agent KPIs */}
      <SectionCard title={t('analytics.agentKPIs', 'Agent KPIs')} icon={Users} iconColor="text-purple-500">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('analytics.agent', 'Agent')}</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('analytics.students', 'Students')}</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('analytics.completedTasks', 'Completed')}</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('analytics.avgDays', 'Avg Days')}</th>
              </tr>
            </thead>
            <tbody>
              {data.agentKPIs.map((kpi) => (
                <tr key={kpi.userId} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{kpi.nameRu}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{kpi.studentsCount}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{kpi.completedTasks}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{kpi.avgProcessingDays.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Expiring Docs */}
      {data.expiringDocs.length > 0 && (
        <SectionCard title={t('analytics.expiringDocs', 'Expiring Documents This Week')} icon={Clock} iconColor="text-orange-500">
          <div className="space-y-2">
            {data.expiringDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-orange-100 px-4 py-3 dark:border-orange-800/30">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.studentName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{doc.docType.replace(/_/g, ' ')}</p>
                </div>
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                  {format(new Date(doc.expiryDate), 'd MMM')}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Monthly Tab
// ---------------------------------------------------------------------------

function MonthlyTab({ data, isLoading, t }: { data: MonthlyAnalytics | null | undefined; isLoading: boolean; t: (k: string, f?: string) => string }) {
  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const revenuePercent = data.revenue.contractTotal > 0
    ? Math.round((data.revenue.paidTotal / data.revenue.contractTotal) * 100)
    : 0;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      {/* Revenue + Average TOPIK */}
      <motion.div variants={itemVariant} className="grid gap-4 sm:grid-cols-2">
        {/* Revenue */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <DollarSign className="h-5 w-5 text-green-500" />
            {t('analytics.revenue', 'Revenue')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.contractTotal', 'Contract Total')}</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">${data.revenue.contractTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.paidTotal', 'Paid Total')}</span>
              <span className="text-lg font-bold text-green-600">${data.revenue.paidTotal.toLocaleString()}</span>
            </div>
            <ProgressBar
              value={data.revenue.paidTotal}
              max={data.revenue.contractTotal}
              color="bg-green-500"
              showLabel
              size="lg"
            />
          </div>
        </div>

        {/* Season Comparison + Average TOPIK */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <GraduationCap className="h-5 w-5 text-blue-500" />
              {t('analytics.averageTopik', 'Average TOPIK')}
            </h3>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {data.averageTopik.toFixed(1)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <Calendar className="h-5 w-5 text-teal-500" />
              {t('analytics.seasonComparison', 'Season Comparison')}
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-blue-600">{data.seasonComparison.spring}</p>
                <p className="text-xs text-gray-500">{t('analytics.spring', 'Spring')}</p>
              </div>
              <div className="text-lg text-gray-300">vs</div>
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-orange-600">{data.seasonComparison.fall}</p>
                <p className="text-xs text-gray-500">{t('analytics.fall', 'Fall')}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Students by University - Bar Chart */}
      <SectionCard title={t('analytics.studentsByUni', 'Students by University')} icon={BarChart3} iconColor="text-indigo-500">
        {data.studentsByUniversity.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.studentsByUniversity} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="universityName" tick={{ fontSize: 12 }} width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-400">{t('analytics.noData', 'No data available')}</p>
        )}
      </SectionCard>

      {/* Branch Comparison - Bar Chart */}
      <SectionCard title={t('analytics.branchComparison', 'Branch Comparison')} icon={Users} iconColor="text-purple-500">
        {data.branchComparison.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.branchComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="branchName" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="students" fill="#6366f1" name={t('analytics.students', 'Students')} radius={[4, 4, 0, 0]} />
                <Bar dataKey="departed" fill="#22c55e" name={t('analytics.departed', 'Departed')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-400">{t('analytics.noData', 'No data available')}</p>
        )}
      </SectionCard>

      {/* Top 10 Universities Table */}
      <SectionCard title={t('analytics.topUniversities', 'Top 10 Universities')} icon={GraduationCap} iconColor="text-amber-500">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">#</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('analytics.university', 'University')}</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('analytics.applicants', 'Applicants')}</th>
              </tr>
            </thead>
            <tbody>
              {data.topUniversities.map((uni, idx) => (
                <tr key={uni.name} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{uni.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{uni.applicants}</td>
                </tr>
              ))}
              {data.topUniversities.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                    {t('analytics.noData', 'No data available')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const sessionToken = useAuthStore((s) => s.sessionToken);

  useDocumentTitle(t('analytics.title', 'Analytics'));

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('daily');

  // Convex queries - each only active when its tab is selected
  const dailyData = useQuery(
    api.analytics.getDaily,
    sessionToken && activeTab === 'daily' ? { sessionToken } : 'skip',
  ) as DailyAnalytics | undefined;

  const weeklyData = useQuery(
    api.analytics.getWeekly,
    sessionToken && activeTab === 'weekly' ? { sessionToken } : 'skip',
  ) as WeeklyAnalytics | undefined;

  const monthlyData = useQuery(
    api.analytics.getMonthly,
    sessionToken && activeTab === 'monthly' ? { sessionToken } : 'skip',
  ) as MonthlyAnalytics | undefined;

  const isLoading =
    (activeTab === 'daily' && dailyData === undefined) ||
    (activeTab === 'weekly' && weeklyData === undefined) ||
    (activeTab === 'monthly' && monthlyData === undefined);

  const tabs: { key: AnalyticsTab; label: string }[] = [
    { key: 'daily', label: t('analytics.daily', 'Daily') },
    { key: 'weekly', label: t('analytics.weekly', 'Weekly') },
    { key: 'monthly', label: t('analytics.monthly', 'Monthly') },
  ];

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('analytics.title', 'Analytics')}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {t('analytics.subtitle', 'Insights and reports for your team')}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'daily' && <DailyTab data={dailyData ?? null} isLoading={isLoading} t={t} />}
      {activeTab === 'weekly' && <WeeklyTab data={weeklyData ?? null} isLoading={isLoading} t={t} />}
      {activeTab === 'monthly' && <MonthlyTab data={monthlyData ?? null} isLoading={isLoading} t={t} />}
    </motion.div>
  );
}
