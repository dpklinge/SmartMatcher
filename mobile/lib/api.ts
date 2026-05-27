import * as TokenStorage from "./token-storage";
import { useAuthStore } from "./auth-store";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

async function tryRefresh(): Promise<boolean> {
  const { refresh } = await TokenStorage.loadTokens();
  if (!refresh) return false;

  const res = await fetch(`${BASE}/api/mobile/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) return false;
  const data = await res.json();
  await useAuthStore.getState().setTokens(data.accessToken, data.refreshToken, data.user);
  return true;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = useAuthStore.getState().accessToken;
      if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${BASE}${path}`, { ...options, headers });
    } else {
      await useAuthStore.getState().logout();
      throw new Error("SESSION_EXPIRED");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = useAuthStore.getState().accessToken;
      if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });
    } else {
      await useAuthStore.getState().logout();
      throw new Error("SESSION_EXPIRED");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => uploadFile<T>(path, formData),
};
