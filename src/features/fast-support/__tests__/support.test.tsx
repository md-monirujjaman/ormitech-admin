import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { toAdminUser } from '@/features/auth/authApi';
import { NavSection } from '@/components/navigation/NavSection';
import { NAV_SECTIONS } from '@/lib/navigation';
import { useAuthStore } from '@/store/authStore';
import { resolvePermissions } from '@/lib/permissions';
import ModeratorsPage from '../pages/ModeratorsPage';
import SupportDeskPage from '../pages/SupportDeskPage';
import SupportSessionPage from '../pages/SupportSessionPage';
import { JoinContext } from '../SupportJoinContext';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }, setAccessToken: vi.fn(), setUnauthorizedHandler: vi.fn() }));
const granted = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: (permission?: string) => !permission || granted.list.includes(permission) }) }));
vi.mock('@/components/shared/MockDataNotice', () => ({ MockDataNotice: () => null }));

const http = axiosClient as unknown as Record<'get' | 'post' | 'patch', Mock>;
const ok = <T,>(data: T) => ({ data: { data } });

const item = (overrides = {}) => ({
  id: 's1',
  subject: 'Facebook page will not connect',
  category: 'facebook_instagram',
  categoryLabel: 'Facebook / Instagram Connection',
  status: 'waiting_for_moderator',
  organizationName: 'Alpha Shop',
  descriptionPreview: 'I press Connect and it fails.',
  hasAttachment: true,
  assignedModeratorId: null,
  assignedModeratorName: null,
  assignedToMe: false,
  canAccept: true,
  aiEnabled: true,
  createdAt: '2026-11-08T10:00:00.000Z',
  lastMessageAt: '2026-11-08T10:00:00.000Z',
  ...overrides,
});

const overview = { totalRequests: 7, pendingRequests: 2, activeSessions: 3, waitingForCustomer: 1, assignedSessions: 1, resolvedSessions: 1, averageResponseSeconds: 180 };

function renderPage(ui: React.ReactElement, path = '/', route = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <JoinContext.Provider value={async () => true}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={ui} />
            <Route path="/fast-support/:id" element={<p>session page</p>} />
          </Routes>
        </MemoryRouter>
      </JoinContext.Provider>
    </QueryClientProvider>,
  );
}

const serveDesk = (items = [item()], me = { isSuperAdmin: false, isModerator: true, permissions: ['support.view', 'support.accept'] }) =>
  http.get.mockImplementation(async (path: string) => {
    if (path.endsWith('/me')) return ok(me);
    if (path.endsWith('/overview')) return ok(overview);
    if (path.endsWith('/notifications')) return ok({ unread: 0, items: [] });
    if (path.endsWith('/sessions')) return ok({ items, hasMore: false });
    return ok(null);
  });

