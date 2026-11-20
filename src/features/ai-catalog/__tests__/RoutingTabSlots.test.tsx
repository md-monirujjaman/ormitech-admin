import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { RoutingTab } from '../components/RoutingTab';
import type { RoutingModelView, RoutingOverview } from '../types';
import { model, ok, renderWithClient } from './testUtils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch', Mock>;

/**
 * What the Model 1-4 fields show: the model that is really saved, or plainly "Not set". A saved model must never show as empty or as the
 * "Not set" example, whether it is switched off, whether the model list has not arrived yet, or whether the answer to a save is still being
 * re-read from the server.
 */

const A = '11111111-1111-4111-8111-11111111111a';
const B = '22222222-2222-4222-8222-22222222222b';
const C = '33333333-3333-4333-8333-33333333333c';

const policy: RoutingOverview['policy'] = {
  enabled: false, routerModelId: null, routerEnabled: true, slot1ModelId: null, slot2ModelId: null, slot3ModelId: null, slot4ModelId: null,
  slot1Enabled: true, slot2Enabled: true, slot3Enabled: true, slot4Enabled: true, maxRetries: null, requestTimeoutMs: null, routerTimeoutMs: 5000,
  maxOutputTokens: 1200, routerMaxTokens: 160, offtopicConfidence: 0.85, fallbackSlots: [3, 1, 2], breakerThreshold: 3, breakerOpenSeconds: 60,
  maxAttemptsPerMessage: 6, intentSlots: {}, reasoningEfforts: {}, modelEfforts: {}, updatedAt: '2026-11-18T10:00:00.000Z',
};

const view = (role: RoutingModelView['role'], modelRowId: string, modelId: string, displayName: string, over: Partial<RoutingModelView> = {}): RoutingModelView => ({
  role, modelRowId, modelId, displayName, providerSlug: 'openrouter', capabilities: ['chat'], contextWindow: 128000, usable: true, acceptedEfforts: null, requestedEffort: 'low', sends: 'default', enabled: true, priced: true, verified: true, ...over,
});

const overview = (over: Partial<RoutingOverview> = {}): RoutingOverview => ({
  gateway: { configured: true, baseUrl: 'https://openrouter.ai/api/v1' },
  environment: { maxRetries: 2, requestTimeoutMs: 30000 },
  policy,
  models: [],
  defaults: { intentSlots: {}, reasoningEfforts: { router: 'none', slot1: 'low', slot2: 'minimal', slot3: 'none', slot4: 'none' } },
  intents: ['pricing'],
  effective: { gatewayReady: false, routingActive: false },
  ...over,
});

const catalogue = [
  model({ id: A, modelId: 'vendor/model-a', displayName: 'Model A', enabled: true }),
  model({ id: B, modelId: 'vendor/model-b', displayName: 'Model B', enabled: true }),
  model({ id: C, modelId: 'vendor/model-c', displayName: 'Model C', enabled: false }),
];

function serve(data: RoutingOverview, models = catalogue) {
  http.get.mockImplementation(async (path: string) => {
    if (path === '/admin/ai/routing') return ok(data);
    if (path === '/admin/ai/routing/health') return ok({ breakers: [] });
    if (path === '/admin/ai/models') return ok(models);
    throw new Error(`unexpected GET ${path}`);
  });
}

const notify = vi.fn();
const mount = () => renderWithClient(<RoutingTab canWrite notify={notify} />);
const field = (title: string) => screen.findByRole('combobox', { name: `${title} model` });

