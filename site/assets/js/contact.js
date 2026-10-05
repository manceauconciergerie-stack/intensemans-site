/* ============================================================
   INTENSÉ'MANS — Formulaire de contact
   ------------------------------------------------------------
   Il affichait « Prototype : ce formulaire n'envoie encore rien »,
   en ligne : tout message écrit ici était perdu.

   Il ouvre désormais la messagerie du visiteur avec le message déjà
   rédigé, adressé à l'exploitant. Le message part de la boîte du
   client : il arrive même quand l'envoi de mails du site est en
   panne, et la réponse se fait par simple « Répondre ».
   ============================================================ */

(() => {
  const form = document.querySelector('[data-contact]');
  if (!form) return;

  /* Même adresse que les pages légales (mentions-legales.html). */
  const DESTINATAIRE = 'rbrsci72@gmail.com';

  const valeur = (nom) => ((form.elements[nom] && form.elements[nom].value) || '').trim();

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const erreur = form.querySelector('[data-contact-erreur]');
    const dire = (texte) => {
      if (!erreur) return;
      erreur.textContent = texte;
      erreur.hidden = !texte;
    };

    const nom = valeur('name');
    const message = valeur('message');
    if (!nom) return dire('Indiquez votre nom.');
    if (!message) return dire('Écrivez votre message.');
    dire('');

    const date = valeur('date');
    const quand = date
      ? new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const objet = `${valeur('subject') || 'Demande'}${quand ? ` · séjour du ${quand}` : ''}`;
    const corps = [message, '', '—', nom, valeur('email'), quand ? `Séjour du ${quand}` : '']
      .filter((l, i) => l !== '' || i === 1)
      .join('\n');

    window.location.href = `mailto:${DESTINATAIRE}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`;
  });
})();