describe('Support desk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    granted.list = ['fastsupport.use'];
  });

  it('shows real numbers and the requests waiting, with who they are from', async () => {
    serveDesk();
    renderPage(<SupportDeskPage />);
    expect(await screen.findByText('Facebook page will not connect')).toBeTruthy();
    expect(screen.getByText('Alpha Shop')).toBeTruthy();
    expect(screen.getByText('Attachment')).toBeTruthy();
    expect(await screen.findByText('7')).toBeTruthy();
    expect(screen.getByText('3 min')).toBeTruthy();
    expect(http.get).toHaveBeenCalledWith('/admin/support/sessions', { params: { scope: 'available', search: undefined, limit: 50, offset: undefined } });
  });

  it('shows the history tab only to someone allowed to see it', async () => {
    serveDesk();
    const plain = renderPage(<SupportDeskPage />);
    await screen.findByText('Facebook page will not connect');
    expect(screen.queryByRole('tab', { name: 'Support history' })).toBeNull();
    plain.unmount();
    serveDesk([item()], { isSuperAdmin: true, isModerator: false, permissions: ['support.view'] });
    renderPage(<SupportDeskPage />);
    expect(await screen.findByRole('tab', { name: 'Support history' })).toBeTruthy();
  });

  it('accepts a request and opens it', async () => {
    serveDesk();
    http.post.mockResolvedValue(ok({ id: 's1', status: 'assigned', moderatorName: 'Rahim' }));
    renderPage(<SupportDeskPage />, '/', '/');
    await userEvent.click(await screen.findByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/support/sessions/s1/accept'));
    expect(await screen.findByText('session page')).toBeTruthy();
  });

  it('says who got there first when the request has already been taken, and stays on the list', async () => {
    serveDesk();
    http.post.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'Rahim already took this request.' } } });
    renderPage(<SupportDeskPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Accept' }));
    expect((await screen.findByRole('alert')).textContent).toContain('already took this request');
    expect(screen.queryByText('session page')).toBeNull();
  });

  it('gives no Accept button on a request that is not free', async () => {
    serveDesk([item({ canAccept: false, status: 'assigned', assignedModeratorName: 'Rahim' })]);
    renderPage(<SupportDeskPage />);
    await screen.findByText('Facebook page will not connect');
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    expect(screen.getByText('Handled by Rahim')).toBeTruthy();
  });

  it('says so when nothing is waiting and when the list cannot be loaded', async () => {
    serveDesk([]);
    const empty = renderPage(<SupportDeskPage />);
    expect(await screen.findByText('No requests are waiting')).toBeTruthy();
    empty.unmount();
    http.get.mockImplementation(async (path: string) => {
      if (path.endsWith('/sessions')) throw { isAxiosError: true, response: { status: 500, data: { message: 'boom' } } };
      return ok(path.endsWith('/me') ? { isSuperAdmin: false, isModerator: true, permissions: ['support.view'] } : path.endsWith('/overview') ? overview : { unread: 0, items: [] });
    });
    renderPage(<SupportDeskPage />);
    expect(await screen.findByText("Couldn't load the requests")).toBeTruthy();
  });
});

const detail = (overrides: Record<string, unknown> = {}, session: Record<string, unknown> = {}) => ({
  session: { ...item({ assignedModeratorId: 'me', assignedModeratorName: 'Rahim', assignedToMe: true, canAccept: false, status: 'human_active' }), description: 'I press Connect and it fails.', phoneNumber: '+8801712345678', clientName: 'Nadia', aiChangedAt: null, acceptedAt: null, firstModeratorReplyAt: null, resolvedAt: null, canReply: true, ...session },
  messages: [
    { id: '1', senderType: 'client', senderName: 'Nadia', body: 'It fails', attachment: null, createdAt: '2026-11-08T10:00:00.000Z' },
    { id: '2', senderType: 'ai', senderName: 'OrmiTech AI', body: 'Try Reconnect', attachment: null, createdAt: '2026-11-08T10:01:00.000Z' },
  ],
  notes: [{ id: 'n1', adminId: 'me', adminName: 'Rahim', body: 'Looks like billing', createdAt: '2026-11-08T10:02:00.000Z' }],
  events: [{ id: 'e1', actorType: 'client', actorId: null, eventType: 'created', fromStatus: null, toStatus: 'waiting_for_moderator', detail: null, createdAt: '2026-11-08T10:00:00.000Z' }],
  ...overrides,
});

const ALL = ['support.view', 'support.accept', 'support.reply', 'support.manage_assigned', 'support.ai.toggle', 'support.notes.create', 'support.resolve', 'support.reopen'];
const serveSession = (data = detail(), permissions = ALL, isSuperAdmin = false) =>
  http.get.mockImplementation(async (path: string) => (path.endsWith('/me') ? ok({ isSuperAdmin, isModerator: !isSuperAdmin, permissions }) : path.endsWith('/sessions/s1') ? ok(data) : ok(null)));
const renderSession = () => renderPage(<SupportSessionPage />, '/fast-support/s1', '/fast-support/:id');

