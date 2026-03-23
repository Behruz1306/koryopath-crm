import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { GripVertical, User } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

import type { Student, StudentStatus } from '../../types';
import { StatusBadge, PriorityBadge, ProgressBar } from '../ui';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STUDENT_STATUSES: StudentStatus[] = [
  'new',
  'docs_collecting',
  'docs_ready',
  'submitted_to_uni',
  'accepted',
  'visa_processing',
  'visa_ready',
  'departed',
  'rejected',
  'on_hold',
];

const statusColumnColors: Record<StudentStatus, { header: string; border: string }> = {
  new: { header: 'bg-blue-500', border: 'border-blue-200' },
  docs_collecting: { header: 'bg-yellow-500', border: 'border-yellow-200' },
  docs_ready: { header: 'bg-green-500', border: 'border-green-200' },
  submitted_to_uni: { header: 'bg-indigo-500', border: 'border-indigo-200' },
  accepted: { header: 'bg-emerald-500', border: 'border-emerald-200' },
  visa_processing: { header: 'bg-purple-500', border: 'border-purple-200' },
  visa_ready: { header: 'bg-teal-500', border: 'border-teal-200' },
  departed: { header: 'bg-green-700', border: 'border-green-300' },
  rejected: { header: 'bg-red-500', border: 'border-red-200' },
  on_hold: { header: 'bg-gray-500', border: 'border-gray-200' },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface KanbanBoardProps {
  students: Student[];
  onStatusChange: (studentId: string, newStatus: StudentStatus) => void;
  onCardClick: (student: Student) => void;
}

// ---------------------------------------------------------------------------
// Sortable Card
// ---------------------------------------------------------------------------

interface KanbanCardProps {
  student: Student;
  onClick: () => void;
  isDragOverlay?: boolean;
}

function KanbanCard({ student, onClick, isDragOverlay }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: student.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const docsReady = student.documentsReady ?? 0;
  const docsTotal = student.documentsTotal ?? 22;
  const docsPercent = docsTotal > 0 ? Math.round((docsReady / docsTotal) * 100) : 0;

  const topikDisplay =
    student.topikLevel === 'none' ? '-' : student.topikLevel.replace('level_', 'TOPIK ');

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={clsx(
        'group rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && !isDragOverlay && 'opacity-40',
        isDragOverlay && 'rotate-2 shadow-xl'
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                <User className="h-3.5 w-3.5 text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {student.lastNameRu} {student.firstNameRu}
              </p>
              {student.lastNameEn && (
                <p className="truncate text-xs text-gray-400">
                  {student.lastNameEn} {student.firstNameEn}
                </p>
              )}
            </div>
          </div>
        </button>
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-gray-500 group-hover:opacity-100"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
          {topikDisplay}
        </span>
        <PriorityBadge priority={student.priority} />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <ProgressBar
            value={docsReady}
            max={docsTotal}
            size="sm"
            color={docsPercent === 100 ? 'bg-green-500' : docsPercent >= 50 ? 'bg-blue-500' : 'bg-orange-500'}
          />
        </div>
        <span className="text-xs font-medium text-gray-500">{docsPercent}%</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable Column
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  status: StudentStatus;
  students: Student[];
  onCardClick: (student: Student) => void;
}

function KanbanColumn({ status, students, onCardClick }: KanbanColumnProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const colors = statusColumnColors[status];

  return (
    <div
      className={clsx(
        'flex w-72 flex-shrink-0 flex-col rounded-xl border bg-gray-50 transition-colors',
        isOver ? 'border-blue-400 bg-blue-50' : colors.border
      )}
    >
      {/* Column header */}
      <div className={clsx('rounded-t-xl px-3 py-2.5', colors.header)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {t(`statuses.${status}`)}
          </h3>
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-bold text-white">
            {students.length}
          </span>
        </div>
      </div>

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 overflow-y-auto p-2"
        style={{ maxHeight: 'calc(100vh - 280px)', minHeight: 120 }}
      >
        <SortableContext
          items={students.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {students.map((student) => (
            <KanbanCard
              key={student.id}
              student={student}
              onClick={() => onCardClick(student)}
            />
          ))}
        </SortableContext>

        {students.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-400">
            {t('kanban.empty', 'No students')}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Kanban Board
// ---------------------------------------------------------------------------

export default function KanbanBoard({
  students,
  onStatusChange,
  onCardClick,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const studentsByStatus = useMemo(() => {
    const map: Record<StudentStatus, Student[]> = {} as Record<StudentStatus, Student[]>;
    for (const status of STUDENT_STATUSES) {
      map[status] = [];
    }
    for (const student of students) {
      if (map[student.status]) {
        map[student.status].push(student);
      }
    }
    return map;
  }, [students]);

  const activeStudent = useMemo(
    () => (activeId ? students.find((s) => s.id === activeId) ?? null : null),
    [activeId, students]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const studentId = String(active.id);
    const overId = String(over.id);

    // Determine target status: the over element could be a column (status) or a card (student id)
    let targetStatus: StudentStatus | null = null;

    if (STUDENT_STATUSES.includes(overId as StudentStatus)) {
      targetStatus = overId as StudentStatus;
    } else {
      // Dropped over a card - find which column that card belongs to
      const targetStudent = students.find((s) => s.id === overId);
      if (targetStudent) {
        targetStatus = targetStudent.status;
      }
    }

    if (!targetStatus) return;

    const draggedStudent = students.find((s) => s.id === studentId);
    if (!draggedStudent || draggedStudent.status === targetStatus) return;

    onStatusChange(studentId, targetStatus);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STUDENT_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              students={studentsByStatus[status]}
              onCardClick={onCardClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeStudent ? (
            <KanbanCard
              student={activeStudent}
              onClick={() => {}}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </motion.div>
  );
}
