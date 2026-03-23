import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  globalSearchOpen: boolean;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  toggleGlobalSearch: () => void;
  setDarkMode: (dark: boolean) => void;
}

const getInitialDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('koryopath_dark_mode');
  return stored === 'true';
};

const applyDarkMode = (dark: boolean): void => {
  if (typeof document === 'undefined') return;
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const initialDarkMode = getInitialDarkMode();
applyDarkMode(initialDarkMode);

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  darkMode: initialDarkMode,
  globalSearchOpen: false,

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  toggleDarkMode: () => {
    set((state) => {
      const dark = !state.darkMode;
      localStorage.setItem('koryopath_dark_mode', String(dark));
      applyDarkMode(dark);
      return { darkMode: dark };
    });
  },

  toggleGlobalSearch: () => {
    set((state) => ({ globalSearchOpen: !state.globalSearchOpen }));
  },

  setDarkMode: (dark: boolean) => {
    localStorage.setItem('koryopath_dark_mode', String(dark));
    applyDarkMode(dark);
    set({ darkMode: dark });
  },
}));
