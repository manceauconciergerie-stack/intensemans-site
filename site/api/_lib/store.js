/* ============================================================
   INTENSÉ'MANS — Registre des commandes (serveur)
   ------------------------------------------------------------
   Remplace le localStorage du prototype. Une commande écrite ici
   est visible par l'hôte depuis n'importe quel appareil — c'était
   impossible tant que tout vivait dans le navigateur du client.

   Deux clés :
     order:<ref>    la commande elle-même
     orders:index   les références payées, triées par moment d'arrivée
   ============================================================ */

import { Redis } from '@upstash/redis';

/* fromEnv() accepte les deux nommages : UPSTASH_REDIS_REST_* et
   KV_REST_API_*. L'intégration Vercel pose les seconds. */
const redis = Redis.fromEnv();

const key = (ref) => `order:${ref}`;
const INDEX = 'orders:index';

/* Une commande impayée ne doit pas s'accumuler indéfiniment :
   un panier abandonné sur la page Stripe ne reviendra jamais. */
const PENDING_TTL = 60 * 60 * 24;

/* Score de l'index : le moment de l'arrivée, en minutes depuis epoch.
   C'est lui qui donne au tableau son tri « par date de séjour puis
   par heure d'arrivée » sans aucun tri à faire côté client. */
function arrivalScore(stay) {
  const date = (stay && stay.date) || '';
  const arrival = (stay && stay.arrival) || '00:00';
  const ts = Date.parse(`${date}T${arrival}:00`);
  return Number.isFinite(ts) ? Math.round(ts / 60000) : 0;
}

export async function putPending(order) {
  await redis.set(key(order.ref), order, { ex: PENDING_TTL });
}

export async function getOrder(ref) {
  return redis.get(key(ref));
}

/* Passage en payé. Renvoie null si la commande était déjà payée :
   c'est ce qui rend le webhook idempotent, Stripe pouvant livrer
   le même événement plusieurs fois. */
export async function markPaid(ref, patch = {}) {
  const order = await redis.get(key(ref));
  if (!order || order.status === 'paid') return null;

  const paid = { ...order, ...patch, status: 'paid', paidAt: new Date().toISOString() };
  await redis.set(key(ref), paid);          // sans ex : plus d'expiration
  await redis.zadd(INDEX, { score: arrivalScore(paid.stay), member: ref });
  return paid;
}

export async function listOrders() {
  const refs = await redis.zrange(INDEX, 0, -1);
  if (!refs.length) return [];
  const orders = await redis.mget(...refs.map(key));
  return orders.filter(Boolean);
}

export async function setPrepared(ref, prepared) {
  const order = await redis.get(key(ref));
  if (!order) return null;
  const next = { ...order, prepared: Boolean(prepared) };
  await redis.set(key(ref), next);
  return next;
}

export async function markAllPrepared() {
  const orders = await listOrders();
  await Promise.all(
    orders
      .filter((o) => !o.prepared)
      .map((o) => redis.set(key(o.ref), { ...o, prepared: true }))
  );
  return listOrders();
}

/* Archivage : on ne retire que ce qui est passé ET préparé.
   Perdre une commande à venir serait une catastrophe métier —
   même garde-fou que dans le prototype. */
export async function archivePrepared() {
  const orders = await listOrders();
  const cutoff = Date.now() - 86400000;

  const stale = orders.filter((o) => {
    if (!o.prepared) return false;
    const ts = Date.parse(`${(o.stay && o.stay.date) || ''}T00:00:00`);
    return Number.isFinite(ts) && ts < cutoff;
  });

  if (stale.length) {
    await Promise.all(stale.map((o) => redis.del(key(o.ref))));
    await redis.zrem(INDEX, ...stale.map((o) => o.ref));
  }
  return listOrders();
}
