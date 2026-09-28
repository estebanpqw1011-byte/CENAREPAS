# Endpoints nuevos y modificados (rama `prototipo-movil`)

Base: `http://localhost:4000/api/v1` (también responde en `/api`). Todas las respuestas usan
`{ success, message, data }` y los errores `{ success: false, message, errors? }`, donde `errors`
trae un mensaje por campo.

> Los `NUMERIC` de PostgreSQL llegan como **string** (`"34000.00"`); dentro de `detalles` llegan como número.
> Las columnas `DATE` (`fecha_entrega`, `fecha_abono`) llegan como medianoche de Colombia en UTC
> (`"2026-09-29T05:00:00.000Z"` = 29/09/2026). Se deja así porque la web ya depende de ese formato.

## Autenticación y permisos

- Toda ruta, salvo `POST /auth/login`, `POST /auth/register`, `GET /health` y la **lectura** de
  `/categorias` y `/productos`, exige `Authorization: Bearer <token>`. Sin token válido: **401**.
- El token se valida contra la base en cada petición: si el usuario o su rol se inactivan, deja de servir.
- La autorización usa las tablas `permiso` y `rol_permiso` (módulo + acción). Sin permiso: **403**.
  `GET→ver`, `POST→crear`, `PUT→editar` y `DELETE→cambiar_estado` o `anular` (ya no hay borrados físicos).
- `/mi/*` es solo para el rol **Cliente** y **siempre** filtra por el usuario del token.

| Rol | Acceso |
|---|---|
| Administrador | Todo |
| Secretaria | Dashboard, proveedores, compras, categorías, insumos, producción, productos, clientes, pedidos, ventas y **abonos** |
| Vendedor | Categorías y productos (ver), clientes (ver, crear, editar), pedidos y ventas, **abonos** (ver, crear, anular, aprobar/rechazar) |
| Domiciliario | Sin permisos (no entra a la app móvil ni a la web) |
| Cliente | Catálogo público y `/mi/*` |

## Acceso

| Método | Ruta | Cambio |
|---|---|---|
| POST | `/auth/login` | **Modificado:** solo bcrypt; sin contraseñas demo, texto plano ni usuarios fallback. 401 si las credenciales fallan y 403 si la cuenta está inactiva. La respuesta trae `usuario.id_cliente` y `usuario.permisos` (permisos activos del rol, `{ "modulo": ["accion", …] }`), que la app usa solo para mostrar u ocultar acciones: cada ruta sigue autorizando en el servidor. |
| POST | `/auth/recuperar` | **Nuevo (f):** `{ correo }`. Genera un código de 6 dígitos que vence en 15 minutos y lo envía por correo (Brevo; en Staging `CORREO_PROVEEDOR=consola` lo escribe en la consola). **Siempre la misma respuesta**, exista o no el correo. **429** si se pide otro para el mismo correo en menos de 1 minuto. Solo se guarda el hash del código. |
| POST | `/auth/verificar-codigo` | **Nuevo (f):** `{ correo, codigo }`. 200 si es válido (no lo consume). 400 con `errors.codigo`: vencido o inexistente, incorrecto ("te quedan N intentos") y, al 5.º intento fallido, el código se invalida. |
| POST | `/auth/restablecer` | **Nuevo (f):** `{ correo, codigo, contrasena, confirmacion }`. Mínimo 8 caracteres y que coincidan (400 por campo, sin gastar intentos). El código se usa una sola vez. |
| POST | `/auth/register` | **Modificado:** registro público de **clientes** (HU-150). Ignora `id_rol` y siempre asigna Cliente. Crea `usuario` + `cliente` vinculados en una transacción. 409 si el correo o el documento ya existen. |

```http
POST /auth/register
{ "nombre": "Laura Restrepo", "tipo_documento": "CC", "documento": "43306028", "telefono": "3104567890",
  "correo": "laura@correo.com", "municipio": "Bello", "barrio": "Niquía", "direccion": "Cra 50 # 40-20",
  "contrasena": "Cliente123*", "id_rol": 1 }

201 → { "data": { "token": "eyJ…", "usuario": { "id_usuario": 52, "nombre": "Laura Restrepo",
        "correo": "laura@correo.com", "id_rol": 26, "rol": "Cliente", "estado": "Activo", "id_cliente": 26,
        "permisos": {} } } }
409 → { "message": "Ya existe un cliente registrado con ese número de documento" }
400 → { "message": "Revisa los datos del registro", "errors": { "municipio": "Selecciona un municipio del Área Metropolitana", … } }
```

