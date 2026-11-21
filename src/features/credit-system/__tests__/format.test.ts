import { describe, expect, it } from 'vitest';
import { formatCreditsOrNA, formatUsd, NOT_AVAILABLE } from '../format';

describe('what is shown for a figure', () => {
  it('says Not available for a missing amount, and never zero', () => {
    expect(formatUsd(null)).toBe(NOT_AVAILABLE);
    expect(formatUsd(undefined)).toBe(NOT_AVAILABLE);
    expect(formatCreditsOrNA(null)).toBe(NOT_AVAILABLE);
    expect(formatUsd(null)).not.toMatch(/0/);
  });
  it('shows a real zero as zero', () => {
    expect(formatUsd('0')).toBe('$0');
    expect(formatUsd('0.00000000')).toBe('$0');
    expect(formatCreditsOrNA('0')).toBe('0');
  });
  it('shows exact decimals without padding or rounding', () => {
    expect(formatUsd('0.95000000000000')).toBe('$0.95');
    expect(formatUsd('1234567.1234')).toBe('$1,234,567.1234');
    expect(formatUsd('0.0000000001')).toBe('$0.0000000001');
    expect(formatCreditsOrNA('1000.50000000')).toBe('1,000.5');
  });
});
