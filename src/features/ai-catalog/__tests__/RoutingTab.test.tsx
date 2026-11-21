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

  describe('understand first', () => {
    it('is off by default and says what it does and what it costs', async () => {
      mount();
      expect(await screen.findByText('Understand first is not active')).toBeTruthy();
      expect((screen.getByRole('switch', { name: 'Understand first' }) as HTMLButtonElement).getAttribute('aria-checked')).toBe('false');
      expect(screen.getByText(/one extra short Model 1 request per customer message/)).toBeTruthy();
      expect(screen.getByText(/Works only while routing is on/)).toBeTruthy();
    });

    it('is switched on with its own switch, saved with the policy, and warns while routing is off', async () => {
      http.put.mockResolvedValue(ok({ policy: { ...policy, enabled: true, understandFirst: true }, warnings: [] }));
      mount();
      await userEvent.click(await screen.findByRole('switch', { name: 'Understand first' }));
      expect(screen.getByText(/Switch routing on as well/)).toBeTruthy();
      await userEvent.click(screen.getByRole('switch', { name: 'Routing enabled' }));
      expect(screen.queryByText(/Switch routing on as well/)).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'Save routing policy' }));
      await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/routing', { understandFirst: true, enabled: true }));
    });

    it('shows when it is active, and reads the saved value', async () => {
      serve(overview({ policy: { ...policy, enabled: true, understandFirst: true, understandFirstAvailable: true }, effective: { gatewayReady: true, routingActive: true, understandFirstActive: true } }));
      mount();
      expect(await screen.findByText('Understand first is active')).toBeTruthy();
      expect((screen.getByRole('switch', { name: 'Understand first' }) as HTMLButtonElement).getAttribute('aria-checked')).toBe('true');
    });

    it('cannot be changed until the API database update 0081 is applied, and says so', async () => {
      serve(overview({ policy: { ...policy, understandFirst: false, understandFirstAvailable: false } }));
      mount();
      expect(await screen.findByText(/database update 0081, which has not been applied yet/)).toBeTruthy();
      expect((screen.getByRole('switch', { name: 'Understand first' }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('is read-only without write permission', async () => {
      mount(false);
      expect((await screen.findByRole('switch', { name: 'Understand first' }) as HTMLButtonElement).disabled).toBe(true);
    });
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

  describe('reasoning effort: one choice per role, what each model accepts is read from OpenRouter', () => {
    const withSlot1 = (accepted?: string[], asked?: string) =>
      serve(overview({ policy: { ...policy, slot1ModelId: 'a', ...(asked ? { reasoningEfforts: { slot1: asked as never } } : {}), modelEfforts: accepted ? { a: accepted } : {} } }));

    it('has one effort control per role and no boxes to tick', async () => {
      withSlot1(['low', 'high']);
      mount();
      await screen.findByText('Model 1: Primary');
      expect(screen.getAllByRole('combobox', { name: /reasoning effort/ }).length).toBe(5);
      expect(screen.queryByRole('checkbox', { name: /accepts/ })).toBeNull();
      expect(screen.queryByText(/Reasoning efforts this model accepts/)).toBeNull();
    });

    it('says what an unset role really uses', async () => {
      withSlot1();
      mount();
      expect(await screen.findByText('Not set: this role uses “low”.')).toBeTruthy();
    });

    it('says the efforts are not read yet for a model OpenRouter has not been asked about, and sends the effort as chosen', async () => {
      withSlot1();
      mount();
      expect((await screen.findByTestId('slot1-accepts')).textContent).toMatch(/not read yet/);
      expect(screen.getByTestId('slot1-sends').textContent).toBe('Sends: low.');
    });

    it('shows what the model accepts, as read from OpenRouter, and the effort sent as chosen when it accepts it', async () => {
      withSlot1(['none', 'low', 'medium', 'high']);
      mount();
      expect((await screen.findByTestId('slot1-accepts')).textContent).toBe('This model accepts (read from OpenRouter): none, low, medium, high.');
      expect(screen.getByTestId('slot1-sends').textContent).toBe('Sends: low.');
    });

    it('shows the nearest accepted effort when the model does not accept the one chosen (GLM cannot turn reasoning off)', async () => {
      withSlot1(['low', 'high'], 'none');
      mount();
      expect((await screen.findByTestId('slot1-sends')).textContent).toBe('Sends: low (the model does not accept none, so the nearest it accepts).');
    });

    it('says nothing is sent to a model that takes no reasoning effort', async () => {
      withSlot1([], 'default');
      mount();
      expect((await screen.findByTestId('slot1-accepts')).textContent).toBe('This model takes no reasoning effort: nothing is sent to it.');
      expect(screen.getByTestId('slot1-sends').textContent).toBe('Sends nothing: the provider decides.');
    });

    it('offers only the efforts the model accepts, plus "nothing", and the one that is saved', async () => {
      withSlot1(['low', 'high'], 'low');
      mount();
      await userEvent.click(await screen.findByRole('combobox', { name: 'Model 1: Primary reasoning effort' }));
      const options = (await screen.findAllByRole('option')).map((option) => option.textContent);
      expect(options).toEqual(['low', 'high', 'Nothing (the provider decides)']);
    });

    it('saves the chosen effort for the role, and nothing about what a model accepts', async () => {
      withSlot1(['none', 'low', 'high']);
      http.put.mockResolvedValue(ok({ policy: { ...policy, slot1ModelId: 'a', reasoningEfforts: { slot1: 'none' } }, warnings: [] }));
      mount();
      await userEvent.click(await screen.findByRole('combobox', { name: 'Model 1: Primary reasoning effort' }));
      await userEvent.click(await screen.findByRole('option', { name: 'none' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save routing policy' }));
      await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/routing', { reasoningEfforts: { slot1: 'none' } }));
    });

    it('reads the efforts from OpenRouter on request and says what it found', async () => {
      withSlot1();
      http.post.mockResolvedValue(ok({ synced: 3, unknown: ['vendor/x'] }));
      mount();
      await userEvent.click(await screen.findByRole('button', { name: /Read efforts from OpenRouter/ }));
      await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/ai/routing/sync-efforts'));
      await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringMatching(/Read the reasoning efforts of 3 model\(s\).*vendor\/x/), 'warning'));
    });

    it('says so when OpenRouter cannot be read', async () => {
      withSlot1();
      http.post.mockRejectedValue(apiFailure(409, 'Conflict'));
      mount();
      await userEvent.click(await screen.findByRole('button', { name: /Read efforts from OpenRouter/ }));
      await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.any(String), 'error'));
    });

    it('has no reading button without write permission, and shows no effort sentence for a role with no model', async () => {
      mount(false);
      await screen.findByText('Model 1: Primary');
      expect(screen.queryByRole('button', { name: /Read efforts from OpenRouter/ })).toBeNull();
      expect(screen.getAllByText('No model chosen.').length).toBeGreaterThanOrEqual(5);
    });
  });
});
