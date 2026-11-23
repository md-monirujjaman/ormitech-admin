import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import EmailTemplatePage from '../pages/EmailTemplatePage';
import { detail, versions } from './fixtures';
import { apiFailure, ok } from './http';
import { renderEmail } from './utils';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const permissions = vi.hoisted(() => ({ write: true }));
// Read access is always true for a page that opened; only writes vary, so `can` answers per permission.
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: (permission?: string) => permission !== 'email.write' || permissions.write }) }));

const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;
const KEY = 'team.invitation';
const preview = (over: Record<string, unknown> = {}) => ({ key: KEY, subject: 'RENDERED SUBJECT', html: '<p>RENDERED BODY</p>', text: 'RENDERED TEXT', warnings: [], viewport: 'desktop', frameWidth: 680, ...over });

function serve(template = detail()) {
  http.get.mockImplementation(async (path: string) => {
    if (path === `/admin/email/templates/${KEY}`) return ok(template);
    if (path === `/admin/email/templates/${KEY}/versions`) return ok(versions);
    throw new Error(`unexpected GET ${path}`);
  });
  http.post.mockImplementation(async (path: string, body: Record<string, unknown>) => {
    if (path === `/admin/email/templates/${KEY}/preview`) return ok(preview({ viewport: body.viewport ?? 'desktop', frameWidth: body.viewport === 'mobile' ? 375 : 680 }));
    if (path === `/admin/email/templates/${KEY}/publish`) return ok({ version: 3 });
    if (path === `/admin/email/templates/${KEY}/test`) return ok({ status: 'sent', logId: null });
    throw new Error(`unexpected POST ${path}`);
  });
  http.put.mockImplementation(async () => ok({ warnings: [] }));
  http.delete.mockImplementation(async () => ok(null));
}

const open = () => renderEmail(<EmailTemplatePage />, { path: `/email/templates/${KEY}`, route: '/email/templates/:key' });
const field = (label: RegExp | string) => screen.findByLabelText(label) as Promise<HTMLInputElement | HTMLTextAreaElement>;

