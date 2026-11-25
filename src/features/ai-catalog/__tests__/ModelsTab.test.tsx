import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { ModelsTab } from '../components/ModelsTab';
import type { AiModel } from '../types';
import { apiFailure, model, ok, renderWithClient } from './testUtils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;

const ready = model({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', modelId: 'ready-model', displayName: 'Ready Model', enabled: false });
const live = model({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', modelId: 'live-model', displayName: 'Live Model', enabled: true, capabilities: ['chat', 'vision'] });
const raw = model({
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  modelId: 'raw-model',
  displayName: 'Raw Model',
  contextWindow: null,
  availabilityVerifiedAt: null,
  pricing: { inputPerMillion: null, outputPerMillion: null, cachedInputPerMillion: null, currency: 'USD', note: null, updatedAt: null },
});

function serve(models: AiModel[] = [ready, live, raw]) {
  http.get.mockImplementation(async (path: string) => {
    if (path === '/admin/ai/models') return ok(models);
    throw new Error(`unexpected GET ${path}`);
  });
}

const notify = vi.fn();
const mount = (canWrite = true) => renderWithClient(<ModelsTab canWrite={canWrite} notify={notify} />);
const rowOf = async (name: string) => within((await screen.findByText(name)).closest('tr') as HTMLElement);

describe('ModelsTab', () => {
  beforeEach(() => {
    notify.mockReset();
    serve();
  });

  it('lists what the API holds: id, capabilities, context, verification, status', async () => {
    mount();
    const row = await rowOf('Live Model');
    expect(row.getByText('live-model')).toBeTruthy();
    expect(row.getByText('Vision (reads pictures)')).toBeTruthy();
    expect(row.getByText('128,000')).toBeTruthy();
    expect(row.getByText('Verified')).toBeTruthy();
    const unverified = await rowOf('Raw Model');
    expect(unverified.getByText('Not verified')).toBeTruthy();
    expect(unverified.getByText('not set')).toBeTruthy();
  });

  it('says there are no models, and that none are built in', async () => {
    serve([]);
    mount();
    expect(await screen.findByText('No models yet')).toBeTruthy();
    expect(screen.getByText(/None are built in/)).toBeTruthy();
  });

  it('says plainly when the API refuses with 403', async () => {
    http.get.mockRejectedValue(apiFailure(403, 'Forbidden'));
    mount();
    expect(await screen.findByText(/don’t have permission/)).toBeTruthy();
  });

  it('offers no change to someone who may only read', async () => {
    mount(false);
    await screen.findByText('Live Model');
    expect(screen.queryByRole('button', { name: /Add model|Verify|Prices|Edit|Delete/ })).toBeNull();
    expect((screen.getByRole('switch', { name: 'Disable Live Model' }) as HTMLButtonElement).disabled).toBe(true);
  });

  describe('enabling', () => {
    it('is not possible until the model is verified', async () => {
      mount();
      await rowOf('Raw Model');
      const toggle = screen.getByRole('switch', { name: 'Enable Raw Model' }) as HTMLButtonElement;
      expect(toggle.disabled).toBe(true);
      expect(toggle.title).toBe('Verify the model first');
      expect((screen.getByRole('switch', { name: 'Enable Ready Model' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('asks first, then enables, and reports success', async () => {
      http.patch.mockResolvedValue(ok({ ...ready, enabled: true }));
      mount();
      await rowOf('Ready Model');
      await userEvent.click(screen.getByRole('switch', { name: 'Enable Ready Model' }));
      const confirm = await screen.findByRole('alertdialog');
      expect(within(confirm).getByText(/It can then answer customers when it is chosen in the Routing tab/)).toBeTruthy();
      expect(http.patch).not.toHaveBeenCalled();
      await userEvent.click(within(confirm).getByRole('button', { name: 'Enable model' }));
      await waitFor(() => expect(http.patch).toHaveBeenCalledWith(`/admin/ai/models/${ready.id}/status`, { enabled: true }));
      await waitFor(() => expect(notify).toHaveBeenCalledWith('Ready Model was enabled.', 'success'));
    });

    it('treats disabling as destructive, with the consequence spelled out, and can be cancelled', async () => {
      http.patch.mockResolvedValue(ok({ ...live, enabled: false }));
      mount();
      await rowOf('Live Model');
      await userEvent.click(screen.getByRole('switch', { name: 'Disable Live Model' }));
      const confirm = await screen.findByRole('alertdialog');
      expect(within(confirm).getByText(/It stops answering customers right away if it is in use/)).toBeTruthy();
      await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
      expect(http.patch).not.toHaveBeenCalled();
    });

    it('shows the API’s reason when it refuses, and keeps the question open', async () => {
      http.patch.mockRejectedValue(apiFailure(409, "Verify the model with OpenRouter before enabling it"));
      mount();
      await rowOf('Ready Model');
      await userEvent.click(screen.getByRole('switch', { name: 'Enable Ready Model' }));
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Enable model' }));
      expect(await screen.findByText("Verify the model with OpenRouter before enabling it")).toBeTruthy();
      expect(notify).not.toHaveBeenCalled();
    });

    it('deletes a model after confirmation, saying what cannot be deleted', async () => {
      http.delete.mockResolvedValue(ok({ deleted: true }));
      mount();
      await rowOf('Raw Model');
      await userEvent.click(screen.getByRole('button', { name: 'Delete Raw Model' }));
      const confirm = await screen.findByRole('alertdialog');
      expect(within(confirm).getByText(/cannot be deleted: switch it off instead/)).toBeTruthy();
      expect(http.delete).not.toHaveBeenCalled();
      await userEvent.click(within(confirm).getByRole('button', { name: 'Delete model' }));
      await waitFor(() => expect(http.delete).toHaveBeenCalledWith(`/admin/ai/models/${raw.id}`));
      await waitFor(() => expect(notify).toHaveBeenCalledWith('Raw Model was deleted.', 'success'));
    });

    it('shows the API’s reason when a model cannot be deleted, and keeps the question open', async () => {
      http.delete.mockRejectedValue(apiFailure(409, 'This model is used by the routing policy. Choose another model there first.'));
      mount();
      await rowOf('Live Model');
      await userEvent.click(screen.getByRole('button', { name: 'Delete Live Model' }));
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete model' }));
      expect(await screen.findByText('This model is used by the routing policy. Choose another model there first.')).toBeTruthy();
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('verifying with OpenRouter', () => {
    const verifyRow = async (name: string) => userEvent.click((await rowOf(name)).getByRole('button', { name: 'Verify' }));

    it('reports a model OpenRouter confirmed', async () => {
      http.post.mockResolvedValue(ok({ model: { ...raw, availabilityVerifiedAt: '2026-11-01T12:00:00.000Z' }, verification: { verified: true, reason: 'available' } }));
      mount();
      await verifyRow('Raw Model');
      await waitFor(() => expect(notify).toHaveBeenCalledWith('Raw Model: OpenRouter confirmed the key can use this model.', 'success'));
      expect(http.post).toHaveBeenCalledWith(`/admin/ai/models/${raw.id}/verify`);
    });

    it('warns when OpenRouter does not know the model, and says it was switched off', async () => {
      http.post.mockResolvedValue(ok({ model: { ...live, enabled: false, availabilityVerifiedAt: null }, verification: { verified: false, reason: 'not_found' } }));
      mount();
      await verifyRow('Live Model');
      await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining('It was switched off'), 'warning'));
    });

    it.each([
      ['unauthorized', 'OpenRouter rejected the key'],
      ['unreachable', 'Nothing was changed.'],
      ['no_key', 'OPENROUTER_API_KEY is not set'],
    ] as const)('reports %s as an error', async (reason, text) => {
      http.post.mockResolvedValue(ok({ model: raw, verification: { verified: false, reason } }));
      mount();
      await verifyRow('Raw Model');
      await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining(text), 'error'));
    });

    it('reports a failed request using the API’s message', async () => {
      http.post.mockRejectedValue(apiFailure(500, 'The catalogue is unavailable'));
      mount();
      await verifyRow('Raw Model');
      await waitFor(() => expect(notify).toHaveBeenCalledWith('The catalogue is unavailable', 'error'));
    });
  });

  describe('adding and editing', () => {
    it('refuses a model id with spaces and an empty name before asking the API', async () => {
      mount();
      await screen.findByText('Live Model');
      await userEvent.click(screen.getByRole('button', { name: 'Add model' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('Model id'), 'has space');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add model' }));
      expect(within(dialog).getByText(/Use the OpenRouter id: author\/model-name/)).toBeTruthy();
      expect(within(dialog).getByText('Enter a display name')).toBeTruthy();
      expect(http.post).not.toHaveBeenCalled();
    });

    it("refuses an id that is not in OpenRouter's author/model-name form before asking the API, and shows an example as a placeholder only", async () => {
      mount();
      await screen.findByText('Live Model');
      await userEvent.click(screen.getByRole('button', { name: 'Add model' }));
      const dialog = await screen.findByRole('dialog');
      const input = within(dialog).getByLabelText('Model id') as HTMLInputElement;
      expect(input.value).toBe('');
      expect(input.placeholder).toBe('author/model-name');
      await userEvent.type(input, 'gpt-4o');
      await userEvent.type(within(dialog).getByLabelText('Display name'), 'No author');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add model' }));
      expect(within(dialog).getByText(/Use the OpenRouter id: author\/model-name/)).toBeTruthy();
      expect(http.post).not.toHaveBeenCalled();
    });

    it('adds a model, with the chat capability, and says what is still to do', async () => {
      http.post.mockResolvedValue(ok(model({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', modelId: 'fixture/new', displayName: 'Fixture New' })));
      mount();
      await screen.findByText('Live Model');
      await userEvent.click(screen.getByRole('button', { name: 'Add model' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('Model id'), 'fixture/new');
      await userEvent.type(within(dialog).getByLabelText('Display name'), 'Fixture New');
      await userEvent.type(within(dialog).getByLabelText('Context window (tokens, optional)'), '64000');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add model' }));
      await waitFor(() =>
        expect(http.post).toHaveBeenCalledWith('/admin/ai/models', { modelId: 'fixture/new', displayName: 'Fixture New', contextWindow: 64000, capabilities: ['chat'] }),
      );
      await waitFor(() => expect(notify).toHaveBeenCalledWith('Fixture New was added. Verify it before enabling.', 'success'));
    });

    it('edits the display name and context window but not the model id', async () => {
      http.patch.mockResolvedValue(ok({ ...live, displayName: 'Live Renamed', contextWindow: null }));
      mount();
      await rowOf('Live Model');
      await userEvent.click(screen.getByRole('button', { name: 'Edit Live Model' }));
      const dialog = await screen.findByRole('dialog');
      expect((within(dialog).getByLabelText('Model id') as HTMLInputElement).disabled).toBe(true);
      await userEvent.clear(within(dialog).getByLabelText('Display name'));
      await userEvent.type(within(dialog).getByLabelText('Display name'), 'Live Renamed');
      await userEvent.clear(within(dialog).getByLabelText('Context window (tokens, optional)'));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
      await waitFor(() =>
        expect(http.patch).toHaveBeenCalledWith(`/admin/ai/models/${live.id}`, { displayName: 'Live Renamed', description: live.description, contextWindow: null, capabilities: ['chat', 'vision'] }),
      );
    });

    it('shows a duplicate model as the API’s conflict', async () => {
      http.post.mockRejectedValue(apiFailure(409, 'A record with the same unique value already exists'));
      mount();
      await screen.findByText('Live Model');
      await userEvent.click(screen.getByRole('button', { name: 'Add model' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('Model id'), 'vendor/live-model');
      await userEvent.type(within(dialog).getByLabelText('Display name'), 'Again');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add model' }));
      expect(await within(dialog).findByText('A record with the same unique value already exists')).toBeTruthy();
    });
  });
});
