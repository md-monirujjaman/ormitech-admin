/** One key per opening of a dialog: a double click, or a retry after a dropped connection, is the same request to the API. */
export const newKey = (): string => globalThis.crypto.randomUUID();
