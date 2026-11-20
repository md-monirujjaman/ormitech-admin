import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { ConnectionTab } from '../components/ConnectionTab';
import { apiFailure, gateway, ok, renderWithClient } from './testUtils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;
const notify = vi.fn();
const mount = (canWrite = true) => renderWithClient(<ConnectionTab canWrite={canWrite} notify={notify} />);

describe('ConnectionTab', () => {
  beforeEach(() => {
    notify.mockReset();
    http.get.mockResolvedValue(ok(gateway()));
  });

  it('shows the address and only the last four characters of the key, and says where they are changed', async () => {
    mount();
    expect(await screen.findByText('https://openrouter.ai/api/v1')).toBeTruthy();
    expect(screen.getByText('••••ZZ99')).toBeTruthy();
    expect(screen.getByText('Key set')).toBeTruthy();
    expect(screen.getByText(/Change them in the deployment environment \(Coolify\)/)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull(); // there is nowhere to type a key
  });

  it('says the AI is off when no key is set, and offers no test', async () => {
    http.get.mockResolvedValue(ok(gateway({ configured: false, keyMask: null })));
    mount();
    expect(await screen.findByText('No key set: the AI is off')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Test connection' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('tests the connection with an empty POST and reports a key OpenRouter accepts', async () => {
    http.post.mockResolvedValue(ok({ gateway: gateway(), check: { status: 'healthy', error: null } }));
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Test connection' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/ai/gateway/check'));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('OpenRouter accepted the key.', 'success'));
    expect(await screen.findByText('Connected')).toBeTruthy();
  });

  it('reports a refused key in words, from a short code', async () => {
    http.post.mockResolvedValue(ok({ gateway: gateway(), check: { status: 'unauthorized', error: 'http_401' } }));
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Test connection' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('OpenRouter rejected the key (401).', 'error'));
    expect(await screen.findByText('Key rejected')).toBeTruthy();
  });

  it('shows the API’s refusal when the test itself fails', async () => {
    http.post.mockRejectedValue(apiFailure(403, 'Forbidden'));
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Test connection' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.any(String), 'error'));
  });

  it('offers no test to someone who may only read', async () => {
    mount(false);
    await screen.findByText('https://openrouter.ai/api/v1');
    expect(screen.queryByRole('button', { name: 'Test connection' })).toBeNull();
  });
});
