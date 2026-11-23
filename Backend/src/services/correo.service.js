import { config } from '../config/env.js';

/**
 * Envío de correos transaccionales (f: código de recuperación).
 *
 * Proveedores (CORREO_PROVEEDOR):
 *  - "brevo": API HTTP de Brevo. Render gratuito bloquea el SMTP saliente
 *    (puertos 465/587), por eso se usa la API y no SMTP. Plan gratuito:
 *    300 correos al día. Sin dominio propio: remitente verificado en Brevo.
 *  - "consola": no envía; escribe el correo en la consola del servidor.
 *    Es el valor por defecto fuera de producción (Staging, pruebas).
 */
export class CorreoService {
  /** Último correo "enviado" en modo consola (lo leen las pruebas del mismo proceso). */
  static ultimo = null;

  static async enviar({ para, nombre, asunto, texto, html }) {
    const { proveedor, brevoApiKey, remitente, remitenteNombre } = config.correo;

    if (proveedor === 'consola') {
      CorreoService.ultimo = { para, asunto, texto };
      console.log(`[Correo:consola] Para: ${para} | Asunto: ${asunto}\n${texto}`);
      return;
    }

    if (proveedor !== 'brevo') throw new Error(`Proveedor de correo desconocido: ${proveedor}`);
    if (!brevoApiKey || !remitente) throw new Error('Faltan BREVO_API_KEY o CORREO_REMITENTE');

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: remitente, name: remitenteNombre },
        to: [{ email: para, name: nombre || para }],
        subject: asunto,
        textContent: texto,
        htmlContent: html || `<p>${texto.replace(/\n/g, '<br>')}</p>`,
      }),
    });
    if (!res.ok) throw new Error(`Brevo respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}
