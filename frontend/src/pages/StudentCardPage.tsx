import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Edit3,
  Printer,
  Phone,
  MessageCircle,
  Send,
  User,
  FileText,
  GraduationCap,
  CheckSquare,
  DollarSign,
  Clock,
  MessageSquare,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  GitCompare,
  Plus,
  Lock,
  Calendar,
} from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuthStore } from '../store';
import { useDocumentTitle } from '../hooks';
import {
  StatusBadge,
  PriorityBadge,
  ProgressBar,
  EmptyState,
} from '../components/ui';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import type {
  Student,
  Document as DocType,
  DocumentType,
  DocumentStatus,
  University,
  Task,
  Comment,
} from '../types';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabKey = 'personal' | 'documents' | 'universities' | 'tasks' | 'finances' | 'history' | 'comments';

const TABS: { key: TabKey; icon: typeof User; label: string }[] = [
  { key: 'personal', icon: User, label: 'studentCard.personal' },
  { key: 'documents', icon: FileText, label: 'studentCard.documents' },
  { key: 'universities', icon: GraduationCap, label: 'studentCard.universities' },
  { key: 'tasks', icon: CheckSquare, label: 'studentCard.tasks' },
  { key: 'finances', icon: DollarSign, label: 'studentCard.finances' },
  { key: 'history', icon: Clock, label: 'studentCard.history' },
  { key: 'comments', icon: MessageSquare, label: 'studentCard.comments' },
];

// ---------------------------------------------------------------------------
// Document type labels
// ---------------------------------------------------------------------------

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  passport: 'Passport',
  internal_passport: 'Internal Passport',
  birth_certificate: 'Birth Certificate',
  school_diploma: 'School Diploma',
  school_transcript: 'School Transcript',
  diploma_apostille: 'Diploma Apostille',
  transcript_apostille: 'Transcript Apostille',
  topik_certificate: 'TOPIK Certificate',
  medical_certificate: 'Medical Certificate',
  hiv_certificate: 'HIV Certificate',
  no_criminal_record: 'No Criminal Record',
  bank_statement: 'Bank Statement',
  sponsor_documents: 'Sponsor Documents',
  photos: 'Photos',
  motivation_letter: 'Motivation Letter',
  recommendation_letter: 'Recommendation Letter',
  portfolio: 'Portfolio',
  health_insurance: 'Health Insurance',
  acceptance_letter: 'Acceptance Letter',
  visa_d2: 'Visa D-2',
  ars_registration: 'ARS Registration',
  contract_signed: 'Contract (Signed)',
  payment_receipt: 'Payment Receipt',
};

