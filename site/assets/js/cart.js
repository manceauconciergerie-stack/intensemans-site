/* ============================================================
   INTENSÉ'MANS — Panier
   ------------------------------------------------------------
   Prototype : l'état vit dans le localStorage du navigateur.
   À la mise en production, ce module est la seule pièce à
   remplacer (WooCommerce ou API + Stripe). Le reste du site
   consomme uniquement l'interface publique ci-dessous.
   ============================================================ */

const IMCart = (() => {
  const KEY = 'im_cart_v1';
  const listeners = new Set();

  const blank = () => ({
    items: [],
    stay: { name: '', date: '', arrival: '', resa: '', message: '' }
  });

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const parsed = JSON.parse(raw);
      const state = blank();
      if (Array.isArray(parsed.items)) {
        state.items = parsed.items
          .filter((l) => l && typeof l.id === 'string' && IM.byId(l.id))
          .map((l) => ({ id: l.id, qty: Math.min(9, Math.max(1, parseInt(l.qty, 10) || 1)) }));
      }
      if (parsed.stay && typeof parsed.stay === 'object') {
        Object.keys(state.stay).forEach((k) => {
          if (typeof parsed.stay[k] === 'string') state.stay[k] = parsed.stay[k];
        });
      }
      return state;
    } catch (e) {
      return blank();
    }
  }

  function write(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* mode privé ou quota : le panier reste valable pour la session */
    }
    listeners.forEach((fn) => fn(state));
    return state;
  }

  const api = {
    state: read,

    onChange(fn) {
      listeners.add(fn);
      fn(read());
      return () => listeners.delete(fn);
    },

    lines() {
      return read().items
        .map((l) => {
          const product = IM.byId(l.id);
          return product ? { product, qty: l.qty, total: product.price * l.qty } : null;
        })
        .filter(Boolean);
    },

    has(id) {
      return read().items.some((l) => l.id === id);
    },

    qtyOf(id) {
      const line = read().items.find((l) => l.id === id);
      return line ? line.qty : 0;
    },

    add(id, qty = 1) {
      if (!IM.byId(id)) return null;
      const state = read();
      const line = state.items.find((l) => l.id === id);
      if (line) line.qty = Math.min(9, line.qty + qty);
      else state.items.push({ id, qty: Math.min(9, Math.max(1, qty)) });
      return write(state);
    },

    setQty(id, qty) {
      const state = read();
      const next = Math.min(9, Math.max(0, parseInt(qty, 10) || 0));
      if (next === 0) return api.remove(id);
      const line = state.items.find((l) => l.id === id);
      if (line) line.qty = next;
      return write(state);
    },

    remove(id) {
      const state = read();
      state.items = state.items.filter((l) => l.id !== id);
      return write(state);
    },

    count() {
      return read().items.reduce((n, l) => n + l.qty, 0);
    },

    total() {
      return api.lines().reduce((sum, l) => sum + l.total, 0);
    },

    /* Un produit du panier contient-il de l'alcool ?
       Déclenche la mention légale et, en production, la vérification d'âge. */
    hasAlcohol() {
      return api.lines().some((l) => l.product.alcohol);
    },

    hasAdult() {
      return api.lines().some((l) => l.product.adult);
    },

    stay() {
      return read().stay;
    },

    saveStay(patch) {
      const state = read();
      Object.keys(state.stay).forEach((k) => {
        if (typeof patch[k] === 'string') state.stay[k] = patch[k];
      });
      return write(state);
    },

    /* Suggestions d'upsell : les produits recommandés par ce qui est
       déjà au panier, jamais un produit déjà pris. */
    suggestions(limit = 2) {
      const cart = read();
      if (!cart.items.length) return [];
      const inCart = new Set(cart.items.map((l) => l.id));
      const out = [];
      cart.items.forEach((line) => {
        const product = IM.byId(line.id);
        (product.upsell || []).forEach((id) => {
          if (!inCart.has(id) && !out.includes(id) && IM.byId(id)) out.push(id);
        });
      });
      return out.slice(0, limit).map(IM.byId);
    },

    clear() {
      return write(blank());
    }
  };

  return api;
})();
