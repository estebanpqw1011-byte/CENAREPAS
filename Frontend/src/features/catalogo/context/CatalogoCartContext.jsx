import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { precioDe, stockDe } from '../../cliente/utils/catalogo';
import { guardarCarritoPublico, leerCarritoPublico } from './carritoPublicoStorage';

const CatalogoCartContext = createContext(null);

/**
 * Mismo comportamiento que el carrito de la app (cart_provider.dart): agregar,
 * aumentar, disminuir (en 1 unidad lo quita), eliminar y vaciar. Las
 * cantidades no pasan del stock conocido del producto, como en la vista del
 * cliente: el backend rechaza el pedido si no alcanza.
 */
export function CatalogoCartProvider({ children }) {
  const [items, setItems] = useState(leerCarritoPublico);

  useEffect(() => {
    guardarCarritoPublico(items);
  }, [items]);

  const cantidadDe = useCallback(
    (idProducto) => items.find((i) => i.producto.id_producto === idProducto)?.cantidad || 0,
    [items]
  );

  /** Suma una unidad (tope: el stock). Devuelve la cantidad que quedó. */
  const agregar = useCallback(
    (producto) => {
      const nueva = Math.min(stockDe(producto), cantidadDe(producto.id_producto) + 1);
      if (nueva <= 0) return 0;
      setItems((prev) =>
        prev.some((i) => i.producto.id_producto === producto.id_producto)
          ? prev.map((i) => (i.producto.id_producto === producto.id_producto ? { producto, cantidad: nueva } : i))
          : [...prev, { producto, cantidad: nueva }]
      );
      return nueva;
    },
    [cantidadDe]
  );

  const eliminar = useCallback((idProducto) => {
    setItems((prev) => prev.filter((i) => i.producto.id_producto !== idProducto));
  }, []);

  /** Fija la cantidad (tope: el stock). 0 o menos quita el producto. */
  const cambiarCantidad = useCallback(
    (idProducto, cantidad) => {
      if (cantidad <= 0) {
        eliminar(idProducto);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.producto.id_producto === idProducto ? { ...i, cantidad: Math.min(cantidad, stockDe(i.producto)) } : i
        )
      );
    },
    [eliminar]
  );

  const vaciar = useCallback(() => setItems([]), []);

  /** Actualiza precio, stock y estado guardados con el catálogo vigente (no quita nada). */
  const sincronizar = useCallback((vigentes) => {
    const porId = new Map(vigentes.map((p) => [p.id_producto, p]));
    setItems((prev) =>
      prev.map((i) => (porId.has(i.producto.id_producto) ? { ...i, producto: porId.get(i.producto.id_producto) } : i))
    );
  }, []);

  const valor = useMemo(
    () => ({
      items,
      cantidadDe,
      agregar,
      cambiarCantidad,
      eliminar,
      vaciar,
      sincronizar,
      totalItems: items.reduce((acc, i) => acc + i.cantidad, 0),
      total: items.reduce((acc, i) => acc + precioDe(i.producto) * i.cantidad, 0),
    }),
    [items, cantidadDe, agregar, cambiarCantidad, eliminar, vaciar, sincronizar]
  );

  return <CatalogoCartContext.Provider value={valor}>{children}</CatalogoCartContext.Provider>;
}

export function useCatalogoCart() {
  const ctx = useContext(CatalogoCartContext);
  if (!ctx) throw new Error('useCatalogoCart debe usarse dentro de un CatalogoCartProvider');
  return ctx;
}
