// A tiny seeded generator (mulberry32): the same seed builds the same city, traffic and
// pedestrians, which is what makes the screenshot scenes repeatable.
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Round 2: shuffle a list in place with the seeded generator, so the taxi fares and
// the hidden packages come in a different order every seed but the same order per seed.
export function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Round 3: pick n distinct items from a list, in seeded order.
export function sample(rng, list, n) {
  return shuffle(rng, [...list]).slice(0, Math.min(n, list.length));
}

// Round 3: small math the new systems share — a clamped value, and the shortest
// signed turn between two headings, so boats, interceptors and the autopilot all
// steer the same way instead of spinning the long way round.
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function angleDiff(want, have) {
  let dh = want - have;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  return dh;
}
