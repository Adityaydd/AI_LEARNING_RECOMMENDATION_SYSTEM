import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  setAuth: (data: { user: User; accessToken: string; refreshToken: string }) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  setUserId: (userId: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set: (partial: AuthState | Partial<AuthState> | ((state: AuthState) => AuthState | Partial<AuthState>)) => void) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      userId: null,

      setAuth: ({ user, accessToken, refreshToken }: { user: User; accessToken: string; refreshToken: string }) =>
        set({
          user,
          accessToken,
          refreshToken,
          userId: user._id,
          isAuthenticated: true,
          isLoading: false,
        }),

      setAccessToken: (accessToken: string) =>
        set({ accessToken }),

      setUser: (user: User) =>
        set({ user, userId: user._id }),

      setUserId: (userId: string) =>
        set({ userId }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          userId: null,
          isAuthenticated: false,
        }),

      setLoading: (isLoading: boolean) =>
        set({ isLoading }),

      initializeAuth: () => {
        // This will be called on app load to check if we have valid tokens
        set({ isLoading: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state: AuthState) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        userId: state.userId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);