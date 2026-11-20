import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { RoutingTab } from '../components/RoutingTab';
import type { RoutingOverview } from '../types';
import { apiFailure, model, ok, renderWithClient } from './testUtils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch', Mock>;

const policy: RoutingOverview['policy'] = {
  enabled: false, routerModelId: null, routerEnabled: true, slot1ModelId: null, slot2ModelId: null, slot3ModelId: null, slot4ModelId: null,
  slot1Enabled: true, slot2Enabled: true, slot3Enabled: true, slot4Enabled: true, maxRetries: null, requestTimeoutMs: null, routerTimeoutMs: 5000,
  maxOutputTokens: 1200, routerMaxTokens: 160, offtopicConfidence: 0.85, fallbackSlots: [3, 1, 2], breakerThreshold: 3, breakerOpenSeconds: 60,
  maxAttemptsPerMessage: 6, intentSlots: {}, reasoningEfforts: {}, modelEfforts: {}, updatedAt: '2026-11-18T10:00:00.000Z',
};
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

function serve(data: RoutingOverview = overview()) {
  http.get.mockImplementation(async (path: string) => {
    if (path === '/admin/ai/routing') return ok(data);
    if (path === '/admin/ai/routing/health') return ok({ breakers: [] });
    if (path === '/admin/ai/models') return ok([model({ id: 'a', modelId: 'm-a', displayName: 'Model A', enabled: true })]);
    throw new Error(`unexpected GET ${path}`);
  });
}

const notify = vi.fn();
const mount = (canWrite = true) => renderWithClient(<RoutingTab canWrite={canWrite} notify={notify} />);

