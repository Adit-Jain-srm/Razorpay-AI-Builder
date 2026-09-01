/**
 * Deterministic, dependency-free pseudo-random number generation for seeders.
 *
 * `xmur3` hashes a string into a 32-bit seed; `mulberry32` is a fast, well-
 * distributed 32-bit PRNG. Together they give a SEEDABLE, reproducible stream:
 * the same seed string always yields the same sequence, which is what makes the
 * analytics seeder testable (identical output across runs) while still looking
 * organic. No `Math.random()` anywhere in the seeder.
 */

/** Hash a string into a 32-bit unsigned integer seed generator. */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** Mulberry32 PRNG: returns a function producing floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** Standard-normal sample (mean 0, stddev 1) via Box-Muller. */
  normal(): number;
  /** Multiplicative noise factor centered on 1 with the given stddev, clamped. */
  jitter(stddev: number, clampPct?: number): number;
}

/** Build a seeded RNG with convenience samplers. */
export function makeRng(seed: string): Rng {
  const next = mulberry32(xmur3(seed)());
  const rng: Rng = {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    normal: () => {
      // Box-Muller; guard against log(0).
      const u = 1 - next();
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    jitter: (stddev, clampPct = 3) => {
      const factor = 1 + rng.normal() * stddev;
      return Math.min(1 + clampPct * stddev, Math.max(1 - clampPct * stddev, factor));
    },
  };
  return rng;
}
