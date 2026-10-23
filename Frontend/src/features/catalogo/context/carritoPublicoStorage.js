/** Carrito de quien aún no ha iniciado sesión (uno por navegador). */
export const CARRITO_PUBLICO_KEY = 'cenarepas_catalogo_carrito';

/** Ítems guardados ({ producto, cantidad }); [] si no hay o están dañados. */
export function leerCarritoPublico() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CARRITO_PUBLICO_KEY) || '[]');
    return Array.isArray(guardado) ? guardado.filter((i) => i?.producto?.id_producto && i.cantidad > 0) : [];
  } catch {
    return [];
  }
}

export function guardarCarritoPublico(items) {
  try {
    if (items.length > 0) localStorage.setItem(CARRITO_PUBLICO_KEY, JSON.stringify(items));
    else localStorage.removeItem(CARRITO_PUBLICO_KEY);
  } catch {
    // Sin almacenamiento (modo privado): el carrito vive mientras la página esté abierta.
  }
}
