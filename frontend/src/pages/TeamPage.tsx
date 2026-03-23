import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Trophy,
  Target,
  Star,
  Medal,
  Crown,
  Sparkles,
  GraduationCap,
  Clock,
  Users,
  PartyPopper,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

import { useAuthStore } from '../store';
import { useDocumentTitle } from '../hooks';
import { ProgressBar } from '../components/ui';
import { CardSkeleton, StatCardSkeleton } from '../components/ui/LoadingSkeleton';
import type { SeasonGoal, LeaderboardEntry, Achievement, Student } from '../types';

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

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm font-bold text-gray-400">#{rank}</span>;
}

function getSeasonEndDate(goal: SeasonGoal): Date {
  // Spring: ends June 30, Fall: ends December 31
  const year = goal.year;
  return goal.semester === 'spring' ? new Date(year, 5, 30) : new Date(year, 11, 31);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TeamPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const isBoss = user?.role === 'boss';

  useDocumentTitle(t('team.title', 'Team'));

  // Convex queries
  const seasonGoal = useQuery(
    api.gamification.getSeasonGoal,
    sessionToken ? { sessionToken } : 'skip',
  ) as SeasonGoal | null | undefined;

  const leaderboard = useQuery(
    api.gamification.getLeaderboard,
    sessionToken ? { sessionToken } : 'skip',
  ) as LeaderboardEntry[] | undefined;

  const achievements = useQuery(
    api.gamification.getAchievements,
    sessionToken ? { sessionToken } : 'skip',
  ) as Achievement[] | undefined;

  const wallOfFame = useQuery(
    api.gamification.getWallOfFame,
    sessionToken ? { sessionToken } : 'skip',
  ) as Student[] | undefined;

  const isLoading = seasonGoal === undefined || leaderboard === undefined || achievements === undefined || wallOfFame === undefined;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
        <StatCardSkeleton />
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  const daysRemaining = seasonGoal ? differenceInDays(getSeasonEndDate(seasonGoal), new Date()) : 0;
  const progressPercent = seasonGoal && seasonGoal.targetCount > 0
    ? Math.round((seasonGoal.currentCount / seasonGoal.targetCount) * 100)
    : 0;

  // For agents, filter leaderboard to show only their entry
  const displayBoard = isBoss ? (leaderboard ?? []) : (leaderboard ?? []).filter((e) => e.isCurrentUser);

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('team.title', 'Team & Gamification')}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {t('team.subtitle', 'Goals, leaderboard, and achievements')}
        </p>
      </div>

      {/* Season Mission Card */}
      {seasonGoal && (
        <motion.div
          variants={itemVariant}
          className="relative overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm dark:border-indigo-800 dark:from-indigo-900/30 dark:to-purple-900/30"
        >
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-800">
                <Target className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('team.seasonMission', 'Season Mission')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {seasonGoal.semester === 'spring'
                    ? t('team.spring', 'Spring')
                    : t('team.fall', 'Fall')}{' '}
                  {seasonGoal.year}
                </p>
              </div>
            </div>

            <p className="mb-4 text-base font-medium text-gray-800 dark:text-gray-200">
              {t('team.missionGoal', "This season's goal: {{target}} students to Korea. Progress: {{current}}/{{target}}", {
                target: seasonGoal.targetCount,
                current: seasonGoal.currentCount,
              })}
            </p>

            {/* Large progress bar */}
            <div className="mb-2">
              <ProgressBar
                value={seasonGoal.currentCount}
                max={seasonGoal.targetCount}
                color={progressPercent >= 100 ? 'bg-green-500' : 'bg-indigo-500'}
                size="lg"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                {progressPercent}%
              </span>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                {seasonGoal.currentCount} / {seasonGoal.targetCount}
              </span>
            </div>

            {/* Countdown */}
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/70 px-4 py-2 dark:bg-gray-800/50">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {daysRemaining > 0
                  ? t('team.daysRemaining', '{{days}} days remaining in campaign', { days: daysRemaining })
                  : t('team.campaignEnded', 'Campaign has ended')}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
        {/* Leaderboard */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Trophy className="h-5 w-5 text-amber-500" />
            {t('team.leaderboard', 'Leaderboard')}
          </h3>

          {displayBoard.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              {t('team.noLeaderboard', 'No leaderboard data yet')}
            </p>
          ) : (
            <div className="space-y-2">
              {displayBoard.map((entry) => (
                <div
                  key={entry.userId}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-4 py-3 transition-colors',
                    entry.isCurrentUser
                      ? 'border border-indigo-200 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/30'
                      : 'border border-gray-100 dark:border-gray-700',
                    entry.rank <= 3 && 'bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10'
                  )}
                >
                  {/* Rank */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Name + Branch */}
                  <div className="min-w-0 flex-1">
                    <p className={clsx(
                      'truncate text-sm font-medium',
                      entry.isCurrentUser ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'
                    )}>
                      {entry.nameRu}
                      {entry.isCurrentUser && (
                        <span className="ml-1.5 text-xs text-indigo-500">({t('team.you', 'You')})</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{entry.branchName}</p>
                  </div>

                  {/* Score */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{entry.score}</p>
                    <p className="text-xs text-gray-400">{t('team.points', 'pts')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Achievements */}
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Star className="h-5 w-5 text-purple-500" />
            {t('team.achievements', 'Achievements')}
          </h3>

          {(achievements ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              {t('team.noAchievements', 'No achievements yet')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {(achievements ?? []).slice(0, 8).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex flex-col items-center rounded-lg border border-gray-100 p-3 text-center transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    {achievement.icon ? (
                      <span className="text-lg">{achievement.icon}</span>
                    ) : (
                      <Sparkles className="h-5 w-5 text-purple-500" />
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{achievement.title}</p>
                  {achievement.description && (
                    <p className="mt-0.5 text-xs text-gray-400">{achievement.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Wall of Fame */}
      <motion.div
        variants={itemVariant}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          <PartyPopper className="h-5 w-5 text-pink-500" />
          {t('team.wallOfFame', 'Wall of Fame')}
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {t('team.wallOfFameDesc', 'Students who made it to Korea')}
        </p>

        {(wallOfFame ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            {t('team.noWallOfFame', 'No departed students yet')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(wallOfFame ?? []).map((student) => (
              <motion.div
                key={student.id}
                variants={itemVariant}
                className="relative overflow-hidden rounded-xl border border-gray-100 bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-sm dark:border-green-800/30 dark:from-green-900/20 dark:to-emerald-900/20"
              >
                {/* Celebration accent */}
                <div className="absolute -right-2 -top-2 text-2xl opacity-30">
                  <PartyPopper />
                </div>

                <div className="relative z-10">
                  {/* Student name */}
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800 dark:bg-green-800 dark:text-green-200">
                      {student.firstNameRu.charAt(0)}{student.lastNameRu.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {student.lastNameRu} {student.firstNameRu}
                      </p>
                    </div>
                  </div>

                  {/* University */}
                  {student.assignedUniversity && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <GraduationCap className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      <span className="truncate">{student.assignedUniversity.nameEn}</span>
                    </div>
                  )}

                  {/* Program */}
                  {student.assignedProgram && (
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-500">
                      {student.assignedProgram}
                    </p>
                  )}

                  {/* Region */}
                  {student.region && (
                    <p className="mt-1 text-xs text-gray-400">
                      {student.region}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Achievement Feed */}
      {(achievements ?? []).length > 0 && (
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {t('team.achievementFeed', 'Recent Activity')}
          </h3>
          <div className="space-y-3">
            {(achievements ?? []).slice(0, 10).map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-700"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  {achievement.icon ? (
                    <span className="text-sm">{achievement.icon}</span>
                  ) : (
                    <Star className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">{achievement.title}</p>
                  {achievement.description && (
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {achievement.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {format(new Date(achievement.createdAt), 'd MMM')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
