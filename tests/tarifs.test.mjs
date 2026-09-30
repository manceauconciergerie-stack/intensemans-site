/* Grille tarifaire validée le 30/09/2026 : chaque montant du document
   de l'hôte, vérifié. Lancer depuis la racine :  node --test tests/*.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prixGrille, instantArrivee } from '../site/api/_lib/grille.js';
import { chiffrerSejour } from '../site/api/_lib/rates.js';

const HEURE = 3600000;
const loin = (iso) => instantArrivee(iso) - 30 * 24 * HEURE;   // réservé un mois avant
const tard = (iso) => instantArrivee(iso) - 48 * HEURE;        // réservé 48 h avant
const prix = (iso, quand) => prixGrille(iso, { maintenant: quand(iso) });

test('dimanche à jeudi : 115 €, 109,25 € à moins de 72 h', () => {
  for (const iso of ['2026-11-01', '2026-11-02', '2026-11-05']) {   // dim, lun, jeu
    assert.equal(prix(iso, loin), 115, iso);
    assert.equal(prix(iso, tard), 109.25, iso);
  }
  assert.equal(Math.round(prix('2026-11-02', tard) * 100), 10925, 'Stripe débite 109,25 €, pas 109');
});

test('vendredi et samedi : 150 €, 135 € à moins de 72 h', () => {
  for (const iso of ['2026-11-06', '2026-11-07']) {
    assert.equal(prix(iso, loin), 150, iso);
    assert.equal(prix(iso, tard), 135, iso);
  }
});

test('événements : 300 €, 270 € à moins de 72 h, bornes incluses', () => {
  const nuits = [
    '2027-04-08', '2027-04-11',                // 24 Heures Motos
    '2027-05-14', '2027-05-16',                // Grand Prix de France Moto
    '2027-06-09', '2027-06-12', '2027-06-13'   // 24 Heures du Mans (le 12 est un samedi)
  ];
  for (const iso of nuits) {
    assert.equal(prix(iso, loin), 300, iso);
    assert.equal(prix(iso, tard), 270, iso);
  }
  assert.equal(prix('2027-04-07', loin), 115, 'veille des 24 Heures Motos (mercredi)');
  assert.equal(prix('2027-04-12', loin), 115, 'lendemain des 24 Heures Motos (lundi)');
});

test('Saint-Valentin : 350 € les nuits du 13 et du 14 février, aucune remise', () => {
  for (const iso of ['2027-02-13', '2027-02-14', '2028-02-13']) {
    assert.equal(prix(iso, loin), 350, iso);
    assert.equal(prix(iso, tard), 350, iso);
  }
  assert.equal(prix('2027-02-12', loin), 150, '12 février 2027, un vendredi : tarif normal');
  assert.equal(prix('2027-02-15', loin), 115, '15 février 2027, un lundi : tarif normal');
});

test('dernière minute : bascule à 72 h pile avant 16 h, heure de Paris', () => {
  const iso = '2026-11-07';   // samedi
  assert.equal(prixGrille(iso, { maintenant: instantArrivee(iso) - 72 * HEURE - 60000 }), 150, '72 h 01 avant');
  assert.equal(prixGrille(iso, { maintenant: instantArrivee(iso) - 72 * HEURE + 60000 }), 135, '71 h 59 avant');
  assert.equal(new Date(instantArrivee('2026-07-04')).toISOString(), '2026-07-04T14:00:00.000Z', 'été : 16 h = 14 h UTC');
  assert.equal(new Date(instantArrivee('2026-12-05')).toISOString(), '2026-12-05T15:00:00.000Z', 'hiver : 16 h = 15 h UTC');
});

test('chiffrage serveur : un lundi lointain vaut 115 € plein tarif', () => {
  const s = chiffrerSejour('2099-11-02', '2099-11-03');
  assert.equal(s.nights, 1);
  assert.equal(s.totalCents, 11500);
});
