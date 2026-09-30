/* Stripe de test : l'événement est le corps lui-même, les lignes
   d'achat viennent de globalThis.__lignes. */
export const webhookSecret = () => 'whsec_test';

export const stripe = () => ({
  webhooks: { constructEvent: (body) => JSON.parse(body) },
  checkout: {
    sessions: {
      listLineItems: async () => ({ data: globalThis.__lignes || [] })
    }
  }
});
