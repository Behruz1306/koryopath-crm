import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  DollarSign,
  Award,
  Plus,
  Shield,
  CheckCircle,
  Users,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';

import { useAuthStore } from '../store';
import { useDocumentTitle } from '../hooks';
import { Modal, StatCard, EmptyState } from '../components/ui';
import { CardSkeleton, StatCardSkeleton } from '../components/ui/LoadingSkeleton';
import type { Penalty, PenaltyType } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PENALTY_TYPE_OPTIONS: PenaltyType[] = ['warning_1', 'warning_2', 'fine', 'bonus'];

const PENALTY_TYPE_CONFIG: Record<PenaltyType, { label: string; color: string; bg: string; icon: typeof AlertTriangle }> = {
  warning_1: { label: 'Warning 1', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: AlertTriangle },
  warning_2: { label: 'Warning 2', color: 'text-orange-700', bg: 'bg-orange-100', icon: AlertTriangle },
  fine: { label: 'Fine', color: 'text-red-700', bg: 'bg-red-100', icon: DollarSign },
  bonus: { label: 'Bonus', color: 'text-green-700', bg: 'bg-green-100', icon: Award },
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

const itemVariant = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PenaltyListPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const isBoss = user?.role === 'boss';

  useDocumentTitle(t('penalties.title', 'Penalties & Bonuses'));

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    agentId: '',
    type: 'warning_1' as PenaltyType,
    reason: '',
    amountUsd: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter
  const [typeFilter, setTypeFilter] = useState<PenaltyType | ''>('');

  // Convex queries
  const penalties = useQuery(
    api.penalties.list,
    sessionToken ? { sessionToken } : 'skip',
  ) as Penalty[] | undefined;

  const summary = useQuery(
    api.penalties.getSummary,
    sessionToken && isBoss ? { sessionToken } : 'skip',
  ) as any | undefined;

  const isLoading = penalties === undefined;

  // Convex mutations
  const createPenaltyMutation = useMutation(api.penalties.create);
  const acknowledgePenaltyMutation = useMutation(api.penalties.acknowledge);

  // Issue penalty
  const handleCreate = async () => {
    if (!formData.agentId || !formData.reason) {
      toast.error(t('penalties.fillRequired', 'Fill in required fields'));
      return;
    }
    setIsSubmitting(true);
    try {
      await createPenaltyMutation({
        sessionToken: sessionToken!,
        agentId: formData.agentId as Id<"users">,
        type: formData.type,
        reason: formData.reason,
        amountUsd: formData.amountUsd ? parseFloat(formData.amountUsd) : null,
      });
      toast.success(t('penalties.created', 'Penalty issued'));
      setShowModal(false);
      setFormData({ agentId: '', type: 'warning_1', reason: '', amountUsd: '' });
    } catch {
      toast.error(t('penalties.createError', 'Failed to issue penalty'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acknowledge penalty
  const handleAcknowledge = async (penaltyId: string) => {
    try {
      await acknowledgePenaltyMutation({
        sessionToken: sessionToken!,
        id: penaltyId as Id<"penalties">,
      });
      toast.success(t('penalties.acknowledged', 'Penalty acknowledged'));
    } catch {
      toast.error(t('penalties.acknowledgeError', 'Failed to acknowledge'));
    }
  };

  const allPenalties = penalties ?? [];

  // Filter penalties
  const filteredPenalties = allPenalties.filter((p) => {
    if (typeFilter && p.type !== typeFilter) return false;
    if (!isBoss && p.agentId !== user?.id) return false;
    return true;
  });

  // Agent has active warnings
  const myWarnings = allPenalties.filter(
    (p) => p.agentId === user?.id && (p.type === 'warning_1' || p.type === 'warning_2') && !p.acknowledgedAt
  );

  const unacknowledgedPenalties = allPenalties.filter(
    (p) => p.agentId === user?.id && !p.acknowledgedAt && p.type !== 'bonus'
  );

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('penalties.title', 'Penalties & Bonuses')}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t('penalties.subtitle', 'Manage team penalties and bonuses')}
          </p>
        </div>
        {isBoss && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            {t('penalties.issue', 'Issue Penalty/Bonus')}
          </button>
        )}
      </div>

      {/* Agent warning banner */}
      {!isBoss && myWarnings.length > 0 && (
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                {t('penalties.activeWarnings', 'You have {{count}} active warning(s)', { count: myWarnings.length })}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                {t('penalties.warningInfo', 'Please review and acknowledge your penalties below.')}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Boss summary cards */}
      {isBoss && summary && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-3">
          <motion.div variants={itemVariant}>
            <StatCard
              title={t('penalties.totalFines', 'Total Fines')}
              value={summary.totalFines}
              icon={DollarSign}
              color="red"
              isLoading={isLoading}
            />
          </motion.div>
          <motion.div variants={itemVariant}>
            <StatCard
              title={t('penalties.totalBonuses', 'Total Bonuses')}
              value={summary.totalBonuses}
              icon={Award}
              color="green"
              isLoading={isLoading}
            />
          </motion.div>
          <motion.div variants={itemVariant}>
            <StatCard
              title={t('penalties.agentsWithWarnings', 'Agents with Warnings')}
              value={summary.totalWarnings}
              icon={AlertTriangle}
              color="orange"
              isLoading={isLoading}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Boss: Agent penalty table */}
      {isBoss && summary && summary.byAgent.length > 0 && (
        <motion.div
          variants={itemVariant}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Users className="h-5 w-5 text-indigo-500" />
            {t('penalties.byAgent', 'By Agent')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('penalties.agent', 'Agent')}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('penalties.warnings', 'Warnings')}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('penalties.fines', 'Fines')}</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">{t('penalties.bonuses', 'Bonuses')}</th>
                </tr>
              </thead>
              <tbody>
                {summary.byAgent.map((agent: any) => (
                  <tr key={agent.agentId} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{agent.nameRu}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        agent.warnings > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        {agent.warnings}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-600 dark:text-red-400">
                      {agent.fines > 0 ? `$${agent.fines.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400">
                      {agent.bonuses > 0 ? `$${agent.bonuses.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as PenaltyType | '')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          <option value="">{t('penalties.allTypes', 'All Types')}</option>
          {PENALTY_TYPE_OPTIONS.map((tp) => (
            <option key={tp} value={tp}>
              {PENALTY_TYPE_CONFIG[tp].label}
            </option>
          ))}
        </select>
        {typeFilter && (
          <button
            type="button"
            onClick={() => setTypeFilter('')}
            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
          >
            <X className="h-3.5 w-3.5" />
            {t('common.clear', 'Clear')}
          </button>
        )}
      </div>

      {/* History list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredPenalties.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={t('penalties.emptyTitle', 'No penalties or bonuses')}
          description={t('penalties.emptyDescription', 'Nothing to show here yet.')}
        />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
          {filteredPenalties.map((penalty) => {
            const config = PENALTY_TYPE_CONFIG[penalty.type];
            const IconComp = config.icon;
            const isUnacknowledged = !penalty.acknowledgedAt && penalty.type !== 'bonus' && penalty.agentId === user?.id;

            return (
              <motion.div
                key={penalty.id}
                variants={itemVariant}
                className={clsx(
                  'flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all dark:bg-gray-800',
                  penalty.type === 'bonus'
                    ? 'border-green-200 dark:border-green-800'
                    : penalty.type === 'fine'
                      ? 'border-red-200 dark:border-red-800'
                      : 'border-yellow-200 dark:border-yellow-800',
                  isUnacknowledged && 'ring-2 ring-yellow-300 dark:ring-yellow-700'
                )}
              >
                {/* Icon */}
                <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', config.bg)}>
                  <IconComp className={clsx('h-5 w-5', config.color)} />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', config.bg, config.color)}>
                      {config.label}
                    </span>
                    {penalty.amountUsd != null && penalty.amountUsd > 0 && (
                      <span className={clsx(
                        'text-sm font-semibold',
                        penalty.type === 'bonus' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {penalty.type === 'bonus' ? '+' : '-'}${penalty.amountUsd}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{penalty.reason}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {isBoss && penalty.agent && <span>{penalty.agent.nameRu}</span>}
                    <span>{format(new Date(penalty.issuedAt), 'd MMM yyyy HH:mm')}</span>
                    {penalty.issuedBy && <span>{t('penalties.by', 'by')} {penalty.issuedBy.nameRu}</span>}
                  </div>
                </div>

                {/* Acknowledge button */}
                {isUnacknowledged && !isBoss && (
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(penalty.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-yellow-700"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {t('penalties.acknowledge', 'Acknowledge')}
                  </button>
                )}

                {penalty.acknowledgedAt && (
                  <span className="shrink-0 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="mr-1 inline h-3.5 w-3.5" />
                    {t('penalties.acked', 'Acknowledged')}
                  </span>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Issue Penalty/Bonus Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('penalties.issueTitle', 'Issue Penalty / Bonus')}
        size="lg"
      >
        <div className="space-y-4">
          {/* Agent */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('penalties.selectAgent', 'Agent')} *
            </label>
            <select
              value={formData.agentId}
              onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('penalties.chooseAgent', 'Choose agent...')}</option>
              {summary?.byAgent.map((a: any) => (
                <option key={a.agentId} value={a.agentId}>{a.nameRu}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('penalties.type', 'Type')} *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as PenaltyType })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {PENALTY_TYPE_OPTIONS.map((tp) => (
                <option key={tp} value={tp}>{PENALTY_TYPE_CONFIG[tp].label}</option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('penalties.reason', 'Reason')} *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Amount */}
          {(formData.type === 'fine' || formData.type === 'bonus') && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('penalties.amount', 'Amount (USD)')}
              </label>
              <input
                type="number"
                value={formData.amountUsd}
                onChange={(e) => setFormData({ ...formData, amountUsd: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? t('common.saving', 'Saving...') : t('penalties.submit', 'Issue')}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
