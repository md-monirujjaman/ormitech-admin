/** A timestamp as an administrator reads it: local date and time, or a dash when there is none. */
export const formatWhen = (iso: string | null): string => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
