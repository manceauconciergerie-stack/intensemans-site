/* ============================================================
   INTENSÉ'MANS — Commandes
   ------------------------------------------------------------
   Les commandes vivent sur le serveur (/api/orders), pas dans le
   navigateur : c'est ce qui permet à l'hôte de les voir depuis son
   téléphone alors qu'elles ont été passées depuis celui du client.

   L'interface publique reste synchrone (`all()`, `tone()`, …) parce
   que le rendu du tableau l'appelle juste après chaque action. D'où
   le cache : les mutations le mettent à jour tout de suite, le
   serveur confirme ensuite et un nouveau rendu est déclenché.
   ============================================================ */

const IMOrders = (() => {
  const ENDPOINT = '/api/orders';
  const listeners = new Set();

  let cache = [];

  function notify() {
    listeners.forEach((fn) => fn(cache));
  }

  /* Il n'y a rien à envoyer ici : la session vit dans un cookie
     HttpOnly que le navigateur joint tout seul, et que le JavaScript
     de la page ne peut ni lire ni recopier ailleurs. Un mot de passe
     gardé en localStorage, lui, se volait avec une seule injection. */

  /* Les adresses collectées par la roue. Elles dormaient dans la base
     sans aucun écran pour les lire : il fallait ouvrir la console
     Upstash. Même session que le tableau. */
  async function cadeaux() {
    const res = await fetch('/api/cadeaux');
    /* Refus d'accès et liste vide sont deux choses différentes :
       renvoyer [] dans les deux cas ferait afficher « aucune adresse »
       à qui n'est pas connecté, ce qui est un mensonge. */
    if (res.status === 401 || res.status === 429) {
      const err = new Error('Accès refusé');
      err.code = res.status;
      throw err;
    }
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return data.cadeaux || [];
  }

  async function synthese() {
    const res = await fetch('/api/synthese');
    return res.ok ? res.json().catch(() => null) : null;
  }

  async function call(method, body) {
    const res = await fetch(ENDPOINT, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });

    if (res.status === 401) {
      const err = new Error('Accès refusé');
      err.code = 401;
      throw err;
    }
    if (!res.ok) throw new Error(`Serveur : ${res.status}`);

    const data = await res.json();
    cache = Array.isArray(data.orders) ? data.orders : [];
    notify();
    return cache;
  }

  /* Jours calendaires entre aujourd'hui et la date de séjour.
     0 = aujourd'hui, 1 = demain, négatif = passé. */
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  const api = {
    synthese,
    cadeaux,
    /* Le serveur renvoie déjà les commandes triées par date de séjour
       puis par heure d'arrivée : l'ordre de préparation de la journée. */
    all() {
      return cache;
    },

    load() {
      return call('GET');
    },

    /* Demande d'un lien de connexion. Le serveur répond toujours la
       même chose, adresse autorisée ou non : sinon la page dirait à
       un curieux quelle adresse administre le site. */
    demanderLien(email) {
      return fetch('/api/connexion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: String(email || '').trim() })
      });
    },

    deconnecter() {
      cache = [];
      notify();
      return fetch('/api/connexion', { method: 'DELETE' });
    },

    onChange(fn) {
      listeners.add(fn);
      fn(cache);
      return () => listeners.delete(fn);
    },

    setPrepared(ref, prepared) {
      cache = cache.map((o) => (o.ref === ref ? Object.assign({}, o, { prepared }) : o));
      return call('PATCH', { action: 'prepared', ref, prepared });
    },

    markAllPrepared() {
      cache = cache.map((o) => Object.assign({}, o, { prepared: true }));
      return call('PATCH', { action: 'all' });
    },

    /* Archive : le serveur ne retire que ce qui est passé ET préparé.
       Perdre une commande à venir serait une catastrophe métier. */
    archivePrepared() {
      return call('PATCH', { action: 'archive' });
    },

    pending() {
      return cache.filter((o) => !o.prepared).length;
    },

    daysUntil,

    /* Étiquette de groupe lisible pour une date de séjour. */
    groupLabel(dateStr) {
      const d = daysUntil(dateStr);
      if (d === null) return 'Date inconnue';
      if (d < 0) return 'Séjours passés';
      if (d === 0) return 'Aujourd’hui';
      if (d === 1) return 'Demain';
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long'
      });
    },

    /* Urgence : elle pilote la couleur du liseré de chaque ligne. */
    tone(order) {
      /* Une arrivée trop proche pour être garantie disponible attend
         un feu vert de l'hôte. Tant qu'il ne l'a pas donné, elle
         passe avant tout le reste, même une arrivée du soir même :
         la préparer ne sert à rien si la nuit doit être remboursée. */
      if (order.status === 'a-confirmer') return 'danger';
      if (order.prepared) return 'success';
      const d = daysUntil(order.stay.date);
      if (d === null) return 'default';
      if (d < 0) return 'danger';   // séjour passé et rien de préparé
      if (d === 0) return 'danger';
      if (d === 1) return 'warning';
      return 'info';
    },

    /* Délai restant, exprimé comme l'hôte y pense. */
    relative(order) {
      const d = daysUntil(order.stay.date);
      if (d === null) return '—';
      if (d < -1) return `il y a ${Math.abs(d)} jours`;
      if (d === -1) return 'hier';
      if (d > 1) return `dans ${d} jours`;

      /* Aujourd'hui ou demain : on descend à l'heure près, c'est ce
         qui décide de l'ordre de préparation. */
      const arrival = order.stay.arrival || '00:00';
      const [h, m] = arrival.split(':').map(Number);
      const when = new Date();
      when.setDate(when.getDate() + d);
      when.setHours(h || 0, m || 0, 0, 0);
      const mins = Math.round((when - new Date()) / 60000);
      if (mins < -60) return `arrivé il y a ${Math.round(-mins / 60)} h`;
      if (mins < 0) return 'arrivée passée';
      if (mins < 60) return `dans ${mins} min`;
      const hours = Math.round(mins / 60);
      return hours < 24 ? `dans ${hours} h` : `demain ${arrival}`;
    },

    /* Icône : celle de la catégorie dominante de la commande. */
    emoji(order) {
      const counts = {};
      (order.lines || []).forEach((l) => {
        const p = IM.products.find((x) => x.name === l.name);
        if (p) counts[p.cat] = (counts[p.cat] || 0) + l.qty;
      });
      const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      const cat = top && IM.category(top);
      return cat ? cat.icon : 'cloche';
    }
  };

  return api;
})();
