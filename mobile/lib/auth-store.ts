import { create } from "zustand";
import * as TokenStorage from "./token-storage";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  onboardingStep: string;
  twoFactorEnabled: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  setTokens: (access: string, refresh: string, user: AuthUser) => Promise<void>;
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isLoading: true,

  setTokens: async (accessToken, refreshToken, user) => {
    await TokenStorage.saveTokens(accessToken, refreshToken);
    set({ accessToken, user, isLoading: false });
  },

  updateUser: (partial) => {
    const current = get().user;
    if (current) set({ user: { ...current, ...partial } });
  },

  logout: async () => {
    await TokenStorage.clearTokens();
    set({ accessToken: null, user: null, isLoading: false });
  },

  rehydrate: async () => {
    try {
      const { refresh } = await TokenStorage.loadTokens();
      if (!refresh) { set({ isLoading: false }); return; }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
      const res = await fetch(`${apiUrl}/api/mobile/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!res.ok) throw new Error("refresh failed");
      const data = await res.json();

      await TokenStorage.saveTokens(data.accessToken, data.refreshToken);
      set({ accessToken: data.accessToken, user: data.user, isLoading: false });
    } catch {
      await TokenStorage.clearTokens();
      set({ isLoading: false });
    }
  },
}));
