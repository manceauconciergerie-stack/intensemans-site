/* Roue de bienvenue : une planche apéritive par mois au plus.
   Lancer depuis la racine :  node --test tests/*.test.mjs */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';

register('./fakes/loader.mjs', import.meta.url);

process.env.RESEND_API_KEY = 're_test';

const { POST } = await import('../site/api/roue.js');
const { LOTS, moisDeParis } = await import('../site/api/_lib/lots.js');

const kv = globalThis.__kv;
const PLANCHE = 'Planche apéritive';

beforeEach(() => {
  kv.clear();
  globalThis.__mails.length = 0;
  globalThis.__resendEnPanne = false;
});

const tourner = async (email, accord = true) => (await POST(new Request('http://local/api/roue', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, accord })
}))).json();

const lire = (k) => (kv.has(k) ? JSON.parse(kv.get(k)) : null);

async function tournerN(n, prefixe = 'joueur') {
  const lots = [];
  for (let i = 0; i < n; i++) lots.push((await tourner(`${prefixe}${i}@exemple.fr`)).lot);
  return lots;
}

test('400 tours dans le mois : une seule planche, les autres lots continuent de sortir', async () => {
  const lots = await tournerN(400);
  assert.equal(lots.filter((l) => l === PLANCHE).length, 1, 'une planche, pas plus (et à 5 %, elle sort en 400 tours)');
  for (const l of LOTS.filter((x) => x.court !== PLANCHE)) {
    assert.ok(lots.includes(l.court), `${l.court} sort encore`);
  }
});

test('une planche déjà donnée ce mois-ci (avant ce code) compte : plus aucune', async () => {
  kv.set('cadeau:IM-ANCIEN', JSON.stringify({ code: 'IM-ANCIEN', lot: PLANCHE, createdAt: new Date().toISOString() }));
  kv.set('cadeaux:index', JSON.stringify(['IM-ANCIEN']));
  const lots = await tournerN(300);
  assert.equal(lots.filter((l) => l === PLANCHE).length, 0);
});

test('une planche du mois dernier ne compte pas', async () => {
  kv.set('cadeau:IM-VIEUX', JSON.stringify({ code: 'IM-VIEUX', lot: PLANCHE, createdAt: '2020-01-15T12:00:00.000Z' }));
  kv.set('cadeaux:index', JSON.stringify(['IM-VIEUX']));
  const lots = await tournerN(400);
  assert.equal(lots.filter((l) => l === PLANCHE).length, 1);
  assert.ok(kv.has(`roue:plafond:${PLANCHE}:${moisDeParis()}`), 'compteur du mois en cours');
});

test('même adresse : même code, aucun nouveau tirage', async () => {
  const a = await tourner('camille@exemple.fr');
  const b = await tourner('Camille@Exemple.fr ');
  assert.equal(b.code, a.code);
  assert.equal(b.lot, a.lot);
  assert.equal(b.deja, true);
  assert.equal(JSON.parse(kv.get('cadeaux:index')).length, 1);
});

test('le consentement coché est enregistré (il ne l’était jamais)', async () => {
  const oui = await tourner('oui@exemple.fr', true);
  const non = await tourner('non@exemple.fr', false);
  assert.equal(lire(`cadeau:${oui.code}`).accord, true);
  assert.equal(lire(`cadeau:${non.code}`).accord, false);
  assert.match(oui.code, /^IM-[A-Z0-9]{6}$/, 'format lu par _lib/cadeaux.js au paiement');
});

test('mail du code en panne : le cadeau est quand même donné et affiché', async () => {
  globalThis.__resendEnPanne = true;
  const r = await tourner('panne@exemple.fr');
  assert.equal(r.ok, true);
  assert.equal(r.envoye, false);
  assert.ok(lire(`cadeau:${r.code}`));
});

test('le disque du navigateur et le tirage du serveur ont les mêmes lots et poids', () => {
  const source = readFileSync(new URL('../site/assets/js/roue.js', import.meta.url), 'utf8');
  const navigateur = [...source.matchAll(/court: '([^']+)'.*?poids: (\d+)/g)].map((m) => [m[1], Number(m[2])]);
  assert.deepEqual(navigateur, LOTS.map((l) => [l.court, l.poids]));
  assert.equal(LOTS.reduce((s, l) => s + l.poids, 0), 100);
  assert.equal(LOTS.find((l) => l.court === PLANCHE).poids, 5);
});
