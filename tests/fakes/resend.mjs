/* Resend qui consigne chaque envoi dans globalThis.__mails.
   globalThis.__resendEnPanne = true simule un refus d'envoi. */
globalThis.__mails ??= [];

export class Resend {
  constructor() {
    this.emails = {
      send: async (msg) => {
        if (globalThis.__resendEnPanne) return { data: null, error: { message: 'panne simulée' } };
        globalThis.__mails.push(msg);
        return { data: { id: `m${globalThis.__mails.length}` }, error: null };
      }
    };
  }
}
