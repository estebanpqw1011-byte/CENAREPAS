import { api } from './api.js';

/** Opciones de un select: solo registros activos, [{ id, nombre, ... }] (GET /opciones/:recurso). */
export const getOpciones = (recurso) => api.get(`/opciones/${recurso}`);

/**
 * Las mismas opciones con el nombre de campo que ya usa cada formulario
 * (p. ej. id → id_proveedor), para no cambiar cómo arman sus selects.
 */
export const getOpcionesComo = async (recurso, idCampo) => {
  const lista = await getOpciones(recurso);
  return (Array.isArray(lista) ? lista : []).map(({ id, ...resto }) => ({ [idCampo]: id, ...resto }));
};

/**
 * Al editar, el registro puede apuntar a algo que ya está inactivo (y no
 * viene en las opciones): se agrega marcado "(inactivo)" para no perder el
 * valor actual. Los registros nuevos solo ven opciones activas.
 */
export const conValorActual = (lista, idCampo, idActual, nombreActual) => {
  if (idActual === undefined || idActual === null || idActual === '') return lista;
  if (lista.some((o) => String(o[idCampo]) === String(idActual))) return lista;
  return [...lista, { [idCampo]: idActual, nombre: `${nombreActual || `#${idActual}`} (inactivo)` }];
};