describe('the template editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.write = true;
    serve();
  });

  it('starts from the built-in wording when nothing is saved, and says so', async () => {
    open();
    expect((await field('Subject')).value).toBe('BUILT-IN {{inviter_name}}');
    expect(screen.getByText(/Editing the built-in wording/)).toBeTruthy();
    expect(within(screen.getByLabelText('Status')).getByText('Built-in')).toBeTruthy();
  });

  it('starts from the saved draft when there is one', async () => {
    serve(detail({ hasDraft: true, draft: { subject: 'MY DRAFT', html: '<p>d</p>', text: 'd' } }));
    open();
    expect((await field('Subject')).value).toBe('MY DRAFT');
    expect(screen.getByText(/Editing your saved draft/)).toBeTruthy();
  });

  it('shows the email as the API rendered it, with its subject, in a frame that runs nothing', async () => {
    open();
    expect(await screen.findByTestId('preview-subject', undefined, { timeout: 4000 })).toHaveProperty('textContent', 'RENDERED SUBJECT');
    const frame = screen.getByTestId('preview-frame') as HTMLIFrameElement;
    expect(frame.getAttribute('sandbox')).toBe('');
    expect(frame.getAttribute('srcdoc')).toBe('<p>RENDERED BODY</p>');
    expect(frame.style.width).toBe('680px');
  });

  it('asks for what is on screen, not what is saved, and switches to the mobile width', async () => {
    const user = userEvent.setup();
    open();
    await screen.findByTestId('preview-frame', undefined, { timeout: 4000 });
    const subject = await field('Subject');
    fireEvent.change(subject, { target: { value: 'TYPED {{inviter_name}}' } });
    await waitFor(
      () => {
        const calls = http.post.mock.calls.filter(([path]) => String(path).endsWith('/preview'));
        expect(calls.at(-1)![1].draft.subject).toBe('TYPED {{inviter_name}}');
      },
      { timeout: 4000 },
    );

    await user.click(screen.getByRole('button', { name: /Mobile/ }));
    await waitFor(() => expect((screen.getByTestId('preview-frame') as HTMLIFrameElement).style.width).toBe('375px'), { timeout: 4000 });
  });

  it('sends a changed sample value, and only a changed one', async () => {
    open();
    await screen.findByTestId('preview-frame', undefined, { timeout: 4000 });
    fireEvent.change(await field('inviter_name'), { target: { value: 'Someone Else' } });
    await waitFor(
      () => {
        const last = http.post.mock.calls.filter(([path]) => String(path).endsWith('/preview')).at(-1)![1];
        expect(last.variables).toEqual({ inviter_name: 'Someone Else' });
      },
      { timeout: 4000 },
    );
  });

  it('shows why a preview cannot be made, from the API', async () => {
    http.post.mockImplementation(async (path: string) => {
      if (path.endsWith('/preview')) throw apiFailure(400, 'The template was refused: unknown_variable (secret).');
      throw new Error('unexpected');
    });
    open();
    expect(await screen.findByText(/unknown_variable \(secret\)/, undefined, { timeout: 4000 })).toBeTruthy();
  });

  it('puts a variable where the cursor is', async () => {
    const user = userEvent.setup();
    open();
    const html = (await field('Full email HTML (header, body, footer and CSS)')) as HTMLTextAreaElement;
    html.focus();
    html.setSelectionRange(3, 3);
    await user.click(screen.getByRole('button', { name: 'Insert {{accept_url}}' }));
    expect(html.value.slice(0, 3 + '{{accept_url}}'.length)).toBe('<p>{{accept_url}}');
  });

  it('saves a draft, and says the published version is untouched', async () => {
    const user = userEvent.setup();
    open();
    expect((screen.queryByRole('button', { name: /Save draft/ }) as HTMLButtonElement | null)?.disabled ?? true).toBe(true);
    fireEvent.change(await field('Subject'), { target: { value: 'NEW SUBJECT' } });
    await user.click(screen.getByRole('button', { name: /Save draft/ }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith(`/admin/email/templates/${KEY}/draft`, expect.objectContaining({ subject: 'NEW SUBJECT', html: detail().builtIn.html })));
    expect(await screen.findByText(/Customers still receive the published version/)).toBeTruthy();
  });

  it('warns when the sanitizer will remove something from a saved draft', async () => {
    http.put.mockImplementation(async () => ok({ warnings: ['tag:script'] }));
    const user = userEvent.setup();
    open();
    fireEvent.change(await field('Full email HTML (header, body, footer and CSS)'), { target: { value: '<p>x</p><script>1</script>' } });
    await user.click(screen.getByRole('button', { name: /Save draft/ }));
    expect(await screen.findByText(/will remove: tag:script/)).toBeTruthy();
  });

  it('publishes exactly what is on screen: saves it as the draft, then publishes with the note', async () => {
    const user = userEvent.setup();
    open();
    fireEvent.change(await field('Subject'), { target: { value: 'GO LIVE' } });
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.type(within(dialog).getByLabelText(/Note/), 'Shorter subject');
    await user.click(within(dialog).getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(http.post).toHaveBeenCalledWith(`/admin/email/templates/${KEY}/publish`, { note: 'Shorter subject' }));
    // The draft is saved first, with what was on screen, so the version is exactly that.
    expect(http.put).toHaveBeenCalledWith(`/admin/email/templates/${KEY}/draft`, expect.objectContaining({ subject: 'GO LIVE' }));
    const publishAt = http.post.mock.calls.findIndex(([path]) => String(path).endsWith('/publish'));
    expect(http.put.mock.invocationCallOrder[0]!).toBeLessThan(http.post.mock.invocationCallOrder[publishAt]!);
    expect(await screen.findByText(/Published as version 3/)).toBeTruthy();
  });

  it('shows the API error instead of success when saving is refused', async () => {
    http.put.mockImplementation(async () => {
      throw apiFailure(400, 'The template was refused: critical_variable_missing (accept_url).');
    });
    const user = userEvent.setup();
    open();
    fireEvent.change(await field('Subject'), { target: { value: 'X' } });
    await user.click(screen.getByRole('button', { name: /Save draft/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/critical_variable_missing/);
  });

  it('asks before switching to the built-in wording, then does', async () => {
    serve(detail({ publishedVersion: 2, published: { version: 2, subject: 'S', html: '<p>h</p>', text: 't' } }));
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('switch', { name: 'Use my wording' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(http.put).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Use built-in wording' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledWith(`/admin/email/templates/${KEY}/enabled`, { enabled: false }));
  });

  it('discards a draft only after confirmation', async () => {
    serve(detail({ hasDraft: true, draft: { subject: 'D', html: '<p>d</p>', text: 'd' } }));
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('button', { name: /Discard draft/ }));
    expect(http.delete).not.toHaveBeenCalled();
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Discard draft' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith(`/admin/email/templates/${KEY}/draft`));
  });

  it('gives a read-only administrator the wording and the preview, and no way to change anything', async () => {
    permissions.write = false;
    open();
    const subject = await field('Subject');
    expect(subject.readOnly).toBe(true);
    for (const name of [/Save draft/, 'Publish', /Send test email/, /Discard draft/]) expect(screen.queryByRole('button', { name })).toBeNull();
    expect((screen.getByRole('switch', { name: 'Use my wording' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: /Restore/ })).toBeNull();
  });

  it('shows why the template could not be loaded', async () => {
    http.get.mockImplementation(async () => {
      throw apiFailure(403, 'You need the super admin role.');
    });
    open();
    expect(await screen.findByText(/super admin role/)).toBeTruthy();
  });
});

describe('sending a test email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.write = true;
    serve();
  });

  const openDialog = async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('button', { name: /Send test email/ }));
    return { user, dialog: await screen.findByRole('dialog') };
  };

  it('needs a valid address, sends the sample once, and says it is marked TEST', async () => {
    const { user, dialog } = await openDialog();
    expect(dialog.textContent).toMatch(/marked TEST/);
    const send = within(dialog).getByRole('button', { name: 'Send test' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    await user.type(within(dialog).getByLabelText('Send to'), 'not-an-address');
    expect(send.disabled).toBe(true);
    await user.clear(within(dialog).getByLabelText('Send to'));
    await user.type(within(dialog).getByLabelText('Send to'), 'qa@example.com');
    await user.click(send);

    await waitFor(() => expect(http.post).toHaveBeenCalledWith(`/admin/email/templates/${KEY}/test`, { to: 'qa@example.com', useDraft: false }));
    expect(await within(dialog).findByText(/accepted by the mail server/)).toBeTruthy();
  });

  it('says when it was not sent, in words, not codes', async () => {
    http.post.mockImplementation(async (path: string) => {
      if (path.endsWith('/test')) return ok({ status: 'failed', logId: null, errorCode: 'timeout' });
      return ok(preview());
    });
    const { user, dialog } = await openDialog();
    await user.type(within(dialog).getByLabelText('Send to'), 'qa@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Send test' }));
    expect(await within(dialog).findByText(/It was not sent: The mail server did not answer in time/)).toBeTruthy();
  });

  it('shows the API refusal, such as the rate limit', async () => {
    http.post.mockImplementation(async (path: string) => {
      if (path.endsWith('/test')) throw apiFailure(429, 'Too many test emails. Try again later.');
      return ok(preview());
    });
    const { user, dialog } = await openDialog();
    await user.type(within(dialog).getByLabelText('Send to'), 'qa@example.com');
    await user.click(within(dialog).getByRole('button', { name: 'Send test' }));
    expect(await within(dialog).findByText(/Too many test emails/)).toBeTruthy();
  });
});
