import axios from 'axios';
import { env } from '@/lib/constants';

// ormitech-api serves everything under /api/v1, so every path in the api modules is relative to that.
export const axiosClient = axios.create({
  baseURL: `${env.apiUrl.replace(/\/+$/, '')}/api/v1`,
  headers: { Accept: 'application/json' },
});

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Called by `authStore` on login/logout/rehydrate — the client never reads the store directly to avoid a cycle. */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Called by `authStore` to register what "the session is no longer valid" means (clear state, redirect to /login). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

axiosClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);
