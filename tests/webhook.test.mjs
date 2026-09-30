/* Webhook Stripe : aucun paiement ne doit se perdre en silence.
   Lancer depuis la racine :  node --test tests/*.test.mjs */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./fakes/loader.mjs', import.meta.url);

process.env.HOST_NOTIFY_EMAIL = 'hote@exemple.fr';
process.env.RESEND_API_KEY = 're_test';

const { POST } = await import('../site/api/webhook.js');

const kv = globalThis.__kv;
const zs = globalThis.__zs;

beforeEach(() => {
  kv.clear();
  zs.clear();
  globalThis.__mails.length = 0;
  globalThis.__resendEnPanne = false;
  globalThis.__lignes = [
    { description: 'Love Room INTENSE MANS — 1 nuit', quantity: 1, amount_total: 13200 },
    { description: 'Sélection de softs', quantity: 1, amount_total: 1200 }
  ];
});

const sessionSejour = (ref = 'IM-N-261001-1234') => ({
  id: 'cs_test_1',
  client_reference_id: ref,
  amount_total: 14400,
  created: 1790000000,
  payment_method_types: ['card'],
  customer_email: 'client@exemple.fr',
  customer_details: { email: 'client@exemple.fr', name: 'Camille Test' },
  metadata: {
    ref, type: 'sejour', checkin: '2026-10-10', checkout: '2026-10-11',
    name: 'Camille Test', phone: '0600000000', message: 'Anniversaire'
  }
});

const livrer = (session) => POST(new Request('http://local/api/webhook', {
  method: 'POST',
  headers: { 'stripe-signature': 't' },
  body: JSON.stringify({ type: 'checkout.session.completed', data: { object: session } })
}));

const lire = (k) => (kv.has(k) ? JSON.parse(kv.get(k)) : null);
const mailsA = (to) => globalThis.__mails.filter((m) => m.to.includes(to));

test('séjour expiré avant le paiement : reconstitué, au tableau, hôte prévenu', async () => {
  const r = await livrer(sessionSejour());
  assert.equal(r.status, 200);

  const s = lire('stay:IM-N-261001-1234');
  assert.ok(s, 'le séjour doit exister après reconstitution');
  assert.equal(s.status, 'a-confirmer');
  assert.equal(s.reconstitue, true);
  assert.equal(s.checkin, '2026-10-10');
  assert.equal(s.guest.email, 'client@exemple.fr');
  assert.equal(s.guest.phone, '0600000000');
  assert.deepEqual(s.lines.map((l) => [l.name, l.total]), [['Sélection de softs', 12]],
    'article retiré du catalogue depuis : compté comme attention, pas dans la nuit');
  assert.equal(s.nightsTotal, 132);
  assert.equal(s.total, 144);
  assert.ok(s.hostNotifiedAt && s.clientNotifiedAt);

  assert.ok(zs.get('stays:index').has('IM-N-261001-1234'), 'visible au tableau');
  assert.equal(lire('night:2026-10-10'), 'IM-N-261001-1234', 'nuit bloquée');

  const hote = mailsA('hote@exemple.fr');
  assert.equal(hote.length, 1);
  assert.match(hote[0].subject, /À VALIDER/);
  assert.match(hote[0].text, /Sélection de softs/);
  assert.match(hote[0].text, /reprises depuis Stripe/);
  assert.match(hote[0].text, /Softs offerts/, 'softs toujours dans la liste à préparer');
  assert.equal(mailsA('client@exemple.fr').length, 1);
});

test('même événement livré deux fois : un seul mail', async () => {
  await livrer(sessionSejour());
  const r = await livrer(sessionSejour());
  assert.equal(r.status, 200);
  assert.equal(globalThis.__mails.length, 2, 'un mail hôte + un mail client, pas plus');
});

test('nuit reprise par un autre client entre-temps : conflit signalé', async () => {
  kv.set('night:2026-10-10', JSON.stringify('IM-N-AUTRE'));
  await livrer(sessionSejour());

  const s = lire('stay:IM-N-261001-1234');
  assert.deepEqual(s.conflits, ['2026-10-10']);
  assert.equal(lire('night:2026-10-10'), 'IM-N-AUTRE', "la nuit de l'autre n'est pas volée");
  assert.match(mailsA('hote@exemple.fr')[0].subject, /CONFLIT DE DATES/);
});

test('envoi en panne : 500 pour que Stripe rejoue, puis mail parti sans doublon', async () => {
  globalThis.__resendEnPanne = true;
  const r1 = await livrer(sessionSejour());
  assert.equal(r1.status, 500);
  assert.ok(lire('stay:IM-N-261001-1234'), 'la réservation est enregistrée malgré la panne');

  globalThis.__resendEnPanne = false;
  const r2 = await livrer(sessionSejour());
  assert.equal(r2.status, 200);
  assert.equal(mailsA('hote@exemple.fr').length, 1);
  assert.equal(mailsA('client@exemple.fr').length, 1);

  const r3 = await livrer(sessionSejour());
  assert.equal(r3.status, 200);
  assert.equal(globalThis.__mails.length, 2, 'rien de renvoyé une fois tout parti');
});

test('parcours normal : séjour en attente payé, statut inchangé', async () => {
  kv.set('stay:IM-N-261001-1234', JSON.stringify({
    ref: 'IM-N-261001-1234', status: 'pending', checkin: '2026-10-10', checkout: '2026-10-11',
    nights: 1, nightDates: ['2026-10-10'], guest: { name: 'Camille Test', email: 'client@exemple.fr' },
    lines: [], total: 144, needsConfirmation: false
  }));
  const r = await livrer(sessionSejour());
  assert.equal(r.status, 200);
  const s = lire('stay:IM-N-261001-1234');
  assert.equal(s.status, 'paid');
  assert.equal(s.reconstitue, undefined);
  const hote = mailsA('hote@exemple.fr')[0];
  assert.match(hote.subject, /^Réservation /);
  assert.match(hote.text, /Softs offerts/, 'nuit sans attention : les softs restent à préparer');
  assert.match(mailsA('client@exemple.fr')[0].text, /boissons fraîches sans alcool vous attendent/);
});

test("commande d'attentions expirée : reconstituée elle aussi", async () => {
  globalThis.__lignes = [{ description: 'Sélection de softs', quantity: 1, amount_total: 1200 }];
  const session = {
    ...sessionSejour('IM-261001-5678'),
    amount_total: 1200,
    metadata: { ref: 'IM-261001-5678', stayDate: '2026-10-10', arrival: '16:00', name: 'Camille Test', resa: 'HM123', message: '' }
  };
  const r = await livrer(session);
  assert.equal(r.status, 200);
  const o = lire('order:IM-261001-5678');
  assert.equal(o.status, 'paid');
  assert.equal(o.stay.date, '2026-10-10');
  assert.equal(o.stay.resa, 'HM123');
  assert.ok(zs.get('orders:index').has('IM-261001-5678'));
  assert.equal(mailsA('hote@exemple.fr').length, 1);
});
