import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { BrandingTab } from '../components/BrandingTab';
import { DeliveryTab } from '../components/DeliveryTab';
import { TemplatesTab } from '../components/TemplatesTab';
import { VersionsPanel } from '../components/VersionsPanel';
import EmailPage from '../pages/EmailPage';
import { branding, detail, log, templates, versions } from './fixtures';
import { apiFailure, ok } from './http';
import { renderEmail } from './utils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const permissions = vi.hoisted(() => ({ write: true }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: (permission?: string) => permission !== 'email.write' || permissions.write }) }));
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;
const preview = { key: 'auth.password_reset', subject: 'PREVIEW', html: '<p>x</p>', text: 't', warnings: [], viewport: 'desktop', frameWidth: 680 };

beforeEach(() => {
  vi.clearAllMocks();
  permissions.write = true;
});

describe('the template list', () => {
  beforeEach(() => {
    http.get.mockImplementation(async (path: string) => {
      if (path === '/admin/email/templates') return ok(templates);
      throw new Error(`unexpected GET ${path}`);
    });
  });

  it('lists every template with its status: published version, draft, disabled, built-in', async () => {
    renderEmail(<TemplatesTab canWrite />);
    const reset = (await screen.findByText('Password reset link')).closest('tr')!;
    expect(within(reset).getByText('Published v2')).toBeTruthy();
    expect(within(reset).getByText('Authentication')).toBeTruthy();
    expect(within(reset).getByText(/sign-in email/)).toBeTruthy();
    expect(within(screen.getByText('Password was changed').closest('tr')!).getByText('Draft')).toBeTruthy();
    const disabled = screen.getByText('New support request').closest('tr')!;
    expect(within(disabled).getByText('Disabled')).toBeTruthy();
    expect(within(screen.getByText('Team invitation').closest('tr')!).getByText('Built-in')).toBeTruthy();
  });

  it('links each row to its editor', async () => {
    renderEmail(<TemplatesTab canWrite />);
    const link = (await screen.findByText('Password reset link')) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/email/templates/auth.password_reset');
  });

  it('searches by name or key, and says when nothing matches', async () => {
    const user = userEvent.setup();
    renderEmail(<TemplatesTab canWrite />);
    await screen.findByText('Team invitation');
    await user.type(screen.getByLabelText('Search templates'), 'password');
    expect(screen.getByText('Password reset link')).toBeTruthy();
    expect(screen.getByText('Password was changed')).toBeTruthy();
    expect(screen.queryByText('Team invitation')).toBeNull();
    await user.clear(screen.getByLabelText('Search templates'));
    await user.type(screen.getByLabelText('Search templates'), 'zzz');
    expect(await screen.findByText('No templates match')).toBeTruthy();
  });

  it('filters by category and by status', async () => {
    const user = userEvent.setup();
    renderEmail(<TemplatesTab canWrite />);
    await screen.findByText('Team invitation');
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'Security' }));
    expect(screen.getByText('Password was changed')).toBeTruthy();
    expect(screen.queryByText('Team invitation')).toBeNull();

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(await screen.findByRole('option', { name: 'All categories' }));
    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: 'Disabled' }));
    expect(screen.getByText('New support request')).toBeTruthy();
    expect(screen.queryByText('Password reset link')).toBeNull();
  });

  it('offers Open, not Edit, to a read-only administrator', async () => {
    renderEmail(<TemplatesTab canWrite={false} />);
    expect(await screen.findByRole('link', { name: 'Open Team invitation' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /^Edit / })).toBeNull();
  });

  it('shows the API refusal when the list cannot be loaded', async () => {
    http.get.mockImplementation(async () => {
      throw apiFailure(403, 'You need the super admin role.');
    });
    renderEmail(<TemplatesTab canWrite />);
    expect(await screen.findByText(/super admin role/)).toBeTruthy();
  });
});

