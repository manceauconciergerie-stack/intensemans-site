/* ============================================================
   INTENSÉ'MANS — Notification de commande à l'hôte
   ------------------------------------------------------------
   Ce mail est écrit pour être TRANSFÉRÉ tel quel à la personne qui
   prépare la chambre : tout ce qu'il faut savoir est dans le corps
   du message, aucun lien à ouvrir, aucun compte à avoir.
   ============================================================ */

import { Resend } from 'resend';

/* Instanciation différée, et c'est important.

   `new Resend(undefined)` lève à la construction. Placée au niveau du
   module, cette exception faisait échouer l'IMPORT de ce fichier, donc
   celui de tout ce qui en dépend : le webhook Stripe répondait 500 et
   n'enregistrait rien, alors que le paiement était encaissé. Une clé
   oubliée coûtait des commandes perdues.

   Ici, l'absence de clé ne casse que l'envoi lui-même. Les appelants
   entourent déjà chaque envoi d'un try : le mail manque, la commande
   reste. */
let client = null;

function resend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY absente : aucun message ne peut partir.');
  }
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

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

  return envoyer({ to, subject, texte, html });
}

async function envoyer({ to, subject, texte, html }) {
  const { data, error } = await resend().emails.send({
    from: process.env.RESEND_FROM || 'INTENSE MANS <onboarding@resend.dev>',
    to: [to],
    subject,
    text: texte,
    html
  });

  if (error) throw new Error(`Resend : ${error.message || JSON.stringify(error)}`);
  return data;
}

/* ------------------------------------------------------------
   Réservation de la chambre
   ------------------------------------------------------------
   Deux cas très différents dans le même message : soit la nuit est
   acquise, soit l'arrivée est trop proche pour qu'on ait pu vérifier
   Airbnb — et là l'hôte doit agir. L'objet du mail doit le dire, il
   se lit sur l'écran verrouillé d'un téléphone.
   ------------------------------------------------------------ */

export async function notifyStay(sejour) {
  const to = process.env.HOST_NOTIFY_EMAIL;
  if (!to) throw new Error('HOST_NOTIFY_EMAIL manquant');

  const g = sejour.guest || {};
  const aValider = sejour.status === 'a-confirmer';

  const subject = aValider
    ? `À VALIDER — arrivée le ${jour(sejour.checkin)} · ${g.name || 'sans nom'}`
    : `Réservation ${jour(sejour.checkin)} → ${jour(sejour.checkout)} · ${g.name || 'sans nom'}`;

  const texte = [
    aValider ? 'RÉSERVATION À VALIDER' : 'NOUVELLE RÉSERVATION',
    '',
    aValider
      ? 'Arrivée proche : vérifiez le calendrier Airbnb avant de confirmer.\n'
      : null,
    `Arrivée       ${jour(sejour.checkin)}`,
    `Départ        ${jour(sejour.checkout)}`,
    `Durée         ${sejour.nights} nuit${sejour.nights > 1 ? 's' : ''}`,
    '',
    `Client        ${g.name || '—'}`,
    `E-mail        ${g.email || '—'}`,
    g.phone ? `Téléphone     ${g.phone}` : null,
    '',
    (sejour.lines && sejour.lines.length)
      ? 'À PRÉPARER\n' + sejour.lines.map((l) => `  · ${l.name}${l.qty > 1 ? ` × ${l.qty}` : ''}`).join('\n') + '\n'
      : null,
    g.message ? `MESSAGE\n  ${g.message}\n` : null,
    `Total payé    ${euro(sejour.total)}`,
    `Référence     ${sejour.ref}`
  ].filter((l) => l !== null).join('\n');

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#191113">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a72">
    ${aValider ? 'Réservation à valider' : 'Nouvelle réservation'}
  </p>
  <h1 style="margin:0 0 20px;font-size:22px;font-weight:600">
    ${esc(jour(sejour.checkin))} → ${esc(jour(sejour.checkout))}
  </h1>

  ${aValider ? `
  <p style="margin:0 0 22px;padding:14px 16px;background:#fdf6f6;border-left:3px solid #c0574f;font-size:14px;line-height:1.55">
    <strong>Arrivée proche.</strong> Le calendrier Airbnb n’est relu que toutes
    les 3 heures : vérifiez qu’aucune réservation n’est arrivée de ce côté
    avant de confirmer au client.
  </p>` : ''}

  <table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:15px">
    <tr><td style="padding:6px 0;color:#8a7a72;width:130px">Durée</td><td style="padding:6px 0;font-weight:600">${sejour.nights} nuit${sejour.nights > 1 ? 's' : ''}</td></tr>
    <tr><td style="padding:6px 0;color:#8a7a72">Client</td><td style="padding:6px 0;font-weight:600">${esc(g.name) || '—'}</td></tr>
    <tr><td style="padding:6px 0;color:#8a7a72">E-mail</td><td style="padding:6px 0">${esc(g.email) || '—'}</td></tr>
    ${g.phone ? `<tr><td style="padding:6px 0;color:#8a7a72">Téléphone</td><td style="padding:6px 0">${esc(g.phone)}</td></tr>` : ''}
    <tr><td style="padding:12px 0;color:#8a7a72">Total payé</td><td style="padding:12px 0;font-weight:600">${esc(euro(sejour.total))}</td></tr>
  </table>

  ${(sejour.lines && sejour.lines.length) ? `
  <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a72">À préparer dans la suite</p>
  <table style="width:100%;border-collapse:collapse;font-size:15px;margin-bottom:22px">
    ${sejour.lines.map((l) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #ece3da">${esc(l.name)}${l.qty > 1 ? ` <strong>× ${l.qty}</strong>` : ''}</td>
      <td style="padding:10px 0;border-bottom:1px solid #ece3da;text-align:right;white-space:nowrap">${esc(euro(l.total))}</td>
    </tr>`).join('')}
  </table>` : ''}

  ${g.message ? `
  <div style="padding:16px;background:#faf5f0;border-left:3px solid #d98b88;margin-bottom:22px">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a72">Message du client</p>
    <p style="margin:0;font-size:15px;line-height:1.55">${esc(g.message)}</p>
  </div>` : ''}

  <p style="margin:0;font-size:13px;color:#8a7a72">Référence ${esc(sejour.ref)}</p>
</div>`;

  return envoyer({ to, subject, texte, html });
}

