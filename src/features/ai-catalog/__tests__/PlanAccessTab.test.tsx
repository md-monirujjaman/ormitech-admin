import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { PlanAccessTab } from '../components/PlanAccessTab';
import type { AiModel } from '../types';
import { apiFailure, model, ok, renderWithClient } from './testUtils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }));

const plansState = vi.hoisted(() => ({ value: { data: undefined as unknown, isLoading: false, isError: false, error: null as unknown, refetch: () => undefined } }));
vi.mock('@/features/plans/hooks', () => ({ usePlans: () => plansState.value }));

const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch', Mock>;
const plan = (slug: string, name: string, status = 'active') => ({ id: `plan-${slug}`, slug, name, status });
const growth = model({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', modelId: 'growth-model', displayName: 'Growth Model', enabled: true, planSlugs: ['growth'] });
const open = model({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', modelId: 'open-model', displayName: 'Open Model', planSlugs: [] });

function serve(models: AiModel[]) {
  http.get.mockImplementation(async (path: string) => {
    if (path === '/admin/ai/models') return ok(models);
    throw new Error(`unexpected GET ${path}`);
  });
}

const notify = vi.fn();
const mount = (canWrite = true) => renderWithClient(<PlanAccessTab canWrite={canWrite} notify={notify} />);
const box = (plan: string, modelName: string) => screen.getByRole('checkbox', { name: `${plan} may use ${modelName}` }) as HTMLInputElement;
const saveOf = async (name: string) => within((await screen.findByText(name)).closest('tr') as HTMLElement).getByRole('button', { name: 'Save' }) as HTMLButtonElement;

describe('PlanAccessTab', () => {
  beforeEach(() => {
    notify.mockReset();
    plansState.value = { data: [plan('starter', 'Starter'), plan('growth', 'Growth'), plan('legacy', 'Legacy', 'archived')], isLoading: false, isError: false, error: null, refetch: () => undefined };
    serve([growth, open]);
  });

  it('shows a column for each active plan only, ticked as the API says', async () => {
    mount();
    await screen.findByText('Growth Model');
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Model', 'Starter', 'Growth', 'Save']);
    expect(box('Growth', 'Growth Model').checked).toBe(true);
    expect(box('Starter', 'Growth Model').checked).toBe(false);
    expect(box('Starter', 'Open Model').checked).toBe(false);
  });

  it('flags a plan that still has access but is no longer active', async () => {
    serve([{ ...growth, planSlugs: ['growth', 'legacy'] }]);
    mount();
    expect(await screen.findByTitle('This plan is not active any more')).toBeTruthy();
  });

  it('has nothing to save until something is changed', async () => {
    mount();
    expect((await saveOf('Growth Model')).disabled).toBe(true);
    await userEvent.click(box('Starter', 'Growth Model'));
    expect((await saveOf('Growth Model')).disabled).toBe(false);
    await userEvent.click(box('Starter', 'Growth Model'));
    expect((await saveOf('Growth Model')).disabled).toBe(true);
  });

  it('confirms what is added and removed, then sends the whole list', async () => {
    http.put.mockResolvedValue(ok({ ...growth, planSlugs: ['starter'] }));
    mount();
    await screen.findByText('Growth Model');
    await userEvent.click(box('Starter', 'Growth Model'));
    await userEvent.click(box('Growth', 'Growth Model'));
    await userEvent.click(await saveOf('Growth Model'));

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Added: starter')).toBeTruthy();
    expect(within(confirm).getByText(/Removed: growth\. Workspaces on these plans stop being answered by this model/)).toBeTruthy();
    expect(http.put).not.toHaveBeenCalled();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Save plan access' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith(`/admin/ai/models/${growth.id}/plan-access`, { planSlugs: expect.arrayContaining(['starter']) }));
    expect((http.put.mock.calls[0]![1] as { planSlugs: string[] }).planSlugs).toEqual(['starter']);
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Plan access for Growth Model was saved.', 'success'));
  });

  it('can clear every plan, which means no plan may use the model', async () => {
    http.put.mockResolvedValue(ok({ ...growth, planSlugs: [] }));
    mount();
    await screen.findByText('Growth Model');
    await userEvent.click(box('Growth', 'Growth Model'));
    await userEvent.click(await saveOf('Growth Model'));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('no plan')).toBeTruthy();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Save plan access' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith(`/admin/ai/models/${growth.id}/plan-access`, { planSlugs: [] }));
  });

  it('changes nothing if the confirmation is cancelled', async () => {
    mount();
    await screen.findByText('Open Model');
    await userEvent.click(box('Starter', 'Open Model'));
    await userEvent.click(await saveOf('Open Model'));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
    expect(http.put).not.toHaveBeenCalled();
    // The unsaved choice is still on screen to be saved or undone.
    expect(box('Starter', 'Open Model').checked).toBe(true);
  });

  it('does not trust the answer blindly: if the server stored a different set, it says so and shows the stored one', async () => {
    http.put.mockResolvedValue(ok({ ...open, planSlugs: ['growth'] }));
    mount();
    await screen.findByText('Open Model');
    await userEvent.click(box('Starter', 'Open Model'));
    await userEvent.click(await saveOf('Open Model'));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Save plan access' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringContaining('different set of plans'), 'warning'));
  });

  it('shows the API’s refusal in the confirmation and keeps the choice', async () => {
    http.put.mockRejectedValue(apiFailure(400, 'Validation failed', [{ field: 'planSlugs', messages: ['unknown or inactive plan: starter'] }]));
    mount();
    await screen.findByText('Open Model');
    await userEvent.click(box('Starter', 'Open Model'));
    await userEvent.click(await saveOf('Open Model'));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Save plan access' }));
    expect(await screen.findByText('unknown or inactive plan: starter')).toBeTruthy();
    expect(notify).not.toHaveBeenCalled();
  });

  it('is read-only for someone who may not write', async () => {
    mount(false);
    await screen.findByText('Growth Model');
    expect(box('Starter', 'Growth Model').disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('explains an empty catalogue and the absence of active plans', async () => {
    serve([]);
    const first = mount();
    expect(await screen.findByText('No models yet')).toBeTruthy();
    first.unmount();
    serve([growth]);
    plansState.value = { ...plansState.value, data: [plan('legacy', 'Legacy', 'archived')] };
    mount();
    expect(await screen.findByText('No active plans')).toBeTruthy();
  });

  it('says plainly when the API refuses with 403', async () => {
    http.get.mockRejectedValue(apiFailure(403, 'Forbidden'));
    mount();
    expect(await screen.findByText(/don’t have permission/)).toBeTruthy();
  });
});
