import { create } from 'zustand';
import type { StudentStatus, Priority, TopikLevel } from '../types';

interface StudentFilters {
  status?: StudentStatus;
  priority?: Priority;
  topikLevel?: TopikLevel;
  branchId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface StudentState {
  filters: StudentFilters;
  viewMode: 'table' | 'kanban';
  page: number;
  limit: number;
  setFilters: (filters: Partial<StudentFilters>) => void;
  setViewMode: (mode: 'table' | 'kanban') => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

export const useStudentStore = create<StudentState>((set) => ({
  filters: {},
  viewMode: 'table',
  page: 1,
  limit: 20,
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters }, page: 1 })),
  setViewMode: (viewMode) => set({ viewMode }),
  setPage: (page) => set({ page }),
  resetFilters: () => set({ filters: {}, page: 1 }),
}));
