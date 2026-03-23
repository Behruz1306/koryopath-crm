// ============================================================
// KoryoPath CRM - Frontend TypeScript Types
// ============================================================

// --- Enums as union types ---

export type UserRole = 'boss' | 'branch_agent';
export type Language = 'ru' | 'ko' | 'en';

export type StudentStatus =
  | 'new'
  | 'docs_collecting'
  | 'docs_ready'
  | 'submitted_to_uni'
  | 'accepted'
  | 'visa_processing'
  | 'visa_ready'
  | 'departed'
  | 'rejected'
  | 'on_hold';

export type Priority = 'normal' | 'high' | 'urgent';
export type EducationLevel = 'class_11' | 'college' | 'bachelor' | 'master';
export type TopikLevel = 'none' | 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | 'level_6';
export type Semester = 'spring' | 'fall';
export type Gender = 'male' | 'female';
export type PaymentStatus = 'not_paid' | 'partial' | 'full' | 'refunded';

export type DocumentType =
  | 'passport'
  | 'internal_passport'
  | 'birth_certificate'
  | 'school_diploma'
  | 'school_transcript'
  | 'diploma_apostille'
  | 'transcript_apostille'
  | 'topik_certificate'
  | 'medical_certificate'
  | 'hiv_certificate'
  | 'no_criminal_record'
  | 'bank_statement'
  | 'sponsor_documents'
  | 'photos'
  | 'motivation_letter'
  | 'recommendation_letter'
  | 'portfolio'
  | 'health_insurance'
  | 'acceptance_letter'
  | 'visa_d2'
  | 'ars_registration'
  | 'contract_signed'
  | 'payment_receipt';

export type DocumentStatus = 'missing' | 'uploaded' | 'verified' | 'rejected' | 'expired';

export type UniversityTier = 'SKY' | 'national' | 'private_top' | 'private_mid' | 'community';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'document' | 'payment' | 'submission' | 'follow_up' | 'interview' | 'other';

export type PenaltyType = 'warning_1' | 'warning_2' | 'fine' | 'bonus';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

// --- Interfaces ---

export interface User {
  id: string;
  email: string;
  nameRu: string;
  nameKo: string | null;
  nameEn: string | null;
  role: UserRole;
  branchId: string | null;
  branch: Branch | null;
  avatarUrl: string | null;
  languagePreference: Language;
  telegramChatId: string | null;
}

export interface Branch {
  id: string;
  nameRu: string;
  nameEn: string | null;
  city: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  agentId: string | null;
}

export interface Student {
  id: string;
  branchId: string;
  agentId: string;
  firstNameRu: string;
  lastNameRu: string;
  firstNameEn: string | null;
  lastNameEn: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  passportNumber: string | null;
  passportIssueDate: string | null;
  passportExpiryDate: string | null;
  phone: string | null;
  email: string | null;
  telegramUsername: string | null;
  parentName: string | null;
  parentPhone: string | null;
  region: string | null;
  district: string | null;
  fullAddress: string | null;
  currentEducationLevel: EducationLevel | null;
  schoolName: string | null;
  graduationYear: number | null;
  gpaScore: number | null;
  topikLevel: TopikLevel;
  topikCertificateNumber: string | null;
  topikExpiryDate: string | null;
  koreanSchoolName: string | null;
  koreanStudyMonths: number | null;
  contractAmount: number | null;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  status: StudentStatus;
  priority: Priority;
  preferredUniversities: string[] | null;
  assignedUniversityId: string | null;
  assignedProgram: string | null;
  admissionYear: number | null;
  admissionSemester: Semester | null;
  intakeDeadline: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  acceptedAt: string | null;
  // Relations
  branch?: Branch;
  agent?: User;
  assignedUniversity?: University | null;
  documents?: Document[];
  tasks?: Task[];
  comments?: Comment[];
  _count?: { documents: number };
  documentsReady?: number;
  documentsTotal?: number;
}

export interface Document {
  id: string;
  studentId: string;
  type: DocumentType;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  status: DocumentStatus;
  uploadedAt: string | null;
  verifiedAt: string | null;
  verifiedById: string | null;
  expiryDate: string | null;
  notes: string | null;
}

export interface University {
  id: string;
  nameKo: string;
  nameEn: string;
  nameRu: string | null;
  city: string;
  region: string | null;
  tier: UniversityTier;
  website: string | null;
  applicationPortalUrl: string | null;
  logoUrl: string | null;
  availablePrograms: string[] | null;
  languageRequirements: { topik_min?: number; english_score?: number } | null;
  springDeadline: string | null;
  fallDeadline: string | null;
  tuitionPerSemesterUsd: number | null;
  dormitoryAvailable: boolean;
  dormitoryCostUsd: number | null;
  uzbekStudentsCount: number | null;
  uzbekCommunityContact: string | null;
  acceptanceRateUzbek: number | null;
  notesRu: string | null;
}

export interface Task {
  id: string;
  studentId: string | null;
  agentId: string;
  createdById: string;
  title: string;
  description: string | null;
  dueDate: string;
  completedAt: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  student?: Student;
  agent?: User;
}

export interface Penalty {
  id: string;
  agentId: string;
  issuedById: string;
  type: PenaltyType;
  reason: string;
  amountUsd: number | null;
  relatedStudentId: string | null;
  relatedTaskId: string | null;
  issuedAt: string;
  acknowledgedAt: string | null;
  agent?: User;
  issuedBy?: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  priority: NotificationPriority;
  link: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  studentId: string;
  authorId: string;
  text: string;
  isInternal: boolean;
  createdAt: string;
  author?: User;
}

// --- Analytics types ---

export interface DailyAnalytics {
  newStudents: number;
  newStudentsByBranch: Record<string, number>;
  overdueTasks: { id: string; title: string; agentId: string; daysOverdue: number }[];
  documentsUploaded: number;
  agentActivity: { userId: string; nameRu: string; lastLogin: string | null; actionsToday: number }[];
}

export interface WeeklyAnalytics {
  conversionFunnel: Record<StudentStatus, number>;
  agentKPIs: { userId: string; nameRu: string; studentsCount: number; completedTasks: number; avgProcessingDays: number }[];
  expiringDocs: { id: string; studentName: string; docType: DocumentType; expiryDate: string }[];
}

export interface MonthlyAnalytics {
  studentsByUniversity: { universityName: string; count: number }[];
  revenue: { contractTotal: number; paidTotal: number };
  branchComparison: { branchName: string; students: number; departed: number; conversionRate: number }[];
  topUniversities: { name: string; applicants: number }[];
  averageTopik: number;
  seasonComparison: { spring: number; fall: number };
}

// --- Gamification ---

export interface SeasonGoal {
  id: string;
  semester: Semester;
  year: number;
  targetCount: number;
  currentCount: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nameRu: string;
  branchName: string;
  score: number;
  isCurrentUser?: boolean;
}

export interface Achievement {
  id: string;
  userId: string | null;
  studentId: string | null;
  type: string;
  title: string;
  description: string | null;
  icon: string | null;
  createdAt: string;
}

// --- Exchange rates ---

export interface ExchangeRates {
  USD: number;
  KRW: number;
  UZS: number;
  updatedAt: string;
}

// --- API response wrappers ---

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface StudentListResponse {
  students: Student[];
  total: number;
  page: number;
  limit: number;
}

export interface StatusSummary {
  status: StudentStatus;
  count: number;
}
