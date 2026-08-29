/* ============================================================
   INTENSÉ'MANS — Commandes
   ------------------------------------------------------------
   Registre des commandes passées, lu par le tableau de préparation.
   Prototype : localStorage. En production, c'est la seule pièce à
   remplacer par un appel API — l'interface publique ne change pas.
   ============================================================ */

const IMOrders = (() => {
  const KEY = 'im_orders_v1';
  const SEEDED = 'im_orders_seeded_v1';
  const listeners = new Set();

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) { /* mode privé : la session reste utilisable */ }
    listeners.forEach((fn) => fn(list));
    return list;
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

  function isoDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  const api = {
    all() {
      /* Tri par date de séjour, puis par heure d'arrivée : c'est
         l'ordre dans lequel l'hôte prépare sa journée. */
      return read().sort((a, b) => {
        const d = (a.stay.date || '').localeCompare(b.stay.date || '');
        return d !== 0 ? d : (a.stay.arrival || '').localeCompare(b.stay.arrival || '');
      });
    },

    onChange(fn) {
      listeners.add(fn);
      fn(api.all());
      return () => listeners.delete(fn);
    },

    add(order) {
      const list = read();
      list.push(Object.assign({ prepared: false, createdAt: new Date().toISOString() }, order));
      return write(list);
    },

    setPrepared(ref, prepared) {
      const list = read().map((o) => (o.ref === ref ? Object.assign({}, o, { prepared }) : o));
      return write(list);
    },

    markAllPrepared() {
      return write(read().map((o) => Object.assign({}, o, { prepared: true })));
    },

    /* Archive : on ne supprime que ce qui est passé et préparé.
       Perdre une commande à venir serait une catastrophe métier. */
    archivePrepared() {
      return write(read().filter((o) => {
        const d = daysUntil(o.stay.date);
        return !(o.prepared && d !== null && d < 0);
      }));
    },

    remove(ref) {
      return write(read().filter((o) => o.ref !== ref));
    },

    pending() {
      return read().filter((o) => !o.prepared).length;
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
    },

    /* Jeu de démonstration, posé une seule fois, pour que le tableau
       ne soit pas vide à la première ouverture. */
    seedOnce() {
      try {
        if (localStorage.getItem(SEEDED)) return;
        localStorage.setItem(SEEDED, '1');
      } catch (e) { return; }
      if (read().length) return;

      const euro = (ids) => ids.reduce((s, [id, q]) => s + IM.byId(id).price * q, 0);
      const lines = (ids) => ids.map(([id, q]) => ({
        name: IM.byId(id).name, qty: q, total: IM.byId(id).price * q
      }));

      const demo = [
        {
          ref: 'IM-DEMO-4417',
          stay: { name: 'Camille Perrot', date: isoDate(0), arrival: '18:30', resa: 'HMAB4X92',
                  message: 'Anniversaire de rencontre. Si possible le prénom Camille sur le lettrage.' },
          items: [['pack-intense', 1], ['fleurs', 1]]
        },
        {
          ref: 'IM-DEMO-4418',
          stay: { name: 'Julien Marchand', date: isoDate(0), arrival: '21:00', resa: '',
                  message: '' },
          items: [['champagne-bouteille', 1], ['planche-apero', 1]]
        },
        {
          ref: 'IM-DEMO-4419',
          stay: { name: 'Sofia Renard', date: isoDate(1), arrival: '17:00', resa: 'BK-77213',
                  message: 'Demande en mariage. Merci de ne rien laisser paraître à l’arrivée.' },
          items: [['deco-demande-mariage', 1], ['pack-double-bulles', 1]]
        },
        {
          ref: 'IM-DEMO-4420',
          stay: { name: 'Thomas Bailly', date: isoDate(3), arrival: '19:30', resa: '',
                  message: 'Elle adore les macarons.' },
          items: [['pack-planche-champagne', 1], ['gourmandises', 1]]
        },
        {
          ref: 'IM-DEMO-4421',
          stay: { name: 'Inès Faure', date: isoDate(-1), arrival: '18:00', resa: 'HM-90112',
                  message: '' },
          items: [['petales-roses', 2], ['chocolats', 1]]
        }
      ];

      write(demo.map((o, i) => ({
        ref: o.ref,
        stay: o.stay,
        lines: lines(o.items),
        total: euro(o.items),
        payment: i % 2 ? 'applepay' : 'carte',
        prepared: i === 4,          // le séjour passé est déjà préparé
        createdAt: new Date().toISOString(),
        demo: true
      })));
    }
  };

  return api;
})();