- `tipo_documento`: CC, CE, NIT, PP o TI.
- `municipio`: Medellín, Bello, Itagüí, Envigado, Sabaneta, La Estrella, Caldas, Copacabana, Girardota o Barbosa.
- `contrasena`: mínimo 8 caracteres.

## Catálogo (público)

| Método | Ruta | Cambio |
|---|---|---|
| GET | `/categorias`, `/categorias/:id` | **Modificado:** sin sesión, o sin `categorias:ver`, solo devuelve las activas. Agrega `cantidad_productos` (productos activos) e `imagen_url`. |
| GET | `/productos`, `/productos/:id` | **Modificado:** sin sesión, o sin `productos:ver`, solo devuelve productos activos de categorías activas. |

## Comprobantes de pago

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/comprobantes` | **Nuevo.** Recibe un multipart con el campo `comprobante`: JPG, PNG o PDF de **máximo 5 MB**, y verifica la firma real del archivo. Pueden subirlo el Cliente o el personal con `abonos:crear` o `pedidos:crear`. |
| GET | `/comprobantes/:archivo` | **Nuevo.** Descarga con sesión: solo quien lo subió o el personal con `abonos:ver` o `pedidos:ver`. Si no hay acceso, responde 404. Los comprobantes **no** se sirven desde `/uploads`. |

```http
POST /comprobantes   (multipart/form-data; comprobante=@transferencia.png)
201 → { "data": { "url": "/api/v1/comprobantes/u52_1790368306349_acede71023917635af5bbcd6.png",
                  "nombre_original": "transferencia.png", "tipo": "image/png", "tamano": 67 } }
