import { create } from 'zustand';

interface NotificationState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
