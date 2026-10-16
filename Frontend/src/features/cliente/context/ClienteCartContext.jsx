import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { precioDe, stockDe } from '../utils/catalogo';

const ClienteCartContext = createContext(null);

// Un carrito por usuario: con una clave única, otro cliente que inicie sesión
// en el mismo navegador heredaría el carrito anterior.
const storageKeyDelUsuario = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return `cenarepas_cliente_cart_${user.id_usuario || 'anonimo'}`;
  } catch {
    return 'cenarepas_cliente_cart_anonimo';
  }
};

export function ClienteCartProvider({ children }) {
  const [STORAGE_KEY] = useState(storageKeyDelUsuario);
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, STORAGE_KEY]);

  const cantidadDe = (id_producto) =>
    items.find((i) => i.producto.id_producto === id_producto)?.cantidad || 0;

  /**
   * Suma unidades sin pasar del stock (el backend rechaza el pedido si no
   * alcanza). Devuelve la cantidad que quedó en el carrito.
   */
  const addItem = (producto, cantidad = 1) => {
    if (!producto || !producto.id_producto) return 0;
    const nueva = Math.min(stockDe(producto), cantidadDe(producto.id_producto) + cantidad);
    if (nueva <= 0) return 0;
    setItems((prev) => {
      const existe = prev.some((i) => i.producto.id_producto === producto.id_producto);
      return existe
        ? prev.map((i) => (i.producto.id_producto === producto.id_producto ? { producto, cantidad: nueva } : i))
        : [...prev, { producto, cantidad: nueva }];
    });
    return nueva;
  };

  const removeItem = (id_producto) => {
    setItems((prev) => prev.filter((i) => i.producto.id_producto !== id_producto));
  };

  /** Fija la cantidad (tope: el stock conocido del producto). 0 o menos lo quita. */
  const updateQuantity = (id_producto, cantidad) => {
    const qty = parseInt(cantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      removeItem(id_producto);
      return 0;
    }
    const item = items.find((i) => i.producto.id_producto === id_producto);
    if (!item) return 0;
    const nueva = Math.min(qty, stockDe(item.producto));
    setItems((prev) =>
      prev.map((i) => (i.producto.id_producto === id_producto ? { ...i, cantidad: nueva } : i))
    );
    return nueva;
  };

  /**
   * Actualiza el precio, el stock y el estado guardados con el catálogo vigente.
   * No quita ni recorta nada: la pantalla del carrito avisa qué corregir.
   */
  const sincronizar = useCallback((productosVigentes) => {
    const porId = new Map(productosVigentes.map((p) => [p.id_producto, p]));
    setItems((prev) =>
      prev.map((i) => (porId.has(i.producto.id_producto) ? { ...i, producto: porId.get(i.producto.id_producto) } : i))
    );
  }, []);

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const totalCount = items.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
  const totalAmount = items.reduce((acc, curr) => acc + precioDe(curr.producto) * (curr.cantidad || 0), 0);

  return (
    <ClienteCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        cantidadDe,
        sincronizar,
        clearCart,
        totalCount,
        totalAmount,
      }}
    >
      {children}
    </ClienteCartContext.Provider>
  );
}

export function useClienteCart() {
  const ctx = useContext(ClienteCartContext);
  if (!ctx) {
    throw new Error('useClienteCart debe usarse dentro de un ClienteCartProvider');
  }
  return ctx;
}
