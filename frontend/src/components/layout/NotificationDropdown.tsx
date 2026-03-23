import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ko } from 'date-fns/locale';
import { Info, AlertTriangle, AlertCircle, CheckCircle2, BellOff } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useAuthStore } from '../../store';
import type { NotificationPriority } from '../../types';

interface NotificationDropdownProps {
  onClose: () => void;
}

const priorityConfig: Record<
  NotificationPriority,
  { icon: React.ElementType; className: string }
> = {
  low: {
    icon: Info,
    className: 'text-gray-400 dark:text-gray-500',
  },
  normal: {
    icon: Info,
    className: 'text-blue-500 dark:text-blue-400',
  },
  high: {
    icon: AlertTriangle,
    className: 'text-amber-500 dark:text-amber-400',
  },
  critical: {
    icon: AlertCircle,
    className: 'text-red-500 dark:text-red-400',
  },
};

function getDateLocale(lang: string) {
  if (lang === 'ru') return ru;
  if (lang === 'ko') return ko;
  return undefined;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sessionToken = useAuthStore((s) => s.sessionToken);

  // Convex queries and mutations
  const notifications = useQuery(
    api.notifications.list,
    sessionToken ? { sessionToken } : 'skip',
  ) as any[] | undefined;

  const markAsReadMutation = useMutation(api.notifications.markAsRead);
  const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleNotificationClick = useCallback(
    async (id: string, link: string | null) => {
      await markAsReadMutation({ sessionToken: sessionToken!, id: id as Id<"notifications"> });
      if (link) {
        navigate(link);
      }
      onClose();
    },
    [markAsReadMutation, sessionToken, navigate, onClose],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsReadMutation({ sessionToken: sessionToken! });
  }, [markAllAsReadMutation, sessionToken]);

  const recentNotifications = (notifications ?? []).slice(0, 10);
  const locale = getDateLocale(i18n.language);

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:w-96"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('notifications.title', 'Notifications')}
        </h3>
        {recentNotifications.some((n) => !n.isRead) && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="text-xs font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            {t('notifications.markAllRead', 'Mark all as read')}
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-96 overflow-y-auto">
        {recentNotifications.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400 dark:text-gray-500">
            <BellOff className="h-8 w-8" />
            <p className="text-sm">{t('notifications.empty', 'No notifications')}</p>
          </div>
        )}

        {recentNotifications.map((notification) => {
          const config = priorityConfig[notification.priority as NotificationPriority];
          const Icon = config.icon;
          const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
            locale,
          });

          return (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNotificationClick(notification.id, notification.link)}
              className={clsx(
                'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50',
                !notification.isRead && 'bg-primary-50/50 dark:bg-primary-900/10',
              )}
            >
              <div
                className={clsx(
                  'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                  notification.priority === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/30'
                    : notification.priority === 'high'
                      ? 'bg-amber-50 dark:bg-amber-900/30'
                      : 'bg-blue-50 dark:bg-blue-900/30',
                )}
              >
                <Icon className={clsx('h-4 w-4', config.className)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={clsx(
                      'text-sm',
                      notification.isRead
                        ? 'text-gray-600 dark:text-gray-400'
                        : 'font-medium text-gray-900 dark:text-white',
                    )}
                  >
                    {notification.title}
                  </p>
                  {!notification.isRead && (
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{timeAgo}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {recentNotifications.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              navigate('/notifications');
              onClose();
            }}
            className="flex w-full items-center justify-center py-3 text-xs font-medium text-primary-600 transition-colors hover:bg-gray-50 dark:text-primary-400 dark:hover:bg-gray-700/50"
          >
            {t('notifications.viewAll', 'View all notifications')}
          </button>
        </div>
      )}
    </div>
  );
}
