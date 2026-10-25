import type { StateStorage } from 'zustand/middleware';

const REMEMBER_KEY = 'ormitech-admin-remember';
const EMAIL_KEY = 'ormitech-admin-remembered-email';

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    // Storage can be blocked (private windows, site settings); the panel must still work without it.
    return fallback;
  }
};

/** Whether the next sign-in should outlive the browser window. On unless the person turned it off. */
export function getRememberPreference(): boolean {
  return safe(() => window.localStorage.getItem(REMEMBER_KEY) !== '0', true);
}

export function setRememberPreference(remember: boolean): void {
  safe(() => window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0'), undefined);
}

/** The email shown again on the sign-in form, only for someone who chose "Remember me". */
export function getRememberedEmail(): string {
  return safe(() => (getRememberPreference() ? window.localStorage.getItem(EMAIL_KEY) ?? '' : ''), '');
}

export function setRememberedEmail(email: string | null): void {
  safe(() => (email ? window.localStorage.setItem(EMAIL_KEY, email) : window.localStorage.removeItem(EMAIL_KEY)), undefined);
}

/**
 * Where the signed-in session is kept. With "Remember me" it goes to `localStorage`, so the administrator is still
 * signed in after closing and reopening the browser. Without it, it goes to `sessionStorage` and ends with the tab.
 * Reading looks in both, and a write clears the other one so the session never lives in two places.
 */
export const sessionStateStorage: StateStorage = {
  getItem: (name) => safe(() => window.localStorage.getItem(name) ?? window.sessionStorage.getItem(name), null),
  setItem: (name, value) =>
    safe(() => {
      const [keep, drop] = getRememberPreference() ? [window.localStorage, window.sessionStorage] : [window.sessionStorage, window.localStorage];
      keep.setItem(name, value);
      drop.removeItem(name);
    }, undefined),
  removeItem: (name) =>
    safe(() => {
      window.localStorage.removeItem(name);
      window.sessionStorage.removeItem(name);
    }, undefined),
};
