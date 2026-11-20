import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { InstructionsTab } from '../components/InstructionsTab';
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
const mount = (canWrite = true) => renderWithClient(<InstructionsTab canWrite={canWrite} notify={notify} />);

describe('InstructionsTab', () => {
  beforeEach(() => {
    notify.mockReset();
    Object.values(http).forEach((fn) => fn.mockReset());
    serve();
  });

  describe('platform instructions', () => {
    const BOXES = ['Main instruction', 'Instruction for the intent router', 'Instruction for Model 1: Primary', 'Instruction for Model 2: Images and voice', 'Instruction for Model 3: Specialist', 'Instruction for Model 4: Off-topic'];

    it('shows a main box and one box per role, each with a placeholder saying what belongs in it, and says the safety rules win', async () => {
      mount();
      for (const name of BOXES) {
        const box = (await screen.findByLabelText(name)) as HTMLTextAreaElement;
        expect(box.placeholder.length).toBeGreaterThan(20);
        expect(box.value).toBe('');
      }
      expect(screen.getByText(/the fixed safety rules \(they cannot be changed here and always win\)/)).toBeTruthy();
      expect(screen.getByText(/The workspace keeps its single instruction box/)).toBeTruthy();
      expect((screen.getByLabelText('Main instruction') as HTMLTextAreaElement).maxLength).toBe(4000);
      expect((screen.getByLabelText('Instruction for Model 1: Primary') as HTMLTextAreaElement).maxLength).toBe(2000);
    });

    it('shows what is saved and sends only the boxes that were edited', async () => {
      serve(overview({ policy: { ...policy, instructions: { main: 'Be warm.', slot1: 'Be brief.' } } }));
      http.put.mockResolvedValue(ok({ policy: { ...policy, instructions: { main: 'Be warm.', slot1: 'Be brief.', slot3: 'Stay calm.' } }, warnings: [] }));
      mount();
      expect(((await screen.findByLabelText('Main instruction')) as HTMLTextAreaElement).value).toBe('Be warm.');
      expect((screen.getByLabelText('Instruction for Model 1: Primary') as HTMLTextAreaElement).value).toBe('Be brief.');
      await userEvent.type(screen.getByLabelText('Instruction for Model 3: Specialist'), 'Stay calm.');
      expect(screen.getByText('Unsaved changes')).toBeTruthy();
      await userEvent.click(screen.getByRole('button', { name: 'Save instructions' }));
      await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/routing', { instructions: { slot3: 'Stay calm.' } }));
      await waitFor(() => expect(notify).toHaveBeenCalledWith('Instructions saved.', 'success'));
    });

    it('clears an instruction by sending an empty text', async () => {
      serve(overview({ policy: { ...policy, instructions: { slot2: 'Read the label first.' } } }));
      http.put.mockResolvedValue(ok({ policy, warnings: [] }));
      mount();
      await userEvent.clear(await screen.findByLabelText('Instruction for Model 2: Images and voice'));
      await userEvent.click(screen.getByRole('button', { name: 'Save instructions' }));
      await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/routing', { instructions: { slot2: '' } }));
    });

    it('counts the characters, and is read-only without write permission', async () => {
      serve(overview({ policy: { ...policy, instructions: { main: 'abc' } } }));
      const first = mount(false);
      const box = (await screen.findByLabelText('Main instruction')) as HTMLTextAreaElement;
      expect(box.disabled).toBe(true);
      expect(screen.getByText(/3 \/ 4,000 characters/)).toBeTruthy();
      first.unmount();
    });

    it('shows the API’s refusal of an instruction and keeps the draft', async () => {
      http.put.mockRejectedValue(apiFailure(400, 'Validation failed', [{ field: 'instructions.main', messages: ['must be at most 4000 characters'] }]));
      mount();
      await userEvent.type(await screen.findByLabelText('Main instruction'), 'x');
      await userEvent.click(screen.getByRole('button', { name: 'Save instructions' }));
      await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.any(String), 'error'));
      expect(screen.getByText('Unsaved changes')).toBeTruthy();
    });
  });
});