describe('Support request page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    granted.list = ['fastsupport.use'];
  });

  it('shows the whole chat from the start, the client\'s details and the notes only moderators see', async () => {
    serveSession();
    renderSession();
    const chat = await screen.findByRole('list', { name: 'Conversation' });
    expect(within(chat).getByText('It fails')).toBeTruthy();
    expect(within(chat).getByText('Try Reconnect')).toBeTruthy();
    expect(screen.getByText('+8801712345678')).toBeTruthy();
    expect(screen.getByText('Looks like billing')).toBeTruthy();
    expect(screen.getByText('You are handling this')).toBeTruthy();
  });

  it('turns the AI off through the server and shows the new state', async () => {
    serveSession();
    http.post.mockResolvedValue(ok({ sessionId: 's1', aiEnabled: false, status: 'human_active' }));
    renderSession();
    const toggle = await screen.findByRole('switch', { name: 'AI replies' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await userEvent.click(toggle);
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/support/sessions/s1/ai', { enabled: false }));
  });

  it('sends a reply as the moderator', async () => {
    serveSession();
    http.post.mockResolvedValue(ok({ id: '3' }));
    renderSession();
    await userEvent.type(await screen.findByLabelText('Your reply'), 'I am on it');
    await userEvent.click(screen.getByRole('button', { name: /Send/ }));
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    const [path, form] = http.post.mock.calls[0]!;
    expect(path).toBe('/admin/support/sessions/s1/messages');
    expect((form as FormData).get('body')).toBe('I am on it');
  });

  it('asks before resolving, and resolves once confirmed', async () => {
    serveSession();
    http.post.mockResolvedValue(ok({ sessionId: 's1', status: 'resolved' }));
    renderSession();
    await userEvent.click(await screen.findByRole('button', { name: 'Resolve' }));
    expect(http.post).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Resolve', hidden: false }).then(() => screen.getAllByRole('button', { name: 'Resolve' }).at(-1)!));
    await waitFor(() => expect(http.post).toHaveBeenCalledWith('/admin/support/sessions/s1/resolve'));
  });

  it('gives a moderator who does not hold the request no reply box, no AI switch, and an Accept button when it is free', async () => {
    serveSession(detail({}, { assignedToMe: false, assignedModeratorName: 'Someone', canAccept: false, canReply: false }), ['support.view', 'support.history.view']);
    renderSession();
    await screen.findByRole('list', { name: 'Conversation' });
    expect(screen.queryByLabelText('Your reply')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'AI replies' })).toBeNull();
    expect(screen.getByText('Only the moderator handling this request can reply.')).toBeTruthy();
  });

  it('offers Accept on a free request, and no reply box until it is taken', async () => {
    serveSession(detail({}, { assignedToMe: false, assignedModeratorName: null, assignedModeratorId: null, canAccept: true, status: 'waiting_for_moderator', canReply: false }), ['support.view', 'support.accept']);
    renderSession();
    expect(await screen.findByRole('button', { name: 'Accept this request' })).toBeTruthy();
    expect(screen.queryByLabelText('Your reply')).toBeNull();
  });

  it('is read-only once resolved, and offers Reopen to who may', async () => {
    serveSession(detail({}, { status: 'resolved', canReply: false }));
    renderSession();
    expect(await screen.findByText(/This request is resolved/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeTruthy();
    expect(screen.queryByLabelText('Your reply')).toBeNull();
  });

  it('says so when the request cannot be opened', async () => {
    http.get.mockImplementation(async (path: string) => {
      if (path.endsWith('/me')) return ok({ isSuperAdmin: false, isModerator: true, permissions: ['support.view'] });
      throw { isAxiosError: true, response: { status: 403, data: { message: 'This request is handled by another moderator.' } } };
    });
    renderSession();
    expect(await screen.findByText("Couldn't open this request")).toBeTruthy();
  });
});

