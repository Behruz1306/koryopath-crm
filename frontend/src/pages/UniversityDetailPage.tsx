import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Globe,
  ExternalLink,
  MapPin,
  DollarSign,
  Calendar,
  Users,
  BookOpen,
  Award,
  Building,
  Clock,
  FileText,
  GraduationCap,
  Home,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import clsx from 'clsx';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

import { useAuthStore } from '../store';
import { useDocumentTitle } from '../hooks';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import type { University, UniversityTier } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<UniversityTier, { bg: string; text: string }> = {
  SKY: { bg: 'bg-amber-100', text: 'text-amber-800' },
  national: { bg: 'bg-blue-100', text: 'text-blue-800' },
  private_top: { bg: 'bg-purple-100', text: 'text-purple-800' },
  private_mid: { bg: 'bg-green-100', text: 'text-green-800' },
  community: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

const TIER_LABELS: Record<UniversityTier, string> = {
  SKY: 'SKY',
  national: 'National',
  private_top: 'Private (Top)',
  private_mid: 'Private (Mid)',
  community: 'Community',
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
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DeadlineCountdown({
  label,
  deadline,
  t,
}: {
  label: string;
  deadline: string | null;
  t: (key: string, fallback?: string) => string;
}) {
  if (!deadline) return null;

  const days = differenceInDays(new Date(deadline), new Date());
  const isPast = days < 0;
  const formatted = format(new Date(deadline), 'd MMMM yyyy');

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-700">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{formatted}</p>
      </div>
      <span
        className={clsx(
          'rounded-full px-3 py-1 text-xs font-medium',
          isPast
            ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            : days <= 14
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : days <= 60
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        )}
      >
        {isPast
          ? t('universities.deadlinePassed', 'Passed')
          : t('universities.daysLeft', '{{days}} days left', { days })}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UniversityDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const sessionToken = useAuthStore((s) => s.sessionToken);

  const university = useQuery(
    api.universities.getById,
    sessionToken && id
      ? { sessionToken, id: id as Id<"universities"> }
      : 'skip',
  ) as University | null | undefined;

  const isLoading = university === undefined;

  useDocumentTitle(university?.nameEn ?? t('universities.detail', 'University'));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <CardSkeleton />
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (!university) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/universities')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', 'Back')}
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            {t('universities.notFound', 'University not found')}
          </p>
        </div>
      </div>
    );
  }

  const tierStyle = TIER_COLORS[university.tier];

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/universities')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('common.back', 'Back to Universities')}
      </button>

      {/* Header card */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <motion.div variants={itemVariant} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{university.nameKo}</h1>
              <span
                className={clsx(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium',
                  tierStyle.bg,
                  tierStyle.text
                )}
              >
                {TIER_LABELS[university.tier]}
              </span>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400">{university.nameEn}</p>
            {university.nameRu && (
              <p className="text-sm text-gray-500 dark:text-gray-500">{university.nameRu}</p>
            )}
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="h-4 w-4" />
              {university.city}
              {university.region && `, ${university.region}`}
            </div>
          </div>

          {university.logoUrl && (
            <img
              src={university.logoUrl}
              alt={university.nameEn}
              className="h-20 w-20 rounded-lg object-contain"
            />
          )}
        </motion.div>
      </motion.div>

      {/* Content grid */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
        {/* Programs */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            {t('universities.programs', 'Programs')}
          </h2>
          {university.availablePrograms && university.availablePrograms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {university.availablePrograms.map((program) => (
                <span
                  key={program}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                >
                  {program}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">{t('universities.noPrograms', 'No programs listed')}</p>
          )}
        </motion.div>

        {/* Requirements */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Award className="h-5 w-5 text-amber-500" />
            {t('universities.requirements', 'Requirements')}
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('universities.topikMin', 'TOPIK Minimum')}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {university.languageRequirements?.topik_min
                  ? `Level ${university.languageRequirements.topik_min}`
                  : t('universities.notRequired', 'Not specified')}
              </span>
            </div>
            {university.languageRequirements?.english_score && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('universities.englishScore', 'English Score')}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {university.languageRequirements.english_score}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Deadlines */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Calendar className="h-5 w-5 text-blue-500" />
            {t('universities.deadlines', 'Deadlines')}
          </h2>
          <div className="space-y-3">
            <DeadlineCountdown
              label={t('universities.springDeadline', 'Spring Intake')}
              deadline={university.springDeadline}
              t={t}
            />
            <DeadlineCountdown
              label={t('universities.fallDeadline', 'Fall Intake')}
              deadline={university.fallDeadline}
              t={t}
            />
            {!university.springDeadline && !university.fallDeadline && (
              <p className="text-sm text-gray-400">{t('universities.noDeadlines', 'No deadlines set')}</p>
            )}
          </div>
        </motion.div>

        {/* Cost Breakdown */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <DollarSign className="h-5 w-5 text-green-500" />
            {t('universities.costs', 'Costs')}
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('universities.tuition', 'Tuition (per semester)')}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {university.tuitionPerSemesterUsd
                  ? `$${university.tuitionPerSemesterUsd.toLocaleString()}`
                  : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('universities.dormitory', 'Dormitory')}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {university.dormitoryAvailable
                  ? university.dormitoryCostUsd
                    ? `$${university.dormitoryCostUsd.toLocaleString()}/sem`
                    : t('universities.available', 'Available')
                  : t('universities.notAvailable', 'Not available')}
              </span>
            </div>
            {university.tuitionPerSemesterUsd && (
              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('universities.yearlyEstimate', 'Yearly Estimate')}
                </span>
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  ${((university.tuitionPerSemesterUsd + (university.dormitoryCostUsd ?? 0)) * 2).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Uzbek Community */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Users className="h-5 w-5 text-purple-500" />
            {t('universities.uzbekCommunity', 'Uzbek Community')}
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('universities.studentCount', 'Uzbek Students')}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {university.uzbekStudentsCount ?? '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('universities.acceptanceRate', 'Acceptance Rate')}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {university.acceptanceRateUzbek != null ? `${university.acceptanceRateUzbek}%` : '-'}
              </span>
            </div>
            {university.uzbekCommunityContact && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('universities.communityContact', 'Community Contact')}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {university.uzbekCommunityContact}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* External Links */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Globe className="h-5 w-5 text-teal-500" />
            {t('universities.links', 'Links')}
          </h2>
          <div className="space-y-2">
            {university.website && (
              <a
                href={university.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
              >
                <Globe className="h-4 w-4" />
                {t('universities.website', 'Official Website')}
                <ExternalLink className="ml-auto h-3.5 w-3.5" />
              </a>
            )}
            {university.applicationPortalUrl && (
              <a
                href={university.applicationPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
              >
                <FileText className="h-4 w-4" />
                {t('universities.applicationPortal', 'Application Portal')}
                <ExternalLink className="ml-auto h-3.5 w-3.5" />
              </a>
            )}
            <a
              href="https://www.hikorea.go.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
            >
              <Building className="h-4 w-4" />
              HIKOREA
              <ExternalLink className="ml-auto h-3.5 w-3.5" />
            </a>
            <a
              href="https://www.studyinkorea.go.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
            >
              <GraduationCap className="h-4 w-4" />
              Study in Korea
              <ExternalLink className="ml-auto h-3.5 w-3.5" />
            </a>
            <a
              href="https://www.niied.go.kr/eng/contents/index.do?contentsNo=78&menuNo=349"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
            >
              <Award className="h-4 w-4" />
              {t('universities.gksScholarship', 'GKS Scholarship')}
              <ExternalLink className="ml-auto h-3.5 w-3.5" />
            </a>
          </div>
        </motion.div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        variants={itemVariant}
        className="flex flex-wrap gap-3"
      >
        <a
          href="https://www.niied.go.kr/eng/contents/index.do?contentsNo=78&menuNo=349"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700"
        >
          <Award className="h-4 w-4" />
          {t('universities.checkGKS', 'Check GKS Eligibility')}
        </a>
        <a
          href="https://www.topik.go.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <Clock className="h-4 w-4" />
          {t('universities.registerTOPIK', 'Register for TOPIK')}
        </a>
      </motion.div>

      {/* Notes in Russian */}
      {university.notesRu && (
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Home className="h-5 w-5 text-gray-500" />
            {t('universities.notes', 'Notes')}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
            {university.notesRu}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
