/* Réservation du 3 octobre : ce qui a manqué ne doit plus manquer.
   Téléphone obligatoire, numéro de l'hôte donné au client, paiement
   Stripe lisible sans mail, cadeau de la roue visible partout.
   Lancer depuis la racine :  node --test tests/*.test.mjs */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./fakes/loader.mjs', import.meta.url);

process.env.HOST_NOTIFY_EMAIL = 'hote@exemple.fr';
process.env.RESEND_API_KEY = 're_test';
delete process.env.AIRBNB_ICAL_URL;
delete process.env.TARIF_SEMAINE;
delete process.env.CONTACT_TEL;

const { POST: creer } = await import('../site/api/create-stay-session.js');
const { POST: webhook } = await import('../site/api/webhook.js');

const CLIENT = { name: 'Camille Test', email: 'client@exemple.fr', phone: '06 12 34 56 78' };
const LUNDI = { checkin: '2099-11-02', checkout: '2099-11-03' };

beforeEach(() => {
  globalThis.__kv.clear();
  globalThis.__zs.clear();
  globalThis.__mails.length = 0;
  globalThis.__sessions = [];
});

const reserver = (corps) => creer(new Request('http://local/api/create-stay-session', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ guest: CLIENT, ...LUNDI, ...corps })
}));

const payer = (s) => webhook(new Request('http://local/api/webhook', {
  method: 'POST',
  headers: { 'stripe-signature': 't' },
  body: JSON.stringify({ type: 'checkout.session.completed', data: { object: {
    id: 'cs_test_1', client_reference_id: s.client_reference_id,
    amount_total: s.line_items.reduce((t, l) => t + l.price_data.unit_amount * l.quantity, 0),
    customer_email: CLIENT.email, metadata: s.metadata, payment_method_types: ['card']
  } } })
}));

const mailA = (to) => globalThis.__mails.find((m) => m.to.includes(to));

test('sans téléphone, ou avec un numéro tronqué : réservation refusée', async () => {
  for (const phone of ['', '06 12 34', 'pas de numéro']) {
    const r = await reserver({ guest: { ...CLIENT, phone } });
    assert.equal(r.status, 400, `« ${phone} »`);
    assert.match((await r.json()).error, /téléphone/);
  }
  assert.equal(globalThis.__sessions.length, 0, 'aucun paiement ouvert');
});

test('numéros acceptés : français, international, avec séparateurs', async () => {
  for (const phone of ['0612345678', '+33 6 12 34 56 78', '06.12.34.56.78']) {
    const r = await reserver({ guest: { ...CLIENT, phone } });
    assert.equal(r.status, 200, `« ${phone} »`);
    globalThis.__kv.clear();
  }
});

test('page Stripe : le numéro de Lenny sous le bouton Payer', async () => {
  await reserver({});
  assert.match(globalThis.__sessions[0].custom_text.submit.message, /Lenny.*06 40 08 10 45/);
});

test('paiement Stripe lisible sans mail : date, client, téléphone, cadeau, attentions', async () => {
  globalThis.__kv.set('cadeau:IM-AB12C', JSON.stringify({ code: 'IM-AB12C', lot: 'Planche apéritive' }));
  await reserver({ cadeau: 'im-ab12c', items: [{ id: 'petales-roses', qty: 1 }] });

  const pi = globalThis.__sessions[0].payment_intent_data;
  assert.match(pi.description, /^Nuit du lundi 2 novembre 2099/);
  assert.match(pi.description, /Camille Test · 06 12 34 56 78/);
  assert.match(pi.description, /Cadeau roue : Planche apéritive \(IM-AB12C\)/);
  assert.match(pi.description, /Attentions : Pétales de roses/);
  assert.equal(pi.metadata['07_Telephone'], '06 12 34 56 78');
  assert.equal(pi.metadata['10_Cadeau_roue'], 'Planche apéritive (IM-AB12C)', 'sur le PAIEMENT, pas seulement la session');
});

