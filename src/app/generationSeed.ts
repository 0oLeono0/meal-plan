let localSequence = 0;

/** Search ordering input only: never an authentication token or persistent ID. */
export function createGenerationSeed(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  } catch { /* A denied optional API must not prevent local meal planning. */ }
  try {
    const values = new Uint32Array(4);
    globalThis.crypto.getRandomValues(values);
    return Array.from(values, value => value.toString(16).padStart(8, '0')).join('');
  } catch {
    // A seed only chooses search ordering. Clock + sequence remains usable when
    // browser crypto is entirely unavailable, without claiming secure randomness.
    localSequence = (localSequence + 1) % Number.MAX_SAFE_INTEGER;
    return `local-${Date.now().toString(36)}-${localSequence.toString(36)}`;
  }
}
