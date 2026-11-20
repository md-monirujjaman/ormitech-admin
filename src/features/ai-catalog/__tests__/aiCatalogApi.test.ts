import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { aiCatalogApi } from '../aiCatalogApi';
import { apiFailure, gateway, model, ok } from './testUtils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;
const ID = '11111111-1111-4111-8111-111111111111';

describe('aiCatalogApi against /admin/ai', () => {
  beforeEach(() => {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) http[method].mockResolvedValue(ok({}));
  });

  it('reads the gateway and the models, and unwraps the API envelope', async () => {
    http.get.mockResolvedValueOnce(ok(gateway()));
    await expect(aiCatalogApi.gateway()).resolves.toEqual(gateway());
    expect(http.get).toHaveBeenCalledWith('/admin/ai/gateway');
    http.get.mockResolvedValueOnce(ok([model()]));
    await expect(aiCatalogApi.listModels()).resolves.toEqual([model()]);
    expect(http.get).toHaveBeenLastCalledWith('/admin/ai/models');
  });

  it('tests the connection with a POST that carries no body: the key is the server\'s, not the panel\'s', async () => {
    await aiCatalogApi.checkGateway();
    expect(http.post).toHaveBeenLastCalledWith('/admin/ai/gateway/check');
  });

  it('calls the model endpoints with the paths and bodies the API defines', async () => {
    await aiCatalogApi.createModel({ modelId: 'vendor/model-a', displayName: 'A', capabilities: ['chat'] });
    expect(http.post).toHaveBeenLastCalledWith('/admin/ai/models', { modelId: 'vendor/model-a', displayName: 'A', capabilities: ['chat'] });
    await aiCatalogApi.updateModel(ID, { description: 'x', contextWindow: null });
    expect(http.patch).toHaveBeenLastCalledWith(`/admin/ai/models/${ID}`, { description: 'x', contextWindow: null });
    await aiCatalogApi.setModelPricing(ID, { inputPerMillion: '0.15', outputPerMillion: '0.6', cachedInputPerMillion: null, currency: 'USD', note: null });
    expect(http.put).toHaveBeenLastCalledWith(`/admin/ai/models/${ID}/pricing`, { inputPerMillion: '0.15', outputPerMillion: '0.6', cachedInputPerMillion: null, currency: 'USD', note: null });
    await aiCatalogApi.verifyModel(ID);
    expect(http.post).toHaveBeenLastCalledWith(`/admin/ai/models/${ID}/verify`);
    await aiCatalogApi.setModelEnabled(ID, false);
    expect(http.patch).toHaveBeenLastCalledWith(`/admin/ai/models/${ID}/status`, { enabled: false });
    await aiCatalogApi.deleteModel(ID);
    expect(http.delete).toHaveBeenLastCalledWith(`/admin/ai/models/${ID}`);
  });

  it('never sends or receives an API key: no call carries a key field, and what it reads cannot hold one', async () => {
    await aiCatalogApi.checkGateway();
    await aiCatalogApi.createModel({ modelId: 'vendor/model-a', displayName: 'A' });
    const bodies = [...http.post.mock.calls, ...http.put.mock.calls, ...http.patch.mock.calls].map((call) => JSON.stringify(call[1] ?? null));
    expect(bodies.join('\n')).not.toMatch(/apiKey|api_key|sk-/);
    http.get.mockResolvedValueOnce(ok(gateway()));
    expect(JSON.stringify(await aiCatalogApi.gateway())).not.toMatch(/sk-/);
  });

  it.each([[401], [403], [409], [400]])('lets a %i from the API reach the caller untouched', async (status) => {
    http.get.mockRejectedValueOnce(apiFailure(status, 'Refused'));
    await expect(aiCatalogApi.gateway()).rejects.toMatchObject({ response: { status } });
  });
});