describe('Moderators page', () => {
  const moderator = (overrides = {}) => ({ id: 'm1', email: 'rahim@ormitech.test', name: 'Rahim', active: true, permissions: ['support.view', 'support.accept'], lastLoginAt: null, createdAt: '2026-11-01T00:00:00.000Z', openSessions: 2, resolvedSessions: 5, averageFirstReplySeconds: 95, ...overrides });

  beforeEach(() => {
    vi.clearAllMocks();
    granted.list = ['fastsupport.use', 'fastsupport.moderators'];
    http.get.mockImplementation(async (path: string) => (path.endsWith('/moderators') ? ok([moderator()]) : ok({ events: [], assigned: [] })));
  });

  it('lists moderators with how they are doing', async () => {
    renderPage(<ModeratorsPage />);
    expect(await screen.findByText('Rahim')).toBeTruthy();
    expect(screen.getByText('rahim@ormitech.test')).toBeTruthy();
    expect(screen.getByText('2 open')).toBeTruthy();
    expect(screen.getByText('5 resolved')).toBeTruthy();
  });

  it('is closed to anyone but a super admin, and asks the API for nothing', () => {
    granted.list = ['fastsupport.use'];
    renderPage(<ModeratorsPage />);
    expect(screen.getByText('Only a super admin manages moderators')).toBeTruthy();
    expect(http.get).not.toHaveBeenCalled();
  });

  it('creates a moderator with the ticked permissions', async () => {
    http.post.mockResolvedValue(ok(moderator({ id: 'm2', name: 'Nadia', email: 'nadia@ormitech.test' })));
    renderPage(<ModeratorsPage />);
    await userEvent.click(await screen.findByRole('button', { name: /New moderator/ }));
    await userEvent.type(screen.getByLabelText('Name'), 'Nadia');
    await userEvent.type(screen.getByLabelText('Email'), 'nadia@ormitech.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ngPassw0rdXY');
    await userEvent.click(screen.getByRole('checkbox', { name: 'See other moderators’ requests and history' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create moderator' }));
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    const [path, body] = http.post.mock.calls[0]!;
    expect(path).toBe('/admin/support/moderators');
    expect(body).toMatchObject({ name: 'Nadia', email: 'nadia@ormitech.test', permissions: expect.arrayContaining(['support.view', 'support.accept', 'support.history.view']) });
  });

  it('switches a moderator off', async () => {
    http.patch.mockResolvedValue(ok(moderator({ active: false })));
    renderPage(<ModeratorsPage />);
    await userEvent.click(await screen.findByRole('switch', { name: 'Switch Rahim off' }));
    await waitFor(() => expect(http.patch).toHaveBeenCalledWith('/admin/support/moderators/m1', { active: false }));
  });
});

describe('who sees what', () => {
  it('gives a moderator Fast Support and nothing else', () => {
    const admin = toAdminUser({ id: '1', email: 'm@x.test', name: 'M', status: 'active', roles: ['moderator'], lastLoginAt: null, createdAt: '2026-11-01T00:00:00.000Z' });
    expect(admin.roles).toEqual(['MODERATOR']);
    expect(admin.permissions).toEqual(['fastsupport.use']);
    granted.list = admin.permissions;
    useAuthStore.setState({ admin });
    render(
      <MemoryRouter>
        {NAV_SECTIONS.map((section) => (
          <NavSection key={section.label} section={section} />
        ))}
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Support Desk']);
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Organizations' })).toBeNull();
  });

  it('keeps moderator management for the super admin only', () => {
    expect(resolvePermissions(['SUPER_ADMIN'])).toEqual(expect.arrayContaining(['fastsupport.use', 'fastsupport.moderators']));
    expect(resolvePermissions(['ADMIN'])).not.toContain('fastsupport.moderators');
    expect(resolvePermissions(['ADMIN'])).not.toContain('fastsupport.use');
    expect(resolvePermissions(['CONTENT_ADMIN'])).not.toContain('fastsupport.use');
  });

  it('does not turn a moderator who also has another role into a moderator-only account', () => {
    const admin = toAdminUser({ id: '1', email: 'm@x.test', name: 'M', status: 'active', roles: ['moderator', 'content_admin'], lastLoginAt: null, createdAt: '2026-11-01T00:00:00.000Z' });
    expect(admin.roles).not.toContain('MODERATOR');
  });
});
