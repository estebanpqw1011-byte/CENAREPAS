import { DOCUMENTO_VALIDO, NOMBRES_DOCUMENTO } from '../config/negocio';

/**
 * Persona natural (nombres + apellidos) o jurídica (NIT + razón social) de
 * clientes y proveedores. El backend sigue guardando `nombre` (nombres +
 * apellidos o razón social) para la app móvil, los pedidos y los reportes.
 */

/** Datos de persona de un registro guardado, o los de uno nuevo. */
export function personaDe(registro, { tipoPorDefecto = 'Natural' } = {}) {
  if (!registro) {
    return {
      tipo_persona: tipoPorDefecto,
      tipo_documento: tipoPorDefecto === 'Jurídica' ? 'NIT' : 'CC',
      documento: '',
      nombres: '',
      apellidos: '',
      razon_social: '',
    };
  }
  const tipo = registro.tipo_persona || (registro.tipo_documento === 'NIT' ? 'Jurídica' : tipoPorDefecto);
  return {
    tipo_persona: tipo,
    tipo_documento: registro.tipo_documento || (tipo === 'Jurídica' ? 'NIT' : 'CC'),
    documento: registro.documento ?? registro.nit ?? '',
    nombres: registro.nombres ?? (tipo === 'Natural' ? registro.nombre || '' : ''),
    apellidos: registro.apellidos ?? '',
    razon_social: registro.razon_social ?? (tipo === 'Jurídica' ? registro.nombre || '' : ''),
  };
}

/** Al cambiar el tipo de persona: Jurídica usa NIT por defecto; Natural, CC. */
export function cambiarTipoPersona(persona, tipo) {
  let tipoDocumento = persona.tipo_documento;
  if (tipo === 'Jurídica') tipoDocumento = 'NIT';
  else if (tipoDocumento === 'NIT') tipoDocumento = 'CC';
  return { ...persona, tipo_persona: tipo, tipo_documento: tipoDocumento };
}

/** Mensaje del primer error, o true si la persona es válida (mismas reglas que el backend). */
export function validarPersona(persona) {
  if (persona.tipo_persona === 'Jurídica') {
    if (persona.razon_social.trim().length < 3) return 'Ingresa la razón social (mínimo 3 caracteres).';
  } else {
    // Los apellidos son opcionales (registros antiguos solo tenían nombre).
    if (persona.nombres.trim().length < 2) return 'Ingresa los nombres.';
  }
  if (!persona.tipo_documento) return 'Selecciona el tipo de documento.';
  if (!persona.documento.trim()) return 'El número de documento es obligatorio.';
  if (!DOCUMENTO_VALIDO.test(persona.documento.trim())) {
    return 'El número de documento debe tener de 5 a 20 letras, números, puntos o guiones.';
  }
  return true;
}

/** Campos que se envían al backend (sin `nombre`: el backend lo arma). */
export function personaPayload(persona) {
  const juridica = persona.tipo_persona === 'Jurídica';
  return {
    tipo_persona: persona.tipo_persona,
    tipo_documento: persona.tipo_documento,
    nombres: juridica ? null : persona.nombres.trim(),
    apellidos: juridica ? null : persona.apellidos.trim(),
    razon_social: juridica ? persona.razon_social.trim() : null,
  };
}

/** La persona cambió respecto al registro guardado (o a la de uno nuevo). */
export function personaCambio(persona, registro, opciones) {
  const original = personaDe(registro, opciones);
  return Object.keys(original).some((k) => String(persona[k] ?? '') !== String(original[k] ?? ''));
}

/** "CC 1020304050" o "NIT 900123456-1" para tablas y detalles. */
export function documentoTexto(tipo, numero) {
  if (!numero) return 'Sin documento';
  return `${tipo || ''} ${numero}`.trim();
}

/** Nombre completo del tipo de documento ("Cédula de ciudadanía"). */
export const nombreTipoDocumento = (tipo) => NOMBRES_DOCUMENTO[tipo] || tipo || '';
