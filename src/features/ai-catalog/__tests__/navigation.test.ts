import { describe, expect, it } from 'vitest';
import { findNavMeta, hasNestedNavItem } from '@/lib/navigation';
import { ROUTES } from '@/lib/constants';

describe('navigation around /ai/providers', () => {
  it('titles each page after its own entry, and nested detail pages after their parent', () => {
    expect(findNavMeta(ROUTES.ai).title).toBe('AI Configuration');
    expect(findNavMeta(ROUTES.aiProviders)).toEqual({ title: 'AI Providers & Models', section: 'Product' });
    expect(findNavMeta(`${ROUTES.organizations}/org_123`).title).toBe('Organizations');
    expect(findNavMeta('/nowhere')).toEqual({ title: 'OrmiTech Admin', section: null });
  });

  it('lights only one of the two AI entries, and leaves every other entry highlighted on its detail pages', () => {
    expect(hasNestedNavItem(ROUTES.ai)).toBe(true);
    expect(hasNestedNavItem(ROUTES.aiProviders)).toBe(false);
    expect(hasNestedNavItem(ROUTES.organizations)).toBe(false);
    expect(hasNestedNavItem(ROUTES.blog)).toBe(false);
  });
});
