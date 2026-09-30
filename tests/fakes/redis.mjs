/* Redis en mémoire, limité à ce que le site utilise. Les valeurs
   passent par JSON comme chez Upstash. Les expirations sont
   ignorées : un test simule l'expiration en effaçant la clé. */
const kv = (globalThis.__kv ??= new Map());
const zs = (globalThis.__zs ??= new Map());

const client = {
  async set(k, v, opts = {}) {
    if (opts.nx && kv.has(k)) return null;
    kv.set(k, JSON.stringify(v));
    return 'OK';
  },
  async get(k) { return kv.has(k) ? JSON.parse(kv.get(k)) : null; },
  async del(k) { return kv.delete(k) ? 1 : 0; },
  async mget(...ks) { return ks.map((k) => (kv.has(k) ? JSON.parse(kv.get(k)) : null)); },
  async zadd(k, { score, member }) {
    const z = zs.get(k) || new Map();
    z.set(member, score);
    zs.set(k, z);
    return 1;
  },
  async zrange(k) {
    return [...(zs.get(k) || new Map()).entries()].sort((a, b) => a[1] - b[1]).map(([m]) => m);
  },
  async zrem(k, ...ms) { const z = zs.get(k); ms.forEach((m) => z && z.delete(m)); return ms.length; }
};

export const Redis = { fromEnv: () => client };