/* ------------------------------------------------------------
   Les confirmations au CLIENT
   ------------------------------------------------------------
   Le site lui promet un e-mail à trois endroits. Sans ces envois,
   il paie et ne reçoit qu'un reçu Stripe : aucune trace écrite de
   ses horaires, de ce qui l'attend, ni de qui contacter.

   L'adresse vient de Stripe pour les commandes d'attentions (le
   formulaire ne la demande pas) et du formulaire pour les nuits.
   ------------------------------------------------------------ */

/* Coordonnees du LIEU, citees dans la confirmation au client.
   Seul endroit du code qui les porte : un demenagement ou un
   changement de numero se corrige ici, et nulle part ailleurs.
   Le code de la boite a cles n'y figure PAS volontairement : il
   est communique plus tard, de la main de l'hote. */
const LIEU = {
  adresse: '1 bis rue Jeanne d’Arc, 72000 Le Mans',
  tel: process.env.CONTACT_TEL || '06 40 08 10 45',
  telLien: 'tel:+33640081045'
};

function coordonnees() {
  return {
    contact: process.env.CONTACT_EMAIL || process.env.HOST_NOTIFY_EMAIL || '',
    tel: process.env.CONTACT_TEL || ''
  };
}

const pied = () => {
  const c = coordonnees();
  return `
  <p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #ece3da;font-size:13px;line-height:1.6;color:#8a7a72">
    Une question ? Répondez simplement à ce message${c.tel ? ` ou appelez le ${esc(c.tel)}` : ''}.<br>
    INTENSÉ’MANS Love Room, Le Mans.
  </p>`;
};

