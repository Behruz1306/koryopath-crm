import { useState, useRef, useCallback, useMemo, Fragment } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  ChevronRight,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useAuthStore, useUIStore } from '../../store';
import NotificationDropdown from './NotificationDropdown';
import type { Language } from '../../types';

const LANGUAGE_OPTIONS: { code: Language; flag: string; label: string }[] = [
  { code: 'ru', flag: '\u{1F1F7}\u{1F1FA}', label: 'RU' },
  { code: 'ko', flag: '\u{1F1F0}\u{1F1F7}', label: 'KO' },
  { code: 'en', flag: '\u{1F1FA}\u{1F1F8}', label: 'EN' },
];

interface BreadcrumbSegment {
  label: string;
  path: string;
}

function useBreadcrumbs(): BreadcrumbSegment[] {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbSegment[] = [{ label: t('nav.dashboard', 'Dashboard'), path: '/' }];

    const labelMap: Record<string, string> = {
      students: t('nav.students', 'Students'),
      universities: t('nav.universities', 'Universities'),
      tasks: t('nav.tasks', 'Tasks'),
      analytics: t('nav.analytics', 'Analytics'),
      penalties: t('nav.penalties', 'Penalties'),
      team: t('nav.team', 'Team'),
      settings: t('nav.settings', 'Settings'),
      new: t('common.new', 'New'),
      edit: t('common.edit', 'Edit'),
    };

    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const label = labelMap[segment] ?? segment;
      crumbs.push({ label, path: currentPath });
    }

    return crumbs;
  }, [pathname, t]);
}

export default function Header() {
  const { t, i18n } = useTranslation();
  const { darkMode, toggleDarkMode, toggleSidebar, toggleGlobalSearch } = useUIStore();
  const { user, logout } = useAuthStore();
  const sessionToken = useAuthStore((s) => s.sessionToken);

  // Get unread count from Convex
  const unreadCountData = useQuery(
    api.notifications.getUnreadCount,
    sessionToken ? { sessionToken } : 'skip',
  );
  const unreadCount = (unreadCountData as number) ?? 0;

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const breadcrumbs = useBreadcrumbs();

  const handleLanguageChange = useCallback(
    (code: Language) => {
      i18n.changeLanguage(code);
      setLangOpen(false);
    },
    [i18n],
  );

  const handleLogout = useCallback(async () => {
    setUserMenuOpen(false);
    await logout();
  }, [logout]);

  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === i18n.language) ?? LANGUAGE_OPTIONS[0];

  const displayName = user?.nameRu ?? user?.email ?? '';

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800 lg:px-6">
      {/* Left: hamburger + breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden"
          aria-label={t('header.toggleMenu', 'Toggle menu')}
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav className="hidden items-center gap-1 text-sm lg:flex" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <Fragment key={crumb.path}>
              {idx > 0 && <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
              {idx === breadcrumbs.length - 1 ? (
                <span className="font-medium text-gray-900 dark:text-white">{crumb.label}</span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {crumb.label}
                </Link>
              )}
            </Fragment>
          ))}
        </nav>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Global search trigger */}
        <button
          type="button"
          onClick={toggleGlobalSearch}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:inline">{t('header.search', 'Search')}</span>
          <kbd className="hidden rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400 md:inline">
            Cmd+K
          </kbd>
        </button>

        {/* Notification bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((v) => !v)}
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label={t('header.notifications', 'Notifications')}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <NotificationDropdown onClose={() => setNotificationsOpen(false)} />
          )}
        </div>

        {/* Language switcher */}
        <div className="relative" ref={langRef}>
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label={t('header.language', 'Language')}
          >
            <span>{currentLang.flag}</span>
            <span className="hidden text-xs font-medium sm:inline">{currentLang.label}</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 z-50 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={clsx(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
                    i18n.language === lang.code
                      ? 'font-medium text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300',
                  )}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          aria-label={t('header.toggleTheme', 'Toggle theme')}
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* User avatar and menu */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-800 dark:text-primary-300">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 md:inline">
              {displayName}
            </span>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
              <Link
                to="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <UserCircle className="h-4 w-4" />
                {t('header.profile', 'Profile')}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
              >
                <LogOut className="h-4 w-4" />
                {t('header.logout', 'Logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
