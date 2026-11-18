import { describe, expect, it } from 'vitest';
import { effectiveEffort } from '../effort';

/** The same cases as ormitech-api `reasoning-effort.spec.ts`: the screen and the API must agree on what is sent. */
describe('effectiveEffort', () => {
  const all = ['none', 'minimal', 'low', 'medium', 'high'];
  it('sends the effort asked for when accepted', () => {
    for (const effort of ['none', 'minimal', 'low', 'medium', 'high'] as const) expect(effectiveEffort(effort, all)).toBe(effort);
  });
  it('sends nothing for default or when the accepted efforts are not recorded', () => {
    expect(effectiveEffort('default', all)).toBe('default');
    expect(effectiveEffort('low', null)).toBe('default');
    expect(effectiveEffort('low', undefined)).toBe('default');
  });
  it('moves to the nearest accepted effort, the lower on a tie', () => {
    expect(effectiveEffort('none', ['high', 'medium', 'low'])).toBe('low');
    expect(effectiveEffort('minimal', ['high', 'medium', 'low'])).toBe('low');
    expect(effectiveEffort('minimal', ['max', 'high', 'low', 'none'])).toBe('none');
    expect(effectiveEffort('medium', ['max', 'high', 'low', 'none'])).toBe('low');
    expect(effectiveEffort('minimal', ['high', 'medium', 'low', 'minimal'])).toBe('minimal');
  });
  it('sends nothing when none of the efforts used here is accepted', () => {
    expect(effectiveEffort('low', [])).toBe('default');
    expect(effectiveEffort('low', ['max', 'xhigh'])).toBe('default');
  });
});
