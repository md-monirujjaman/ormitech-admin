import { describe, expect, it } from 'vitest';
import { formatPrice, pricesEqual, sameSet } from '../format';
import { createModelSchema, fieldErrors, pricingSchema } from '../schemas';

const pricing = (overrides: Record<string, string> = {}) => ({ inputPerMillion: '0.15', outputPerMillion: '0.6', cachedInputPerMillion: '', currency: 'USD', note: '', ...overrides });

describe('pricing validation', () => {
  it('accepts decimal prices with up to 8 places, including an empty cached price', () => {
    for (const value of ['0', '1', '0.15', '0.12345678', '999999.87654321', '1000000', '1000000.00000000']) {
      expect(pricingSchema.safeParse(pricing({ inputPerMillion: value })).success, value).toBe(true);
    }
  });

  it('keeps a price as the text it was typed as', () => {
    const parsed = pricingSchema.parse(pricing({ inputPerMillion: ' 0.10000000 ', outputPerMillion: '12.5' }));
    expect(parsed.inputPerMillion).toBe('0.10000000');
    expect(parsed.outputPerMillion).toBe('12.5');
  });

  it.each(['', '-1', 'abc', '1e-7', '0.123456789', '1,5', '1.', '.5', '12345678901', '1000000.00000001', '1000001', ' '])('refuses the price %j', (value) => {
    expect(pricingSchema.safeParse(pricing({ inputPerMillion: value })).success).toBe(false);
    expect(pricingSchema.safeParse(pricing({ outputPerMillion: value })).success).toBe(false);
  });

  it('refuses a bad cached price, currency or note, and any field it does not know', () => {
    expect(pricingSchema.safeParse(pricing({ cachedInputPerMillion: '-1' })).success).toBe(false);
    expect(pricingSchema.safeParse(pricing({ currency: 'usd' })).success).toBe(false);
    expect(pricingSchema.safeParse(pricing({ currency: 'US' })).success).toBe(false);
    expect(pricingSchema.safeParse(pricing({ note: 'x'.repeat(301) })).success).toBe(false);
    expect(pricingSchema.safeParse({ ...pricing(), extra: 'x' }).success).toBe(false);
  });

  it('reports a message for the field that is wrong', () => {
    const result = pricingSchema.safeParse(pricing({ outputPerMillion: '1.123456789' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).outputPerMillion).toMatch(/8 decimal places/);
  });
});

describe('prices are compared and shown without rounding', () => {
  it('trims only the padding zeros', () => {
    expect(formatPrice('0.15000000')).toBe('0.15');
    expect(formatPrice('1.00000000')).toBe('1');
    expect(formatPrice('0.00000001')).toBe('0.00000001');
    expect(formatPrice('999999.87654321')).toBe('999999.87654321');
    expect(formatPrice('0.00000000')).toBe('0');
    expect(formatPrice('12')).toBe('12');
    expect(formatPrice(null)).toBe('not set');
  });

  it('compares amounts exactly, whatever the padding', () => {
    expect(pricesEqual('0.15', '0.15000000')).toBe(true);
    expect(pricesEqual('0.1', '0.10000001')).toBe(false);
    expect(pricesEqual('0.30000000', '0.3')).toBe(true);
    expect(pricesEqual('999999.99999999', '999999.99999998')).toBe(false);
    expect(pricesEqual(null, null)).toBe(true);
    expect(pricesEqual(null, '0')).toBe(false);
    expect(pricesEqual('not a number', '1')).toBe(false);
  });

  it('compares sets of plans regardless of order', () => {
    expect(sameSet(['b', 'a'], ['a', 'b'])).toBe(true);
    expect(sameSet(['a'], ['a', 'b'])).toBe(false);
    expect(sameSet([], [])).toBe(true);
  });
});

describe('model form', () => {
  const modelForm = { modelId: 'fixture-model-a', displayName: 'Fixture', description: '', contextWindow: '', capabilities: ['chat' as const] };

  it('accepts a model and an optional context window', () => {
    expect(createModelSchema.safeParse(modelForm).success).toBe(true);
    expect(createModelSchema.safeParse({ ...modelForm, contextWindow: '128000' }).success).toBe(true);
  });

  it('refuses an id with spaces, a bad context window or no capability', () => {
    expect(createModelSchema.safeParse({ ...modelForm, modelId: 'has space' }).success).toBe(false);
    expect(createModelSchema.safeParse({ ...modelForm, modelId: '' }).success).toBe(false);
    expect(createModelSchema.safeParse({ ...modelForm, contextWindow: '0' }).success).toBe(false);
    expect(createModelSchema.safeParse({ ...modelForm, contextWindow: '1.5' }).success).toBe(false);
    expect(createModelSchema.safeParse({ ...modelForm, contextWindow: '100000001' }).success).toBe(false);
    expect(createModelSchema.safeParse({ ...modelForm, capabilities: [] }).success).toBe(false);
    expect(createModelSchema.safeParse({ ...modelForm, capabilities: ['telepathy'] }).success).toBe(false);
    expect(createModelSchema.safeParse({ ...modelForm, capabilities: ['chat', 'audio'] }).success).toBe(true);
  });
});
