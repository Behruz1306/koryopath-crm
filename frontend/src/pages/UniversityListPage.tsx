import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Search,
  GraduationCap,
  Sparkles,
  MapPin,
  X,
  Filter,
  Clock,
  DollarSign,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';

import { useAuthStore } from '../store';
import { useDocumentTitle, useDebounce } from '../hooks';
import { EmptyState } from '../components/ui';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import type { University, UniversityTier, Student } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_OPTIONS: UniversityTier[] = ['SKY', 'national', 'private_top', 'private_mid', 'community'];

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
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDeadlineInfo(deadline: string | null): { label: string; color: string } | null {
  if (!deadline) return null;
  const days = differenceInDays(new Date(deadline), new Date());
  if (days < 0) return { label: 'Passed', color: 'text-gray-400' };
  if (days <= 7) return { label: `${days}d left`, color: 'text-red-600' };
  if (days <= 30) return { label: `${days}d left`, color: 'text-yellow-600' };
  return { label: format(new Date(deadline), 'd MMM'), color: 'text-green-600' };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UniversityListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sessionToken = useAuthStore((s) => s.sessionToken);

  useDocumentTitle(t('universities.title', 'Universities'));

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [tierFilter, setTierFilter] = useState<UniversityTier | ''>('');
  const [cityFilter, setCityFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Smart Match
  const [smartMatchOpen, setSmartMatchOpen] = useState(false);
  const [smartMatchStudentId, setSmartMatchStudentId] = useState<string | null>(null);

  // Fetch universities via Convex
  const universities = useQuery(
    api.universities.list,
    sessionToken
      ? {
          sessionToken,
          search: debouncedSearch || undefined,
          tier: tierFilter || undefined,
          city: cityFilter || undefined,
        }
      : 'skip',
  );
  const isLoading = universities === undefined;

  // Fetch students for smart match modal
  const studentsData = useQuery(
    api.students.list,
    sessionToken && smartMatchOpen ? { sessionToken, limit: 200 } : 'skip',
  );
  const students: Student[] = (studentsData as any)?.students ?? [];
  const studentsLoading = smartMatchOpen && studentsData === undefined;

  // Smart match results
  const matchResults = useQuery(
    api.universities.matchForStudent,
    sessionToken && smartMatchStudentId
      ? { sessionToken, studentId: smartMatchStudentId as Id<"students"> }
      : 'skip',
  );

  const displayList = smartMatchStudentId && matchResults ? (matchResults as University[]) : (universities as University[]) ?? [];

  // Get unique cities from loaded universities
  const cities = [...new Set((universities as University[] ?? []).map((u) => u.city))].sort();

  const handleSmartMatchOpen = () => {
    setSmartMatchOpen(true);
  };

  const handleSmartMatch = (studentId: string) => {
    setSmartMatchOpen(false);
    setSmartMatchStudentId(studentId);
    toast.success(t('universities.matchSuccess', 'Smart match started'));
  };

  const clearMatch = () => {
    setSmartMatchStudentId(null);
  };

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('universities.title', 'Universities')}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {smartMatchStudentId
              ? t('universities.matchResults', '{{count}} matched universities', { count: displayList.length })
              : t('universities.subtitle', '{{count}} universities in catalog', { count: displayList.length })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {smartMatchStudentId && (
            <button
              type="button"
              onClick={clearMatch}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
              {t('universities.clearMatch', 'Clear Match')}
            </button>
          )}
          <button
            type="button"
            onClick={handleSmartMatchOpen}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Sparkles className="h-4 w-4" />
            {t('universities.smartMatch', 'Smart Match')}
          </button>
        </div>
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
              placeholder={t('universities.search', 'Search universities...')}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 lg:hidden dark:border-gray-600 dark:text-gray-300"
          >
            <Filter className="h-4 w-4" />
            {t('universities.filters', 'Filters')}
          </button>

          {/* Filter dropdowns */}
          <div
            className={clsx(
              'flex flex-col gap-2 sm:flex-row sm:items-center',
              filtersOpen ? 'flex' : 'hidden lg:flex'
            )}
          >
            {/* Tier */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as UniversityTier | '')}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="">{t('universities.allTiers', 'All Tiers')}</option>
              {TIER_OPTIONS.map((tier) => (
                <option key={tier} value={tier}>
                  {TIER_LABELS[tier]}
                </option>
              ))}
            </select>

            {/* City */}
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              <option value="">{t('universities.allCities', 'All Cities')}</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            {/* Clear */}
            {(tierFilter || cityFilter || searchInput) && (
              <button
                type="button"
                onClick={() => {
                  setTierFilter('');
                  setCityFilter('');
                  setSearchInput('');
                }}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <X className="h-3.5 w-3.5" />
                {t('universities.clearFilters', 'Clear')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </motion.div>
      ) : displayList.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={t('universities.emptyTitle', 'No universities found')}
          description={t('universities.emptyDescription', 'Try adjusting your search or filters.')}
        />
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {displayList.map((uni) => {
            const tierStyle = TIER_COLORS[uni.tier];
            const springInfo = getDeadlineInfo(uni.springDeadline);
            const fallInfo = getDeadlineInfo(uni.fallDeadline);

            return (
              <motion.div
                key={uni.id}
                variants={cardVariant}
                onClick={() => navigate(`/universities/${uni.id}`)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-600"
              >
                {/* Header */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                      {uni.nameKo}
                    </h3>
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                      {uni.nameEn}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                      tierStyle.bg,
                      tierStyle.text
                    )}
                  >
                    {TIER_LABELS[uni.tier]}
                  </span>
                </div>

                {/* City */}
                <div className="mb-3 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {uni.city}
                </div>

                {/* Info grid */}
                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  {/* Tuition */}
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <DollarSign className="h-3 w-3" />
                    {uni.tuitionPerSemesterUsd
                      ? `$${uni.tuitionPerSemesterUsd.toLocaleString()}/sem`
                      : '-'}
                  </div>

                  {/* TOPIK */}
                  <div className="text-gray-600 dark:text-gray-400">
                    TOPIK:{' '}
                    {uni.languageRequirements?.topik_min
                      ? `Level ${uni.languageRequirements.topik_min}+`
                      : '-'}
                  </div>

                  {/* Acceptance rate */}
                  {uni.acceptanceRateUzbek !== null && uni.acceptanceRateUzbek !== undefined && (
                    <div className="text-gray-600 dark:text-gray-400">
                      {t('universities.acceptance', 'Acceptance')}: {uni.acceptanceRateUzbek}%
                    </div>
                  )}
                </div>

                {/* Deadlines */}
                <div className="flex items-center gap-3 border-t border-gray-100 pt-3 text-xs dark:border-gray-700">
                  <Clock className="h-3 w-3 text-gray-400" />
                  {springInfo && (
                    <span className={springInfo.color}>
                      {t('universities.spring', 'Spring')}: {springInfo.label}
                    </span>
                  )}
                  {fallInfo && (
                    <span className={fallInfo.color}>
                      {t('universities.fall', 'Fall')}: {fallInfo.label}
                    </span>
                  )}
                  {!springInfo && !fallInfo && (
                    <span className="text-gray-400">{t('universities.noDeadlines', 'No deadlines set')}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Smart Match Student Selector Modal */}
      {smartMatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSmartMatchOpen(false)}
          />
          <motion.div
            className="relative w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-800"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('universities.selectStudent', 'Select Student for Smart Match')}
              </h2>
              <button
                onClick={() => setSmartMatchOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto px-6 py-4">
              {studentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
                  ))}
                </div>
              ) : students.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  {t('universities.noStudents', 'No students available')}
                </p>
              ) : (
                <div className="space-y-2">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => handleSmartMatch(student.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 text-left transition-colors hover:bg-indigo-50 dark:border-gray-700 dark:hover:bg-indigo-900/20"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                        {student.firstNameRu.charAt(0)}
                        {student.lastNameRu.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {student.lastNameRu} {student.firstNameRu}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          TOPIK: {student.topikLevel === 'none' ? '-' : student.topikLevel.replace('level_', '')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
