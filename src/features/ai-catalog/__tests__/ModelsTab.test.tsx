import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { ModelsTab } from '../components/ModelsTab';
import type { AiModel } from '../types';
import { apiFailure, model, ok, provider, renderWithClient } from './testUtils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch', Mock>;

const ready = model({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', modelId: 'ready-model', displayName: 'Ready Model', enabled: false });
const live = model({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', modelId: 'live-model', displayName: 'Live Model', enabled: true, isDefault: true, capabilities: ['chat', 'vision'] });
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
    if (path === '/admin/ai/providers') return ok([provider()]);
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

  it('lists what the API holds: id, capabilities, context, prices, verification, status', async () => {
    mount();
    const row = await rowOf('Live Model');
    expect(row.getByText('live-model')).toBeTruthy();
    expect(row.getByText('Vision (reads pictures)')).toBeTruthy();
    expect(row.getByText('128,000')).toBeTruthy();
    // 0.15000000 is shown as 0.15: the database padding goes, nothing is rounded.
    expect(row.getByText(/In 0\.15 · Out 0\.6 USD/)).toBeTruthy();
    expect(row.getByText('Verified')).toBeTruthy();
    expect(row.getByText('Provider default')).toBeTruthy();
    const unpriced = await rowOf('Raw Model');
    expect(unpriced.getByText('Not priced')).toBeTruthy();
    expect(unpriced.getByText('Not verified')).toBeTruthy();
    expect(unpriced.getByText('not set')).toBeTruthy();
  });

  it('shows the cached price when the model has one', async () => {
    serve([model({ pricing: { inputPerMillion: '1.00000000', outputPerMillion: '4.00000000', cachedInputPerMillion: '0.10000000', currency: 'USD', note: null, updatedAt: null } })]);
    mount();
    expect(await screen.findByText('Cached in 0.1')).toBeTruthy();
  });

  it('says there are no models, and that none are built in', async () => {
    serve([]);
    mount();
    expect(await screen.findByText('No models in the catalogue')).toBeTruthy();
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
    expect(screen.queryByRole('button', { name: /Add model|Verify|Prices|Edit/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Make default' })).toBeNull();
    expect((screen.getByRole('switch', { name: 'Disable Live Model' }) as HTMLButtonElement).disabled).toBe(true);
  });

  describe('enabling', () => {
    it('is not possible until the model is priced and verified', async () => {
      mount();
      await rowOf('Raw Model');
      const toggle = screen.getByRole('switch', { name: 'Enable Raw Model' }) as HTMLButtonElement;
      expect(toggle.disabled).toBe(true);
      expect(toggle.title).toBe('Set prices and verify the model first');
      expect((screen.getByRole('switch', { name: 'Enable Ready Model' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('asks first, then enables, and reports success', async () => {
      http.patch.mockResolvedValue(ok({ ...ready, enabled: true }));
      mount();
      await rowOf('Ready Model');
      await userEvent.click(screen.getByRole('switch', { name: 'Enable Ready Model' }));
      const confirm = await screen.findByRole('alertdialog');
      expect(within(confirm).getByText(/Workspaces on the plans you allow will be answered by this model/)).toBeTruthy();
      expect(http.patch).not.toHaveBeenCalled();
      await userEvent.click(within(confirm).getByRole('button', { name: 'Enable model' }));
      await waitFor(() => expect(http.patch).toHaveBeenCalledWith(`/admin/ai/models/${ready.id}/status`, { enabled: true }));
      await waitFor(() => expect(notify).toHaveBeenCalledWith('Ready Model was enabled.', 'success'));
    });

    it('treats disabling as destructive, with the consequence spelled out, and can be cancelled', async () => {
      http.patch.mockResolvedValue(ok({ ...live, enabled: false, isDefault: false }));
      mount();
      await rowOf('Live Model');
      await userEvent.click(screen.getByRole('switch', { name: 'Disable Live Model' }));
      const confirm = await screen.findByRole('alertdialog');
      expect(within(confirm).getByText(/Workspaces stop being answered by it/)).toBeTruthy();
      await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
      expect(http.patch).not.toHaveBeenCalled();
    });

    it('shows the API’s reason when it refuses, and keeps the question open', async () => {
      http.patch.mockRejectedValue(apiFailure(409, "Verify the model against the provider's API before enabling it"));
      mount();
      await rowOf('Ready Model');
      await userEvent.click(screen.getByRole('switch', { name: 'Enable Ready Model' }));
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Enable model' }));
      expect(await screen.findByText("Verify the model against the provider's API before enabling it")).toBeTruthy();
      expect(notify).not.toHaveBeenCalled();
    });

    it('makes an enabled model the provider’s default after confirmation', async () => {
      http.post.mockResolvedValue(ok({ ...live, isDefault: true }));
      serve([{ ...ready, enabled: true }, live]);
      mount();
      await rowOf('Ready Model');
      await userEvent.click(screen.getByRole('button', { name: 'Make default' }));
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Make default' }));
      await waitFor(() => expect(http.post).toHaveBeenCalledWith(`/admin/ai/models/${ready.id}/default`));
    });
  });

  describe('verifying with the provider', () => {
    const verifyRow = async (name: string) => userEvent.click((await rowOf(name)).getByRole('button', { name: 'Verify' }));

    it('reports a model the provider confirmed', async () => {
      http.post.mockResolvedValue(ok({ model: { ...raw, availabilityVerifiedAt: '2026-11-01T12:00:00.000Z' }, verification: { verified: true, reason: 'available' } }));
      mount();
      await verifyRow('Raw Model');
      await waitFor(() => expect(notify).toHaveBeenCalledWith('Raw Model: The provider confirmed this key can use the model.', 'success'));
      expect(http.post).toHaveBeenCalledWith(`/admin/ai/models/${raw.id}/verify`);
    });

    it('warns when the provider does not know the model, and says it was switched off', async () => {
      http.post.mockResolvedValue(ok({ model: { ...live, enabled: false, isDefault: false, availabilityVerifiedAt: null }, verification: { verified: false, reason: 'not_found' } }));
      mount();
      await verifyRow('Live Model');
      await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining('It was switched off'), 'warning'));
    });

    it.each([
      ['unauthorized', 'The provider rejected the key'],
      ['unreachable', 'Nothing was changed.'],
      ['no_key', 'no API key yet'],
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

  describe('prices', () => {
    const openPrices = async (name: string) => userEvent.click((await rowOf(name)).getByRole('button', { name: 'Prices' }));

    it('starts from what the API holds, and starts empty for a model with no price (nothing is pre-filled)', async () => {
      mount();
      await openPrices('Live Model');
      let dialog = await screen.findByRole('dialog');
      expect((within(dialog).getByLabelText('Input price') as HTMLInputElement).value).toBe('0.15');
      expect((within(dialog).getByLabelText('Output price') as HTMLInputElement).value).toBe('0.6');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

      await openPrices('Raw Model');
      dialog = await screen.findByRole('dialog');
      expect((within(dialog).getByLabelText('Input price') as HTMLInputElement).value).toBe('');
      expect((within(dialog).getByLabelText('Output price') as HTMLInputElement).value).toBe('');
    });

    it('refuses prices that are not prices, with the reason, without sending anything', async () => {
      mount();
      await openPrices('Raw Model');
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('Input price'), '-1');
      await userEvent.type(within(dialog).getByLabelText('Output price'), '0.123456789');
      await userEvent.clear(within(dialog).getByLabelText('Currency'));
      await userEvent.type(within(dialog).getByLabelText('Currency'), 'usd');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review change' }));
      expect(within(dialog).getByText(/The input price must be a number with up to 8 decimal places/)).toBeTruthy();
      expect(within(dialog).getByText(/The output price must be a number with up to 8 decimal places/)).toBeTruthy();
      expect(within(dialog).getByText(/three-letter upper-case code/)).toBeTruthy();
      expect(http.put).not.toHaveBeenCalled();
    });

    it('shows exactly what changes, asks again, then sends the prices as the text that was typed', async () => {
      http.put.mockResolvedValue(
        ok({ ...live, pricing: { inputPerMillion: '0.12345678', outputPerMillion: '999999.87654321', cachedInputPerMillion: '0.00000001', currency: 'USD', note: 'read on 2026-11-01', updatedAt: '2026-11-01T12:00:00.000Z' } }),
      );
      mount();
      await openPrices('Live Model');
      const dialog = await screen.findByRole('dialog');
      await userEvent.clear(within(dialog).getByLabelText('Input price'));
      await userEvent.type(within(dialog).getByLabelText('Input price'), '0.12345678');
      await userEvent.clear(within(dialog).getByLabelText('Output price'));
      await userEvent.type(within(dialog).getByLabelText('Output price'), '999999.87654321');
      await userEvent.type(within(dialog).getByLabelText('Cached input price (optional)'), '0.00000001');
      await userEvent.clear(within(dialog).getByLabelText('Where the price came from (optional)'));
      await userEvent.type(within(dialog).getByLabelText('Where the price came from (optional)'), 'read on 2026-11-01');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review change' }));

      expect(http.put).not.toHaveBeenCalled();
      expect(within(dialog).getByText('0.15 → 0.12345678')).toBeTruthy();
      expect(within(dialog).getByText('0.6 → 999999.87654321')).toBeTruthy();
      expect(within(dialog).getByText('not set → 0.00000001')).toBeTruthy();
      expect(within(dialog).getByText(/recorded in the audit log with the old and new figures/)).toBeTruthy();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm and save' }));
      await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
      expect(http.put).toHaveBeenCalledWith(`/admin/ai/models/${live.id}/pricing`, {
        inputPerMillion: '0.12345678',
        outputPerMillion: '999999.87654321',
        cachedInputPerMillion: '0.00000001',
        currency: 'USD',
        note: 'read on 2026-11-01',
      });
      await waitFor(() => expect(notify).toHaveBeenCalledWith('Prices for Live Model were saved.', 'success'));
    });

    it('can go back from the review to change a figure', async () => {
      mount();
      await openPrices('Live Model');
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('Input price'), '9');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review change' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Back' }));
      expect((within(dialog).getByLabelText('Input price') as HTMLInputElement).value).toBe('0.159');
      expect(http.put).not.toHaveBeenCalled();
    });

    it('does not trust the answer blindly: if the server stored different prices, it says so', async () => {
      http.put.mockResolvedValue(ok({ ...live, pricing: { ...live.pricing, inputPerMillion: '9.00000000' } }));
      mount();
      await openPrices('Live Model');
      const dialog = await screen.findByRole('dialog');
      await userEvent.clear(within(dialog).getByLabelText('Input price'));
      await userEvent.type(within(dialog).getByLabelText('Input price'), '1');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review change' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm and save' }));
      await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining('saved different prices'), 'warning'));
    });

    it('shows the API’s refusal inside the dialog', async () => {
      http.put.mockRejectedValue(apiFailure(400, 'Validation failed', [{ field: 'inputPerMillion', messages: ['must not exceed 1000000 per million tokens'] }]));
      mount();
      await openPrices('Live Model');
      const dialog = await screen.findByRole('dialog');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Review change' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm and save' }));
      expect(await within(dialog).findByText('must not exceed 1000000 per million tokens')).toBeTruthy();
      expect(notify).not.toHaveBeenCalled();
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
      expect(within(dialog).getByText(/Use only letters, digits and/)).toBeTruthy();
      expect(within(dialog).getByText('Enter a display name')).toBeTruthy();
      expect(http.post).not.toHaveBeenCalled();
    });

    it('adds a model for the provider, with no price and the chat capability, and says what is still to do', async () => {
      http.post.mockResolvedValue(ok(model({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', modelId: 'fixture-new', displayName: 'Fixture New' })));
      mount();
      await screen.findByText('Live Model');
      await userEvent.click(screen.getByRole('button', { name: 'Add model' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('Model id'), 'fixture-new');
      await userEvent.type(within(dialog).getByLabelText('Display name'), 'Fixture New');
      await userEvent.type(within(dialog).getByLabelText('Context window (tokens, optional)'), '64000');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add model' }));
      await waitFor(() =>
        expect(http.post).toHaveBeenCalledWith('/admin/ai/models', { providerId: provider().id, modelId: 'fixture-new', displayName: 'Fixture New', contextWindow: 64000, capabilities: ['chat'] }),
      );
      await waitFor(() => expect(notify).toHaveBeenCalledWith('Fixture New was added. Set its prices and verify it before enabling.', 'success'));
    });

    it('edits the display name and context window but not the provider’s model id', async () => {
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
      await userEvent.type(within(dialog).getByLabelText('Model id'), 'live-model');
      await userEvent.type(within(dialog).getByLabelText('Display name'), 'Again');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add model' }));
      expect(await within(dialog).findByText('A record with the same unique value already exists')).toBeTruthy();
    });
  });
});