describe('RoutingTab', () => {
  beforeEach(() => {
    notify.mockReset();
    Object.values(http).forEach((fn) => fn.mockReset());
    serve();
  });

  it('says plainly that routing is not active, that Model 1 answers everything meanwhile, and whether the gateway is ready', async () => {
    mount();
    expect(await screen.findByText('Routing is not active')).toBeTruthy();
    expect(screen.getByText('No Model 1: the AI is off')).toBeTruthy();
    expect(screen.getByText(/every AI request is answered by Model 1/)).toBeTruthy();
    expect(screen.getByText(/Technical fallback never uses Model 4/)).toBeTruthy();
  });

  it('shows the router and the four slots, each with what it is for', async () => {
    mount();
    for (const title of ['Intent router', 'Model 1: Primary', 'Model 2: Images and voice', 'Model 3: Specialist', 'Model 4: Off-topic']) expect(await screen.findByText(title)).toBeTruthy();
    expect(screen.getByText(/Only for genuinely off-topic chat/)).toBeTruthy();
  });

  it('sends only what changed, and shows what the server says back', async () => {
    http.put.mockResolvedValue(ok({ policy: { ...policy, maxRetries: 3 }, warnings: [] }));
    mount();
    const retries = await screen.findByLabelText('Extra attempts (0-5)');
    await userEvent.type(retries, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Save routing policy' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
    expect(http.put).toHaveBeenCalledWith('/admin/ai/routing', { maxRetries: 3 });
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Routing policy saved.', 'success'));
  });

  it('turns routing on with the platform switch', async () => {
    http.put.mockResolvedValue(ok({ policy: { ...policy, enabled: true }, warnings: [] }));
    mount();
    await userEvent.click(await screen.findByRole('switch', { name: 'Routing enabled' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save routing policy' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/routing', { enabled: true }));
  });

  it('shows the API\'s refusal and keeps the draft', async () => {
    http.put.mockRejectedValue(apiFailure(400, 'Validation failed', [{ field: 'enabled', messages: ['Routing needs a primary model (slot 1) before it can be switched on'] }]));
    mount();
    await userEvent.click(await screen.findByRole('switch', { name: 'Routing enabled' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save routing policy' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringMatching(/primary model|refused|Validation/), 'error'));
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
  });

  it('checks the configuration and lists errors and warnings', async () => {
    http.post.mockResolvedValue(ok({ ok: false, problems: [{ level: 'error', role: 'slot2', code: 'slot2_no_vision', message: 'x/y is not marked as able to see pictures (vision), which slot 2 is for.' }, { level: 'warning', role: 'router', code: 'missing_router', message: 'No router model is set.' }] }));
    mount();
    await userEvent.click(await screen.findByRole('button', { name: /Check the configuration/ }));
    expect(await screen.findByText(/not marked as able to see pictures/)).toBeTruthy();
    expect(screen.getByText(/No router model is set/)).toBeTruthy();
  });

  it('says plainly whether the gateway is ready, and never shows a key', async () => {
    serve(overview({ gateway: { configured: false, baseUrl: 'https://openrouter.ai/api/v1' } }));
    mount();
    expect(await screen.findByText('No key set: the AI is off')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/sk-/);
    expect(screen.queryByRole('button', { name: /Create the OpenRouter provider/ })).toBeNull();
  });

  it('every control is read-only without write permission', async () => {
    const first = mount(false);
    expect(await screen.findByText('Routing is not active')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save routing policy' })).toBeNull();
    expect((screen.getByRole('switch', { name: 'Routing enabled' }) as HTMLButtonElement).disabled).toBe(true);
    first.unmount();
  });

  it('explains when the API refuses with 403', async () => {
    http.get.mockImplementation(async (path: string) => {
      if (path === '/admin/ai/routing') throw apiFailure(403, 'Forbidden');
      return ok([]);
    });
    mount();
    expect(await screen.findByText(/routing policy/i)).toBeTruthy();
  });

  describe('reasoning effort: what is asked for and what is really sent', () => {
    const withSlot1 = (accepted?: string[], asked?: string) =>
      serve(overview({ policy: { ...policy, slot1ModelId: 'a', ...(asked ? { reasoningEfforts: { slot1: asked as never } } : {}), modelEfforts: accepted ? { a: accepted } : {} } }));

    it('says what an unset role really asks for, never "provider default" when the API sends something else', async () => {
      withSlot1();
      mount();
      expect(await screen.findByText(/Model 1: Primary/)).toBeTruthy();
      expect(screen.getByText('Not set: this role asks for “low”.')).toBeTruthy();
      expect(screen.queryByText(/nothing sent/i)).toBeNull();
    });

    it('says no effort is sent to a model whose accepted efforts are not recorded', async () => {
      withSlot1();
      mount();
      expect((await screen.findByTestId('slot1-sends')).textContent).toBe('Sends nothing: the efforts this model accepts are not recorded below.');
    });

    it('shows the effort sent as it is asked for when the model accepts it', async () => {
      withSlot1(['low', 'medium', 'high']);
      mount();
      expect((await screen.findByTestId('slot1-sends')).textContent).toBe('Sends: low.');
    });

    it('shows the nearest accepted effort when the model does not accept the one asked for (Gemini cannot turn reasoning off)', async () => {
      withSlot1(['low', 'medium', 'high'], 'none');
      mount();
      expect((await screen.findByTestId('slot1-sends')).textContent).toBe('Sends: low (the model does not accept none).');
    });

    it('records what a model accepts, live, and saves it with the policy', async () => {
      withSlot1();
      http.put.mockResolvedValue(ok({ policy: { ...policy, slot1ModelId: 'a', modelEfforts: { a: ['low'] } }, warnings: [] }));
      mount();
      await userEvent.click(await screen.findByRole('checkbox', { name: 'Model 1: Primary accepts low' }));
      expect(screen.getByTestId('slot1-sends').textContent).toBe('Sends: low.');
      await userEvent.click(screen.getByRole('button', { name: 'Save routing policy' }));
      await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/routing', { modelEfforts: { a: ['low'] } }));
    });

    it('shows no accepted-effort boxes for a role with no model', async () => {
      mount();
      await screen.findByText(/Model 1: Primary/);
      expect(screen.queryByRole('checkbox', { name: /accepts/ })).toBeNull();
      expect(screen.getAllByText('No model chosen.').length).toBe(5);
    });
  });
});
