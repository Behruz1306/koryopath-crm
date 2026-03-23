import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Search, GraduationCap, Building2, X } from 'lucide-react';
import { useDebounce } from '../../hooks';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useAuthStore } from '../../store';
import type { Student, University } from '../../types';

interface SearchResult {
  id: string;
  type: 'student' | 'university';
  title: string;
  subtitle: string;
  path: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons: Record<SearchResult['type'], React.ElementType> = {
  student: GraduationCap,
  university: Building2,
};

const typeColors: Record<SearchResult['type'], string> = {
  student: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',
  university: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionToken = useAuthStore((s) => s.sessionToken);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const debouncedQuery = useDebounce(query, 300);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small delay for the animation to start
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Convex queries for search
  const hasSearch = debouncedQuery.trim().length > 0;

  const studentsData = useQuery(
    api.students.list,
    sessionToken && hasSearch
      ? { sessionToken, search: debouncedQuery, limit: 5 }
      : 'skip',
  );

  const universitiesData = useQuery(
    api.universities.list,
    sessionToken && hasSearch
      ? { sessionToken, search: debouncedQuery }
      : 'skip',
  );

  const isSearching = hasSearch && (studentsData === undefined || universitiesData === undefined);

  // Build results from Convex data
  const results: SearchResult[] = [];

  if (studentsData && hasSearch) {
    const students: Student[] = (studentsData as any)?.students ?? [];
    for (const s of students) {
      results.push({
        id: s.id,
        type: 'student',
        title: `${s.lastNameRu} ${s.firstNameRu}`,
        subtitle: s.passportNumber ?? s.status,
        path: `/students/${s.id}`,
      });
    }
  }

  if (universitiesData && hasSearch) {
    const universities: University[] = universitiesData as University[] ?? [];
    for (const u of universities.slice(0, 5)) {
      results.push({
        id: u.id,
        type: 'university',
        title: u.nameEn,
        subtitle: `${u.city} - ${u.tier}`,
        path: `/universities/${u.id}`,
      });
    }
  }

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onClose();
      navigate(result.path);
    },
    [navigate, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex, handleSelect, onClose],
  );

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const groupLabels: Record<string, string> = {
    student: t('search.students', 'Students'),
    university: t('search.universities', 'Universities'),
  };

  // Flat index tracking for keyboard nav
  let flatIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-[15vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-700">
              <Search className="h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('search.placeholder', 'Search students, universities...')}
                className="flex-1 border-0 bg-transparent py-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                </div>
              )}

              {!isSearching && debouncedQuery && results.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('search.noResults', 'No results found')}
                </div>
              )}

              {!isSearching &&
                Object.entries(grouped).map(([type, items]) => (
                  <div key={type}>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {groupLabels[type] ?? type}
                    </div>
                    {items.map((result) => {
                      flatIndex += 1;
                      const idx = flatIndex;
                      const Icon = typeIcons[result.type];
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => handleSelect(result)}
                          className={clsx(
                            'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                            idx === selectedIndex
                              ? 'bg-primary-50 dark:bg-primary-900/30'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                          )}
                        >
                          <span
                            className={clsx(
                              'flex h-8 w-8 items-center justify-center rounded-lg',
                              typeColors[result.type],
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-gray-900 dark:text-white">
                              {result.title}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {result.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
              <div className="flex gap-2">
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-700">
                  &uarr;&darr;
                </kbd>
                <span>{t('search.navigate', 'navigate')}</span>
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-700">
                  &crarr;
                </kbd>
                <span>{t('search.select', 'select')}</span>
              </div>
              <div>
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-700">
                  esc
                </kbd>
                <span className="ml-1">{t('search.close', 'close')}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
