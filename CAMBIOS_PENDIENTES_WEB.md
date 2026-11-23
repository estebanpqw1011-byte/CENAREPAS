# Cambios pendientes en la web (Frontend)

En la rama `prototipo-movil` el backend cambió para soportar la app móvil de clientes. **La web no
se modificó.** Se verificó en Chrome contra `cenarepas_staging` con Administrador, Secretaria y
Vendedor: el login, Clientes, Pedidos y Ventas cargan sin errores de API ni de consola.

Esta lista es lo que conviene ajustar en la web para aprovechar el modelo nuevo y quitar las
compatibilidades temporales.

## 1. Pedidos: estados nuevos (obligatorio a mediano plazo)

- Los estados ahora son **Pendiente, En proceso, Entregado y Anulado** (CHECK en la base).
- `PedidoFormModal.jsx` y `PedidosPage.jsx` aún usan "En preparacion" y "Listo para entregar".
  - El backend los convierte a "En proceso" para no romper nada, pero el selector no tiene "En proceso".
  - Al editar un pedido En proceso, el selector aparece vacío.
- La columna Estado muestra un interruptor Activo/Inactivo en lugar de los 4 estados. La métrica
  "En Camino" cuenta estados que ya no existen.
- Transiciones permitidas:

  | Estado actual | Puede pasar a |
  |---|---|
  | Pendiente | En proceso, Anulado |
  | En proceso | Entregado, Anulado |
  | Entregado | Anulado |

  No se puede saltar pasos (409).
- Para cambiar de estado, usar `PATCH /pedidos/:id/estado { estado, motivo }` en lugar de `PUT` con el pedido completo.
- **Anular pide motivo** (CA-111-002). Hoy la web anula sin motivo y el backend guarda
  "Anulado por <usuario> sin motivo registrado". Agregar el campo de motivo en el diálogo.
- `fecha_entrega` ahora es **obligatoria** al crear (CA-106-001).
- El formulario envía `valor_total`, `precio_unitario` e `id_usuario: 1`; el backend los ignora.
  - El total se calcula con los precios de la base.
  - El usuario es el del token.
  - Se pueden quitar del formulario.
- Productos, cliente y fecha solo se editan en Pendiente (409 en otro estado); sede y observaciones también en En proceso.
- Nuevos campos para mostrar:
  - Entrega: `direccion_entrega`, `municipio_entrega`, `barrio_entrega`, `complemento_entrega`, `indicaciones_entrega`.
  - Pago: `medio_pago`, `comprobante_url`.
  - `origen` (`app` o `personal`) y `motivo_anulacion`.
  - Crédito: `id_credito`, `credito_saldo`, `credito_estado`.
  - `abonos`, en el detalle.

## 2. Ventas: ahora son de solo lectura

- Una venta es un **pedido Entregado**. `GET /ventas` conserva la forma de antes (`id_venta`,
  `fecha_venta`, `estado` Pagada/Pendiente, `detalles` con `id_detalle_venta`).
- `id_venta` ahora es el número del **pedido**. La venta antigua queda en `id_venta_origen`
  (las ventas 3, 4, 5 y 6 corresponden a los pedidos 4, 5, 7 y 8).
- `POST`, `PUT` y `DELETE /ventas` responden **405**. Hay que quitar los botones "Nueva Venta",
  editar y eliminar de `VentasPage.jsx`:
  - Para vender, se marca el pedido como Entregado (descuenta stock).
  - Para anular, se anula el pedido (repone stock).
- El estado "Pendiente" de una venta significa que tiene un **crédito con saldo**.

## 3. Abonos y créditos (no existe pantalla en la web)

- Endpoints nuevos (ver `Backend/ENDPOINTS_APP_MOVIL.md`):
  - `GET /abonos?estado=En revisión`
  - `PATCH /abonos/:id/aprobar`
  - `PATCH /abonos/:id/rechazar { motivo }`
  - `PATCH /abonos/:id/anular { motivo }`
  - `POST /abonos`
  - `GET /abonos/creditos`
- El comprobante se ve con `GET /api/v1/comprobantes/:archivo` **con el token**; no es una URL pública.
  Para mostrarlo en la web hay que descargarlo con `fetch` + `Authorization` y crear un `blob:`.
- Secretaria y Vendedor ya tienen permisos del módulo `abonos` en `rol_permiso`.
  `shared/config/permisos.js` los tiene como acción `abonos` dentro de `pedidos`; conviene alinearlo.

## 4. Registro (`/register`, `/admin/register`)

- `POST /auth/register` ahora es el **registro público de clientes**. Ignora `id_rol` y siempre crea
  un Cliente con `tipo_documento`, `documento`, `telefono`, `municipio`, `barrio` y `direccion` obligatorios.
- La página de registro de la web (nombre, correo, contraseña) ya no crea personal. El personal se crea
  desde **Usuarios** (`POST /usuarios`, solo Administrador). Decidir si se quita la página o se adapta.
- Un usuario Cliente no tiene permisos en la web: todas las rutas del personal le responden 403.

## 5. Autenticación

- Sin token válido todo responde **401**; antes el backend dejaba pasar como Administrador.
- `useAuth.js` tiene un **login de respaldo simulado** (`fallbackLogin`): si el backend falla, entra
  como Administrador con un token falso. Ahora ese token recibe 401 en todo. Conviene **eliminarlo**
  y mostrar el error real.
- `api.js` no maneja el 401. Conviene cerrar la sesión y volver a `/admin/login` cuando llegue uno.
- El encabezado muestra "Carlos Eduardo Gómez / admin@sistema.com" para todos los administradores
  (sale de `ROLE_DEFAULT_USERS`). Debería usar el `usuario` que devuelve el login.

## 6. Borrados

`DELETE` ya **no borra**:
- clientes, usuarios, productos, categorías, proveedores, insumos, fichas y sedes → Inactivo
- pedidos → Anulado
- compras → Anulada
- lotes de producción → Anulado
- roles → solo si no tienen usuarios y no son del sistema (si no, 409)

Los mensajes de confirmación de la web aún dicen "eliminar".

## 7. Detalles de presentación encontrados en la prueba

- **Pedidos · "Valor Facturado"** muestra `$042000.00345…` porque suma `valor_total` como texto
  (PostgreSQL devuelve `NUMERIC` como string). Usar `Number(p.valor_total)` en el `reduce`.
- Pedidos y Ventas muestran "Sede #2" para Aranjuez. La respuesta ya trae `sede_nombre`; usarlo.
- Las columnas `DATE` llegan como `2026-09-29T05:00:00.000Z` (medianoche de Colombia en UTC).
  Formatear con la zona local, sin cortar el texto.

## 8. Otros

- `GET /usuarios` sin permiso `usuarios:ver` (Secretaria y Vendedor) devuelve solo
  `id_usuario, nombre, id_rol, rol_nombre, estado`, suficiente para los nombres en Pedidos y Ventas.
- `GET /sedes` también funciona con `pedidos:ver` o `ventas:ver`.