describe('the Email page', () => {
  beforeEach(() => {
    http.get.mockImplementation(async (path: string) => {
      if (path === '/admin/email/templates') return ok(templates);
      if (path === '/admin/email/branding') return ok(branding());
      if (path === '/admin/email/logs') return ok({ items: [], next: null });
      throw new Error(`unexpected GET ${path}`);
    });
    http.post.mockImplementation(async () => ok(preview));
  });

  it('opens on templates and switches between the three views', async () => {
    const user = userEvent.setup();
    renderEmail(<EmailPage />);
    expect(await screen.findByText('Team invitation')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Branding' }));
    expect(await screen.findByLabelText('Product name')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Delivery' }));
    expect(await screen.findByText('No emails match these filters yet.')).toBeTruthy();
  });

  it('opens straight on the view in the address', async () => {
    renderEmail(<EmailPage />, { path: '/?tab=delivery' });
    expect(await screen.findByText('No emails match these filters yet.')).toBeTruthy();
  });
});

describe('version history', () => {
  const editor = { subject: 'editor subject', html: '<p>editor</p>', text: 'editor' };
  beforeEach(() => {
    http.get.mockImplementation(async (path: string) => {
      if (path.endsWith('/versions')) return ok(versions);
      const match = /versions\/(\d+)$/.exec(path);
      if (match) return ok({ ...versions.find((v) => v.version === Number(match[1]))!, subject: `subject v${match[1]}`, html: `<p>html v${match[1]}</p>`, text: `text v${match[1]}` });
      throw new Error(`unexpected GET ${path}`);
    });
    http.post.mockImplementation(async () => ok({ version: 3 }));
  });
  const panel = (canWrite = true) => renderEmail(<VersionsPanel templateKey="team.invitation" canWrite={canWrite} editor={editor} builtIn={detail().builtIn} />);

  it('lists versions newest first and marks the live one', async () => {
    panel();
    const rows = await screen.findAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText('Version 2')).toBeTruthy();
    expect(within(rows[0]!).getByText('Live')).toBeTruthy();
    expect(within(rows[0]!).getByText(/Shorter subject/)).toBeTruthy();
    expect(within(rows[1]!).queryByText('Live')).toBeNull();
  });

  it('offers Restore only for versions that are not live, and only to someone who can write', async () => {
    panel();
    const rows = await screen.findAllByRole('listitem');
    expect(within(rows[0]!).queryByRole('button', { name: /Restore/ })).toBeNull();
    expect(within(rows[1]!).getByRole('button', { name: /Restore/ })).toBeTruthy();
  });

  it('hides Restore from a read-only administrator, but still lets them compare', async () => {
    panel(false);
    const rows = await screen.findAllByRole('listitem');
    expect(screen.queryByRole('button', { name: /Restore/ })).toBeNull();
    expect(within(rows[1]!).getByRole('button', { name: /Compare/ })).toBeTruthy();
  });

  it('restores only after confirmation, as a copy that goes live', async () => {
    const user = userEvent.setup();
    panel();
    const rows = await screen.findAllByRole('listitem');
    await user.click(within(rows[1]!).getByRole('button', { name: /Restore/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toMatch(/new version/);
    expect(http.post).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Restore and publish' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/email/templates/team.invitation/restore/1', {}));
    expect(await screen.findByText(/Restored as version 3/)).toBeTruthy();
  });

  it('shows the API refusal when a restore fails', async () => {
    http.post.mockImplementation(async () => {
      throw apiFailure(400, 'The template was refused: critical_variable_missing (accept_url).');
    });
    const user = userEvent.setup();
    panel();
    const rows = await screen.findAllByRole('listitem');
    await user.click(within(rows[1]!).getByRole('button', { name: /Restore/ }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Restore and publish' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/critical_variable_missing/);
  });

  it('compares a version with what is in the editor, line by line', async () => {
    const user = userEvent.setup();
    panel();
    const rows = await screen.findAllByRole('listitem');
    await user.click(within(rows[1]!).getByRole('button', { name: /Compare/ }));
    const dialog = await screen.findByRole('dialog');
    const subject = await within(dialog).findByLabelText('Subject comparison');
    await waitFor(() => expect(subject.querySelector('[data-kind="removed"]')?.textContent).toMatch(/subject v1/));
    expect(subject.querySelector('[data-kind="added"]')?.textContent).toMatch(/editor subject/);
  });

  it('says when nothing has been published', async () => {
    http.get.mockImplementation(async () => ok([]));
    panel();
    expect(await screen.findByText(/Nothing has been published yet/)).toBeTruthy();
  });
});

describe('branding', () => {
  beforeEach(() => {
    http.get.mockImplementation(async (path: string) => {
      if (path === '/admin/email/branding') return ok(branding());
      if (path === '/admin/email/templates') return ok(templates);
      throw new Error(`unexpected GET ${path}`);
    });
    http.post.mockImplementation(async () => ok(preview));
    http.put.mockImplementation(async () => ok(null));
  });

  it('loads the shared look and says whether it is custom', async () => {
    renderEmail(<BrandingTab canWrite />);
    expect(((await screen.findByLabelText('Product name')) as HTMLInputElement).value).toBe('OrmiTech');
    expect(screen.getByText('Built-in')).toBeTruthy();
    expect((screen.getByLabelText('Primary colour (buttons, links)') as HTMLInputElement).value).toBe('#4f46e5');
  });

  it('saves what was changed, and says every email now uses it', async () => {
    const user = userEvent.setup();
    renderEmail(<BrandingTab canWrite />);
    const name = (await screen.findByLabelText('Product name')) as HTMLInputElement;
    await user.clear(name);
    await user.type(name, 'Acme');
    fireEvent.change(screen.getByLabelText('Primary colour (buttons, links)'), { target: { value: '#112233' } });
    await user.type(screen.getByLabelText(/Footer/), '{enter}Second line');
    await user.click(screen.getByRole('button', { name: 'Save branding' }));

    await waitFor(() =>
      expect(http.put).toHaveBeenCalledWith(
        '/admin/email/branding',
        expect.objectContaining({ productName: 'Acme', accentColor: '#112233', logoUrl: null, footerLines: [expect.stringMatching(/activity on your OrmiTech/), 'Second line'] }),
      ),
    );
    expect(await screen.findByText(/Every email now uses this look/)).toBeTruthy();
  });

  it('will not send a colour or a logo the API would refuse, and says why beside the field', async () => {
    const user = userEvent.setup();
    renderEmail(<BrandingTab canWrite />);
    fireEvent.change(await screen.findByLabelText('Text colour'), { target: { value: 'red' } });
    await user.type(screen.getByLabelText(/Logo address/), 'http://insecure.example/l.png');
    expect(screen.getByText('Use a colour like #4f46e5.')).toBeTruthy();
    expect(screen.getByText(/full https:\/\/ address/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Save branding' }) as HTMLButtonElement).disabled).toBe(true);
    expect(http.put).not.toHaveBeenCalled();
  });

  it('shows the API refusal when saving fails', async () => {
    http.put.mockImplementation(async () => {
      throw apiFailure(400, 'The template was refused: invalid_branding (fontFamily).');
    });
    const user = userEvent.setup();
    renderEmail(<BrandingTab canWrite />);
    await user.click(await screen.findByRole('button', { name: 'Save branding' }));
    expect(await screen.findByText(/invalid_branding/)).toBeTruthy();
  });

  it('previews the saved look through the API, and is read-only without write access', async () => {
    renderEmail(<BrandingTab canWrite={false} />);
    expect(await screen.findByTestId('preview-subject', undefined, { timeout: 4000 })).toBeTruthy();
    expect(http.post).toHaveBeenCalledWith('/admin/email/templates/auth.password_reset/preview', expect.objectContaining({ use: 'builtin' }));
    expect((screen.getByLabelText('Product name') as HTMLInputElement).readOnly).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save branding' })).toBeNull();
  });
});

describe('delivery monitoring', () => {
  const rows = [
    log({ id: 'a', status: 'sent' }),
    log({ id: 'b', status: 'failed', errorCode: 'rejected', attempts: 1, recipient: 'ba***@example.com', retryable: true, sentAt: null }),
    log({ id: 'c', status: 'queued', attempts: 2, errorCode: 'timeout', sentAt: null, recipient: 'qu***@example.com' }),
    log({ id: 'd', status: 'sent', isTest: true, templateKey: 'auth.password_reset' }),
  ];
  beforeEach(() => {
    http.get.mockImplementation(async (path: string, config?: { params?: Record<string, string> }) => {
      if (path === '/admin/email/templates') return ok(templates);
      if (path === '/admin/email/logs') {
        const status = config?.params?.status;
        const items = status ? rows.filter((row) => row.status === status) : rows;
        return ok({ items, next: config?.params?.before ? null : status ? null : 'cursor-1' });
      }
      throw new Error(`unexpected GET ${path}`);
    });
    http.post.mockImplementation(async () => ok(null));
  });

  it('lists sent, failed and queued messages with attempts, times and masked recipients', async () => {
    renderEmail(<DeliveryTab canWrite />);
    const failed = (await screen.findByText('ba***@example.com')).closest('tr')!;
    // The status is in two cells, one for phones and one for wider screens; CSS shows one of them.
    expect(within(failed).getAllByText('Failed').length).toBeGreaterThan(0);
    expect(within(failed).getAllByText(/recipient address was rejected/).length).toBeGreaterThan(0);
    const queuedRow = screen.getByText('qu***@example.com').closest('tr')!;
    expect(within(queuedRow).getAllByText('Queued').length).toBeGreaterThan(0);
    expect(within(queuedRow).getAllByText(/did not answer in time/).length).toBeGreaterThan(0);
    const sentRow = screen.getAllByText('ta***@example.com')[0]!.closest('tr')!;
    expect(within(sentRow).getAllByText('Sent').length).toBeGreaterThan(0);
    expect(within(sentRow).getByText('1')).toBeTruthy();
    expect(screen.getByText('TEST')).toBeTruthy();
  });

  it('shows only failed emails on request', async () => {
    const user = userEvent.setup();
    renderEmail(<DeliveryTab canWrite />);
    await screen.findByText('ba***@example.com');
    await user.click(screen.getByRole('button', { name: 'Failed only' }));
    await waitFor(() => expect(screen.queryByText('qu***@example.com')).toBeNull());
    expect(screen.getByText('ba***@example.com')).toBeTruthy();
    expect(http.get).toHaveBeenCalledWith('/admin/email/logs', { params: expect.objectContaining({ status: 'failed' }) });
  });

  it('loads the next page with the cursor the API gave', async () => {
    const user = userEvent.setup();
    renderEmail(<DeliveryTab canWrite />);
    await user.click(await screen.findByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(http.get).toHaveBeenCalledWith('/admin/email/logs', { params: expect.objectContaining({ before: 'cursor-1' }) }));
  });

  it('offers Retry only for a failed email the queue still holds, and asks first', async () => {
    const user = userEvent.setup();
    renderEmail(<DeliveryTab canWrite />);
    expect(await screen.findAllByRole('button', { name: /^Retry/ })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Retry the email to ba***@example.com' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(http.post).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/email/logs/b/retry'));
    expect(await screen.findByText(/Queued to run again/)).toBeTruthy();
  });

  it('shows the API reason when the retry window has passed', async () => {
    http.post.mockImplementation(async () => {
      throw apiFailure(409, 'The retry window has passed. The message is not stored anywhere else, so it cannot be rebuilt.');
    });
    const user = userEvent.setup();
    renderEmail(<DeliveryTab canWrite />);
    await user.click(await screen.findByRole('button', { name: 'Retry the email to ba***@example.com' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Retry' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/retry window has passed/);
  });

  it('gives a read-only administrator the log without Retry', async () => {
    renderEmail(<DeliveryTab canWrite={false} />);
    await screen.findByText('ba***@example.com');
    expect(screen.queryByRole('button', { name: /^Retry/ })).toBeNull();
  });

  it('says when nothing has been sent', async () => {
    http.get.mockImplementation(async (path: string) => (path === '/admin/email/templates' ? ok(templates) : ok({ items: [], next: null })));
    renderEmail(<DeliveryTab canWrite />);
    expect(await screen.findByText('Nothing here')).toBeTruthy();
  });
});