const DOC_STATUS_ICONS: Record<DocumentStatus, { icon: typeof CheckCircle; color: string }> = {
  missing: { icon: XCircle, color: 'text-gray-300' },
  uploaded: { icon: Upload, color: 'text-blue-500' },
  verified: { icon: CheckCircle, color: 'text-green-500' },
  rejected: { icon: XCircle, color: 'text-red-500' },
  expired: { icon: AlertTriangle, color: 'text-orange-500' },
};

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const tabVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StudentCardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const sessionToken = useAuthStore((s) => s.sessionToken);

  const isBoss = user?.role === 'boss';

  const [activeTab, setActiveTab] = useState<TabKey>('personal');

  // Convex queries
  const student = useQuery(
    api.students.getById,
    sessionToken && id ? { sessionToken, id: id as Id<"students"> } : "skip"
  );

  const documents = useQuery(
    api.documents.listByStudent,
    sessionToken && id && activeTab === 'documents'
      ? { sessionToken, studentId: id as Id<"students"> }
      : "skip"
  );

  const tasks = useQuery(
    api.tasks.listByStudent,
    sessionToken && id && activeTab === 'tasks'
      ? { sessionToken, studentId: id as Id<"students"> }
      : "skip"
  );

  const comments = useQuery(
    api.comments.listByStudent,
    sessionToken && id && (activeTab === 'comments' || activeTab === 'history')
      ? { sessionToken, studentId: id as Id<"students"> }
      : "skip"
  );

  // Convex mutations
  const updateStudentMutation = useMutation(api.students.update);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveFile = useMutation(api.documents.saveFile);
  const verifyDocumentMutation = useMutation(api.documents.verify);
  const matchUniversitiesMutation = useMutation(api.students.matchUniversities);
  const assignUniversityMutation = useMutation(api.students.assignUniversity);
  const createTaskMutation = useMutation(api.tasks.create);
  const addCommentMutation = useMutation(api.comments.create);

  const isLoading = student === undefined;
  const loadingDocs = documents === undefined && activeTab === 'documents';
  const loadingTasks = tasks === undefined && activeTab === 'tasks';

  const documentsList = documents ?? [];
  const tasksList = tasks ?? [];
  const commentsList = comments ?? [];

  useDocumentTitle(
    student
      ? `${student.lastNameRu} ${student.firstNameRu}`
      : t('studentCard.title', 'Student')
  );

  // ---- Countdown timer ----
  const countdown = useMemo(() => {
    if (!student?.intakeDeadline) return null;
    const deadline = new Date(student.intakeDeadline);
    const now = new Date();
    const days = differenceInDays(deadline, now);
    const hours = differenceInHours(deadline, now) % 24;
    const isPast = deadline < now;
    return { days: Math.abs(days), hours: Math.abs(hours), isPast };
  }, [student?.intakeDeadline]);

  // ---- Docs progress ----
  const docsReady = (documentsList as DocType[]).filter(
    (d) => d.status === 'verified' || d.status === 'uploaded'
  ).length;
  const docsTotal = documentsList.length || (student?.documentsTotal ?? 22);

  // ---- Quick actions ----
  const handleWhatsApp = useCallback(() => {
    if (!student?.phone) return;
    const cleaned = student.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  }, [student?.phone]);

  const handleTelegram = useCallback(() => {
    if (!student?.telegramUsername) return;
    const username = student.telegramUsername.replace('@', '');
    window.open(`https://t.me/${username}`, '_blank');
  }, [student?.telegramUsername]);

  const handleCall = useCallback(() => {
    if (!student?.phone) return;
    window.open(`tel:${student.phone}`);
  }, [student?.phone]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ---- Document upload ----
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  const handleDocUpload = useCallback(
    async (docId: string, file: File) => {
      if (!sessionToken) return;
      setUploadingDocId(docId);
      try {
        const url = await generateUploadUrl({ sessionToken });
        const result = await fetch(url, {
          method: "POST",
          body: file,
          headers: { "Content-Type": file.type },
        });
        const { storageId } = await result.json();
        await saveFile({
          sessionToken,
          documentId: docId as Id<"documents">,
          storageId,
          fileName: file.name,
          fileSize: file.size,
        });
        toast.success(t('studentCard.docUploaded', 'Document uploaded'));
      } catch {
        toast.error(t('studentCard.docUploadError', 'Upload failed'));
      } finally {
        setUploadingDocId(null);
      }
    },
    [sessionToken, generateUploadUrl, saveFile, t]
  );

  // ---- Document verify/reject (boss only) ----
  const handleDocVerify = useCallback(
    async (docId: string, action: 'verified' | 'rejected') => {
      if (!sessionToken) return;
      try {
        await verifyDocumentMutation({
          sessionToken,
          documentId: docId as Id<"documents">,
          status: action,
        });
        toast.success(
          action === 'verified'
            ? t('studentCard.docVerified', 'Document verified')
            : t('studentCard.docRejected', 'Document rejected')
        );
      } catch {
        toast.error('Action failed');
      }
    },
    [sessionToken, verifyDocumentMutation, t]
  );

  // ---- University match ----
  const [matchedUnis, setMatchedUnis] = useState<University[]>([]);

  const handleMatchUnis = useCallback(async () => {
    if (!id || !sessionToken) return;
    try {
      const matches = await matchUniversitiesMutation({
        sessionToken,
        studentId: id as Id<"students">,
      });
      setMatchedUnis(matches as University[]);
      toast.success(
        t('studentCard.matchFound', '{{count}} matches found', { count: (matches as University[]).length })
      );
    } catch {
      toast.error('Matching failed');
    }
  }, [id, sessionToken, matchUniversitiesMutation, t]);

  // ---- Assign university (boss) ----
  const handleAssignUni = useCallback(
    async (universityId: string) => {
      if (!id || !sessionToken) return;
      try {
        await assignUniversityMutation({
          sessionToken,
          studentId: id as Id<"students">,
          universityId: universityId as Id<"universities">,
        });
        toast.success(t('studentCard.uniAssigned', 'University assigned'));
      } catch {
        toast.error('Assignment failed');
      }
    },
    [id, sessionToken, assignUniversityMutation, t]
  );

  // ---- Add comment ----
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() || !id || !sessionToken) return;
    try {
      await addCommentMutation({
        sessionToken,
        studentId: id as Id<"students">,
        text: commentText,
        isInternal,
      });
      setCommentText('');
      toast.success(t('studentCard.commentAdded', 'Comment added'));
    } catch {
      toast.error('Failed to add comment');
    }
  }, [commentText, isInternal, id, sessionToken, addCommentMutation, t]);

  // ---- Loading state ----
  if (isLoading || !student) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  // ---- Finances ----
  const contractAmount = student.contractAmount ?? 0;
  const paidAmount = student.paidAmount ?? 0;
  const paymentPercent =
    contractAmount > 0 ? Math.round((paidAmount / contractAmount) * 100) : 0;

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/students')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('studentCard.backToList', 'Back to students')}
      </button>

      {/* Header card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: avatar + info */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xl font-bold text-white ring-2 ring-gray-100">
                {student.firstNameRu?.charAt(0)}
                {student.lastNameRu?.charAt(0)}
              </div>
            )}

            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {student.lastNameRu} {student.firstNameRu}
              </h1>
              {student.lastNameEn && (
                <p className="text-sm text-gray-500">
                  {student.lastNameEn} {student.firstNameEn}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={student.status} />
                <PriorityBadge priority={student.priority} />
              </div>
            </div>
          </div>

          {/* Right: progress + countdown */}
          <div className="flex flex-col items-end gap-3">
            {/* Docs progress */}
            <div className="w-48">
              <p className="mb-1 text-xs text-gray-500">
                {t('studentCard.docsProgress', 'Documents')}
              </p>
              <ProgressBar
                value={student.documentsReady ?? docsReady}
                max={student.documentsTotal ?? docsTotal}
                showLabel
                color={
                  (student.documentsReady ?? docsReady) === (student.documentsTotal ?? docsTotal)
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                }
              />
            </div>

            {/* Countdown */}
            {countdown && (
              <div
                className={clsx(
                  'rounded-lg px-3 py-2 text-center',
                  countdown.isPast
                    ? 'bg-red-100 text-red-700'
                    : countdown.days <= 7
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                )}
              >
                <p className="text-xs font-medium">
                  {countdown.isPast
                    ? t('studentCard.overdue', 'Overdue')
                    : t('studentCard.deadline', 'Deadline')}
                </p>
                <p className="text-lg font-bold">
                  {countdown.isPast ? '-' : ''}
                  {countdown.days}d {countdown.hours}h
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <QuickBtn
            icon={<MessageCircle className="h-4 w-4" />}
            label="WhatsApp"
            onClick={handleWhatsApp}
            disabled={!student.phone}
            color="bg-green-500 hover:bg-green-600"
          />
          <QuickBtn
            icon={<Send className="h-4 w-4" />}
            label="Telegram"
            onClick={handleTelegram}
            disabled={!student.telegramUsername}
            color="bg-blue-500 hover:bg-blue-600"
          />
          <QuickBtn
            icon={<Phone className="h-4 w-4" />}
            label={t('studentCard.call', 'Call')}
            onClick={handleCall}
            disabled={!student.phone}
            color="bg-indigo-500 hover:bg-indigo-600"
          />
          <QuickBtn
            icon={<Printer className="h-4 w-4" />}
            label={t('studentCard.print', 'Print')}
            onClick={handlePrint}
            color="bg-gray-500 hover:bg-gray-600"
          />
          <QuickBtn
            icon={<Edit3 className="h-4 w-4" />}
            label={t('studentCard.edit', 'Edit')}
            onClick={() => navigate(`/students/${student._id}/edit`)}
            color="bg-orange-500 hover:bg-orange-600"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Tab navigation */}
        <div className="flex overflow-x-auto border-b border-gray-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {t(tab.label, tab.key)}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {/* ---------- PERSONAL INFO ---------- */}
            {activeTab === 'personal' && (
              <PersonalInfoTab student={student as unknown as Student} t={t} />
            )}

            {/* ---------- DOCUMENTS ---------- */}
            {activeTab === 'documents' && (
              <DocumentsTab
                documents={documentsList as DocType[]}
                loading={loadingDocs}
                isBoss={isBoss}
                uploadingDocId={uploadingDocId}
                onUpload={handleDocUpload}
                onVerify={handleDocVerify}
                t={t}
              />
            )}

            {/* ---------- UNIVERSITIES ---------- */}
            {activeTab === 'universities' && (
              <UniversitiesTab
                student={student as unknown as Student}
                matchedUnis={matchedUnis}
                isBoss={isBoss}
                onMatch={handleMatchUnis}
                onAssign={handleAssignUni}
                t={t}
                navigate={navigate}
              />
            )}

            {/* ---------- TASKS ---------- */}
            {activeTab === 'tasks' && (
              <TasksTab
                tasks={tasksList as Task[]}
                loading={loadingTasks}
                studentId={id!}
                sessionToken={sessionToken}
                createTaskMutation={createTaskMutation}
                t={t}
                navigate={navigate}
              />
            )}

            {/* ---------- FINANCES ---------- */}
            {activeTab === 'finances' && (
              <FinancesTab
                contractAmount={contractAmount}
                paidAmount={paidAmount}
                paymentPercent={paymentPercent}
                paymentStatus={student.paymentStatus}
                t={t}
              />
            )}

            {/* ---------- HISTORY ---------- */}
            {activeTab === 'history' && (
              <HistoryTab comments={commentsList as Comment[]} student={student as unknown as Student} t={t} />
            )}

            {/* ---------- COMMENTS ---------- */}
            {activeTab === 'comments' && (
              <CommentsTab
                comments={commentsList as Comment[]}
                commentText={commentText}
                isInternal={isInternal}
                isBoss={isBoss}
                onTextChange={setCommentText}
                onInternalChange={setIsInternal}
                onSubmit={handleAddComment}
                t={t}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ===========================================================================
// Sub-components
// ===========================================================================

function QuickBtn({
  icon,
  label,
  onClick,
  disabled,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        color
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Personal Info Tab
// ---------------------------------------------------------------------------

function PersonalInfoTab({ student, t }: { student: Student; t: (key: string, fallback?: string) => string }) {
  const fields = [
    { label: t('studentCard.dob', 'Date of Birth'), value: student.dateOfBirth ? format(new Date(student.dateOfBirth), 'd MMM yyyy') : '-' },
    { label: t('studentCard.gender', 'Gender'), value: student.gender ? t(`gender.${student.gender}`, student.gender) : '-' },
    { label: t('studentCard.passport', 'Passport'), value: student.passportNumber ?? '-' },
    { label: t('studentCard.passportExpiry', 'Passport Expiry'), value: student.passportExpiryDate ? format(new Date(student.passportExpiryDate), 'd MMM yyyy') : '-' },
    { label: t('studentCard.phone', 'Phone'), value: student.phone ?? '-' },
    { label: t('studentCard.email', 'Email'), value: student.email ?? '-' },
    { label: t('studentCard.telegram', 'Telegram'), value: student.telegramUsername ?? '-' },
    { label: t('studentCard.parent', 'Parent'), value: student.parentName ?? '-' },
    { label: t('studentCard.parentPhone', 'Parent Phone'), value: student.parentPhone ?? '-' },
    { label: t('studentCard.region', 'Region'), value: student.region ?? '-' },
    { label: t('studentCard.district', 'District'), value: student.district ?? '-' },
    { label: t('studentCard.address', 'Address'), value: student.fullAddress ?? '-' },
    { label: t('studentCard.education', 'Education'), value: student.currentEducationLevel ? t(`education.${student.currentEducationLevel}`, student.currentEducationLevel) : '-' },
    { label: t('studentCard.school', 'School'), value: student.schoolName ?? '-' },
    { label: t('studentCard.gradYear', 'Graduation Year'), value: student.graduationYear?.toString() ?? '-' },
    { label: t('studentCard.gpa', 'GPA'), value: student.gpaScore?.toFixed(2) ?? '-' },
    { label: t('studentCard.topik', 'TOPIK Level'), value: student.topikLevel === 'none' ? '-' : student.topikLevel.replace('level_', 'Level ') },
    { label: t('studentCard.koreanSchool', 'Korean School'), value: student.koreanSchoolName ?? '-' },
    { label: t('studentCard.koreanMonths', 'Korean Study (months)'), value: student.koreanStudyMonths?.toString() ?? '-' },
    { label: t('studentCard.branch', 'Branch'), value: student.branch?.nameRu ?? '-' },
    { label: t('studentCard.agent', 'Agent'), value: student.agent?.nameRu ?? '-' },
    { label: t('studentCard.created', 'Created'), value: format(new Date(student.createdAt), 'd MMM yyyy HH:mm') },
  ];

  return (
    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) => (
        <div key={f.label}>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {f.label}
          </p>
          <p className="mt-0.5 text-sm text-gray-800">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documents Tab
// ---------------------------------------------------------------------------

function DocumentsTab({
  documents,
  loading,
  isBoss,
  uploadingDocId,
  onUpload,
  onVerify,
  t,
}: {
  documents: DocType[];
  loading: boolean;
  isBoss: boolean;
  uploadingDocId: string | null;
  onUpload: (docId: string, file: File) => void;
  onVerify: (docId: string, action: 'verified' | 'rejected') => void;
  t: (key: string, fallback?: string) => string;
}) {
  const verified = documents.filter((d) => d.status === 'verified').length;
  const total = documents.length;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t('studentCard.noDocs', 'No documents')}
        description={t('studentCard.noDocsDesc', 'Documents will appear here once initialized.')}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ProgressBar
            value={verified}
            max={total}
            showLabel
            size="md"
            color={verified === total ? 'bg-green-500' : 'bg-blue-500'}
          />
          <span className="text-sm text-gray-500">
            {verified}/{total} {t('studentCard.verified', 'verified')}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => {
          const statusInfo = DOC_STATUS_ICONS[doc.status];
          const StatusIcon = statusInfo.icon;
          const isExpiring =
            doc.expiryDate &&
            differenceInDays(new Date(doc.expiryDate), new Date()) <= 30;

          return (
            <div
              key={doc.id}
              className={clsx(
                'flex items-center justify-between rounded-lg border px-4 py-3 transition-colors',
                doc.status === 'rejected'
                  ? 'border-red-200 bg-red-50'
                  : doc.status === 'verified'
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white'
              )}
            >
              <div className="flex items-center gap-3">
                <StatusIcon className={clsx('h-5 w-5', statusInfo.color)} />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {t(`docStatus.${doc.status}`, doc.status)}
                    </span>
                    {isExpiring && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-orange-600">
                        <AlertTriangle className="h-3 w-3" />
                        {t('studentCard.expiringSoon', 'Expiring soon')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {doc.fileUrl && (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                {/* Upload button */}
                {(doc.status === 'missing' || doc.status === 'rejected') && (
                  <label className="cursor-pointer rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100">
                    {uploadingDocId === doc.id ? '...' : t('studentCard.upload', 'Upload')}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUpload(doc.id, file);
                      }}
                    />
                  </label>
                )}

                {/* Boss verify/reject */}
                {isBoss && doc.status === 'uploaded' && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onVerify(doc.id, 'verified')}
                      className="rounded p-1.5 text-green-500 transition-colors hover:bg-green-50"
                      title={t('studentCard.verify', 'Verify')}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onVerify(doc.id, 'rejected')}
                      className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50"
                      title={t('studentCard.reject', 'Reject')}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Universities Tab
// ---------------------------------------------------------------------------

function UniversitiesTab({
  student,
  matchedUnis,
  isBoss,
  onMatch,
  onAssign,
  t,
  navigate,
}: {
  student: Student;
  matchedUnis: University[];
  isBoss: boolean;
  onMatch: () => void;
  onAssign: (id: string) => void;
  t: (key: string, fallback?: string, opts?: Record<string, unknown>) => string;
  navigate: (path: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Assigned university */}
      {student.assignedUniversity && (
        <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-indigo-500">
            {t('studentCard.assignedUniversity', 'Assigned University')}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {student.assignedUniversity.nameEn}
              </p>
              <p className="text-sm text-gray-500">
                {student.assignedUniversity.city}
                {student.assignedProgram && ` - ${student.assignedProgram}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                navigate(`/universities/${student.assignedUniversity!.id}`)
              }
              className="rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200"
            >
              {t('studentCard.viewDetails', 'Details')}
            </button>
          </div>
        </div>
      )}

      {/* Preferred universities */}
      {student.preferredUniversities && student.preferredUniversities.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            {t('studentCard.preferred', 'Preferred Universities')}
          </h4>
          <ul className="space-y-2">
            {student.preferredUniversities.map((uniId) => (
              <li
                key={uniId}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5"
              >
                <span className="text-sm text-gray-700">{uniId}</span>
                {isBoss && (
                  <button
                    type="button"
                    onClick={() => onAssign(uniId)}
                    className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                  >
                    {t('studentCard.assign', 'Assign')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onMatch}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" />
          {t('studentCard.smartMatch', 'Smart Match')}
        </button>
      </div>

      {/* Matched universities */}
      {matchedUnis.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            {t('studentCard.matchResults', 'Match Results')}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {matchedUnis.map((uni) => (
              <div
                key={uni.id}
                className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{uni.nameEn}</p>
                    <p className="text-xs text-gray-500">
                      {uni.city} - {uni.tier}
                    </p>
                  </div>
                  {uni.logoUrl && (
                    <img
                      src={uni.logoUrl}
                      alt=""
                      className="h-8 w-8 rounded object-contain"
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                  {uni.tuitionPerSemesterUsd && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5">
                      ${uni.tuitionPerSemesterUsd.toLocaleString()}/sem
                    </span>
                  )}
                  {uni.dormitoryAvailable && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">
                      Dorm
                    </span>
                  )}
                </div>
                {isBoss && (
                  <button
                    type="button"
                    onClick={() => onAssign(uni.id)}
                    className="mt-2 w-full rounded-lg bg-indigo-50 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                  >
                    {t('studentCard.assignThis', 'Assign This University')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tasks Tab
// ---------------------------------------------------------------------------

function TasksTab({
  tasks,
  loading,
  studentId,
  sessionToken,
  createTaskMutation,
  t,
  navigate,
}: {
  tasks: Task[];
  loading: boolean;
  studentId: string;
  sessionToken: string | null;
  createTaskMutation: any;
  t: (key: string, fallback?: string) => string;
  navigate: (path: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim() || !sessionToken) return;
    try {
      await createTaskMutation({
        sessionToken,
        studentId: studentId as Id<"students">,
        title: newTitle,
        dueDate: newDueDate || new Date().toISOString(),
        status: 'pending',
        priority: 'medium',
        type: 'other',
      });
      setNewTitle('');
      setNewDueDate('');
      setShowForm(false);
      toast.success(t('studentCard.taskCreated', 'Task created'));
    } catch {
      toast.error('Failed to create task');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          {t('studentCard.tasks', 'Tasks')} ({tasks.length})
        </h4>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('studentCard.addTask', 'Add Task')}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('studentCard.taskTitle', 'Task title')}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t('studentCard.create', 'Create')}
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={t('studentCard.noTasks', 'No tasks')}
          description={t('studentCard.noTasksDesc', 'Create a task for this student.')}
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isOverdue =
              task.status !== 'completed' &&
              new Date(task.dueDate) < new Date();
            return (
              <div
                key={task.id}
                className={clsx(
                  'flex items-center justify-between rounded-lg border px-4 py-3',
                  isOverdue
                    ? 'border-red-200 bg-red-50'
                    : task.status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
                )}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={clsx(
                      'text-sm font-medium',
                      task.status === 'completed'
                        ? 'text-gray-500 line-through'
                        : 'text-gray-800'
                    )}
                  >
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t('studentCard.due', 'Due')}: {format(new Date(task.dueDate), 'd MMM yyyy')}
                  </p>
                </div>
                <span
                  className={clsx(
                    'ml-3 rounded-full px-2 py-0.5 text-xs font-medium',
                    task.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : task.status === 'overdue' || isOverdue
                      ? 'bg-red-100 text-red-700'
                      : task.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {task.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finances Tab
// ---------------------------------------------------------------------------

function FinancesTab({
  contractAmount,
  paidAmount,
  paymentPercent,
  paymentStatus,
  t,
}: {
  contractAmount: number;
  paidAmount: number;
  paymentPercent: number;
  paymentStatus: string;
  t: (key: string, fallback?: string) => string;
}) {
  const statusColor: Record<string, string> = {
    not_paid: 'bg-red-100 text-red-700',
    partial: 'bg-yellow-100 text-yellow-700',
    full: 'bg-green-100 text-green-700',
    refunded: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {t('studentCard.contract', 'Contract')}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${contractAmount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {t('studentCard.paid', 'Paid')}
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            ${paidAmount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {t('studentCard.remaining', 'Remaining')}
          </p>
          <p className="mt-1 text-2xl font-bold text-orange-600">
            ${(contractAmount - paidAmount).toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            {t('studentCard.paymentProgress', 'Payment Progress')}
          </p>
          <span
            className={clsx(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              statusColor[paymentStatus] ?? 'bg-gray-100 text-gray-700'
            )}
          >
            {t(`paymentStatus.${paymentStatus}`, paymentStatus)}
          </span>
        </div>
        <ProgressBar
          value={paidAmount}
          max={contractAmount || 1}
          showLabel
          size="lg"
          color={
            paymentPercent === 100
              ? 'bg-green-500'
              : paymentPercent >= 50
              ? 'bg-blue-500'
              : 'bg-orange-500'
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Tab
// ---------------------------------------------------------------------------

function HistoryTab({
  comments,
  student,
  t,
}: {
  comments: Comment[];
  student: Student;
  t: (key: string, fallback?: string) => string;
}) {
  // Build a simple timeline from comments + key dates
  interface TimelineEntry {
    date: string;
    text: string;
    type: 'comment' | 'event';
  }

  const timeline: TimelineEntry[] = [];

  // Add student creation
  timeline.push({
    date: student.createdAt,
    text: t('studentCard.histCreated', 'Student record created'),
    type: 'event',
  });

  if (student.submittedAt) {
    timeline.push({
      date: student.submittedAt,
      text: t('studentCard.histSubmitted', 'Application submitted to university'),
      type: 'event',
    });
  }

  if (student.acceptedAt) {
    timeline.push({
      date: student.acceptedAt,
      text: t('studentCard.histAccepted', 'Accepted by university'),
      type: 'event',
    });
  }

  // Add comments
  for (const c of comments) {
    timeline.push({
      date: c.createdAt,
      text: `${c.author?.nameRu ?? 'User'}: ${c.text}`,
      type: 'comment',
    });
  }

  // Sort newest first
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (timeline.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title={t('studentCard.noHistory', 'No history')}
        description={t('studentCard.noHistoryDesc', 'Activity will appear here.')}
      />
    );
  }

  return (
    <div className="relative space-y-4 pl-6">
      {/* Timeline line */}
      <div className="absolute bottom-0 left-2.5 top-0 w-px bg-gray-200" />

      {timeline.map((entry, i) => (
        <div key={i} className="relative flex gap-3">
          <div
            className={clsx(
              'absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-white',
              entry.type === 'event' ? 'bg-indigo-500' : 'bg-gray-400'
            )}
          />
          <div className="flex-1 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5">
            <p className="text-sm text-gray-700">{entry.text}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {format(new Date(entry.date), 'd MMM yyyy HH:mm')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comments Tab
// ---------------------------------------------------------------------------

function CommentsTab({
  comments,
  commentText,
  isInternal,
  isBoss,
  onTextChange,
  onInternalChange,
  onSubmit,
  t,
}: {
  comments: Comment[];
  commentText: string;
  isInternal: boolean;
  isBoss: boolean;
  onTextChange: (text: string) => void;
  onInternalChange: (val: boolean) => void;
  onSubmit: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <div className="space-y-4">
      {/* Comment form */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <textarea
          value={commentText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={t('studentCard.commentPlaceholder', 'Write a comment...')}
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <div className="mt-2 flex items-center justify-between">
          <div>
            {isBoss && (
              <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => onInternalChange(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Lock className="h-3 w-3" />
                {t('studentCard.internalOnly', 'Internal only')}
              </label>
            )}
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!commentText.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {t('studentCard.send', 'Send')}
          </button>
        </div>
      </div>

      {/* Comment list */}
      {comments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={t('studentCard.noComments', 'No comments yet')}
          description={t('studentCard.noCommentsDesc', 'Be the first to comment.')}
        />
      ) : (
        <div className="space-y-3">
          {[...comments]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .map((comment) => (
              <div
                key={comment.id}
                className={clsx(
                  'rounded-lg border px-4 py-3',
                  comment.isInternal
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-gray-200 bg-white'
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                      {comment.author?.nameRu?.charAt(0) ?? 'U'}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {comment.author?.nameRu ?? 'Unknown'}
                    </span>
                    {comment.isInternal && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
                        <Lock className="h-3 w-3" />
                        {t('studentCard.internal', 'Internal')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(new Date(comment.createdAt), 'd MMM yyyy HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{comment.text}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
