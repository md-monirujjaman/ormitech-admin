import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { aiCatalogApi } from '../aiCatalogApi';
import { apiFailure, model, ok, provider } from './testUtils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch', Mock>;
const ID = '11111111-1111-4111-8111-111111111111';

describe('aiCatalogApi against /admin/ai', () => {
  beforeEach(() => {
    for (const method of ['get', 'post', 'put', 'patch'] as const) http[method].mockResolvedValue(ok({}));
  });

  it('reads the providers and the models, and unwraps the API envelope', async () => {
    http.get.mockResolvedValueOnce(ok([provider()]));
    await expect(aiCatalogApi.listProviders()).resolves.toEqual([provider()]);
    expect(http.get).toHaveBeenCalledWith('/admin/ai/providers');
    http.get.mockResolvedValueOnce(ok([model()]));
    await expect(aiCatalogApi.listModels()).resolves.toEqual([model()]);
    expect(http.get).toHaveBeenLastCalledWith('/admin/ai/models');
  });

  it('calls the provider endpoints with the paths and bodies the API defines', async () => {
    await aiCatalogApi.createProvider({ slug: 'a-b', name: 'A', baseUrl: 'https://x.example.com/v1', priority: 5 });
    expect(http.post).toHaveBeenLastCalledWith('/admin/ai/providers', { slug: 'a-b', name: 'A', baseUrl: 'https://x.example.com/v1', priority: 5 });
    await aiCatalogApi.updateProvider(ID, { name: 'B' });
    expect(http.patch).toHaveBeenLastCalledWith(`/admin/ai/providers/${ID}`, { name: 'B' });
    await aiCatalogApi.setProviderEnabled(ID, true);
    expect(http.patch).toHaveBeenLastCalledWith(`/admin/ai/providers/${ID}/status`, { enabled: true });
    await aiCatalogApi.setDefaultProvider(ID);
    expect(http.post).toHaveBeenLastCalledWith(`/admin/ai/providers/${ID}/default`);
    await aiCatalogApi.checkProvider(ID);
    expect(http.post).toHaveBeenLastCalledWith(`/admin/ai/providers/${ID}/check`);
  });

  it('calls the model endpoints with the paths and bodies the API defines', async () => {
    await aiCatalogApi.createModel({ providerId: ID, modelId: 'fixture-model-a', displayName: 'A', capabilities: ['chat'] });
    expect(http.post).toHaveBeenLastCalledWith('/admin/ai/models', { providerId: ID, modelId: 'fixture-model-a', displayName: 'A', capabilities: ['chat'] });
    await aiCatalogApi.updateModel(ID, { description: 'x', contextWindow: null });
    expect(http.patch).toHaveBeenLastCalledWith(`/admin/ai/models/${ID}`, { description: 'x', contextWindow: null });
    await aiCatalogApi.setModelPricing(ID, { inputPerMillion: '0.15', outputPerMillion: '0.6', cachedInputPerMillion: null, currency: 'USD', note: null });
    expect(http.put).toHaveBeenLastCalledWith(`/admin/ai/models/${ID}/pricing`, { inputPerMillion: '0.15', outputPerMillion: '0.6', cachedInputPerMillion: null, currency: 'USD', note: null });
    await aiCatalogApi.verifyModel(ID);
    expect(http.post).toHaveBeenLastCalledWith(`/admin/ai/models/${ID}/verify`);
    await aiCatalogApi.setModelEnabled(ID, false);
    expect(http.patch).toHaveBeenLastCalledWith(`/admin/ai/models/${ID}/status`, { enabled: false });
    await aiCatalogApi.setDefaultModel(ID);
    expect(http.post).toHaveBeenLastCalledWith(`/admin/ai/models/${ID}/default`);
    await aiCatalogApi.setPlanAccess(ID, ['starter', 'growth']);
    expect(http.put).toHaveBeenLastCalledWith(`/admin/ai/models/${ID}/plan-access`, { planSlugs: ['starter', 'growth'] });
  });

  it('sends an API key only in the body of the request that sets it, never in a path or a query', async () => {
    const key = 'sk-test-secret-1234567890abcdef';
    await aiCatalogApi.setProviderCredentials(ID, key);
    expect(http.put).toHaveBeenCalledWith(`/admin/ai/providers/${ID}/credentials`, { apiKey: key });
    await aiCatalogApi.createProvider({ slug: 'a-b', name: 'A', apiKey: key });
    expect(http.post).toHaveBeenLastCalledWith('/admin/ai/providers', expect.objectContaining({ apiKey: key }));
    const urls = [...http.get.mock.calls, ...http.post.mock.calls, ...http.put.mock.calls, ...http.patch.mock.calls].map((call) => String(call[0]));
    expect(urls.join('\n')).not.toContain(key);
    // And nothing it reads can carry one.
    http.get.mockResolvedValueOnce(ok([provider()]));
    expect(JSON.stringify(await aiCatalogApi.listProviders())).not.toMatch(/sk-/);
  });

  it.each([[401], [403], [409], [400]])('lets a %i from the API reach the caller untouched', async (status) => {
    http.get.mockRejectedValueOnce(apiFailure(status, 'Refused'));
    await expect(aiCatalogApi.listProviders()).rejects.toMatchObject({ response: { status } });
  });
});
