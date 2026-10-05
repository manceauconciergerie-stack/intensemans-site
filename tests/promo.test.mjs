/* Code d'apporteur VANESSA10 : remise appliquée par le serveur, au
   centime, et l'hôte sait qui a envoyé le client.
   Lancer depuis la racine :  node --test tests/*.test.mjs */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./fakes/loader.mjs', import.meta.url);

process.env.HOST_NOTIFY_EMAIL = 'hote@exemple.fr';
process.env.RESEND_API_KEY = 're_test';
delete process.env.AIRBNB_ICAL_URL;
delete process.env.TARIF_SEMAINE;

const { POST: creer } = await import('../site/api/create-stay-session.js');
const { POST: webhook } = await import('../site/api/webhook.js');
const { GET: verifier } = await import('../site/api/promo.js');

beforeEach(() => {
  globalThis.__kv.clear();
  globalThis.__zs.clear();
  globalThis.__mails.length = 0;
  globalThis.__sessions = [];
});

const reserver = (corps) => creer(new Request('http://local/api/create-stay-session', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ guest: { name: 'Camille Test', email: 'client@exemple.fr', phone: '06 00 00 00 00' }, ...corps })
}));

const lire = (k) => (globalThis.__kv.has(k) ? JSON.parse(globalThis.__kv.get(k)) : null);
const montants = (s) => s.line_items.map((l) => [l.price_data.unit_amount, l.quantity]);

/* Lundi 2 novembre 2099 : 115 € plein tarif (pas de dernière minute). */
const LUNDI = { checkin: '2099-11-02', checkout: '2099-11-03' };

test('« Vanessa10 » saisi en minuscules : −10 % sur la nuit et les attentions', async () => {
  const r = await reserver({ ...LUNDI, items: [{ id: 'petales-roses', qty: 2 }], promo: 'Vanessa10' });
  assert.equal(r.status, 200, await r.clone().text());

  const s = globalThis.__sessions[0];
  assert.deepEqual(montants(s), [[10350, 1], [2250, 2]], 'nuit 115 → 103,50 ; pétales 25 → 22,50 ×2');
  assert.equal(s.metadata.promo, 'VANESSA10');

  const sejour = lire(`stay:${s.client_reference_id}`);
  assert.equal(sejour.total, 148.5);
  assert.deepEqual(sejour.promo, { code: 'VANESSA10', apporteur: 'Vanessa', remise: 0.1, montant: 16.5 });
  assert.equal(sejour.nightsTotal, 115, 'lignes gardées au plein tarif, remise à part');
});

test('sans code : plein tarif, aucune trace de promo', async () => {
  await reserver({ ...LUNDI, items: [{ id: 'petales-roses', qty: 1 }] });
  const s = globalThis.__sessions[0];
  assert.deepEqual(montants(s), [[11500, 1], [2500, 1]]);
  assert.equal(s.metadata.promo, undefined);
  assert.equal(lire(`stay:${s.client_reference_id}`).promo, null);
});

test('code inconnu : refusé, rien de verrouillé ni débité', async () => {
  const r = await reserver({ ...LUNDI, promo: 'PIERRE50' });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /code promo/);
  assert.equal(globalThis.__sessions.length, 0);
  assert.equal(lire('night:2099-11-02'), null, 'nuit non verrouillée');
});

test('Saint-Valentin : la nuit reste à 350 €, les attentions sont remisées', async () => {
  await reserver({ checkin: '2099-02-14', checkout: '2099-02-15', items: [{ id: 'chocolats', qty: 1 }], promo: 'VANESSA10' });
  const s = globalThis.__sessions[0];
  assert.deepEqual(montants(s), [[35000, 1], [1620, 1]], 'chocolats 18 → 16,20');
  assert.equal(lire(`stay:${s.client_reference_id}`).promo.montant, 1.8);
});

test('après paiement : Lenny sait que le client vient de Vanessa', async () => {
  await reserver({ ...LUNDI, items: [{ id: 'petales-roses', qty: 2 }], promo: 'VANESSA10' });
  const s = globalThis.__sessions[0];
  const total = s.line_items.reduce((t, l) => t + l.price_data.unit_amount * l.quantity, 0);

  const r = await webhook(new Request('http://local/api/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 't' },
    body: JSON.stringify({ type: 'checkout.session.completed', data: { object: {
      id: 'cs_test_1', client_reference_id: s.client_reference_id, amount_total: total,
      customer_email: 'client@exemple.fr', metadata: s.metadata, payment_method_types: ['card']
    } } })
  }));
  assert.equal(r.status, 200);

  const hote = globalThis.__mails.find((m) => m.to.includes('hote@exemple.fr'));
  assert.match(hote.text, /De la part de Vanessa · code VANESSA10, −16,50\s€/);
  assert.match(hote.text, /Total payé\s+148,50\s€/);
  const client = globalThis.__mails.find((m) => m.to.includes('client@exemple.fr'));
  assert.match(client.text, /Code VANESSA10\s+−16,50\s€/);
});

test('/api/promo : reconnaît le code, refuse le reste', async () => {
  const ok = await verifier(new Request('http://local/api/promo?code=vanessa%2010'));
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { valide: true, code: 'VANESSA10', apporteur: 'Vanessa', remise: 0.1 });
  const ko = await verifier(new Request('http://local/api/promo?code=IM-AB12C'));
  assert.equal(ko.status, 404);
});
