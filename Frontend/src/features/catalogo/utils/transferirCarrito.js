import { storageKeyDelUsuario } from '../../cliente/context/ClienteCartContext';
import { stockDe } from '../../cliente/utils/catalogo';
import { guardarCarritoPublico, leerCarritoPublico } from '../context/carritoPublicoStorage';
import { toast } from '../../../shared/utils/toast.jsx';

const esCliente = (usuario) => String(usuario?.rol || '').toLowerCase().trim() === 'cliente';

function leerCarritoCliente(clave) {
  try {
    const guardado = JSON.parse(localStorage.getItem(clave) || '[]');
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
}

/**
 * Pasa el carrito público al carrito del cliente que acaba de iniciar sesión
 * o registrarse: suma cantidades si el producto ya estaba, sin pasar del
 * stock conocido, y vacía el carrito público. Debe llamarse después de que
 * useAuth guarde el usuario (la clave del carrito del cliente sale de él).
 *
 * Solo para el rol Cliente: con otro rol no hace nada y el carrito público
 * queda intacto. Devuelve { transferidos, omitidos } (omitidos: productos
 * sin stock que no se pudieron pasar).
 */
export function transferirCarritoPublico(usuario) {
  const publico = leerCarritoPublico();
  if (!esCliente(usuario) || publico.length === 0) return { transferidos: 0, omitidos: 0 };

  const clave = storageKeyDelUsuario();
  const carrito = leerCarritoCliente(clave);
  let transferidos = 0;
  let omitidos = 0;

  for (const { producto, cantidad } of publico) {
    const i = carrito.findIndex((item) => item?.producto?.id_producto === producto.id_producto);
    const previa = i >= 0 ? Number(carrito[i].cantidad) || 0 : 0;
    const nueva = Math.min(stockDe(producto), previa + cantidad);
    // Sin stock, o el carrito del cliente ya está en el tope: no se suma (ni se le resta).
    if (nueva <= previa) {
      omitidos += 1;
      continue;
    }
    if (i >= 0) carrito[i] = { producto, cantidad: nueva };
    else carrito.push({ producto, cantidad: nueva });
    transferidos += 1;
  }

  try {
    localStorage.setItem(clave, JSON.stringify(carrito));
  } catch {
    // Sin almacenamiento no hay carrito guardado que actualizar.
    return { transferidos: 0, omitidos: publico.length };
  }
  guardarCarritoPublico([]);
  return { transferidos, omitidos };
}

/** Transfiere el carrito público (ver arriba) y avisa cuántos productos pasaron. */
export function pasarCarritoPublico(usuario) {
  const { transferidos, omitidos } = transferirCarritoPublico(usuario);
  if (transferidos > 0) {
    toast.success(`Pasamos ${transferidos} ${transferidos === 1 ? 'producto' : 'productos'} a tu carrito.`);
  }
  if (omitidos > 0) {
    toast.warning(`${omitidos} ${omitidos === 1 ? 'producto no se pudo pasar' : 'productos no se pudieron pasar'} por falta de stock.`);
  }
}

/**
 * Destino después de iniciar sesión o registrarse: el inicio de su rol, salvo
 * el cliente que viene de "Confirmar pedido", que va al checkout.
 */
export function destinoTrasAcceso(usuario, origen, rutaPorRol) {
  return esCliente(usuario) && origen === 'confirmar-pedido' ? '/cliente/checkout' : rutaPorRol;
}
