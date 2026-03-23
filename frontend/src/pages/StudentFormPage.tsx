import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  User,
  Phone,
  GraduationCap,
  BookOpen,
  DollarSign,
  Building2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuthStore } from '../store';
import { useDocumentTitle, useDebounce } from '../hooks';
import type {
  Student,
  Gender,
  EducationLevel,
  TopikLevel,
  Semester,
  Priority,
  University,
} from '../types';

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

interface StepDef {
  key: string;
  label: string;
  icon: typeof User;
}

const STEPS: StepDef[] = [
  { key: 'personal', label: 'studentForm.personal', icon: User },
  { key: 'contact', label: 'studentForm.contact', icon: Phone },
  { key: 'academic', label: 'studentForm.academic', icon: GraduationCap },
  { key: 'korean', label: 'studentForm.korean', icon: BookOpen },
  { key: 'financial', label: 'studentForm.financial', icon: DollarSign },
  { key: 'university', label: 'studentForm.university', icon: Building2 },
];

// ---------------------------------------------------------------------------
// Russian-to-English transliteration
// ---------------------------------------------------------------------------

const TRANSLIT_MAP: Record<string, string> = {
  'a': 'a', 'b': 'b', 'v': 'v', 'g': 'g', 'd': 'd', 'e': 'e',
  '\u0430': 'a', '\u0431': 'b', '\u0432': 'v', '\u0433': 'g', '\u0434': 'd', '\u0435': 'e',
  '\u0451': 'yo', '\u0436': 'zh', '\u0437': 'z', '\u0438': 'i', '\u0439': 'y',
  '\u043a': 'k', '\u043b': 'l', '\u043c': 'm', '\u043d': 'n', '\u043e': 'o',
  '\u043f': 'p', '\u0440': 'r', '\u0441': 's', '\u0442': 't', '\u0443': 'u',
  '\u0444': 'f', '\u0445': 'kh', '\u0446': 'ts', '\u0447': 'ch', '\u0448': 'sh',
  '\u0449': 'shch', '\u044a': '', '\u044b': 'y', '\u044c': '', '\u044d': 'e',
  '\u044e': 'yu', '\u044f': 'ya',
  '\u0410': 'A', '\u0411': 'B', '\u0412': 'V', '\u0413': 'G', '\u0414': 'D', '\u0415': 'E',
  '\u0401': 'Yo', '\u0416': 'Zh', '\u0417': 'Z', '\u0418': 'I', '\u0419': 'Y',
  '\u041a': 'K', '\u041b': 'L', '\u041c': 'M', '\u041d': 'N', '\u041e': 'O',
  '\u041f': 'P', '\u0420': 'R', '\u0421': 'S', '\u0422': 'T', '\u0423': 'U',
  '\u0424': 'F', '\u0425': 'Kh', '\u0426': 'Ts', '\u0427': 'Ch', '\u0428': 'Sh',
  '\u0429': 'Shch', '\u042a': '', '\u042b': 'Y', '\u042c': '', '\u042d': 'E',
  '\u042e': 'Yu', '\u042f': 'Ya',
  ' ': ' ', '-': '-', "'": "'",
};

function transliterate(text: string): string {
  return text
    .split('')
    .map((ch) => TRANSLIT_MAP[ch] ?? ch)
    .join('');
}

// ---------------------------------------------------------------------------
// Passport validation
// ---------------------------------------------------------------------------

function isValidPassport(value: string): boolean {
  // Uzbek passport: AA1234567
  return /^[A-Z]{2}\d{7}$/.test(value.toUpperCase());
}

// ---------------------------------------------------------------------------
// Phone formatting
// ---------------------------------------------------------------------------

function formatPhone(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('998')) {
    const rest = digits.slice(3);
    if (rest.length <= 2) return `+998 ${rest}`;
    if (rest.length <= 5) return `+998 ${rest.slice(0, 2)} ${rest.slice(2)}`;
    if (rest.length <= 7) return `+998 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5)}`;
    return `+998 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5, 7)} ${rest.slice(7, 9)}`;
  }
  return `+${digits}`;
}