export async function confirmerAuClient(sejour) {
  const g = sejour.guest || {};
  if (!g.email) throw new Error('Adresse du client inconnue');

  const aValider = sejour.status === 'a-confirmer';
  const lignes = sejour.lines || [];

  const subject = aValider
    ? `Nous confirmons votre nuit du ${jour(sejour.checkin)} très vite`
    : `Votre nuit du ${jour(sejour.checkin)} est réservée`;

  const texte = [
    aValider ? 'PAIEMENT REÇU, CONFIRMATION EN COURS' : 'VOTRE NUIT EST RÉSERVÉE',
    '',
    aValider
      ? 'Votre arrivée est proche. Nous vérifions une dernière fois nos\ndisponibilités et vous confirmons dans les prochaines heures. En cas\nd’imprévu, vous seriez intégralement remboursé.\n'
      : null,
    `Arrivée      ${jour(sejour.checkin)}, à partir de 16 h`,
    `Départ       ${jour(sejour.checkout)}, avant 11 h`,
    `Adresse      ${LIEU.adresse}`,
    '',
    lignes.length ? 'PRÉPARÉ POUR VOUS\n' + lignes.map((l) => `  · ${l.name}${l.qty > 1 ? ` × ${l.qty}` : ''}`).join('\n') + '\n' : null,
    `Total payé   ${euro(sejour.total)}`,
    `Référence    ${sejour.ref}`,
    '',
    'Tout sera installé avant votre arrivée. Vous n’avez rien à apporter.',
    '',
    `Lenny vous contactera avant votre arrivée pour vous indiquer comment vous\nrendre sur place et vous communiquer les codes d’accès, afin que votre\nséjour se passe au mieux. Vous pouvez le joindre au ${LIEU.tel}.`
  ].filter((l) => l !== null).join('\n');

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#191113">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a72">
    ${aValider ? 'Paiement reçu' : 'Votre nuit est réservée'}
  </p>
  <h1 style="margin:0 0 20px;font-size:22px;font-weight:600">
    ${esc(jour(sejour.checkin))}
  </h1>

  ${aValider ? `
  <p style="margin:0 0 22px;padding:14px 16px;background:#fdf6f6;border-left:3px solid #c0574f;font-size:14px;line-height:1.55">
    Votre arrivée est proche. Nous vérifions une dernière fois nos disponibilités
    et vous confirmons dans les prochaines heures. En cas d’imprévu, vous seriez
    intégralement remboursé.
  </p>` : ''}

  <table style="width:100%;border-collapse:collapse;margin-bottom:22px;font-size:15px">
    <tr><td style="padding:6px 0;color:#8a7a72;width:120px">Arrivée</td><td style="padding:6px 0;font-weight:600">${esc(jour(sejour.checkin))}, à partir de 16 h</td></tr>
    <tr><td style="padding:6px 0;color:#8a7a72">Départ</td><td style="padding:6px 0;font-weight:600">${esc(jour(sejour.checkout))}, avant 11 h</td></tr>
    <tr><td style="padding:6px 0;color:#8a7a72">Adresse</td><td style="padding:6px 0;font-weight:600">${esc(LIEU.adresse)}</td></tr>
    <tr><td style="padding:12px 0;color:#8a7a72">Total payé</td><td style="padding:12px 0;font-weight:600">${esc(euro(sejour.total))}</td></tr>
  </table>

  ${lignes.length ? `
  <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a72">Préparé pour vous</p>
  <table style="width:100%;border-collapse:collapse;font-size:15px;margin-bottom:22px">
    ${lignes.map((l) => `
    <tr><td style="padding:9px 0;border-bottom:1px solid #ece3da">${esc(l.name)}${l.qty > 1 ? ` <strong>× ${l.qty}</strong>` : ''}</td></tr>`).join('')}
  </table>` : ''}

  <div style="margin:0 0 22px;padding:16px;background:#faf5f0;border-left:3px solid #d98b88">
    <p style="margin:0;font-size:15px;line-height:1.6">
      Lenny vous contactera avant votre arrivée pour vous indiquer comment vous
      rendre sur place et vous communiquer les codes d’accès, afin que votre
      séjour se passe au mieux.<br>
      Vous pouvez le joindre au
      <a href="${LIEU.telLien}" style="color:#191113;font-weight:600;text-decoration:none">${esc(LIEU.tel)}</a>.
    </p>
  </div>

  <p style="margin:0;font-size:15px;line-height:1.6">
    Tout sera installé avant votre arrivée. Vous n’avez rien à apporter.
  </p>
  <p style="margin:14px 0 0;font-size:13px;color:#8a7a72">Référence ${esc(sejour.ref)}</p>
  ${pied()}
</div>`;

  return envoyer({ to: g.email, subject, texte, html });
}

/* Commande d'attentions seule : la nuit est déjà réservée ailleurs,
   l'adresse vient de Stripe. */
export async function confirmerCommandeAuClient(order, email) {
  if (!email) throw new Error('Adresse du client inconnue');
  const lignes = order.lines || [];

  const texte = [
    'VOS ATTENTIONS SONT COMMANDÉES',
    '',
    `Séjour du   ${jour(order.stay && order.stay.date)}`,
    `Au nom de   ${(order.stay && order.stay.name) || '—'}`,
    '',
    lignes.length ? lignes.map((l) => `  · ${l.name}${l.qty > 1 ? ` × ${l.qty}` : ''}`).join('\n') + '\n' : null,
    `Total payé  ${euro(order.total)}`,
    `Référence   ${order.ref}`,
    '',
    'Tout sera installé dans la suite avant votre arrivée.'
  ].filter((l) => l !== null).join('\n');

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#191113">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a72">Commande confirmée</p>
  <h1 style="margin:0 0 20px;font-size:22px;font-weight:600">Séjour du ${esc(jour(order.stay && order.stay.date))}</h1>

  <table style="width:100%;border-collapse:collapse;font-size:15px;margin-bottom:22px">
    ${lignes.map((l) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #ece3da">${esc(l.name)}${l.qty > 1 ? ` <strong>× ${l.qty}</strong>` : ''}</td>
      <td style="padding:9px 0;border-bottom:1px solid #ece3da;text-align:right;white-space:nowrap">${esc(euro(l.total))}</td>
    </tr>`).join('')}
    <tr><td style="padding:12px 0;font-weight:600">Total payé</td><td style="padding:12px 0;text-align:right;font-weight:600">${esc(euro(order.total))}</td></tr>
  </table>

  <p style="margin:0;font-size:15px;line-height:1.6">
    Tout sera installé dans la suite avant votre arrivée.
  </p>
  <p style="margin:14px 0 0;font-size:13px;color:#8a7a72">Référence ${esc(order.ref)}</p>
  ${pied()}
