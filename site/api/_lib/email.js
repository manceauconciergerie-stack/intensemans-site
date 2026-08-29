/* ============================================================
   INTENSÉ'MANS — Notification de commande à l'hôte
   ------------------------------------------------------------
   Ce mail est écrit pour être TRANSFÉRÉ tel quel à la personne qui
   prépare la chambre : tout ce qu'il faut savoir est dans le corps
   du message, aucun lien à ouvrir, aucun compte à avoir.
   ============================================================ */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const euro = (n) => new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2
}).format(n);

const jour = (iso) => {
  const ts = Date.parse(`${iso}T12:00:00`);
  if (!Number.isFinite(ts)) return iso || '—';
  return new Date(ts).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
};

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export async function notifyHost(order) {
  const to = process.env.HOST_NOTIFY_EMAIL;
  if (!to) throw new Error('HOST_NOTIFY_EMAIL manquant');

  const stay = order.stay || {};
  const lines = order.lines || [];
  const alcool = lines.some((l) => l.alcohol);

  /* L'objet porte l'essentiel : sur un téléphone, en notification,
     l'hôte doit savoir quand c'est sans ouvrir le message. */
  const subject = `Commande ${jour(stay.date)} · ${stay.arrival || '—'} · ${stay.name || 'sans nom'}`;

  const texte = [
    'NOUVELLE COMMANDE — à préparer',
    '',
    `Séjour        ${jour(stay.date)}`,
    `Arrivée       ${stay.arrival || '—'}`,
    `Au nom de     ${stay.name || '—'}`,
    stay.resa ? `N° résa       ${stay.resa}` : null,
    '',
    'À PRÉPARER',
    ...lines.map((l) => `  · ${l.name}${l.qty > 1 ? ` × ${l.qty}` : ''}`),
    '',
    stay.message ? `MESSAGE DU CLIENT\n  ${stay.message}\n` : null,
    alcool ? 'Contient de l’alcool — à mettre au frais, vérifier la majorité à l’arrivée.\n' : null,
    `Total payé    ${euro(order.total)}`,
    `Référence     ${order.ref}`
  ].filter((l) => l !== null).join('\n');

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#191113">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a72">Nouvelle commande</p>
  <h1 style="margin:0 0 24px;font-size:22px;font-weight:600">À préparer pour le ${esc(jour(stay.date))}</h1>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:15px">
    <tr><td style="padding:6px 0;color:#8a7a72;width:130px">Arrivée</td><td style="padding:6px 0;font-weight:600">${esc(stay.arrival) || '—'}</td></tr>
    <tr><td style="padding:6px 0;color:#8a7a72">Au nom de</td><td style="padding:6px 0;font-weight:600">${esc(stay.name) || '—'}</td></tr>
    ${stay.resa ? `<tr><td style="padding:6px 0;color:#8a7a72">N° de réservation</td><td style="padding:6px 0">${esc(stay.resa)}</td></tr>` : ''}
  </table>

  <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a72">À préparer</p>
  <table style="width:100%;border-collapse:collapse;font-size:15px;margin-bottom:24px">
    ${lines.map((l) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #ece3da">${esc(l.name)}${l.qty > 1 ? ` <strong>× ${l.qty}</strong>` : ''}</td>
      <td style="padding:10px 0;border-bottom:1px solid #ece3da;text-align:right;white-space:nowrap">${esc(euro(l.total))}</td>
    </tr>`).join('')}
    <tr>
      <td style="padding:12px 0;font-weight:600">Total payé</td>
      <td style="padding:12px 0;text-align:right;font-weight:600">${esc(euro(order.total))}</td>
    </tr>
  </table>

  ${stay.message ? `
  <div style="padding:16px;background:#faf5f0;border-left:3px solid #d98b88;margin-bottom:24px">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a72">Message du client</p>
    <p style="margin:0;font-size:15px;line-height:1.55">${esc(stay.message)}</p>
  </div>` : ''}

  ${alcool ? `
  <p style="margin:0 0 24px;padding:12px 16px;background:#fdf6f6;border-left:3px solid #c0574f;font-size:14px">
    Cette commande contient de l’alcool — à mettre au frais, et vérifier la majorité à l’arrivée.
  </p>` : ''}

  <p style="margin:0;font-size:13px;color:#8a7a72">Référence ${esc(order.ref)}</p>
</div>`;

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM || 'INTENSE MANS <onboarding@resend.dev>',
    to: [to],
    subject,
    text: texte,
    html
  });

  if (error) throw new Error(`Resend : ${error.message || JSON.stringify(error)}`);
  return data;
}
