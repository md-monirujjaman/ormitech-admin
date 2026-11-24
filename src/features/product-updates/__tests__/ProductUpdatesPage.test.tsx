import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { ok, renderWithClient } from '@/features/ai-catalog/__tests__/testUtils';
import { ROUTES } from '@/lib/constants';
import { findNavMeta } from '@/lib/navigation';
import { ROLE_DEFINITIONS } from '@/lib/permissions';
import ProductUpdatesPage from '../pages/ProductUpdatesPage';
import type { ProductUpdate } from '../types';

vi.mock('@/api/axiosClient', () => ({ axiosClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/api/dataSource', () => ({ isMockDataSource: false }));
const granted = vi.hoisted(() => ({ list: ['productupdates.read', 'productupdates.write'] as string[] }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: (permission?: string) => !permission || granted.list.includes(permission) }) }));
vi.mock('@/components/shared/MockDataNotice', () => ({ MockDataNotice: () => null }));
// jsdom has no ResizeObserver, which Radix's Switch reaches for.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
const http = axiosClient as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', Mock>;

const item = (over: Partial<ProductUpdate> = {}): ProductUpdate => ({
  id: 'u1',
  title: 'AI Agent',
  description: 'A chat that does dashboard work.',
  details: '- Ask for products',
  changes: ['Ask for products'],
  imageUrl: null,
  category: 'feature',
  version: '1.8.0',
  releaseDate: '2026-11-24',
  learnMoreUrl: null,
  status: 'draft',
  newOverride: 'auto',
  sortOrder: 0,
  publishedAt: null,
  isNew: false,
  createdAt: '2026-11-24T09:00:00.000Z',
  updatedAt: '2026-11-24T09:00:00.000Z',
  ...over,
});

describe('the product updates page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    granted.list = ['productupdates.read', 'productupdates.write'];
    http.get.mockResolvedValue(ok([item(), item({ id: 'u2', title: 'Faster inbox', status: 'published', category: 'improvement', isNew: true, publishedAt: new Date().toISOString() })]));
  });

  it('lists drafts and published entries with their state and NEW tag', async () => {
    renderWithClient(<ProductUpdatesPage />);
    expect(await screen.findByText('AI Agent')).toBeTruthy();
    expect(screen.getByText('Faster inbox')).toBeTruthy();
    expect(screen.getByText('Draft')).toBeTruthy();
    expect(screen.getByText('Published')).toBeTruthy();
    expect(screen.getByText('NEW')).toBeTruthy();
    expect(screen.getAllByText('24 Nov 2026').length).toBe(2);
    expect(http.get).toHaveBeenCalledWith('/admin/product-updates');
  });

  it('publishes a draft and unpublishes a published entry from the list', async () => {
    http.patch.mockResolvedValue(ok(item()));
    renderWithClient(<ProductUpdatesPage />);
    await screen.findByText('AI Agent');
    await userEvent.click(screen.getByRole('button', { name: /^Publish$/ }));
    await waitFor(() => expect(http.patch).toHaveBeenCalledWith('/admin/product-updates/u1', { status: 'published' }));
    await userEvent.click(screen.getByRole('button', { name: /^Unpublish$/ }));
    await waitFor(() => expect(http.patch).toHaveBeenCalledWith('/admin/product-updates/u2', { status: 'draft' }));
  });

  it('creates a draft from the form, and refuses an empty title', async () => {
    http.post.mockResolvedValue(ok(item()));
    renderWithClient(<ProductUpdatesPage />);
    await screen.findByText('AI Agent');
    await userEvent.click(screen.getByRole('button', { name: /New update/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Write a title.')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Save draft' }).hasAttribute('disabled')).toBe(true);
    await userEvent.type(within(dialog).getByLabelText('Title'), 'Brand new');
    await userEvent.type(within(dialog).getByLabelText('Version'), '2.0.0');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    expect(http.post.mock.calls[0]![0]).toBe('/admin/product-updates');
    expect(http.post.mock.calls[0]![1]).toMatchObject({ title: 'Brand new', version: '2.0.0', status: 'draft', newOverride: 'auto', category: 'feature', imageUrl: null, learnMoreUrl: null });
  });

  it('refuses a Learn more link that is not a web address', async () => {
    renderWithClient(<ProductUpdatesPage />);
    await screen.findByText('AI Agent');
    await userEvent.click(screen.getByRole('button', { name: /New update/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Title'), 'x');
    await userEvent.type(within(dialog).getByLabelText(/Learn more link/), 'javascript:alert(1)');
    expect(within(dialog).getByText(/must be a full web address/)).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Save draft' }).hasAttribute('disabled')).toBe(true);
  });

  it('deletes after confirming', async () => {
    http.delete.mockResolvedValue(ok(null));
    renderWithClient(<ProductUpdatesPage />);
    await screen.findByText('AI Agent');
    await userEvent.click(screen.getAllByRole('button', { name: /Delete/ })[0]!);
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/admin/product-updates/u1'));
  });

  it('hides every control from someone who can only read', async () => {
    granted.list = ['productupdates.read'];
    renderWithClient(<ProductUpdatesPage />);
    await screen.findByText('AI Agent');
    expect(screen.queryByRole('button', { name: /New update/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Publish/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit/ })).toBeNull();
  });
});

describe('product updates in the admin app', () => {
  it('has a nav entry and a route, and is open to content admins and super admins', () => {
    expect(findNavMeta(ROUTES.productUpdates)).toEqual({ title: 'Product Updates', section: 'Content' });
    const roles = Object.fromEntries(ROLE_DEFINITIONS.map((role) => [role.name, role.permissions]));
    expect(roles.SUPER_ADMIN).toContain('productupdates.write');
    expect(roles.CONTENT_ADMIN).toEqual(expect.arrayContaining(['productupdates.read', 'productupdates.write']));
  });
});
