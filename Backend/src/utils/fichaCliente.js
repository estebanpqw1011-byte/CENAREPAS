import { texto } from './normalizar.js';
import { MUNICIPIOS_ENTREGA, TIPOS_DOCUMENTO } from '../config/negocio.js';

/**
 * Datos de la ficha del cliente (tabla cliente) normalizados y sus errores por
 * campo. Los usan el registro público (HU-150) y "Completa tu perfil".
 */
export function validarFichaCliente(datos = {}) {
  const valores = {
    nombre: texto(datos.nombre),
    tipoDocumento: texto(datos.tipo_documento).toUpperCase(),
    documento: texto(datos.documento),
    telefono: texto(datos.telefono),
    municipio: texto(datos.municipio),
    barrio: texto(datos.barrio),
    direccion: texto(datos.direccion),
  };
  const errores = {};
  if (valores.nombre.length < 3) errores.nombre = 'Ingresa tu nombre completo';
  if (!TIPOS_DOCUMENTO.includes(valores.tipoDocumento)) errores.tipo_documento = 'Selecciona un tipo de documento válido';
  if (!/^[0-9A-Za-z.-]{5,20}$/.test(valores.documento)) errores.documento = 'Ingresa un número de documento válido';
  if (!/^[0-9+ ]{7,15}$/.test(valores.telefono)) errores.telefono = 'Ingresa un teléfono válido';
  if (!MUNICIPIOS_ENTREGA.includes(valores.municipio)) errores.municipio = 'Selecciona un municipio del Área Metropolitana';
  if (!valores.barrio) errores.barrio = 'Ingresa tu barrio';
  if (valores.direccion.length < 5) errores.direccion = 'Ingresa tu dirección';
  return { valores, errores };
}
