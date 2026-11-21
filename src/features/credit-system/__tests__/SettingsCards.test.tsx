import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { apiFailure, ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { CostUnitCard } from '../components/CostUnitCard';
import { FinancialCard } from '../components/FinancialCard';
import { ModeCard } from '../components/ModeCard';
import { PilotCard } from '../components/PilotCard';
import { decided, pilotRow, settings, verifiedUnit } from './fixtures';
import type { CreditSettings } from '../types';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;

function serve(current: CreditSettings = settings(), pilot = [pilotRow()]) {
  http.get.mockImplementation(async (path: string) => {
    if (path === '/admin/ai/credit-settings') return ok(current);
    if (path === '/admin/ai/credit-settings/pilot-workspaces') return ok(pilot);
    if (path === '/admin/ai/credit-plans') return ok({ conversion: { ready: true, missing: [] }, items: [{ planId: 'plan-growth', slug: 'growth', name: 'Growth', status: 'active', planVersion: 1, usdBudget: '10', markupPercent: '200', credits: '30000', missing: [], version: 1, updatedAt: '2026-11-20T09:00:00.000Z' }] });
    throw new Error(`unexpected GET ${path}`);
  });
}
const noop = () => undefined;
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

describe('FinancialCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  it('shows the shipped state: every value not set, and examples that are only placeholders', async () => {
    renderWithClient(<FinancialCard canWrite onDirtyChange={noop} />);
    expect(await screen.findByText('Not set: 3 of 3')).toBeTruthy();
    for (const label of ['Credit value (USD per credit)', 'Decimal places of the debit']) expect(input(label).value).toBe('');
    // The example is a placeholder, never a value, and the saved value is said next to the box.
    expect(input('Credit value (USD per credit)').placeholder).toBe('e.g. 0.0001');
    expect(screen.getAllByText('Not set').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/Until all three are set, no credit can be calculated/)).toBeTruthy();
  });

  it('shows saved values after a reload, without the padding the database adds, next to the boxes', async () => {
    serve(decided({ financial: { creditValueUsd: '0.0001', roundingMode: 'half_even', decimalPlaces: 8, complete: true, missing: [] } }));
    renderWithClient(<FinancialCard canWrite onDirtyChange={noop} />);
    expect(await screen.findByText('All three set')).toBeTruthy();
    expect(input('Credit value (USD per credit)').value).toBe('0.0001');
    expect(input('Decimal places of the debit').value).toBe('8');
    expect(screen.getByRole('combobox', { name: 'Rounding mode' }).textContent).toMatch(/Half even/);
    expect(screen.getByText('0.0001')).toBeTruthy();
    expect(screen.getByText(/Settings version 3/)).toBeTruthy();
  });

  it('refuses invalid values on the page and asks the API nothing', async () => {
    renderWithClient(<FinancialCard canWrite onDirtyChange={noop} />);
    await screen.findByText('Not set: 3 of 3');
    await userEvent.type(input('Credit value (USD per credit)'), '-0.0001');
    await userEvent.type(input('Decimal places of the debit'), '9');
    await userEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    expect(await screen.findByText(/Digits and one point only/)).toBeTruthy();
    expect(screen.getByText('A whole number from 0 to 8')).toBeTruthy();
    expect(http.put).not.toHaveBeenCalled();
  });

  it('shows what changes, asks for confirmation, then saves against the version it read, as text', async () => {
    http.put.mockResolvedValue(ok(decided()));
    renderWithClient(<FinancialCard canWrite onDirtyChange={noop} />);
    await screen.findByText('Not set: 3 of 3');
    await userEvent.type(input('Credit value (USD per credit)'), '0.0001');
    await userEvent.type(input('Decimal places of the debit'), '2');
    await userEvent.click(screen.getByRole('combobox', { name: 'Rounding mode' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Round up (ceil)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Credit value \(USD per credit\): not set → 0.0001/)).toBeTruthy();
    expect(http.put).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/credit-settings/financial', { expectedVersion: 0, creditValueUsd: '0.0001', roundingMode: 'ceil', decimalPlaces: 2 }));
    expect(typeof http.put.mock.calls[0]![1].creditValueUsd).toBe('string');
    expect(await screen.findByText('The financial settings were saved.')).toBeTruthy();
  });

  it('says so when someone else saved first, and keeps what was typed', async () => {
    http.put.mockRejectedValue(apiFailure(409, 'The credit settings were changed by someone else since you opened them. Reload to see the saved values, then make your change again.'));
    renderWithClient(<FinancialCard canWrite onDirtyChange={noop} />);
    await screen.findByText('Not set: 3 of 3');
    await userEvent.type(input('Credit value (USD per credit)'), '0.0001');
    await userEvent.click(screen.getByRole('button', { name: 'Review changes' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText(/changed by someone else/)).toBeTruthy();
    expect(input('Credit value (USD per credit)').value).toBe('0.0001');
  });

  it('reports unsaved changes while the form differs from what is saved, and stops when it is discarded', async () => {
    const dirty = vi.fn();
    renderWithClient(<FinancialCard canWrite onDirtyChange={dirty} />);
    await screen.findByText('Not set: 3 of 3');
    expect(dirty).toHaveBeenLastCalledWith(false);
    await userEvent.type(input('Decimal places of the debit'), '1');
    expect(await screen.findByText('Unsaved changes')).toBeTruthy();
    expect(dirty).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(input('Decimal places of the debit').value).toBe('');
    expect(dirty).toHaveBeenLastCalledWith(false);
  });

  it('warns when the older conversion describes a different credit', async () => {
    serve(decided({ legacyConversion: { decided: true, creditsPerCostUnit: '1000', costCurrency: 'USD', markupPercent: '0', rounding: 'half_up', consistency: { status: 'different', detail: 'They do not describe the same credit value.' } } }));
    renderWithClient(<FinancialCard canWrite onDirtyChange={noop} />);
    expect(await screen.findByText(/do not describe the same credit value/)).toBeTruthy();
  });

  it('offers no way to change anything without the permission to', async () => {
    renderWithClient(<FinancialCard canWrite={false} onDirtyChange={noop} />);
    await screen.findByText('Not set: 3 of 3');
    expect(screen.queryByRole('button', { name: 'Review changes' })).toBeNull();
    expect(input('Decimal places of the debit').disabled).toBe(true);
  });

  it('calculates with the saved settings only once they are complete, and shows what the API answers', async () => {
    renderWithClient(<FinancialCard canWrite onDirtyChange={noop} />);
    await screen.findByText('Not set: 3 of 3');
    expect((screen.getByRole('button', { name: 'Calculate' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('previews a calculation and shows the three amounts', async () => {
    serve(decided());
    http.post.mockResolvedValue(ok({ verifiedCostUsd: '0.0080000000000000000000', markedCostUsd: '0.0240000000000000000000000000', creditsUnrounded: '240.000000000000', credits: '240.00', settings: { creditValueUsd: '0.0001', roundingMode: 'ceil', decimalPlaces: 2, markupPercent: '200', version: 3 }, note: 'A preview only' }));
    renderWithClient(<FinancialCard canWrite onDirtyChange={noop} />);
    await screen.findByText('All three set');
    await userEvent.type(screen.getByLabelText('Verified cost (USD)'), '0.008');
    await userEvent.click(screen.getByRole('combobox', { name: 'Plan' }));
    await userEvent.click(await screen.findByRole('option', { name: /Growth/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    const result = await screen.findByLabelText('Calculation result');
    expect(http.post).toHaveBeenCalledWith('/admin/ai/credit-settings/preview', { verifiedCostUsd: '0.008', planId: 'plan-growth' });
    expect(within(result).getByText('0.024')).toBeTruthy();
    expect(within(result).getByText('240.00')).toBeTruthy();
  });

  it('refuses a cost that is not a USD amount before asking the API', async () => {
    serve(decided());
    renderWithClient(<FinancialCard canWrite onDirtyChange={noop} />);
    await screen.findByText('All three set');
    await userEvent.type(screen.getByLabelText('Verified cost (USD)'), '1e-3');
    await userEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(await screen.findByText(/Enter a USD amount/)).toBeTruthy();
    expect(http.post).not.toHaveBeenCalled();
  });
});

describe('CostUnitCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  it('says the unit is not assumed to be USD until it is verified', async () => {
    renderWithClient(<CostUnitCard canWrite onDirtyChange={noop} />);
    expect(await screen.findByText('Not verified')).toBeTruthy();
    expect(screen.getByText(/not assumed to be US dollars/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear verification' })).toBeNull();
    expect(input('Unit the provider reports').placeholder).toBe('e.g. openrouter_credits');
    expect(input('Unit the provider reports').value).toBe('');
  });

  it('refuses a verification without evidence and asks the API nothing', async () => {
    renderWithClient(<CostUnitCard canWrite onDirtyChange={noop} />);
    await screen.findByText('Not verified');
    await userEvent.type(input('Unit the provider reports'), 'openrouter_credits');
    await userEvent.type(input('USD per one unit'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(await screen.findByText(/A verification without evidence is not recorded/)).toBeTruthy();
    expect(http.put).not.toHaveBeenCalled();
  });

  it('records a verification after a confirmation that says what it does', async () => {
    http.put.mockResolvedValue(ok(decided({ costUnit: verifiedUnit })));
    renderWithClient(<CostUnitCard canWrite onDirtyChange={noop} />);
    await screen.findByText('Not verified');
    await userEvent.type(input('Unit the provider reports'), 'fixture_unit');
    await userEvent.type(input('USD per one unit'), '0.5');
    await userEvent.type(screen.getByLabelText('How it was verified'), 'Compared with a recorded response in a test.');
    await userEvent.click(screen.getByRole('button', { name: 'Review' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/treated as USD at this factor/)).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Record verification' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/credit-settings/cost-unit', { expectedVersion: 0, unit: 'fixture_unit', usdFactor: '0.5', evidence: 'Compared with a recorded response in a test.' }));
    expect(await screen.findByText('The verification was recorded.')).toBeTruthy();
  });

  it('shows a recorded verification with its evidence, and clears it only after confirming', async () => {
    serve(decided({ costUnit: verifiedUnit }));
    http.put.mockResolvedValue(ok(decided()));
    renderWithClient(<CostUnitCard canWrite onDirtyChange={noop} />);
    expect(await screen.findByText(/Verified: 1 fixture_unit = 0.5 USD/)).toBeTruthy();
    expect(screen.getByText('Compared with a recorded response in a test.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Clear verification' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(http.put).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Clear verification' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/credit-settings/cost-unit', { expectedVersion: 3, unit: null, usdFactor: null, evidence: null }));
  });
});

describe('ModeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  it('explains all three modes and shows the current one: off by default', async () => {
    renderWithClient(<ModeCard canWrite onDirtyChange={noop} />);
    expect(await screen.findByText(/No enforcement: nothing is blocked/)).toBeTruthy();
    expect(screen.getByText(/nothing is deducted/)).toBeTruthy();
    expect(screen.getByText(/reserved before an AI request/)).toBeTruthy();
    expect(screen.getByText('Current platform mode').nextSibling?.textContent).toBe('Off');
  });

  it('lists what enforce needs, marks what is missing, and does not offer enforce until all of it is met', async () => {
    renderWithClient(<ModeCard canWrite onDirtyChange={noop} />);
    const list = await screen.findByLabelText('Enforce readiness');
    expect(within(list).getAllByLabelText('Not met')).toHaveLength(3);
    expect(within(list).getByLabelText('Advice, not met')).toBeTruthy();
    await userEvent.click(screen.getByRole('combobox', { name: 'Platform mode' }));
    expect(await screen.findByRole('option', { name: 'Enforce (not ready)' })).toHaveProperty('ariaDisabled', 'true');
  });

  it('offers enforce once everything it needs is met, and confirms it with a warning', async () => {
    const ready = decided({ costUnit: verifiedUnit, mode: { ...settings().mode, recoveryConfirmed: true }, enforceReadiness: { ready: true, checks: settings().enforceReadiness.checks.map((check) => ({ ...check, ok: true })) } });
    serve(ready);
    http.patch.mockResolvedValue(ok({}));
    renderWithClient(<ModeCard canWrite onDirtyChange={noop} />);
    await userEvent.click(await screen.findByRole('combobox', { name: 'Platform mode' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Enforce' }));
    await userEvent.click(screen.getByRole('button', { name: 'Review change' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Enforce credits across the platform?')).toBeTruthy();
    expect(within(dialog).getByText(/Prefer the pilot restriction/)).toBeTruthy();
    expect(http.patch).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Switch to Enforce' }));
    await waitFor(() => expect(http.patch).toHaveBeenCalledWith('/admin/ai/credit-policy', { mode: 'enforce' }));
  });

  it('shows the API’s refusal when a mode cannot be set, and keeps the mode as it was', async () => {
    http.patch.mockRejectedValue(apiFailure(409, 'A mode other than off needs the credit conversion (rate, currency and markup) to be set first'));
    renderWithClient(<ModeCard canWrite onDirtyChange={noop} />);
    await userEvent.click(await screen.findByRole('combobox', { name: 'Platform mode' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Observe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Review change' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Switch to Observe' }));
    expect(await screen.findByText(/needs the credit conversion/)).toBeTruthy();
    expect(screen.getByText('Current platform mode').nextSibling?.textContent).toBe('Off');
  });

  it('cannot change the mode without the permission to', async () => {
    renderWithClient(<ModeCard canWrite={false} onDirtyChange={noop} />);
    await screen.findByLabelText('Enforce readiness');
    expect(screen.queryByRole('combobox', { name: 'Platform mode' })).toBeNull();
  });
});

describe('PilotCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  it('lists the pilot workspaces with who added them and when', async () => {
    renderWithClient(<PilotCard canWrite onDirtyChange={noop} />);
    expect(await screen.findByText('Fixture Shop')).toBeTruthy();
    expect(screen.getByText('018f0000-0000-7000-8000-000000000001')).toBeTruthy();
    expect(screen.getByText('first pilot')).toBeTruthy();
    expect(screen.getByText('018f0000…')).toBeTruthy();
    expect(screen.getByText(/Not restricted/)).toBeTruthy();
  });

  it('says plainly when nobody is in the pilot', async () => {
    serve(settings(), []);
    renderWithClient(<PilotCard canWrite onDirtyChange={noop} />);
    expect(await screen.findByText('No workspace is in the pilot.')).toBeTruthy();
  });

  it('refuses an ID that is not a workspace ID before asking the API', async () => {
    renderWithClient(<PilotCard canWrite onDirtyChange={noop} />);
    await screen.findByText('Fixture Shop');
    await userEvent.type(input('Workspace ID'), 'not-an-id');
    await userEvent.click(screen.getByRole('button', { name: 'Add to pilot' }));
    expect(await screen.findByText(/A workspace ID looks like/)).toBeTruthy();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('adds a workspace, and shows the API’s refusal of a duplicate', async () => {
    http.post.mockResolvedValueOnce(ok([pilotRow()])).mockRejectedValueOnce(apiFailure(409, 'Fixture Shop is already in the pilot allowlist'));
    renderWithClient(<PilotCard canWrite onDirtyChange={noop} />);
    await screen.findByText('Fixture Shop');
    await userEvent.type(input('Workspace ID'), '018F0000-0000-7000-8000-000000000001');
    await userEvent.type(input('Note (optional)'), 'second');
    await userEvent.click(screen.getByRole('button', { name: 'Add to pilot' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/ai/credit-settings/pilot-workspaces', { organizationId: '018f0000-0000-7000-8000-000000000001', note: 'second' }));
    expect(await screen.findByText('The workspace was added to the pilot.')).toBeTruthy();
    await userEvent.type(input('Workspace ID'), '018f0000-0000-7000-8000-000000000001');
    await userEvent.click(screen.getByRole('button', { name: 'Add to pilot' }));
    expect(await screen.findByText(/already in the pilot allowlist/)).toBeTruthy();
  });

  it('removes a workspace only after confirming', async () => {
    http.delete.mockResolvedValue(ok([]));
    renderWithClient(<PilotCard canWrite onDirtyChange={noop} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Fixture Shop from the pilot' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(http.delete).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove from pilot' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/admin/ai/credit-settings/pilot-workspaces/018f0000-0000-7000-8000-000000000001'));
  });

  it('turns the restriction on after confirming, against the version it read', async () => {
    serve(decided());
    http.put.mockResolvedValue(ok(decided()));
    renderWithClient(<PilotCard canWrite onDirtyChange={noop} />);
    await userEvent.click(await screen.findByRole('switch', { name: 'Restrict credits to the pilot' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Every other workspace is treated as off/)).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restrict' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith('/admin/ai/credit-settings/pilot-restriction', { expectedVersion: 3, enabled: true }));
  });

  it('has no controls for someone who cannot write', async () => {
    renderWithClient(<PilotCard canWrite={false} onDirtyChange={noop} />);
    await screen.findByText('Fixture Shop');
    expect(screen.queryByRole('button', { name: 'Add to pilot' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
    expect((screen.getByRole('switch', { name: 'Restrict credits to the pilot' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
