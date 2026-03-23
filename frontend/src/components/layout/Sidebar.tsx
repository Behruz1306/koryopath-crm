import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
  LayoutDashboard,
  GraduationCap,
  Building2,
  CheckSquare,
  BarChart3,
  AlertTriangle,
  Users,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useAuthStore, useUIStore } from '../../store';

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ElementType;
  bossOnly?: boolean;
  agentLabelKey?: string;
}

const navItems: NavItem[] = [
  { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/students', labelKey: 'nav.students', icon: GraduationCap },
  { path: '/universities', labelKey: 'nav.universities', icon: Building2 },
  { path: '/tasks', labelKey: 'nav.tasks', icon: CheckSquare },
  { path: '/analytics', labelKey: 'nav.analytics', icon: BarChart3, bossOnly: true },
  {
    path: '/penalties',
    labelKey: 'nav.penalties',
    icon: AlertTriangle,
    agentLabelKey: 'nav.myPenalties',
  },
  { path: '/team', labelKey: 'nav.team', icon: Users },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
];

function SeasonProgress() {
  const { t } = useTranslation();
  // Placeholder values; a real implementation would pull from a gamification store
  const current = 42;
  const target = 100;
  const pct = Math.round((current / target) * 100);

  return (
    <div className="rounded-lg bg-primary-50 p-3 dark:bg-primary-900/30">
      <p className="text-xs font-medium text-primary-700 dark:text-primary-300">
        {t('season.progress', 'Season Progress')}
      </p>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-primary-200 dark:bg-primary-800">
        <div
          className="h-full rounded-full bg-primary-600 transition-all dark:bg-primary-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-primary-600 dark:text-primary-400">
        {current}/{target} ({pct}%)
      </p>
    </div>
  );
}

export default function Sidebar() {
  const { t } = useTranslation();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const isBoss = user?.role === 'boss';

  const filteredItems = navItems.filter((item) => {
    if (item.bossOnly && !isBoss) return false;
    return true;
  });

  return (
    <nav
      className={clsx(
        'flex h-full flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
          K
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap text-lg font-bold text-gray-900 dark:text-white"
            >
              Koryo<span className="text-primary-600 dark:text-primary-400">Path</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation links */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const label =
              !isBoss && item.agentLabelKey
                ? t(item.agentLabelKey, t(item.labelKey))
                : t(item.labelKey);

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-900 text-white dark:bg-primary-600'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                      !sidebarOpen && 'justify-center',
                    )
                  }
                  title={!sidebarOpen ? label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom section */}
      <div className="border-t border-gray-200 p-3 dark:border-gray-700">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <SeasonProgress />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={toggleSidebar}
          className={clsx(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200',
            !sidebarOpen && 'justify-center',
          )}
        >
          {sidebarOpen ? (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span>{t('sidebar.collapse', 'Collapse')}</span>
            </>
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </nav>
  );
}
