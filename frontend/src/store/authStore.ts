import { create } from 'zustand';
import { ConvexHttpClient } from "convex/browser";
import { api } from '@convex/_generated/api';
import toast from 'react-hot-toast';
import type { User } from '../types';

const convexClient = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL || "");

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  updateProfile: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionToken: localStorage.getItem('koryopath_session_token'),
  isAuthenticated: !!localStorage.getItem('koryopath_session_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await convexClient.mutation(api.auth.login, { email, password });
      localStorage.setItem('koryopath_session_token', result.sessionToken);
      set({
        user: result.user as unknown as User,
        sessionToken: result.sessionToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      set({ isLoading: false });
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      throw error;
    }
  },

  logout: async () => {
    const token = get().sessionToken;
    if (token) {
      try {
        await convexClient.mutation(api.auth.logout, { sessionToken: token });
      } catch { /* ignore */ }
    }
    localStorage.removeItem('koryopath_session_token');
    set({ user: null, sessionToken: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    const token = get().sessionToken;
    if (!token) return;
    set({ isLoading: true });
    try {
      const user = await convexClient.query(api.auth.getMe, { sessionToken: token });
      if (user) {
        set({ user: user as unknown as User, isAuthenticated: true, isLoading: false });
      } else {
        localStorage.removeItem('koryopath_session_token');
        set({ user: null, sessionToken: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      localStorage.removeItem('koryopath_session_token');
      set({ user: null, sessionToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
  updateProfile: (data) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...data } });
    }
  },
}));
