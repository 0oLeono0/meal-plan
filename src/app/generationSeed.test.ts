import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGenerationSeed } from './generationSeed';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('generation seed compatibility', () => {
  it('uses the available native UUID as a reproducible search input', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'e518fed7-4664-4252-a608-6a8797503b52' });
    expect(createGenerationSeed()).toBe('e518fed7-4664-4252-a608-6a8797503b52');
  });

  it.each([undefined, () => { throw new Error('UUID unavailable'); }])('falls back to random values when UUID is unavailable: %s', randomUUID => {
    vi.stubGlobal('crypto', { randomUUID, getRandomValues: (values: Uint32Array) => {
      values.set([0, 1, 0x12345678, 0xffffffff]); return values;
    } });
    expect(createGenerationSeed()).toBe('000000000000000112345678ffffffff');
  });

  it.each([undefined, {}, { randomUUID() { throw new Error('UUID denied'); }, getRandomValues() { throw new Error('Entropy denied'); } }])(
    'still produces distinct bounded non-secret seeds without crypto: %s', crypto => {
      vi.stubGlobal('crypto', crypto);
      vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T00:00:00Z'));
      const first = createGenerationSeed(), second = createGenerationSeed();
      expect(first).toMatch(/^local-[a-z0-9]+-[a-z0-9]+$/);
      expect(second).not.toBe(first);
      expect(first.length).toBeLessThanOrEqual(200);
    },
  );
});
