import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { ProvidersTab } from '../components/ProvidersTab';
import { apiFailure, captureConsole, ok, provider, renderWithClient } from './testUtils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch', Mock>;
const KEY = 'sk-test-secret-1234567890abcdefZZ99';
const NEW_KEY = 'sk-test-rotated-0987654321abcdefQQ77';

const main = provider();
const spare = provider({ id: '33333333-3333-4333-8333-333333333333', slug: 'openai-spare', name: 'OpenAI Spare', enabled: false, isDefault: false, priority: 50, modelCount: 0, credential: { configured: false, mask: null, updatedAt: null }, health: { status: 'unknown', checkedAt: null, error: null } });

function serve(providers = [main, spare]) {
  http.get.mockImplementation(async (path: string) => {
    if (path === '/admin/ai/providers') return ok(providers);
    throw new Error(`unexpected GET ${path}`);
  });
}

const notify = vi.fn();
const mount = (canWrite = true) => renderWithClient(<ProvidersTab canWrite={canWrite} notify={notify} />);

describe('ProvidersTab', () => {
  beforeEach(() => {
    notify.mockReset();
    serve();
  });

  it('lists providers with a masked key, status, connection, priority and model count, and never a key', async () => {
    const logs = captureConsole();
    mount();
    expect(await screen.findByText('OpenAI Main')).toBeTruthy();
    expect(screen.getByText('••••ZZ99')).toBeTruthy();
    expect(screen.getByText('Default')).toBeTruthy();
    expect(screen.getByText('Healthy')).toBeTruthy();
    expect(screen.getByText('No key')).toBeTruthy();
    expect(screen.getByText('Not checked')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/sk-/);
    expect(logs.text()).not.toMatch(/sk-/);
  });

  it('shows loading, then an empty state with a way to add the first provider', async () => {
    serve([]);
    mount();
    expect(await screen.findByText('No AI provider yet')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Add provider' }).length).toBeGreaterThan(0);
  });

  it('says plainly when the API refuses with 403, and does not offer a retry that cannot work', async () => {
    http.get.mockRejectedValue(apiFailure(403, 'Forbidden'));
    mount();
    expect(await screen.findByText(/don’t have permission/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('shows the API’s message and a retry for any other failure', async () => {
    http.get.mockRejectedValueOnce(apiFailure(500, 'The database is busy'));
    mount();
    expect(await screen.findByText('The database is busy')).toBeTruthy();
    serve();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('OpenAI Main')).toBeTruthy();
  });

  it('offers no change to someone who may only read', async () => {
    mount(false);
    await screen.findByText('OpenAI Main');
    expect(screen.queryByRole('button', { name: /Add provider|Replace key|Set key|Check connection|Edit/ })).toBeNull();
    expect((screen.getByRole('switch', { name: 'Disable OpenAI Main' }) as HTMLButtonElement).disabled).toBe(true);
  });

  describe('adding a provider', () => {
    it('checks the form before it asks the API, and shows what is wrong', async () => {
      mount();
      await screen.findByText('OpenAI Main');
      await userEvent.click(screen.getAllByRole('button', { name: 'Add provider' })[0]!);
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('Identifier'), 'Bad Slug');
      await userEvent.clear(within(dialog).getByLabelText('API address'));
      await userEvent.type(within(dialog).getByLabelText('API address'), 'http://localhost/v1');
      await userEvent.type(within(dialog).getByLabelText('API key (optional now)'), 'short');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add provider' }));

      expect(within(dialog).getByText(/lower-case letters, digits and single hyphens/)).toBeTruthy();
      expect(within(dialog).getByText('Enter a name')).toBeTruthy();
      expect(within(dialog).getByText('The address must use https')).toBeTruthy();
      expect(within(dialog).getByText('An API key is 20 to 400 characters without spaces')).toBeTruthy();
      expect(http.post).not.toHaveBeenCalled();
    });

    it('sends the key once, then forgets it: not on screen, not in the cache, not in any log', async () => {
      const logs = captureConsole();
      const created = provider({ id: '44444444-4444-4444-8444-444444444444', slug: 'openai-new', name: 'OpenAI New', enabled: false, isDefault: false, credential: { configured: true, mask: '••••ZZ99', updatedAt: '2026-11-01T11:00:00.000Z' }, modelCount: 0 });
      http.post.mockResolvedValue(ok(created));
      const { client } = mount();
      await screen.findByText('OpenAI Main');
      await userEvent.click(screen.getAllByRole('button', { name: 'Add provider' })[0]!);
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('Identifier'), 'openai-new');
      await userEvent.type(within(dialog).getByLabelText('Name'), 'OpenAI New');
      const keyField = within(dialog).getByLabelText('API key (optional now)') as HTMLInputElement;
      expect(keyField.type).toBe('password');
      await userEvent.type(keyField, KEY);
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add provider' }));

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith('/admin/ai/providers', { slug: 'openai-new', name: 'OpenAI New', baseUrl: 'https://api.openai.com/v1', priority: 100, apiKey: KEY });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('OpenAI New was added'), 'success');

      expect(document.body.textContent).not.toContain(KEY);
      expect(logs.text()).not.toContain(KEY);
      // The mutation that carried the key is not kept in memory once nothing is looking at it.
      await waitFor(() => expect(client.getMutationCache().getAll().filter((mutation) => JSON.stringify(mutation.state.variables ?? '').includes(KEY))).toHaveLength(0));
      // Opening the dialog again shows an empty key field.
      await userEvent.click(screen.getAllByRole('button', { name: 'Add provider' })[0]!);
      expect(((await screen.findByLabelText('API key (optional now)')) as HTMLInputElement).value).toBe('');
    });

    it('shows the API’s refusal inside the dialog and keeps what was typed (except the key)', async () => {
      http.post.mockRejectedValue(apiFailure(409, 'A record with the same unique value already exists'));
      mount();
      await screen.findByText('OpenAI Main');
      await userEvent.click(screen.getAllByRole('button', { name: 'Add provider' })[0]!);
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('Identifier'), 'openai-main');
      await userEvent.type(within(dialog).getByLabelText('Name'), 'Again');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add provider' }));
      expect(await within(dialog).findByText('A record with the same unique value already exists')).toBeTruthy();
      expect((within(dialog).getByLabelText('Name') as HTMLInputElement).value).toBe('Again');
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('the API key', () => {
    it('never shows the stored key: the dialog says only what the API sent as a mask', async () => {
      mount();
      await screen.findByText('OpenAI Main');
      await userEvent.click(screen.getByRole('button', { name: 'Replace key' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/ends in ••••ZZ99/)).toBeTruthy();
      expect((within(dialog).getByLabelText('New API key') as HTMLInputElement).value).toBe('');
      expect(dialog.textContent).not.toMatch(/sk-/);
    });

    it('refuses a malformed key without sending it, and without echoing it', async () => {
      mount();
      await screen.findByText('OpenAI Main');
      await userEvent.click(screen.getByRole('button', { name: 'Replace key' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('New API key'), 'not a key');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
      expect(within(dialog).getByText('An API key is 20 to 400 characters without spaces')).toBeTruthy();
      expect(http.put).not.toHaveBeenCalled();
      expect(dialog.textContent).not.toContain('not a key');
    });

    it('asks for a second confirmation before it replaces a key, then sends it once', async () => {
      const logs = captureConsole();
      http.put.mockResolvedValue(ok(provider({ credential: { configured: true, mask: '••••QQ77', updatedAt: '2026-11-01T12:00:00.000Z' }, health: { status: 'unknown', checkedAt: null, error: null } })));
      const { client } = mount();
      await screen.findByText('OpenAI Main');
      await userEvent.click(screen.getByRole('button', { name: 'Replace key' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('New API key'), NEW_KEY);
      await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));

      expect(within(dialog).getByText(/Replace the key ••••ZZ99\?/)).toBeTruthy();
      expect(http.put).not.toHaveBeenCalled();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Back' }));
      expect(within(dialog).getByLabelText('New API key')).toBeTruthy();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Replace key' }));

      await waitFor(() => expect(http.put).toHaveBeenCalledTimes(1));
      expect(http.put).toHaveBeenCalledWith('/admin/ai/providers/11111111-1111-4111-8111-111111111111/credentials', { apiKey: NEW_KEY });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('••••QQ77'), 'success');
      expect(notify.mock.calls.flat().join(' ')).not.toContain(NEW_KEY);
      expect(document.body.textContent).not.toContain(NEW_KEY);
      expect(logs.text()).not.toContain(NEW_KEY);
      await waitFor(() => expect(client.getMutationCache().getAll().filter((mutation) => JSON.stringify(mutation.state.variables ?? '').includes(NEW_KEY))).toHaveLength(0));
    });

    it('sets a first key without a confirmation step', async () => {
      http.put.mockResolvedValue(ok({ ...spare, credential: { configured: true, mask: '••••QQ77', updatedAt: '2026-11-01T12:00:00.000Z' } }));
      mount();
      await screen.findByText('OpenAI Spare');
      await userEvent.click(screen.getByRole('button', { name: 'Set key' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('New API key'), NEW_KEY);
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save key' }));
      await waitFor(() => expect(http.put).toHaveBeenCalledWith(`/admin/ai/providers/${spare.id}/credentials`, { apiKey: NEW_KEY }));
    });

    it('shows a refusal inside the dialog and clears nothing it should keep', async () => {
      http.put.mockRejectedValue(apiFailure(400, 'Validation failed', [{ field: 'apiKey', messages: ['must be 20 to 400 printable characters without spaces'] }]));
      mount();
      await screen.findByText('OpenAI Spare');
      await userEvent.click(screen.getByRole('button', { name: 'Set key' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('New API key'), NEW_KEY);
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save key' }));
      expect(await within(dialog).findByText('must be 20 to 400 printable characters without spaces')).toBeTruthy();
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('turning a provider on and off', () => {
    it('cannot switch on a provider that has no key', async () => {
      mount();
      await screen.findByText('OpenAI Spare');
      const toggle = screen.getByRole('switch', { name: 'Enable OpenAI Spare' }) as HTMLButtonElement;
      expect(toggle.disabled).toBe(true);
      expect(toggle.title).toBe('Add an API key first');
    });

    it('asks before disabling, says what happens, and does nothing if cancelled', async () => {
      http.patch.mockResolvedValue(ok({ ...main, enabled: false, isDefault: false }));
      mount();
      await screen.findByText('OpenAI Main');
      await userEvent.click(screen.getByRole('switch', { name: 'Disable OpenAI Main' }));
      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Disable this provider?')).toBeTruthy();
      expect(within(dialog).getByText(/Requests stop going to it/)).toBeTruthy();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(http.patch).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('switch', { name: 'Disable OpenAI Main' }));
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Disable provider' }));
      await waitFor(() => expect(http.patch).toHaveBeenCalledWith(`/admin/ai/providers/${main.id}/status`, { enabled: false }));
      await waitFor(() => expect(notify).toHaveBeenCalledWith('OpenAI Main was disabled.', 'success'));
    });

    it('keeps the confirmation open and shows the API’s reason when it refuses', async () => {
      http.patch.mockRejectedValue(apiFailure(409, 'Set an API key before enabling this provider'));
      serve([main, { ...spare, credential: { configured: true, mask: '••••1111', updatedAt: null } }]);
      mount();
      await screen.findByText('OpenAI Spare');
      await userEvent.click(screen.getByRole('switch', { name: 'Enable OpenAI Spare' }));
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Enable provider' }));
      expect(await screen.findByText('Set an API key before enabling this provider')).toBeTruthy();
      expect(screen.getByRole('alertdialog')).toBeTruthy();
      expect(notify).not.toHaveBeenCalled();
    });

    it('makes an enabled provider the default only after confirmation', async () => {
      http.post.mockResolvedValue(ok({ ...spare, enabled: true, isDefault: true }));
      serve([main, { ...spare, enabled: true, credential: { configured: true, mask: '••••1111', updatedAt: null } }]);
      mount();
      await screen.findByText('OpenAI Spare');
      await userEvent.click(screen.getByRole('button', { name: 'Make default' }));
      expect(http.post).not.toHaveBeenCalled();
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Make default' }));
      await waitFor(() => expect(http.post).toHaveBeenCalledWith(`/admin/ai/providers/${spare.id}/default`));
    });
  });

  describe('editing', () => {
    it('saves a new name and priority without any warning', async () => {
      http.patch.mockResolvedValue(ok({ ...main, name: 'Renamed', priority: 3 }));
      mount();
      await screen.findByText('OpenAI Main');
      await userEvent.click(screen.getByRole('button', { name: 'Edit OpenAI Main' }));
      const dialog = await screen.findByRole('dialog');
      expect((within(dialog).getByLabelText('Identifier') as HTMLInputElement).disabled).toBe(true);
      expect(within(dialog).queryByLabelText(/API key/)).toBeNull();
      await userEvent.clear(within(dialog).getByLabelText('Name'));
      await userEvent.type(within(dialog).getByLabelText('Name'), 'Renamed');
      await userEvent.clear(within(dialog).getByLabelText('Priority'));
      await userEvent.type(within(dialog).getByLabelText('Priority'), '3');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
      await waitFor(() => expect(http.patch).toHaveBeenCalledWith(`/admin/ai/providers/${main.id}`, { name: 'Renamed', baseUrl: 'https://llm.provider-test.dev/v1', priority: 3 }));
      await waitFor(() => expect(notify).toHaveBeenCalledWith('Renamed was updated.', 'success'));
    });

    it('warns before a new address, because it receives the key and switches the models off', async () => {
      http.patch.mockResolvedValue(ok({ ...main, baseUrl: 'https://llm.other-host.dev/v1' }));
      mount();
      await screen.findByText('OpenAI Main');
      await userEvent.click(screen.getByRole('button', { name: 'Edit OpenAI Main' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.clear(within(dialog).getByLabelText('API address'));
      await userEvent.type(within(dialog).getByLabelText('API address'), 'https://llm.other-host.dev/v1');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

      const confirm = await screen.findByRole('alertdialog');
      expect(within(confirm).getByText(/Your API key will be sent to the new address/)).toBeTruthy();
      expect(within(confirm).getByText(/switched off until it is verified again/)).toBeTruthy();
      expect(http.patch).not.toHaveBeenCalled();
      await userEvent.click(within(confirm).getByRole('button', { name: 'Change address' }));
      await waitFor(() => expect(http.patch).toHaveBeenCalledTimes(1));
    });

    it('refuses an unsafe address in the form, before the warning and before the API', async () => {
      mount();
      await screen.findByText('OpenAI Main');
      await userEvent.click(screen.getByRole('button', { name: 'Edit OpenAI Main' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.clear(within(dialog).getByLabelText('API address'));
      await userEvent.type(within(dialog).getByLabelText('API address'), 'https://169.254.169.254/latest');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
      expect(within(dialog).getByText(/public host name, not an IP address/)).toBeTruthy();
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(http.patch).not.toHaveBeenCalled();
    });
  });

  describe('checking the connection', () => {
    const run = async () => {
      mount();
      await screen.findByText('OpenAI Main');
      await userEvent.click(screen.getAllByRole('button', { name: 'Check connection' })[0]!);
    };

    it('says the key works', async () => {
      http.post.mockResolvedValue(ok({ provider: main, check: { status: 'healthy', error: null } }));
      await run();
      await waitFor(() => expect(notify).toHaveBeenCalledWith('OpenAI Main answered: the key works.', 'success'));
      expect(http.post).toHaveBeenCalledWith(`/admin/ai/providers/${main.id}/check`);
    });

    it('explains a rejected key in words, from the short code', async () => {
      http.post.mockResolvedValue(ok({ provider: { ...main, health: { status: 'unauthorized', checkedAt: '2026-11-01T12:00:00.000Z', error: 'http_401' } }, check: { status: 'unauthorized', error: 'http_401' } }));
      await run();
      await waitFor(() => expect(notify).toHaveBeenCalledWith('OpenAI Main: The provider rejected the key (401).', 'error'));
      expect(await screen.findByText('Key rejected')).toBeTruthy();
    });

    it('reports a failure of the check itself', async () => {
      http.post.mockRejectedValue(apiFailure(500, 'Something broke'));
      await run();
      await waitFor(() => expect(notify).toHaveBeenCalledWith('Something broke', 'error'));
    });

    it('cannot check a provider that has no key', async () => {
      mount();
      await screen.findByText('OpenAI Spare');
      const buttons = screen.getAllByRole('button', { name: 'Check connection' }) as HTMLButtonElement[];
      expect(buttons.map((button) => button.disabled)).toEqual([false, true]);
    });
  });
});
