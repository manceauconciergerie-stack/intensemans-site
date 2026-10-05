/* Stripe de test : l'événement est le corps lui-même, les lignes
   d'achat viennent de globalThis.__lignes. */
export const webhookSecret = () => 'whsec_test';

/* Fiches client en mémoire : globalThis.__clients. */
const clients = () => (globalThis.__clients ??= []);

export const stripe = () => ({
  customers: {
    list: async ({ email }) => ({ data: clients().filter((c) => c.email === email).slice(0, 1) }),
    create: async (c) => { const n = { id: `cus_${clients().length + 1}`, ...c }; clients().push(n); return n; },
    update: async (id, d) => Object.assign(clients().find((c) => c.id === id), d)
  },
  webhooks: { constructEvent: (body) => JSON.parse(body) },
  checkout: {
    sessions: {
      listLineItems: async () => ({ data: globalThis.__lignes || [] }),
      /* Consigne la session demandée au lieu de l'ouvrir. */
      create: async (params) => {
        (globalThis.__sessions ??= []).push(params);
        return { id: `cs_test_${globalThis.__sessions.length}`, url: 'https://checkout.stripe.test/session' };
      }
    }
  }
});
