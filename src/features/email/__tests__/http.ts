import { AxiosError, type AxiosResponse } from 'axios';

/** The API's success envelope. */
export const ok = <T,>(data: T) => ({ data: { success: true, message: 'ok', data } });

/** A failed request, shaped like what ormitech-api sends. */
export function apiFailure(status: number, message: string) {
  const response = { status, data: { success: false, message, error: { code: 'VALIDATION_ERROR' } }, statusText: '', headers: {}, config: {} } as AxiosResponse;
  return new AxiosError(message, 'ERR_BAD_REQUEST', undefined, undefined, response);
}