describe('Model 1-4 fields show what is saved', () => {
  beforeEach(() => {
    notify.mockReset();
    Object.values(http).forEach((fn) => fn.mockReset());
  });

  it('shows the saved model by name, and a slot with nothing saved as "Not set"', async () => {
    serve(overview({ policy: { ...policy, slot1ModelId: A }, models: [view('slot1', A, 'vendor/model-a', 'Model A')] }));
    mount();
    expect((await field('Model 1: Primary')).textContent).toContain('Model A (openrouter/vendor/model-a)');
    expect((await field('Model 2: Images and voice')).textContent).toContain('Not set');
    expect((await field('Model 4: Off-topic')).textContent).toContain('Not set');
  });

  it('still shows a saved model that has since been switched off, and says so, instead of an empty field', async () => {
    serve(overview({ policy: { ...policy, slot3ModelId: C }, models: [view('slot3', C, 'vendor/model-c', 'Model C', { enabled: false, usable: false })] }));
    mount();
    const trigger = await field('Model 3: Specialist');
    expect(trigger.textContent).toContain('Model C (openrouter/vendor/model-c)');
    expect(trigger.textContent).not.toContain('Not set');
    expect(screen.getByText(/saved model is switched off/i)).toBeTruthy();
  });

  it('shows the saved model while the model list is still loading', async () => {
    let release: (value: unknown) => void = () => undefined;
    const slow = new Promise((resolve) => {
      release = resolve;
    });
    http.get.mockImplementation(async (path: string) => {
      if (path === '/admin/ai/routing') return ok(overview({ policy: { ...policy, slot2ModelId: B }, models: [view('slot2', B, 'vendor/model-b', 'Model B')] }));
      if (path === '/admin/ai/routing/health') return ok({ breakers: [] });
      if (path === '/admin/ai/models') {
        await slow;
        return ok(catalogue);
      }
      throw new Error(`unexpected GET ${path}`);
    });
    mount();
    const trigger = await field('Model 2: Images and voice');
    expect(trigger.textContent).toContain('Model B (openrouter/vendor/model-b)');
    release(undefined);
  });

  it('shows the model the server saved straight away, even while the routing view is still being read again', async () => {
    const before = overview();
    const after = overview({ policy: { ...policy, slot1ModelId: B }, models: [view('slot1', B, 'vendor/model-b', 'Model B')] });
    let routingReads = 0;
    let release: (value: unknown) => void = () => undefined;
    const slowRead = new Promise((resolve) => {
      release = resolve;
    });
    http.get.mockImplementation(async (path: string) => {
      if (path === '/admin/ai/routing') {
        routingReads += 1;
        if (routingReads === 1) return ok(before);
        await slowRead;
        return ok(after);
      }
      if (path === '/admin/ai/routing/health') return ok({ breakers: [] });
      if (path === '/admin/ai/models') return ok(catalogue);
      throw new Error(`unexpected GET ${path}`);
    });
    http.put.mockResolvedValue(ok({ policy: { ...policy, slot1ModelId: B }, warnings: [] }));
    mount();

    await userEvent.click(await field('Model 1: Primary'));
    await userEvent.click(await screen.findByRole('option', { name: /Model B/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save routing policy' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/routing', { slot1ModelId: B }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Routing policy saved.', 'success'));

    // The routing view has not been read again yet: the field must already show the saved model, not the old "Not set".
    expect(routingReads).toBeGreaterThan(1);
    expect((await field('Model 1: Primary')).textContent).toContain('Model B (openrouter/vendor/model-b)');
    expect((await field('Model 1: Primary')).textContent).not.toContain('Not set');
    release(undefined);
  });

  it('says what is saved when the choice on screen is not saved yet', async () => {
    serve(overview({ policy: { ...policy, slot1ModelId: A }, models: [view('slot1', A, 'vendor/model-a', 'Model A')] }));
    mount();
    await userEvent.click(await field('Model 1: Primary'));
    await userEvent.click(await screen.findByRole('option', { name: /Model B/ }));
    expect(screen.getByText(/Not saved yet\. Saved now: Model A \(openrouter\/vendor\/model-a\)\./)).toBeTruthy();
  });

  it('keeps an unsaved choice marked as unsaved, and never shows the example text as a value', async () => {
    serve(overview());
    mount();
    const trigger = await field('Model 1: Primary');
    expect(trigger.textContent).toContain('Not set');
    expect(within(trigger).queryByText(/Model A/)).toBeNull();
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('option', { name: /Model A/ }));
    expect((await field('Model 1: Primary')).textContent).toContain('Model A');
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
  });
});