test('fiche complète sur le paiement : tout ce que le site sait, dans l’ordre de lecture', async () => {
  globalThis.__kv.set('cadeau:IM-AB12C', JSON.stringify({ code: 'IM-AB12C', lot: 'Planche apéritive' }));
  await reserver({
    cadeau: 'IM-AB12C', promo: 'VANESSA10',
    items: [{ id: 'petales-roses', qty: 2 }, { id: 'champagne-bouteille', qty: 1 }],
    guest: { ...CLIENT, message: 'Anniversaire, Espace Intense : installé.' }, adult: true
  });
  const m = globalThis.__sessions[0].payment_intent_data.metadata;
  assert.deepEqual(Object.keys(m), [
    '01_Reference', '02_Statut', '03_Arrivee', '04_Depart', '05_Nuits', '06_Client', '07_Telephone',
    '08_Email', '09_Attentions', '10_Cadeau_roue', '11_Softs', '12_Alcool', '13_Code_promo',
    '14_Message_client', '15_Total_paye'
  ]);
  assert.match(m['03_Arrivee'], /lundi 2 novembre 2099, à partir de 16 h/);
  assert.match(m['05_Nuits'], /1 nuit : lun\. 2 nov\. 115\s€/);
  assert.match(m['09_Attentions'], /Pétales de roses ×2 \(45\s€\), Bouteille de champagne/);
  assert.match(m['12_Alcool'], /majorité/);
  assert.match(m['13_Code_promo'], /VANESSA10 · apporteur Vanessa · −/);
  assert.match(m['14_Message_client'], /Espace Intense/);
  assert.match(m['15_Total_paye'], /plein tarif/);
  for (const [k, v] of Object.entries(m)) {
    assert.ok(k.length <= 40 && !/[[\]]/.test(k) && /^[\x20-\x7e]+$/.test(k), `clé Stripe valide : ${k}`);
    assert.ok(v.length <= 500, `valeur ≤ 500 : ${k}`);
  }
});

test('fiche client Stripe : nom, e-mail, téléphone ; réutilisée quand le client revient', async () => {
  globalThis.__clients = [];
  await reserver({});
  globalThis.__kv.clear();
  await reserver({ guest: { ...CLIENT, phone: '07 00 00 00 00' }, checkin: '2099-11-09', checkout: '2099-11-10' });
  assert.equal(globalThis.__clients.length, 1, 'une seule fiche pour le même e-mail');
  assert.deepEqual(
    { name: globalThis.__clients[0].name, email: globalThis.__clients[0].email, phone: globalThis.__clients[0].phone },
    { name: 'Camille Test', email: 'client@exemple.fr', phone: '07 00 00 00 00' }
  );
  assert.equal(globalThis.__sessions[1].customer, 'cus_1');
  assert.equal(globalThis.__sessions[1].customer_email, undefined, 'Stripe refuse customer et customer_email ensemble');
});

test('cadeau gagné : dans « À préparer » de Lenny et rappelé au client', async () => {
  globalThis.__kv.set('cadeau:IM-AB12C', JSON.stringify({ code: 'IM-AB12C', lot: 'Planche apéritive' }));
  await reserver({ cadeau: 'IM-AB12C' });
  const r = await payer(globalThis.__sessions[0]);
  assert.equal(r.status, 200);

  const hote = mailA('hote@exemple.fr');
  assert.match(hote.text, /À PRÉPARER\n(.*\n)*\s+· Cadeau de la roue : Planche apéritive \(IM-AB12C\)/);
  assert.match(hote.text, /Téléphone\s+06 12 34 56 78/);
  assert.match(mailA('client@exemple.fr').text, /Cadeau de la roue : Planche apéritive/);
  assert.match(mailA('client@exemple.fr').text, /06 40 08 10 45/);
});

test('code cadeau inconnu ou expiré : signalé « à vérifier », pas perdu', async () => {
  await reserver({ cadeau: 'IM-ZZZZ9' });
  assert.match(globalThis.__sessions[0].payment_intent_data.description, /code IM-ZZZZ9 à vérifier/);
  await payer(globalThis.__sessions[0]);
  assert.match(mailA('hote@exemple.fr').text, /Cadeau de la roue : code IM-ZZZZ9 à vérifier/);
});
