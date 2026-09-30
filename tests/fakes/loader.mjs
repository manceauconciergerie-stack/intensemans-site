/* Redirige les dépendances externes du webhook vers des doublures :
   Redis en mémoire, Resend qui consigne au lieu d'envoyer, Stripe
   qui accepte tout événement sans signature. Aucun appel réseau. */
const ici = new URL('./', import.meta.url);

export async function resolve(specifier, context, next) {
  if (specifier === '@upstash/redis') return { url: new URL('redis.mjs', ici).href, shortCircuit: true };
  if (specifier === 'resend') return { url: new URL('resend.mjs', ici).href, shortCircuit: true };
  const r = await next(specifier, context);
  if (r.url.endsWith('/api/_lib/stripe.js')) return { url: new URL('stripe.mjs', ici).href, shortCircuit: true };
  return r;
}
