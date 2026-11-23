import { texto } from './normalizar.js';

export const TIPOS_PERSONA = ['Natural', 'Jurídica'];

/** 'natural' / 'juridica' / 'Jurídica' → 'Natural' | 'Jurídica'; cualquier otro valor → null. */
export const normalizarTipoPersona = (valor) => {
  const t = String(valor ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (t === 'natural') return 'Natural';
  if (t === 'juridica') return 'Jurídica';
  return null;
};

const CAMPOS_PERSONA = ['tipo_persona', 'nombres', 'apellidos', 'razon_social', 'nombre'];

/** La petición cambia el nombre o el tipo de persona (si no, al editar se conservan). */
export const tocaPersona = (datos = {}) => CAMPOS_PERSONA.some((campo) => datos[campo] !== undefined);

/**
 * Persona natural (nombres + apellidos) o jurídica (razón social) y el
 * `nombre` que se sigue guardando (lo usan la app móvil, el registro, los
 * pedidos y los reportes: nombres + apellidos o razón social, máximo 150).
 * `actual` es la fila guardada al editar. Compatibilidad: si solo llega
 * `nombre` (app móvil, registro), se usa como nombres o razón social. Sin
 * tipo de persona: Jurídica si el documento es NIT; si no, Natural.
 */
export function armarPersona(datos = {}, actual = {}, { tipoDocumento } = {}) {
  const errores = {};
  let tipo = null;
  if (datos.tipo_persona !== undefined && datos.tipo_persona !== null) {
    tipo = normalizarTipoPersona(datos.tipo_persona);
    if (!tipo) errores.tipo_persona = 'El tipo de persona debe ser Natural o Jurídica';
  }
  tipo = tipo || actual.tipo_persona || (tipoDocumento === 'NIT' ? 'Jurídica' : 'Natural');
  const nombreSuelto = datos.nombre !== undefined && datos.nombre !== null ? texto(datos.nombre) : undefined;

  let nombres = null;
  let apellidos = null;
  let razonSocial = null;
  if (tipo === 'Jurídica') {
    razonSocial = datos.razon_social !== undefined && datos.razon_social !== null
      ? texto(datos.razon_social)
      : nombreSuelto ?? (actual.razon_social || actual.nombre || '');
    if (razonSocial.length < 3) errores.razon_social = 'Ingresa la razón social';
    else if (razonSocial.length > 150) errores.razon_social = 'La razón social admite máximo 150 caracteres';
  } else {
    if (datos.nombres !== undefined || datos.apellidos !== undefined) {
      nombres = datos.nombres !== undefined && datos.nombres !== null ? texto(datos.nombres) : actual.nombres || '';
      apellidos = datos.apellidos !== undefined && datos.apellidos !== null ? texto(datos.apellidos) : actual.apellidos || '';
    } else if (nombreSuelto !== undefined) {
      nombres = nombreSuelto;
      apellidos = '';
    } else {
      nombres = actual.nombres || actual.nombre || '';
      apellidos = actual.apellidos || '';
    }
    if (nombres.length < 2) errores.nombres = 'Ingresa los nombres';
    else if (nombres.length > 75) errores.nombres = 'Los nombres admiten máximo 75 caracteres';
    if (apellidos.length > 74) errores.apellidos = 'Los apellidos admiten máximo 74 caracteres';
  }

  return {
    valores: {
      tipo_persona: tipo,
      nombres: tipo === 'Natural' ? nombres : null,
      apellidos: tipo === 'Natural' ? apellidos || null : null,
      razon_social: tipo === 'Jurídica' ? razonSocial : null,
      nombre: tipo === 'Jurídica' ? razonSocial : [nombres, apellidos].filter(Boolean).join(' '),
    },
    errores,
  };
}
