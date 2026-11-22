import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { HoldCard } from '../components/HoldCard';
import { decided, settings } from './fixtures';
import type { CreditSettings } from '../types';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'put', Mock>;

const serve = (current: CreditSettings = settings()) => http.get.mockImplementation(async () => ok(current));
const noop = () => undefined;
const box = () => screen.getByLabelText('Hold (credits)') as HTMLInputElement;

describe('HoldCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  it('starts not decided, with an example that is only a placeholder', async () => {
    renderWithClient(<HoldCard canWrite onDirtyChange={noop} />);
    expect(await screen.findByText('Not decided')).toBeTruthy();
    expect(box().value).toBe('');
    expect(box().placeholder).toBe('e.g. 500');
  });

  it('refuses a zero, a negative or a too precise hold on the page and asks the API nothing', async () => {
    renderWithClient(<HoldCard canWrite onDirtyChange={noop} />);
    await screen.findByText('Not decided');
    for (const bad of ['0', '-5', '1.123456789', '1e3']) {
      await userEvent.clear(box());
      await userEvent.type(box(), bad);
      await userEvent.click(screen.getByRole('button', { name: 'Review change' }));
      expect(await screen.findByText(/positive number of credits/)).toBeTruthy();
    }
    expect(http.put).not.toHaveBeenCalled();
  });

  it('saves against the version it read, as text, after a confirmation', async () => {
    http.put.mockResolvedValue(ok(decided({ hold: { turnHoldCredits: '500' } })));
    serve(decided());
    renderWithClient(<HoldCard canWrite onDirtyChange={noop} />);
    await screen.findByText('Not decided');
    await userEvent.type(box(), '500');
    await userEvent.click(screen.getByRole('button', { name: 'Review change' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(http.put).toHaveBeenCalledWith('/admin/ai/credit-settings/hold', { expectedVersion: 3, turnHoldCredits: '500' });
    expect(await screen.findByText('Fixed hold saved.')).toBeTruthy();
  });

  it('shows the saved hold and hides the controls without write access', async () => {
    serve(decided({ hold: { turnHoldCredits: '500.00000000' } }));
    renderWithClient(<HoldCard canWrite={false} onDirtyChange={noop} />);
    expect(await screen.findByText('500.00000000 credits')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Review change' })).toBeNull();
    expect(box().disabled).toBe(true);
  });
});
