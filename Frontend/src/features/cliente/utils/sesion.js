// Usuario de la sesión del cliente (el que guarda useAuth tras el login).
const EVENTO = 'cenarepas:usuario';

export const leerUsuario = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') || {};
  } catch {
    return {};
  }
};

/** El usuario tiene ficha (fila en cliente): sin ella solo ve el catálogo y "Completa tu perfil". */
export const tieneFicha = () => Boolean(leerUsuario().id_cliente);

/** Actualiza campos del usuario guardado (p. ej. id_cliente o nombre) y avisa a quien escuche. */
export const actualizarUsuarioGuardado = (cambios) => {
  try {
    localStorage.setItem('user', JSON.stringify({ ...leerUsuario(), ...cambios }));
  } catch {
    // Sin almacenamiento: el cambio se verá al volver a iniciar sesión.
  }
  window.dispatchEvent(new Event(EVENTO));
};

/** Se suscribe a los cambios del usuario guardado; devuelve la función para cancelar. */
export const alCambiarUsuario = (callback) => {
  window.addEventListener(EVENTO, callback);
  return () => window.removeEventListener(EVENTO, callback);
};
