import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Bell,
  Info,
  Settings,
  Camera,
  Save,
  Globe,
  MessageSquare,
  Shield,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';

import { useAuthStore } from '../store';
import { useDocumentTitle } from '../hooks';
import type { Language } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'ru', label: 'Russian' },
  { value: 'ko', label: 'Korean' },
  { value: 'en', label: 'English' },
];

const APP_VERSION = '1.0.0';

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
// Main component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, updateProfile } = useAuthStore();
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const isBoss = user?.role === 'boss';

  useDocumentTitle(t('settings.title', 'Settings'));

  // Convex mutations
  const updateProfileMutation = useMutation(api.auth.updateProfile);
  const changePasswordMutation = useMutation(api.auth.changePassword);

  // Profile form
  const [profileData, setProfileData] = useState({
    nameRu: user?.nameRu ?? '',
    nameKo: user?.nameKo ?? '',
    nameEn: user?.nameEn ?? '',
    telegramChatId: user?.telegramChatId ?? '',
    languagePreference: user?.languagePreference ?? 'ru',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Notification preferences (placeholder)
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    telegramNotifications: true,
    taskReminders: true,
    deadlineAlerts: true,
    studentUpdates: false,
  });

  // Save profile
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updateProfileMutation({
        sessionToken: sessionToken!,
        nameRu: profileData.nameRu,
        nameKo: profileData.nameKo || null,
        nameEn: profileData.nameEn || null,
        telegramChatId: profileData.telegramChatId || null,
        languagePreference: profileData.languagePreference,
      });
      updateProfile({
        nameRu: profileData.nameRu,
        nameKo: profileData.nameKo || null,
        nameEn: profileData.nameEn || null,
        telegramChatId: profileData.telegramChatId || null,
        languagePreference: profileData.languagePreference as Language,
      });
      i18n.changeLanguage(profileData.languagePreference);
      toast.success(t('settings.profileSaved', 'Profile saved'));
    } catch {
      toast.error(t('settings.profileError', 'Failed to save profile'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error(t('settings.fillRequired', 'Fill in all required fields'));
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('settings.passwordMismatch', 'Passwords do not match'));
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error(t('settings.passwordTooShort', 'Password must be at least 6 characters'));
      return;
    }
    setIsSavingPassword(true);
    try {
      await changePasswordMutation({
        sessionToken: sessionToken!,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(t('settings.passwordChanged', 'Password changed'));
    } catch {
      toast.error(t('settings.passwordError', 'Failed to change password'));
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('settings.title', 'Settings')}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {t('settings.subtitle', 'Manage your account and preferences')}
        </p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* Profile Section */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <User className="h-5 w-5 text-indigo-500" />
            {t('settings.profile', 'Profile')}
          </h2>

          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  {user?.nameRu?.charAt(0) ?? 'U'}
                </div>
                <button
                  type="button"
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-gray-200 transition-colors hover:bg-gray-50 dark:bg-gray-700 dark:ring-gray-600"
                >
                  <Camera className="h-3 w-3 text-gray-500" />
                </button>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.nameRu}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                <p className="text-xs text-gray-400">
                  {user?.role === 'boss' ? t('settings.roleBoss', 'Boss') : t('settings.roleAgent', 'Agent')}
                </p>
              </div>
            </div>

            {/* Name fields */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.nameRu', 'Name (Russian)')}
                </label>
                <input
                  type="text"
                  value={profileData.nameRu}
                  onChange={(e) => setProfileData({ ...profileData, nameRu: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.nameKo', 'Name (Korean)')}
                </label>
                <input
                  type="text"
                  value={profileData.nameKo}
                  onChange={(e) => setProfileData({ ...profileData, nameKo: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.nameEn', 'Name (English)')}
                </label>
                <input
                  type="text"
                  value={profileData.nameEn}
                  onChange={(e) => setProfileData({ ...profileData, nameEn: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Telegram + Language */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t('settings.telegramChatId', 'Telegram Chat ID')}
                </label>
                <input
                  type="text"
                  value={profileData.telegramChatId}
                  onChange={(e) => setProfileData({ ...profileData, telegramChatId: e.target.value })}
                  placeholder="123456789"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Globe className="h-3.5 w-3.5" />
                  {t('settings.language', 'Language')}
                </label>
                <select
                  value={profileData.languagePreference}
                  onChange={(e) => setProfileData({ ...profileData, languagePreference: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSavingProfile ? t('common.saving', 'Saving...') : t('settings.saveProfile', 'Save Profile')}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Password Change */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Lock className="h-5 w-5 text-orange-500" />
            {t('settings.changePassword', 'Change Password')}
          </h2>

          <div className="max-w-md space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.currentPassword', 'Current Password')}
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.newPassword', 'New Password')}
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.confirmPassword', 'Confirm Password')}
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={isSavingPassword}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {isSavingPassword ? t('common.saving', 'Saving...') : t('settings.updatePassword', 'Update Password')}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Notification Preferences */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Bell className="h-5 w-5 text-blue-500" />
            {t('settings.notifications', 'Notification Preferences')}
          </h2>

          <div className="space-y-4">
            {[
              { key: 'emailNotifications', label: t('settings.emailNotif', 'Email Notifications') },
              { key: 'telegramNotifications', label: t('settings.telegramNotif', 'Telegram Notifications') },
              { key: 'taskReminders', label: t('settings.taskReminders', 'Task Reminders') },
              { key: 'deadlineAlerts', label: t('settings.deadlineAlerts', 'Deadline Alerts') },
              { key: 'studentUpdates', label: t('settings.studentUpdates', 'Student Updates') },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                <button
                  type="button"
                  onClick={() =>
                    setNotifications((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key as keyof typeof prev],
                    }))
                  }
                  className={clsx(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                    notifications[item.key as keyof typeof notifications]
                      ? 'bg-indigo-600'
                      : 'bg-gray-200 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform',
                      notifications[item.key as keyof typeof notifications]
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* About */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Info className="h-5 w-5 text-gray-500" />
            {t('settings.about', 'About')}
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('settings.appName', 'Application')}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">KoryoPath CRM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('settings.version', 'Version')}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{APP_VERSION}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 dark:border-gray-700">
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://studyinkorea.go.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  Study in Korea
                </a>
                <a
                  href="https://www.topik.go.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  TOPIK
                </a>
                <a
                  href="https://www.hikorea.go.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  HIKOREA
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone (Boss only) */}
        {isBoss && (
          <motion.div
            variants={itemVariant}
            className="rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-800 dark:bg-gray-800"
          >
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-red-700 dark:text-red-400">
              <Shield className="h-5 w-5" />
              {t('settings.dangerZone', 'Danger Zone')}
            </h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('settings.dangerDescription', 'System settings and administrative actions. Use with caution.')}
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('settings.systemSettings', 'System Settings')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('settings.systemSettingsDesc', 'Configure branches, roles, and system parameters')}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                >
                  <Settings className="mr-1 inline h-3.5 w-3.5" />
                  {t('settings.configure', 'Configure')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
