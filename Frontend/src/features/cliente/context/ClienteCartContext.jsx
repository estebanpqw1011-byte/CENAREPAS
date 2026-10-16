import React, { createContext, useContext, useState, useEffect } from 'react';

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

  const addItem = (producto, cantidad = 1) => {
    if (!producto || !producto.id_producto) return;
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.producto.id_producto === producto.id_producto);
      if (existingIndex > -1) {
        const next = [...prev];
        const newQty = next[existingIndex].cantidad + cantidad;
        next[existingIndex] = {
          ...next[existingIndex],
          cantidad: Math.max(1, newQty),
        };
        return next;
      }
      return [...prev, { producto, cantidad: Math.max(1, cantidad) }];
    });
  };

  const removeItem = (id_producto) => {
    setItems((prev) => prev.filter((i) => i.producto.id_producto !== id_producto));
  };

  const updateQuantity = (id_producto, cantidad) => {
    const qty = parseInt(cantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      removeItem(id_producto);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.producto.id_producto === id_producto ? { ...i, cantidad: qty } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const totalCount = items.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
  const totalAmount = items.reduce(
    (acc, curr) => acc + (Number(curr.producto.precio_venta) || 0) * (curr.cantidad || 0),
    0
  );

  return (
    <ClienteCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
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
