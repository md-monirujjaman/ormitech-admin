import { AxiosError, type AxiosAdapter } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axiosClient, setUnauthorizedHandler } from '@/api/axiosClient';
import { aiCatalogApi } from '../aiCatalogApi';

/** The real API client, with only the network replaced: an expired session must reach the one place that signs out. */
const answerWith = (status: number): AxiosAdapter => async (config) => {
  throw new AxiosError('Refused', String(status), config, undefined, { status, statusText: 'x', headers: {}, config, data: { success: false, message: 'Refused', error: { code: 'X' } } });
};

describe('the AI catalogue and the session', () => {
  const original = axiosClient.defaults.adapter;
  afterEach(() => {
    axiosClient.defaults.adapter = original;
    setUnauthorizedHandler(null);
  });

  it('signs the administrator out when the API says the session is no longer valid (401)', async () => {
    const signOut = vi.fn();
    setUnauthorizedHandler(signOut);
    axiosClient.defaults.adapter = answerWith(401);
    await expect(aiCatalogApi.listProviders()).rejects.toMatchObject({ response: { status: 401 } });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('signs out on an expired session during a change too', async () => {
    const signOut = vi.fn();
    setUnauthorizedHandler(signOut);
    axiosClient.defaults.adapter = answerWith(401);
    await expect(aiCatalogApi.setModelEnabled('id', true)).rejects.toMatchObject({ response: { status: 401 } });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('does not sign anyone out for a permission refusal (403): the session is fine, the role is not', async () => {
    const signOut = vi.fn();
    setUnauthorizedHandler(signOut);
    axiosClient.defaults.adapter = answerWith(403);
    await expect(aiCatalogApi.listModels()).rejects.toMatchObject({ response: { status: 403 } });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('sends the access token with every request, and the key only in the body of the one that sets it', async () => {
    const seen: Array<{ url?: string; auth?: string; data?: unknown }> = [];
    axiosClient.defaults.adapter = async (config) => {
      seen.push({ url: config.url, auth: String(config.headers.get('Authorization') ?? ''), data: config.data });
      return { status: 200, statusText: 'OK', headers: {}, config, data: { success: true, message: 'ok', data: {} } };
    };
    const { setAccessToken } = await import('@/api/axiosClient');
    setAccessToken('token-123');
    await aiCatalogApi.listProviders();
    await aiCatalogApi.setProviderCredentials('id', 'sk-test-secret-1234567890abcdef');
    setAccessToken(null);
    expect(seen.map((entry) => entry.auth)).toEqual(['Bearer token-123', 'Bearer token-123']);
    expect(seen[0]?.url).toBe('/admin/ai/providers');
    expect(seen[1]?.data).toBe('{"apiKey":"sk-test-secret-1234567890abcdef"}');
    expect(JSON.stringify(seen[0])).not.toContain('sk-test');
  });
});