</div>`;

  return envoyer({ to: email, subject: `Vos attentions pour le ${jour(order.stay && order.stay.date)}`, texte, html });
}

/* Le code de la roue, envoyé au client. La roue affichait
   « Nous avons envoyé votre code » sans que rien ne parte. */
export async function envoyerCodeCadeau({ email, code, lot }) {
  const texte = [
    'VOTRE CADEAU DE BIENVENUE',
    '',
    lot,
    '',
    `Votre code   ${code}`,
    '',
    'Indiquez-le au moment de composer votre séjour, dans le champ',
    '« Code cadeau », ou mentionnez-le simplement dans votre message.',
    '',
    'Valable pour un séjour, non cumulable avec un autre cadeau.'
  ].join('\n');

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#191113">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a72">Votre cadeau de bienvenue</p>
  <h1 style="margin:0 0 22px;font-size:22px;font-weight:600">${esc(lot)}</h1>

  <p style="margin:0 0 8px;font-size:13px;color:#8a7a72">Votre code</p>
  <p style="margin:0 0 22px;padding:14px 18px;border:1px dashed #d98b88;border-radius:8px;
            font-size:20px;letter-spacing:.16em;font-weight:600;text-align:center;color:#8c4b48">
    ${esc(code)}
  </p>

  <p style="margin:0;font-size:15px;line-height:1.6">
    Indiquez-le au moment de composer votre séjour, dans le champ « Code cadeau »,
    ou mentionnez-le simplement dans votre message.
  </p>
  <p style="margin:14px 0 0;font-size:13px;color:#8a7a72">
    Valable pour un séjour, non cumulable avec un autre cadeau.
  </p>
  ${pied()}
</div>`;

  return envoyer({ to: email, subject: `Votre cadeau : ${lot}`, texte, html });
}

/* Le lien de connexion de l'hôte. Aucun mot de passe n'existe : ce
   message EST la clé, d'où la durée courte et l'usage unique. */
export async function envoyerLienConnexion(email, lien) {
  const texte = [
    'VOTRE LIEN DE CONNEXION',
    '',
    lien,
    '',
    'Valable 15 minutes, une seule fois.',
    'Si vous n’avez rien demandé, ignorez ce message : personne ne',
    'peut se connecter sans ce lien.'
  ].join('\n');

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#191113">
  <p style="margin:0 0 18px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a72">Votre tableau de bord</p>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.6">Cliquez pour ouvrir votre tableau. Le lien est valable 15 minutes et ne fonctionne qu’une fois.</p>
  <p style="margin:0 0 22px">
    <a href="${esc(lien)}" style="display:inline-block;padding:13px 24px;border-radius:8px;background:#191113;color:#f6ece4;text-decoration:none;font-size:15px;font-weight:600">Ouvrir mon tableau</a>
  </p>
  <p style="margin:0;font-size:13px;line-height:1.6;color:#8a7a72">
    Si vous n’avez rien demandé, ignorez ce message : personne ne peut se connecter sans ce lien.
  </p>
</div>`;

  return envoyer({ to: email, subject: 'Votre lien de connexion', texte, html });
}