```

La `url` se envía luego en `comprobante_url` al crear el pedido o el abono. El backend rechaza
comprobantes subidos por otro usuario (403).

## Cliente: `/mi/*` (siempre filtrado por el token)

| Método | Ruta | HU |
|---|---|---|
| GET | `/mi/pedidos?estado=Pendiente` | HU-162 |
| POST | `/mi/pedidos` | HU-158 a HU-161 |
| GET | `/mi/pedidos/:id` | HU-163 (404 si no es suyo) |
| POST | `/mi/pedidos/:id/anular` `{ motivo }` | HU-164: solo Pendiente y ≥ 24 h antes de la entrega |
| GET | `/mi/creditos`, `/mi/creditos/:id` | HU-166 (incluye el historial de abonos) |
| POST | `/mi/creditos/:id/abonos` `{ valor_abonado, medio_pago, comprobante_url? }` | HU-167: queda **En revisión** |
| GET | `/mi/notificaciones` | HU-169 (`no_leidas` + lista) |
| PATCH | `/mi/notificaciones/:id/leida`, `/mi/notificaciones/leidas` | HU-169 |
| GET / PUT | `/mi/perfil` | HU-170: nombre, teléfono, dirección, municipio y barrio; el documento no se edita |
| PUT | `/mi/contrasena` `{ contrasena_actual, contrasena_nueva }` | HU-170 |

```http
POST /mi/pedidos
{ "fecha_entrega": "2026-09-29", "medio_pago": "Transferencia", "valor_abono": 15000,
  "comprobante_url": "/api/v1/comprobantes/u52_….png",
  "entrega": { "municipio": "Bello", "direccion": "Cra 50 # 40-20", "barrio": "Niquía",
               "complemento": "Casa 2", "indicaciones": "Portón verde" },
  "detalles": [ { "id_producto": 10, "cantidad": 2 }, { "id_producto": 15, "cantidad": 1 } ] }

201 → { "message": "Pedido #14 registrado", "data": { "id_pedido": 14, "estado": "Pendiente",
        "valor_total": "34000.00", "sede_nombre": "Aranjuez", "origen": "app", "medio_pago": "Transferencia",
        "id_credito": 3, "credito_saldo": "34000.00", "credito_estado": "Activo",
        "detalles": [ { "id_producto": 10, "producto_nombre": "Arepa Rellena de Pollo y Queso",
                        "cantidad": 2, "precio_unitario": 14000, "subtotal": 28000, "producto_estado": "Activo" }, … ],
        "abonos": [ { "id_abono": 9, "valor_abonado": "15000.00", "estado": "En revisión", … } ] } }
```

- El **total lo calcula el servidor** con los precios de la base; cualquier `valor_total` o `precio_unitario` enviado se ignora.
- `medio_pago`: Efectivo, Tarjeta (datáfono al recibir) o Transferencia. Se aceptan variantes como "nequi" o "transferencia".
- Transferencia exige `comprobante_url`.
- `valor_abono` es opcional. Si se envía, debe ser mayor a 0 y menor al total; crea el crédito y el abono inicial En revisión.
- Se valida que los productos estén activos, sin vencer y con stock. La sede es Aranjuez por defecto (`SEDE_PEDIDOS_CLIENTE`).

```http
GET /mi/notificaciones
200 → { "data": { "no_leidas": 3, "notificaciones": [ { "id_notificacion": 11, "id_pedido": 14,
        "tipo": "pedido_estado", "titulo": "Pedido #14: En proceso",
        "mensaje": "Tu pedido #14 cambió a En proceso.", "leida": false, … } ] } }
```

Tipos de notificación: `pedido_creado`, `pedido_estado`, `abono_aprobado` y `abono_rechazado`.

## Personal

| Método | Ruta | Permiso | Cambio |
|---|---|---|---|
| GET | `/pedidos?estado=&id_cliente=` | pedidos:ver | **Modificado:** agrega entrega, pago, crédito y `origen` (`app` o `personal`) |
| GET | `/pedidos/:id` | pedidos:ver | **Modificado:** ahora incluye `detalles` y `abonos` |
| POST | `/pedidos` | pedidos:crear | **Modificado:** siempre nace Pendiente, total en el servidor y `fecha_entrega` obligatoria (CA-106-001) |
| PUT | `/pedidos/:id` | pedidos:editar | **Modificado:** productos, cliente y fecha solo en Pendiente. Si el `estado` cambia, aplica la transición con sus permisos |
| PATCH | `/pedidos/:id/estado` `{ estado, motivo? }` | pedidos:cambiar_estado (+ anular) | **Nuevo:** notifica al cliente |
| DELETE | `/pedidos/:id` | pedidos:anular | **Modificado:** anula (no borra) |
| GET | `/ventas`, `/ventas/:id` | ventas:ver | **Modificado:** vista de **solo lectura** de los pedidos Entregado |
| POST, PUT, DELETE | `/ventas` | — | **Modificado:** 405 |
| GET | `/abonos?estado=En revisión&id_pedido=&id_credito=` | abonos:ver | **Nuevo** (HU-171) |
| GET | `/abonos/creditos?estado=&id_cliente=` | abonos:ver | **Nuevo** |
| POST | `/abonos` `{ id_pedido, valor_abonado, medio_pago, comprobante_url? }` | abonos:crear | **Nuevo:** queda Aprobado (HU-117) |
| PATCH | `/abonos/:id/aprobar` | abonos:cambiar_estado | **Nuevo:** actualiza el saldo y notifica |
| PATCH | `/abonos/:id/rechazar` `{ motivo }` | abonos:cambiar_estado | **Nuevo:** notifica |
| PATCH | `/abonos/:id/anular` `{ motivo }` | abonos:anular | **Nuevo:** devuelve el valor al saldo |
| GET | `/usuarios` | usuarios:ver, o pedidos/ventas:ver en versión resumida | **Modificado:** nunca devuelve el hash; sin contraseña por defecto |
| GET | `/sedes` | sedes:ver o pedidos/ventas:ver | **Modificado** |
| DELETE | clientes, usuarios, productos, categorías, proveedores, insumos, fichas y sedes | cambiar_estado | **Modificado:** inactiva (no borra) |
| DELETE | `/clientes/:id/definitivo` | clientes:eliminar | **Nuevo (HU-104):** borra el cliente **solo si no tiene registros asociados**. 409 con el motivo y la sugerencia de inactivar: "Este cliente tiene una cuenta en la app; puedes inactivarlo.", "…tiene pedidos asociados…", "…tiene ventas asociadas…" o "…tiene abonos o créditos asociados…". 404 si no existe. El `DELETE /clientes/:id` de siempre sigue inactivando. |
| DELETE | `/productos/:id/definitivo` | productos:eliminar | **Nuevo (HU-093):** borra el producto **solo si no está en pedidos ni ventas**; si no, 409 "Este producto está en pedidos; puedes inactivarlo." o "…está en ventas…". 404 si no existe. El `DELETE /productos/:id` de siempre sigue inactivando. |
| DELETE | `/categorias/:id/definitivo` | categorias:eliminar | **Nuevo:** borra la categoría **solo si no tiene productos** (activos o inactivos); si no, 409 "Esta categoría tiene productos asociados; puedes inactivarla.". 404 si no existe. El `DELETE /categorias/:id` de siempre sigue inactivando. |
| DELETE | `/usuarios/:id/definitivo` | usuarios:eliminar | **Nuevo (HU-018):** borra el usuario **solo si no tiene nada registrado a su nombre** (pedidos, ventas, abonos registrados o revisados, cambios de estado, compras, producción, auditoría ni cuenta de cliente); si no, 409 con el motivo y "…puedes inactivarlo.". También 409 si es el propio usuario ("No puedes eliminar tu propio usuario.") o el único Administrador activo. 404 si no existe. El `DELETE /usuarios/:id` de siempre sigue inactivando. |
| DELETE | `/pedidos/:id/definitivo` | pedidos:eliminar | **Nuevo:** borra un pedido **Pendiente sin abonos, crédito ni venta**, con su detalle, su historial de estados y sus notificaciones, en una transacción. Si no: 409 "Este pedido tiene abonos; anúlalo con un motivo.", "Solo se puede eliminar un pedido Pendiente; este está En proceso. Anúlalo con un motivo." o "Este pedido ya está anulado y no se puede eliminar.". 404 si no existe. El `DELETE /pedidos/:id` de siempre sigue anulando. |
| GET | `/abonos` | abonos:ver | **Modificado (e):** además de `estado`, `id_pedido` e `id_credito`, filtra por `id_cliente` y por `desde`/`hasta` (AAAA-MM-DD, incluidas, sobre `fecha_abono`). 400 con error por campo si un filtro no es válido o si `desde` es posterior a `hasta`. |
| POST | `/abonos` | abonos:crear | **Modificado (e):** acepta `fecha_abono` opcional (AAAA-MM-DD; sin ella, hoy). No puede ser futura, ni anterior a la fecha del pedido, ni de hace más de `ABONO_DIAS_ATRAS_MAX` = 7 días (`src/config/negocio.js`): 400 con `errors.fecha_abono` y el límite en el mensaje. `fecha_registro` sigue siendo el momento real del registro. Los abonos del cliente (`/mi/*`) siguen con la fecha de hoy. |
| PUT | `/abonos/:id` `{ valor_abonado?, medio_pago?, fecha_abono?, comprobante_url? }` | abonos:editar | **Nuevo:** corrige un abono **En revisión**; lo que no se envía se conserva. Mismas reglas que `POST /abonos`: valor entero mayor a 0 y no mayor que el saldo menos los otros abonos en revisión (`errors.valor_abonado`), transferencia con comprobante (`errors.comprobante_url`) y la regla de fecha de 7 días (`errors.fecha_abono`). `comprobante_url: null` lo quita. Aprobado, Rechazado o Anulado → **409** con un mensaje por estado ("El abono ya fue aprobado; anúlalo y registra uno nuevo.", "El abono fue rechazado y no se puede editar; registra uno nuevo.", "El abono está anulado y no se puede editar; registra uno nuevo."). El crédito debe estar Activo (409). |
| POST/PUT | `/abonos`, `/abonos/:id` | abonos:crear / editar | **Modificado:** `comprobante_url` debe ser exactamente la URL que devuelve `POST /comprobantes` (`/api/v1/comprobantes/u<id>_<marca>_<24 hex>.jpg\|png\|pdf`) y el archivo debe existir. Una URL externa u otra ruta → 400 con `errors.comprobante_url`. Aún no se valida quién subió el archivo. |
| GET | `/pedidos/:id/historial` | pedidos:ver | **Nuevo:** historial de estados (migración 010), del más antiguo al más reciente: `estado_anterior` (null al crear), `estado_nuevo`, `id_usuario`, `usuario_nombre`, `rol_nombre` (del usuario, solo nombre y rol: sin correo), `motivo`, `fecha_cambio` y `reconstruido` (true en las filas reconstruidas de pedidos anteriores a la migración). 404 si el pedido no existe. Se escribe al crear el pedido y en cada cambio de estado (`PATCH /pedidos/:id/estado`, `DELETE /pedidos/:id`, `POST /mi/pedidos/:id/anular`). |
| GET | `/fichas-tecnicas/:id` | ver | **Modificado:** trae `insumos` igual que el listado (`insumo_nombre`, `cantidad`, `unidad_medida`). Vendedor y Secretaria tienen `ver` (migración 007). |
| POST/PUT | `/clientes`, `/clientes/:id` | crear / editar | **Modificado:** guardan `tipo_documento` (CC, CE, NIT, PP o TI; en mayúsculas; `CC` si no llega al crear), `municipio` (Área Metropolitana, `MUNICIPIOS_ENTREGA`) y `barrio`. Solo se valida lo que llega (400 con error por campo); en `PUT`, lo que no llega se conserva. |
| PUT | `/clientes/:id` con `estado` | editar (+ cambiar_estado si cambia) | **Modificado:** un `estado` igual al actual (sin distinguir mayúsculas) se ignora; uno distinto exige `clientes:cambiar_estado`, si no **403** "No tienes permiso para cambiar el estado del cliente". Pruebas: `npm run test:staging`. |
| DELETE | compras y producción | anular | **Modificado:** anula |
| DELETE | `/roles/:id` | roles:eliminar | **Modificado:** 409 si tiene usuarios o es un rol del sistema |

**Transiciones del pedido** (`config/negocio.js`):

| Estado actual | Puede pasar a |
|---|---|
| Pendiente | En proceso, Anulado |
| En proceso | Entregado, Anulado |
| Entregado | Anulado |

- **Entregado** descuenta el stock (409 si no alcanza).
- **Anulado** repone el stock si ya se había descontado, anula el crédito y rechaza los abonos En revisión.

```http
PATCH /pedidos/14/estado   { "estado": "En proceso" }
200 → { "message": "Pedido actualizado a En proceso", "data": { "id_pedido": 14, "estado": "En proceso", … } }
409 → { "message": "Un pedido Pendiente no puede pasar a Entregado" }

PATCH /abonos/9/aprobar
200 → { "message": "Abono aprobado: se actualizó el saldo y se notificó al cliente",
        "data": { "id_abono": 9, "estado": "Aprobado", "saldo_pendiente": "19000.00",
                  "usuario_revisa_nombre": "Vendedor Staging", … } }

GET /ventas/8
200 → { "data": { "id_venta": 8, "id_pedido": 8, "id_venta_origen": 6, "fecha_venta": "…",
        "valor_total": "210000.00", "medio_pago": "Transferencia", "estado": "Pendiente",
        "saldo_pendiente": "105000.00", "detalles": [ { "id_detalle_venta": 5, … } ] } }
```

## Configuración (`src/config/negocio.js`)

| Constante | Valor | Uso |
|---|---|---|
| `ANTICIPACION_ANULAR_HORAS` | 24 (o variable de entorno) | Horas antes de las 00:00 del día de entrega |
| `SEDE_PEDIDOS_CLIENTE` | `'Aranjuez'` (o variable de entorno) | Sede de los pedidos de la app |
| `COSTO_ENVIO` | 0 | Desactivado; cambiar aquí para reactivarlo |
| `MUNICIPIOS_ENTREGA`, `TRANSICIONES_PEDIDO`, `COMPROBANTE_MAX_BYTES` | — | Reglas de entrega, estados y comprobantes |

Para arrancar contra Staging: `npm run start:staging` (usa `.env.staging`).