// ---------------------------------------------------------------------------
// Form data type
// ---------------------------------------------------------------------------

interface FormData {
  firstNameRu: string;
  lastNameRu: string;
  firstNameEn: string;
  lastNameEn: string;
  dateOfBirth: string;
  gender: Gender | '';
  passportNumber: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  phone: string;
  email: string;
  telegramUsername: string;
  parentName: string;
  parentPhone: string;
  region: string;
  district: string;
  fullAddress: string;
  currentEducationLevel: EducationLevel | '';
  schoolName: string;
  graduationYear: string;
  gpaScore: string;
  topikLevel: TopikLevel;
  topikCertificateNumber: string;
  topikExpiryDate: string;
  koreanSchoolName: string;
  koreanStudyMonths: string;
  contractAmount: string;
  paidAmount: string;
  admissionYear: string;
  admissionSemester: Semester | '';
  intakeDeadline: string;
  priority: Priority;
  preferredUniversities: string[];
}

const INITIAL_FORM: FormData = {
  firstNameRu: '',
  lastNameRu: '',
  firstNameEn: '',
  lastNameEn: '',
  dateOfBirth: '',
  gender: '',
  passportNumber: '',
  passportIssueDate: '',
  passportExpiryDate: '',
  phone: '',
  email: '',
  telegramUsername: '',
  parentName: '',
  parentPhone: '',
  region: '',
  district: '',
  fullAddress: '',
  currentEducationLevel: '',
  schoolName: '',
  graduationYear: '',
  gpaScore: '',
  topikLevel: 'none',
  topikCertificateNumber: '',
  topikExpiryDate: '',
  koreanSchoolName: '',
  koreanStudyMonths: '',
  contractAmount: '',
  paidAmount: '',
  admissionYear: '',
  admissionSemester: '',
  intakeDeadline: '',
  priority: 'normal',
  preferredUniversities: [],
};

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StudentFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const sessionToken = useAuthStore((s) => s.sessionToken);

  useDocumentTitle(
    isEdit
      ? t('studentForm.editTitle', 'Edit Student')
      : t('studentForm.addTitle', 'Add Student')
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [passportError, setPassportError] = useState('');
  const [passportDuplicate, setPassportDuplicate] = useState(false);

  // Convex queries
  const existingStudent = useQuery(
    api.students.getById,
    sessionToken && id ? { sessionToken, id: id as Id<"students"> } : "skip"
  );

  const universities = useQuery(
    api.universities.list,
    sessionToken ? { sessionToken } : "skip"
  );

  const universitiesList = (universities as University[]) ?? [];

  // Convex mutations
  const createStudentMutation = useMutation(api.students.create);
  const updateStudentMutation = useMutation(api.students.update);

  // Populate form when existing student loads (edit mode)
  const [formPopulated, setFormPopulated] = useState(false);
  useEffect(() => {
    if (!existingStudent || formPopulated) return;
    const s = existingStudent as unknown as Student;
    setForm({
      firstNameRu: s.firstNameRu,
      lastNameRu: s.lastNameRu,
      firstNameEn: s.firstNameEn ?? '',
      lastNameEn: s.lastNameEn ?? '',
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.split('T')[0] : '',
      gender: s.gender ?? '',
      passportNumber: s.passportNumber ?? '',
      passportIssueDate: s.passportIssueDate ? s.passportIssueDate.split('T')[0] : '',
      passportExpiryDate: s.passportExpiryDate ? s.passportExpiryDate.split('T')[0] : '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      telegramUsername: s.telegramUsername ?? '',
      parentName: s.parentName ?? '',
      parentPhone: s.parentPhone ?? '',
      region: s.region ?? '',
      district: s.district ?? '',
      fullAddress: s.fullAddress ?? '',
      currentEducationLevel: s.currentEducationLevel ?? '',
      schoolName: s.schoolName ?? '',
      graduationYear: s.graduationYear?.toString() ?? '',
      gpaScore: s.gpaScore?.toString() ?? '',
      topikLevel: s.topikLevel,
      topikCertificateNumber: s.topikCertificateNumber ?? '',
      topikExpiryDate: s.topikExpiryDate ? s.topikExpiryDate.split('T')[0] : '',
      koreanSchoolName: s.koreanSchoolName ?? '',
      koreanStudyMonths: s.koreanStudyMonths?.toString() ?? '',
      contractAmount: s.contractAmount?.toString() ?? '',
      paidAmount: s.paidAmount?.toString() ?? '',
      admissionYear: s.admissionYear?.toString() ?? '',
      admissionSemester: s.admissionSemester ?? '',
      intakeDeadline: s.intakeDeadline ? s.intakeDeadline.split('T')[0] : '',
      priority: s.priority,
      preferredUniversities: s.preferredUniversities ?? [],
    });
    setFormPopulated(true);
  }, [existingStudent, formPopulated]);

  const loadingStudent = isEdit && existingStudent === undefined;

  // Auto-transliteration
  const translitFirstName = useMemo(
    () => transliterate(form.firstNameRu),
    [form.firstNameRu]
  );
  const translitLastName = useMemo(
    () => transliterate(form.lastNameRu),
    [form.lastNameRu]
  );

  // Passport duplicate check (debounced)
  const debouncedPassport = useDebounce(form.passportNumber, 600);

  // Convex query for passport duplicate check
  const passportCheckData = useQuery(
    api.students.list,
    sessionToken && debouncedPassport && debouncedPassport.length >= 9 && isValidPassport(debouncedPassport)
      ? { sessionToken, search: debouncedPassport, limit: 1 }
      : "skip"
  );

  useEffect(() => {
    if (!debouncedPassport || debouncedPassport.length < 9) {
      setPassportDuplicate(false);
      setPassportError('');
      return;
    }
    if (!isValidPassport(debouncedPassport)) {
      setPassportError(t('studentForm.invalidPassport', 'Invalid passport format (e.g. AA1234567)'));
      setPassportDuplicate(false);
      return;
    }
    setPassportError('');
    if (passportCheckData) {
      const found = passportCheckData.students as unknown as Student[];
      const isDup = found.some(
        (s) => s.passportNumber === debouncedPassport.toUpperCase() && s.id !== id
      );
      setPassportDuplicate(isDup);
    }
  }, [debouncedPassport, passportCheckData, id, t]);

  // ---- Field change handler ----
  const handleChange = useCallback(
    (field: keyof FormData, value: string | string[]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // ---- Phone change with formatting ----
  const handlePhoneChange = useCallback(
    (field: 'phone' | 'parentPhone', value: string) => {
      setForm((prev) => ({ ...prev, [field]: formatPhone(value) }));
    },
    []
  );

  // ---- Navigation ----
  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // ---- Submit ----
  const handleSubmit = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        sessionToken,
        firstNameRu: form.firstNameRu,
        lastNameRu: form.lastNameRu,
        firstNameEn: form.firstNameEn || undefined,
        lastNameEn: form.lastNameEn || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: (form.gender as Gender) || undefined,
        passportNumber: form.passportNumber.toUpperCase() || undefined,
        passportIssueDate: form.passportIssueDate || undefined,
        passportExpiryDate: form.passportExpiryDate || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        telegramUsername: form.telegramUsername || undefined,
        parentName: form.parentName || undefined,
        parentPhone: form.parentPhone || undefined,
        region: form.region || undefined,
        district: form.district || undefined,
        fullAddress: form.fullAddress || undefined,
        currentEducationLevel: (form.currentEducationLevel as EducationLevel) || undefined,
        schoolName: form.schoolName || undefined,
        graduationYear: form.graduationYear ? parseInt(form.graduationYear, 10) : undefined,
        gpaScore: form.gpaScore ? parseFloat(form.gpaScore) : undefined,
        topikLevel: form.topikLevel,
        topikCertificateNumber: form.topikCertificateNumber || undefined,
        topikExpiryDate: form.topikExpiryDate || undefined,
        koreanSchoolName: form.koreanSchoolName || undefined,
        koreanStudyMonths: form.koreanStudyMonths ? parseInt(form.koreanStudyMonths, 10) : undefined,
        contractAmount: form.contractAmount ? parseFloat(form.contractAmount) : undefined,
        paidAmount: form.paidAmount ? parseFloat(form.paidAmount) : 0,
        admissionYear: form.admissionYear ? parseInt(form.admissionYear, 10) : undefined,
        admissionSemester: (form.admissionSemester as Semester) || undefined,
        intakeDeadline: form.intakeDeadline || undefined,
        priority: form.priority,
        preferredUniversities: form.preferredUniversities.length > 0 ? form.preferredUniversities : undefined,
      };

      let savedId: string;
      if (isEdit && id) {
        payload.id = id as Id<"students">;
        await updateStudentMutation(payload as any);
        savedId = id;
      } else {
        savedId = await createStudentMutation(payload as any) as unknown as string;
      }

      toast.success(
        isEdit
          ? t('studentForm.updateSuccess', 'Student updated')
          : t('studentForm.createSuccess', 'Student created')
      );
      navigate(`/students/${savedId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save student';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [form, isEdit, id, sessionToken, navigate, t, createStudentMutation, updateStudentMutation]);

  // ---- University multi-select toggle ----
  const toggleUni = useCallback(
    (uniId: string) => {
      setForm((prev) => {
        const current = prev.preferredUniversities;
        const next = current.includes(uniId)
          ? current.filter((u) => u !== uniId)
          : [...current, uniId];
        return { ...prev, preferredUniversities: next };
      });
    },
    []
  );

  // ---- Loading edit data ----
  if (loadingStudent) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-3xl space-y-6"
    >
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit
            ? t('studentForm.editTitle', 'Edit Student')
            : t('studentForm.addTitle', 'New Student')}
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isComplete = idx < currentStep;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => {
                setDirection(idx > currentStep ? 1 : -1);
                setCurrentStep(idx);
              }}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  isActive
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : isComplete
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-200 bg-white text-gray-400'
                )}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={clsx(
                  'hidden text-xs font-medium sm:block',
                  isActive
                    ? 'text-indigo-600'
                    : isComplete
                    ? 'text-green-600'
                    : 'text-gray-400'
                )}
              >
                {t(step.label, step.key)}
              </span>
              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div className="sr-only" />
              )}
            </button>
          );
        })}
      </div>

      {/* Progress bar under steps */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
        <motion.div
          className="h-full rounded-full bg-indigo-600"
          animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            {/* Step 0: Personal */}
            {currentStep === 0 && (
              <fieldset className="space-y-4">
                <legend className="mb-4 text-lg font-semibold text-gray-900">
                  {t('studentForm.personalInfo', 'Personal Information')}
                </legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label={t('studentForm.lastNameRu', 'Last Name (Russian)')}
                    required
                  >
                    <input
                      type="text"
                      value={form.lastNameRu}
                      onChange={(e) => handleChange('lastNameRu', e.target.value)}
                      className={inputClass}
                      required
                    />
                  </FormField>

                  <FormField
                    label={t('studentForm.firstNameRu', 'First Name (Russian)')}
                    required
                  >
                    <input
                      type="text"
                      value={form.firstNameRu}
                      onChange={(e) => handleChange('firstNameRu', e.target.value)}
                      className={inputClass}
                      required
                    />
                  </FormField>

                  <FormField
                    label={t('studentForm.lastNameEn', 'Last Name (English)')}
                    hint={
                      form.lastNameRu && !form.lastNameEn
                        ? `${t('studentForm.suggestion', 'Suggestion')}: ${translitLastName}`
                        : undefined
                    }
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.lastNameEn}
                        onChange={(e) => handleChange('lastNameEn', e.target.value)}
                        placeholder={translitLastName}
                        className={clsx(inputClass, 'flex-1')}
                      />
                      {form.lastNameRu && !form.lastNameEn && (
                        <button
                          type="button"
                          onClick={() => handleChange('lastNameEn', translitLastName)}
                          className="rounded-lg bg-indigo-50 px-3 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                          title="Apply transliteration"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </FormField>

                  <FormField
                    label={t('studentForm.firstNameEn', 'First Name (English)')}
                    hint={
                      form.firstNameRu && !form.firstNameEn
                        ? `${t('studentForm.suggestion', 'Suggestion')}: ${translitFirstName}`
                        : undefined
                    }
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.firstNameEn}
                        onChange={(e) => handleChange('firstNameEn', e.target.value)}
                        placeholder={translitFirstName}
                        className={clsx(inputClass, 'flex-1')}
                      />
                      {form.firstNameRu && !form.firstNameEn && (
                        <button
                          type="button"
                          onClick={() => handleChange('firstNameEn', translitFirstName)}
                          className="rounded-lg bg-indigo-50 px-3 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                          title="Apply transliteration"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </FormField>

                  <FormField label={t('studentForm.dob', 'Date of Birth')}>
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.gender', 'Gender')}>
                    <select
                      value={form.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">{t('studentForm.select', 'Select...')}</option>
                      <option value="male">{t('gender.male', 'Male')}</option>
                      <option value="female">{t('gender.female', 'Female')}</option>
                    </select>
                  </FormField>

                  <FormField
                    label={t('studentForm.passport', 'Passport Number')}
                    error={passportError || (passportDuplicate ? t('studentForm.passportDuplicate', 'This passport already exists') : undefined)}
                  >
                    <input
                      type="text"
                      value={form.passportNumber}
                      onChange={(e) =>
                        handleChange('passportNumber', e.target.value.toUpperCase())
                      }
                      placeholder="AA1234567"
                      maxLength={9}
                      className={clsx(
                        inputClass,
                        (passportError || passportDuplicate) && 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      )}
                    />
                  </FormField>

                  <FormField label={t('studentForm.passportIssue', 'Passport Issue Date')}>
                    <input
                      type="date"
                      value={form.passportIssueDate}
                      onChange={(e) => handleChange('passportIssueDate', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.passportExpiry', 'Passport Expiry Date')}>
                    <input
                      type="date"
                      value={form.passportExpiryDate}
                      onChange={(e) => handleChange('passportExpiryDate', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.priority', 'Priority')}>
                    <select
                      value={form.priority}
                      onChange={(e) => handleChange('priority', e.target.value)}
                      className={inputClass}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </FormField>
                </div>
              </fieldset>
            )}

            {/* Step 1: Contact */}
            {currentStep === 1 && (
              <fieldset className="space-y-4">
                <legend className="mb-4 text-lg font-semibold text-gray-900">
                  {t('studentForm.contactInfo', 'Contact Information')}
                </legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={t('studentForm.phone', 'Phone')}>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handlePhoneChange('phone', e.target.value)}
                      placeholder="+998 90 123 45 67"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.email', 'Email')}>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.telegram', 'Telegram')}>
                    <input
                      type="text"
                      value={form.telegramUsername}
                      onChange={(e) => handleChange('telegramUsername', e.target.value)}
                      placeholder="@username"
                      className={inputClass}
                    />
                  </FormField>

                  <div /> {/* spacer */}

                  <FormField label={t('studentForm.parentName', 'Parent Name')}>
                    <input
                      type="text"
                      value={form.parentName}
                      onChange={(e) => handleChange('parentName', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.parentPhone', 'Parent Phone')}>
                    <input
                      type="tel"
                      value={form.parentPhone}
                      onChange={(e) => handlePhoneChange('parentPhone', e.target.value)}
                      placeholder="+998 90 123 45 67"
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.region', 'Region')}>
                    <input
                      type="text"
                      value={form.region}
                      onChange={(e) => handleChange('region', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.district', 'District')}>
                    <input
                      type="text"
                      value={form.district}
                      onChange={(e) => handleChange('district', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <div className="sm:col-span-2">
                    <FormField label={t('studentForm.address', 'Full Address')}>
                      <input
                        type="text"
                        value={form.fullAddress}
                        onChange={(e) => handleChange('fullAddress', e.target.value)}
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                </div>
              </fieldset>
            )}

            {/* Step 2: Academic */}
            {currentStep === 2 && (
              <fieldset className="space-y-4">
                <legend className="mb-4 text-lg font-semibold text-gray-900">
                  {t('studentForm.academicInfo', 'Academic Information')}
                </legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={t('studentForm.educationLevel', 'Education Level')}>
                    <select
                      value={form.currentEducationLevel}
                      onChange={(e) => handleChange('currentEducationLevel', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">{t('studentForm.select', 'Select...')}</option>
                      <option value="class_11">{t('education.class_11', '11th Grade')}</option>
                      <option value="college">{t('education.college', 'College')}</option>
                      <option value="bachelor">{t('education.bachelor', 'Bachelor')}</option>
                      <option value="master">{t('education.master', 'Master')}</option>
                    </select>
                  </FormField>

                  <FormField label={t('studentForm.school', 'School / University Name')}>
                    <input
                      type="text"
                      value={form.schoolName}
                      onChange={(e) => handleChange('schoolName', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.gradYear', 'Graduation Year')}>
                    <input
                      type="number"
                      value={form.graduationYear}
                      onChange={(e) => handleChange('graduationYear', e.target.value)}
                      min={2000}
                      max={2035}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.gpa', 'GPA Score')}>
                    <input
                      type="number"
                      value={form.gpaScore}
                      onChange={(e) => handleChange('gpaScore', e.target.value)}
                      step="0.01"
                      min={0}
                      max={5}
                      className={inputClass}
                    />
                  </FormField>
                </div>
              </fieldset>
            )}

            {/* Step 3: Korean Language */}
            {currentStep === 3 && (
              <fieldset className="space-y-4">
                <legend className="mb-4 text-lg font-semibold text-gray-900">
                  {t('studentForm.koreanInfo', 'Korean Language')}
                </legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={t('studentForm.topik', 'TOPIK Level')}>
                    <select
                      value={form.topikLevel}
                      onChange={(e) => handleChange('topikLevel', e.target.value)}
                      className={inputClass}
                    >
                      <option value="none">{t('studentForm.noTopik', 'None')}</option>
                      <option value="level_1">Level 1</option>
                      <option value="level_2">Level 2</option>
                      <option value="level_3">Level 3</option>
                      <option value="level_4">Level 4</option>
                      <option value="level_5">Level 5</option>
                      <option value="level_6">Level 6</option>
                    </select>
                  </FormField>

                  <FormField label={t('studentForm.topikCert', 'TOPIK Certificate Number')}>
                    <input
                      type="text"
                      value={form.topikCertificateNumber}
                      onChange={(e) => handleChange('topikCertificateNumber', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.topikExpiry', 'TOPIK Expiry Date')}>
                    <input
                      type="date"
                      value={form.topikExpiryDate}
                      onChange={(e) => handleChange('topikExpiryDate', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <div /> {/* spacer */}

                  <FormField label={t('studentForm.koreanSchool', 'Korean Language School')}>
                    <input
                      type="text"
                      value={form.koreanSchoolName}
                      onChange={(e) => handleChange('koreanSchoolName', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.koreanMonths', 'Study Duration (months)')}>
                    <input
                      type="number"
                      value={form.koreanStudyMonths}
                      onChange={(e) => handleChange('koreanStudyMonths', e.target.value)}
                      min={0}
                      max={120}
                      className={inputClass}
                    />
                  </FormField>
                </div>
              </fieldset>
            )}

            {/* Step 4: Financial */}
            {currentStep === 4 && (
              <fieldset className="space-y-4">
                <legend className="mb-4 text-lg font-semibold text-gray-900">
                  {t('studentForm.financialInfo', 'Financial Information')}
                </legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={t('studentForm.contractAmount', 'Contract Amount (USD)')}>
                    <input
                      type="number"
                      value={form.contractAmount}
                      onChange={(e) => handleChange('contractAmount', e.target.value)}
                      min={0}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.paidAmount', 'Paid Amount (USD)')}>
                    <input
                      type="number"
                      value={form.paidAmount}
                      onChange={(e) => handleChange('paidAmount', e.target.value)}
                      min={0}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.admissionYear', 'Admission Year')}>
                    <input
                      type="number"
                      value={form.admissionYear}
                      onChange={(e) => handleChange('admissionYear', e.target.value)}
                      min={2024}
                      max={2030}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label={t('studentForm.semester', 'Semester')}>
                    <select
                      value={form.admissionSemester}
                      onChange={(e) => handleChange('admissionSemester', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">{t('studentForm.select', 'Select...')}</option>
                      <option value="spring">{t('semester.spring', 'Spring')}</option>
                      <option value="fall">{t('semester.fall', 'Fall')}</option>
                    </select>
                  </FormField>

                  <FormField label={t('studentForm.intakeDeadline', 'Intake Deadline')}>
                    <input
                      type="date"
                      value={form.intakeDeadline}
                      onChange={(e) => handleChange('intakeDeadline', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>
                </div>
              </fieldset>
            )}

            {/* Step 5: University Preferences */}
            {currentStep === 5 && (
              <fieldset className="space-y-4">
                <legend className="mb-4 text-lg font-semibold text-gray-900">
                  {t('studentForm.universityPrefs', 'University Preferences')}
                </legend>

                <p className="text-sm text-gray-500">
                  {t(
                    'studentForm.selectUnis',
                    'Select preferred universities for this student.'
                  )}
                </p>

                {universitiesList.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">
                    {t('studentForm.noUnisAvailable', 'No universities available')}
                  </p>
                ) : (
                  <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                    {universitiesList.map((uni) => {
                      const selected = form.preferredUniversities.includes(uni.id);
                      return (
                        <button
                          key={uni.id}
                          type="button"
                          onClick={() => toggleUni(uni.id)}
                          className={clsx(
                            'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
                            selected
                              ? 'border-indigo-300 bg-indigo-50'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          )}
                        >
                          <div>
                            <p
                              className={clsx(
                                'text-sm font-medium',
                                selected ? 'text-indigo-700' : 'text-gray-800'
                              )}
                            >
                              {uni.nameEn}
                            </p>
                            <p className="text-xs text-gray-500">
                              {uni.city} - {uni.tier}
                            </p>
                          </div>
                          <div
                            className={clsx(
                              'flex h-5 w-5 items-center justify-center rounded border',
                              selected
                                ? 'border-indigo-600 bg-indigo-600'
                                : 'border-gray-300'
                            )}
                          >
                            {selected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {form.preferredUniversities.length > 0 && (
                  <p className="text-sm text-indigo-600">
                    {t('studentForm.selectedCount', '{{count}} selected', {
                      count: form.preferredUniversities.length,
                    })}
                  </p>
                )}
              </fieldset>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentStep === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('studentForm.back', 'Back')}
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            {t('studentForm.next', 'Next')}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !form.firstNameRu || !form.lastNameRu}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit
              ? t('studentForm.update', 'Update Student')
              : t('studentForm.create', 'Create Student')}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ===========================================================================
// Shared form field component
// ===========================================================================

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 transition-colors focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100';

function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-indigo-500">{hint}</p>
      )}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
