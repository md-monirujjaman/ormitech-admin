import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import type { AiModel, AiProvider } from '../types';

/** A fresh query client per test, with no retries, so a failed request is a failed request. */
export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

export const provider = (overrides: Partial<AiProvider> = {}): AiProvider => ({
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'openai-main',
  name: 'OpenAI Main',
  type: 'openai',
  baseUrl: 'https://llm.provider-test.dev/v1',
  enabled: true,
  isDefault: true,
  priority: 10,
  credential: { configured: true, mask: '••••ZZ99', updatedAt: '2026-11-01T10:00:00.000Z' },
  health: { status: 'healthy', checkedAt: '2026-11-01T10:05:00.000Z', error: null },
  modelCount: 1,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:05:00.000Z',
  ...overrides,
});

export const model = (overrides: Partial<AiModel> = {}): AiModel => ({
  id: '22222222-2222-4222-8222-222222222222',
  providerId: '11111111-1111-4111-8111-111111111111',
  providerSlug: 'openai-main',
  modelId: 'fixture-model-a',
  displayName: 'Fixture A',
  description: 'A model typed in by an administrator',
  pricing: { inputPerMillion: '0.15000000', outputPerMillion: '0.60000000', cachedInputPerMillion: null, currency: 'USD', note: 'fixture figures', updatedAt: '2026-11-01T09:00:00.000Z' },
  contextWindow: 128000,
  capabilities: ['chat'],
  enabled: false,
  isDefault: false,
  availabilityVerifiedAt: '2026-11-01T09:30:00.000Z',
  planSlugs: [],
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-11-01T09:30:00.000Z',
  ...overrides,
});

/** The API's success envelope. */
export const ok = <T,>(data: T) => ({ data: { success: true, message: 'ok', data } });

/** An error the way axios raises one for a non-2xx answer from ormitech-api. */
export function apiFailure(status: number, message: string, details?: Array<{ field: string; messages: string[] }>) {
  const response = {
    status,
    statusText: 'x',
    headers: {},
    config: {} as never,
    data: { success: false, message, error: { code: 'X', ...(details ? { details } : {}) } },
  } as AxiosResponse;
  return new AxiosError(message, String(status), undefined, undefined, response);
}

/** Every `console` method, silenced and recorded, so a test can prove nothing sensitive was logged. */
export function captureConsole() {
  const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
  return { text: () => JSON.stringify(spies.map((spy) => spy.mock.calls)) };
}
