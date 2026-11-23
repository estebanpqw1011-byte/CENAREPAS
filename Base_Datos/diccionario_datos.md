# CENAREPAS - Diccionario de datos

**Motor:** PostgreSQL 18 · **Esquema:** `cenarepas` · **Fuente:** `Base_Datos/cenarepas_completo.sql` (cenarepas_db + migraciones 001 a 011, idéntico a Staging)

## 1. Cómo se mantiene este documento

- **Secciones 1, 2 y 6** (esta explicación, las decisiones de diseño y el glosario): se escriben a mano.
- **Secciones 3 a 5** (resumen, llaves foráneas y tablas): las genera `Base_Datos/herramientas/generar_documentacion.js`.
  - Columnas, tipos, nulos, valores por defecto, restricciones, índices y llaves foráneas salen del esquema real (`pg_catalog`), no se redactan.
  - Las descripciones de negocio de cada tabla y columna están en `Base_Datos/herramientas/descripciones.json`.
  - El generador falla si ese archivo describe una tabla o columna que no existe, o si falta una descripción.
- **Para regenerarlo** (lee la base, no escribe en ella):

  ```bash
  # Base nueva y desechable, igual a Staging
  dropdb -U postgres --if-exists cenarepas_verificacion
  createdb -U postgres -E UTF8 cenarepas_verificacion
  psql -U postgres -d cenarepas_verificacion -v ON_ERROR_STOP=1 -f Base_Datos/cenarepas_completo.sql

  node Base_Datos/herramientas/generar_documentacion.js              # reescribe las secciones 3 a 5 y el diagrama
  node Base_Datos/herramientas/generar_documentacion.js --comprobar  # solo comprueba que estén al día
  ```

## 2. Decisiones de diseño

### 2.1. Pedidos y ventas están fusionados

- Una venta es un **pedido Entregado**. Las ventas nuevas se registran en `pedido` y `detalle_pedido`.
- `venta` y `detalle_venta` se conservan como **históricas** (migración 002): ninguna fila se borró.
  - Cada venta antigua quedó como un pedido.
  - `pedido.id_venta_origen` guarda el número de la venta de la que salió.
  - El backend ya no crea ventas.
- **Entregar** un pedido descuenta el stock de sus productos (`stock_descontado = TRUE`, `fecha_entregado`).
- **Anular** un pedido entregado repone el stock.

### 2.2. Los 4 estados del pedido y sus transiciones

El CHECK `ck_pedido_estado` admite solo `Pendiente`, `En proceso`, `Entregado` y `Anulado`. Las transiciones permitidas las aplica el backend (`TRANSICIONES_PEDIDO` en `Backend/src/config/negocio.js`):

| Desde | Puede pasar a |
| :--- | :--- |
| Pendiente | En proceso, Anulado |
| En proceso | Entregado, Anulado |
| Entregado | Anulado |
| Anulado | (ninguno) |

- Todo pedido nace **Pendiente**.
- Cada cambio de estado deja una fila en `pedido_estado_historial` en la misma transacción. La creación deja la fila con `estado_anterior` NULL.
- La anulación exige motivo: queda en `pedido.motivo_anulacion` y en el historial. Los demás cambios no guardan motivo.
- El cliente de la app solo puede anular pedidos Pendientes, hasta 24 horas antes del día de entrega.

### 2.3. El crédito se crea con el primer abono

- Registrar un pedido **no** crea un crédito.
- El crédito nace en la misma transacción del **primer abono** (`CreditosService.crearParaPedido`), con el total del pedido.
- **Un pedido sin abonos no tiene fila en `credito`, y eso es correcto.**
- Los abonos del personal quedan `Aprobado` y descuentan el saldo en el momento.
- Los del cliente de la app quedan `En revisión` hasta que el personal los aprueba o los rechaza.
- Una transferencia exige comprobante (JPG, PNG o PDF de máximo 5 MB). Nunca se guardan datos de tarjeta.

### 2.4. "Pagado / Con saldo" no es un estado del pedido

- El estado del pedido es solo logístico (sección 2.2).
- La insignia de pago sale de `credito.estado`:
  - `Pagado`: saldo 0.
  - `Activo`: con saldo.
  - Sin crédito: sin abonos.
- `credito.estado = 'Anulado'` cuando se anula el pedido.

### 2.5. Nada se elimina: se inactiva o se anula

- **La regla la aplica el backend.**
  - Clientes, productos, categorías, insumos, proveedores, sedes, usuarios y fichas técnicas se **inactivan**.
  - Pedidos, abonos, compras y lotes se **anulan** (con motivo en pedidos y abonos).
  - El `DELETE` de la API hace eso mismo; no borra filas.
  - **Única excepción:** `DELETE /roles` borra el rol si no tiene usuarios (sus permisos se borran en cascada).
- **La base protege además, con `ON DELETE RESTRICT`, las entidades que tienen registros asociados:**
  - un **cliente** con pedidos, créditos, abonos o ventas;
  - un **producto** usado en un pedido o una venta;
  - un **insumo** usado en una ficha técnica, una compra o un lote;
  - una **categoría** con productos;
  - una **ficha técnica** con lotes;
  - un **proveedor** con compras;
  - una **sede** con pedidos o ventas;
  - un **rol** con usuarios;
  - un **usuario** que registró pedidos, compras, lotes o ventas, o que es la cuenta de un cliente;
  - un **crédito** con abonos;
  - un **pedido** con crédito.
- **Pedidos:** la base no tiene un `RESTRICT` general.
  - Su detalle y sus abonos tienen `ON DELETE CASCADE`.
  - Lo que hoy impide borrar un pedido es:
    - la llave del historial (`pedido_estado_historial_id_pedido_fkey`, `NO ACTION`): desde la migración 010 todo pedido tiene historial;
    - y, si tiene abonos, la del crédito (`fk_credito_pedido`, `RESTRICT`).
  - Un pedido sin historial ni crédito se podría borrar con un `DELETE` directo en la base, y arrastraría su detalle y sus abonos. Por eso la regla depende del backend, que nunca borra pedidos.
- **Otras llaves sin protección:** borran o desvinculan en lugar de impedir. Por ejemplo, una ficha técnica sin lotes se puede borrar y sus productos quedan sin ficha (`SET NULL`). La lista completa está en la sección 4.
- Las pruebas de estas protecciones están en `Base_Datos/pruebas_reglas.sql`.

### 2.6. Recuperación de contraseña con código, no con enlace (CA-003-002)

- La matriz pide un **enlace** que expira. Se implementó con un **código de 6 dígitos** enviado al correo:
  - vence a los 15 minutos;
  - sirve una sola vez;
  - se bloquea al 5.º intento fallido;
  - se puede pedir uno por minuto.
- En `usuario` solo se guarda el HMAC del código (`token_recuperacion`), su vencimiento (`token_expiracion`) y los intentos fallidos (`recuperacion_intentos`, migración 011).
- **Justificación:**
  - la app móvil no abre enlaces, y así la app y la web siguen el mismo flujo;
  - cumple lo que busca el criterio: la prueba de acceso al correo expira, es de un solo uso y no se guarda en claro.
- Las contraseñas nuevas o cambiadas exigen al menos 8 caracteres. El login no valida la longitud: las contraseñas de 6 o 7 caracteres que ya existían siguen funcionando.

### 2.7. Municipios como texto (deuda técnica)

- `cliente.municipio` y `pedido.municipio_entrega` son texto.
- No hay tablas de país, departamento ni municipio.
- El Área Metropolitana es una lista en el código: `MUNICIPIOS_ENTREGA` en el backend y `municipiosEntrega` en la app.
- **Mejora futura:** un catálogo con llave foránea.

### 2.8. El stock de insumos no se mueve solo (pendiente del equipo)

- La ficha técnica del proyecto pide "relacionar automáticamente los insumos definidos en la receta con el control de inventario y consumo". **Hoy el backend no lo hace:**
  - registrar una compra no suma a `insumo.stock_actual`;
  - registrar un lote de producción no le resta los insumos consumidos.
- `lote_produccion_insumo` guarda el consumo, pero no mueve el stock.
- `insumo.stock_actual` solo cambia cuando alguien lo edita.
- Pendiente para los responsables de Compras y Producción (ver `HANDOFF.md` de la app).

### 2.9. Roles y permisos en la base

- Los permisos no están escritos en el código. Salen de `permiso` (16 módulos por 7 acciones) y `rol_permiso`:
  - Administrador: 112 permisos;
  - Secretaria: 78;
  - Vendedor: 22.
- El login entrega los permisos activos del rol, y cada endpoint los comprueba.
- El Domiciliario no tiene permisos.
- El rol Cliente solo usa los endpoints `/mi/*`.

<!-- INICIO GENERADO por Base_Datos/herramientas/generar_documentacion.js: no editar a mano -->

## 3. Resumen del esquema

Esquema `cenarepas` leído de la base `cenarepas_verificacion`.

| Elemento | Cantidad |
| :--- | ---: |
| Tablas | 25 |
| Columnas | 205 |
| Llaves primarias | 25 |
| Llaves foráneas | 44 |
| Restricciones UNIQUE | 17 |
| Restricciones CHECK | 53 |
| Restricciones NOT NULL (se ven en la columna "Nulo") | 143 |
| Índices (incluye los de llaves primarias y UNIQUE) | 85 |
| Secuencias | 24 |

## 4. Llaves foráneas por acción al borrar

Qué hace la base si se intenta borrar la fila referenciada (la de la columna "Referencia a"). RESTRICT y NO ACTION impiden el borrado mientras existan filas que la referencien; CASCADE borra también esas filas; SET NULL las deja sin referencia.

### ON DELETE RESTRICT (22)

| Tabla y columna | Referencia a | Llave foránea |
| :--- | :--- | :--- |
| `producto.id_categoria` | `categoria_producto` | `fk_producto_categoria` |
| `abono.id_cliente` | `cliente` | `fk_abono_cliente` |
| `credito.id_cliente` | `cliente` | `fk_credito_cliente` |
| `pedido.id_cliente` | `cliente` | `fk_pedido_cliente` |
| `venta.id_cliente` | `cliente` | `fk_venta_cliente` |
| `abono.id_credito` | `credito` | `fk_abono_credito` |
| `lote_produccion.id_ficha` | `ficha_tecnica` | `fk_lote_ficha` |
| `detalle_compra.id_insumo` | `insumo` | `fk_detcompra_insumo` |
| `ficha_tecnica_insumo.id_insumo` | `insumo` | `fk_fichainsumo_insumo` |
| `lote_produccion_insumo.id_insumo` | `insumo` | `fk_loteinsumo_insumo` |
| `credito.id_pedido` | `pedido` | `fk_credito_pedido` |
| `detalle_pedido.id_producto` | `producto` | `fk_detpedido_producto` |
| `detalle_venta.id_producto` | `producto` | `fk_detventa_producto` |
| `compra.id_proveedor` | `proveedor` | `fk_compra_proveedor` |
| `usuario.id_rol` | `rol` | `fk_usuario_rol` |
| `pedido.id_sede` | `sede` | `fk_pedido_sede` |
| `venta.id_sede` | `sede` | `fk_venta_sede` |
| `cliente.id_usuario` | `usuario` | `fk_cliente_usuario` |
| `compra.id_usuario` | `usuario` | `fk_compra_usuario` |
| `lote_produccion.id_usuario_responsable` | `usuario` | `fk_lote_usuario` |
| `pedido.id_usuario` | `usuario` | `fk_pedido_usuario` |
| `venta.id_usuario` | `usuario` | `fk_venta_usuario` |

### ON DELETE NO ACTION (2)

| Tabla y columna | Referencia a | Llave foránea |
| :--- | :--- | :--- |
| `pedido_estado_historial.id_pedido` | `pedido` | `pedido_estado_historial_id_pedido_fkey` |
| `pedido_estado_historial.id_usuario` | `usuario` | `pedido_estado_historial_id_usuario_fkey` |

### ON DELETE CASCADE (10)

| Tabla y columna | Referencia a | Llave foránea |
| :--- | :--- | :--- |
| `detalle_compra.id_compra` | `compra` | `fk_detcompra_compra` |
| `ficha_tecnica_insumo.id_ficha` | `ficha_tecnica` | `fk_fichainsumo_ficha` |
| `lote_produccion_insumo.id_lote` | `lote_produccion` | `fk_loteinsumo_lote` |
| `abono.id_pedido` | `pedido` | `fk_abono_pedido` |
| `detalle_pedido.id_pedido` | `pedido` | `fk_detpedido_pedido` |
| `rol_permiso.id_permiso` | `permiso` | `fk_rolpermiso_permiso` |
| `rol_permiso.id_rol` | `rol` | `fk_rolpermiso_rol` |
| `notificacion.id_usuario` | `usuario` | `fk_notificacion_usuario` |
| `abono.id_venta` | `venta` | `fk_abono_venta` |
| `detalle_venta.id_venta` | `venta` | `fk_detventa_venta` |

### ON DELETE SET NULL (10)

| Tabla y columna | Referencia a | Llave foránea |
| :--- | :--- | :--- |
| `notificacion.id_abono` | `abono` | `fk_notificacion_abono` |
| `producto.id_ficha` | `ficha_tecnica` | `fk_producto_ficha` |
| `notificacion.id_pedido` | `pedido` | `fk_notificacion_pedido` |
| `venta.id_pedido` | `pedido` | `fk_venta_pedido` |
| `insumo.id_proveedor` | `proveedor` | `fk_insumo_proveedor` |
| `producto.id_proveedor` | `proveedor` | `fk_producto_proveedor` |
| `abono.id_usuario_registra` | `usuario` | `fk_abono_usuario_registra` |
| `abono.id_usuario_revisa` | `usuario` | `fk_abono_usuario_revisa` |
| `auditoria.id_usuario` | `usuario` | `fk_auditoria_usuario` |
| `pedido.id_venta_origen` | `venta` | `fk_pedido_venta_origen` |

## 5. Tablas por dominio

### 5.1. Seguridad

#### Tabla `rol`

Roles del sistema: Administrador, Secretaria, Vendedor, Domiciliario y Cliente (HU-005 a HU-012). El backend busca el rol Cliente por nombre, no por id.

Comentario en la base: _HU-005 a HU-012: perfiles de usuario (Administrador, Secretaria, Vendedor, etc.)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_rol` | `integer` | No | `nextval('rol_id_rol_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `nombre` | `character varying(50)` | No |  | UQ | Nombre del rol (único). |
| 3 | `descripcion` | `character varying(255)` | Sí |  |  | Descripción del rol. |
| 4 | `estado` | `character varying(10)` | No | `'Activo'::character varying` |  | Activo o Inactivo. |
| 5 | `fecha_creacion` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento en que se creó el rol. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_rol_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))` |
| `rol_pkey` | PRIMARY KEY | `PRIMARY KEY (id_rol)` |
| `uq_rol_nombre` | UNIQUE | `UNIQUE (nombre)` |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `rol_pkey` | `CREATE UNIQUE INDEX rol_pkey ON rol USING btree (id_rol)` |
| `uq_rol_nombre` | `CREATE UNIQUE INDEX uq_rol_nombre ON rol USING btree (nombre)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `rol_permiso.id_rol` | `fk_rolpermiso_rol` | CASCADE |
| `usuario.id_rol` | `fk_usuario_rol` | RESTRICT |

#### Tabla `permiso`

Acciones por módulo que se asignan a los roles: 16 módulos por 7 acciones (CA-012).

Comentario en la base: _CA-012: acciones disponibles por módulo, asignables a roles_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_permiso` | `integer` | No | `nextval('permiso_id_permiso_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `modulo` | `character varying(50)` | No |  |  | Módulo (abonos, categorias, clientes, compras, configuracion, dashboard, fichas-tecnicas, insumos, pedidos, produccion, productos, proveedores, roles, sedes, usuarios, ventas). |
| 3 | `accion` | `character varying(50)` | No |  |  | Acción: ver, crear, editar, eliminar, cambiar_estado, exportar o anular. |
| 4 | `estado` | `character varying(10)` | No | `'Activo'::character varying` |  | Activo o Inactivo. El login solo entrega los permisos activos. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_permiso_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))` |
| `permiso_pkey` | PRIMARY KEY | `PRIMARY KEY (id_permiso)` |
| `uq_permiso_modulo_accion` | UNIQUE | `UNIQUE (modulo, accion)` |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `permiso_pkey` | `CREATE UNIQUE INDEX permiso_pkey ON permiso USING btree (id_permiso)` |
| `uq_permiso_modulo_accion` | `CREATE UNIQUE INDEX uq_permiso_modulo_accion ON permiso USING btree (modulo, accion)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `rol_permiso.id_permiso` | `fk_rolpermiso_permiso` | CASCADE |

#### Tabla `rol_permiso`

Permisos de cada rol (HU-012). Administrador 112, Secretaria 78, Vendedor 22.

Comentario en la base: _Relación N:M entre rol y permiso (HU-012)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_rol` | `integer` | No |  | PK<br>FK → `rol.id_rol` | Referencia a `rol`. |
| 2 | `id_permiso` | `integer` | No |  | PK<br>FK → `permiso.id_permiso` | Referencia a `permiso`. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `rol_permiso_pkey` | PRIMARY KEY | `PRIMARY KEY (id_rol, id_permiso)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_rolpermiso_permiso` | `id_permiso` | `permiso.id_permiso` | CASCADE | CASCADE |
| `fk_rolpermiso_rol` | `id_rol` | `rol.id_rol` | CASCADE | CASCADE |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `rol_permiso_pkey` | `CREATE UNIQUE INDEX rol_permiso_pkey ON rol_permiso USING btree (id_rol, id_permiso)` |

#### Tabla `usuario`

Cuentas de acceso: personal (Administrador, Secretaria, Vendedor, Domiciliario) y clientes registrados en la app (HU-013 a HU-024).

Comentario en la base: _HU-013 a HU-024: cuentas de acceso al sistema (Administrador/Secretaria/Vendedor)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_usuario` | `integer` | No | `nextval('usuario_id_usuario_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `nombre` | `character varying(100)` | No |  |  | Nombre de la persona. |
| 3 | `correo` | `character varying(150)` | No |  | UQ | Correo de acceso. Único sin distinguir mayúsculas (uq_usuario_correo y ux_usuario_correo_lower). |
| 4 | `contrasena_hash` | `character varying(255)` | No |  |  | Hash bcrypt de la contraseña (10 rondas). Contraseñas nuevas o cambiadas: mínimo 8 caracteres (lo valida el backend). |
| 5 | `id_rol` | `integer` | No |  | FK → `rol.id_rol` | Referencia a `rol`. |
| 6 | `estado` | `character varying(10)` | No | `'Activo'::character varying` |  | Activo o Inactivo. Un usuario inactivo no puede iniciar sesión. |
| 7 | `token_recuperacion` | `character varying(255)` | Sí |  |  | HMAC del código de recuperación de 6 dígitos (nunca el código). NULL si no hay código vigente. _(Comentario en la base: CA-003/CA-024: token temporal para recuperación de contraseña)_ |
| 8 | `token_expiracion` | `timestamp without time zone` | Sí |  |  | Vencimiento del código de recuperación (15 minutos después de pedirlo). |
| 9 | `fecha_creacion` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento en que se creó la cuenta. |
| 10 | `recuperacion_intentos` | `integer` | No | `0` |  | Intentos fallidos con el código vigente; al 5.º el código se invalida (migración 011). |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_usuario_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))` |
| `ck_usuario_recuperacion_intentos` | CHECK | `CHECK ((recuperacion_intentos >= 0))` |
| `usuario_pkey` | PRIMARY KEY | `PRIMARY KEY (id_usuario)` |
| `uq_usuario_correo` | UNIQUE | `UNIQUE (correo)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_usuario_rol` | `id_rol` | `rol.id_rol` | CASCADE | RESTRICT |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `idx_usuario_estado` | `CREATE INDEX idx_usuario_estado ON usuario USING btree (estado)` |
| `idx_usuario_nombre` | `CREATE INDEX idx_usuario_nombre ON usuario USING gin (nombre gin_trgm_ops)` |
| `uq_usuario_correo` | `CREATE UNIQUE INDEX uq_usuario_correo ON usuario USING btree (correo)` |
| `usuario_pkey` | `CREATE UNIQUE INDEX usuario_pkey ON usuario USING btree (id_usuario)` |
| `ux_usuario_correo_lower` | `CREATE UNIQUE INDEX ux_usuario_correo_lower ON usuario USING btree (lower((correo)::text))` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `abono.id_usuario_registra` | `fk_abono_usuario_registra` | SET NULL |
| `abono.id_usuario_revisa` | `fk_abono_usuario_revisa` | SET NULL |
| `auditoria.id_usuario` | `fk_auditoria_usuario` | SET NULL |
| `cliente.id_usuario` | `fk_cliente_usuario` | RESTRICT |
| `compra.id_usuario` | `fk_compra_usuario` | RESTRICT |
| `lote_produccion.id_usuario_responsable` | `fk_lote_usuario` | RESTRICT |
| `notificacion.id_usuario` | `fk_notificacion_usuario` | CASCADE |
| `pedido.id_usuario` | `fk_pedido_usuario` | RESTRICT |
| `pedido_estado_historial.id_usuario` | `pedido_estado_historial_id_usuario_fkey` | NO ACTION |
| `venta.id_usuario` | `fk_venta_usuario` | RESTRICT |

#### Tabla `auditoria`

Bitácora de eventos. Existe en la base y GET /auditoria la lee, pero el backend actual no escribe en ella (AuditoriaService no tiene llamadas que inserten).

Comentario en la base: _Bitácora de auditoría (Manual Técnico - Regla de Negocio de Roles, generalizada)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_auditoria` | `integer` | No | `nextval('auditoria_id_auditoria_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_usuario` | `integer` | Sí |  | FK → `usuario.id_usuario` | Usuario que hizo la acción. |
| 3 | `tabla_afectada` | `character varying(50)` | No |  |  | Tabla del registro afectado. |
| 4 | `id_registro_afectado` | `integer` | Sí |  |  | Id del registro afectado. |
| 5 | `accion` | `character varying(20)` | No |  |  | INSERT, UPDATE, DELETE, ANULACION o CAMBIO_ESTADO. |
| 6 | `detalle` | `text` | Sí |  |  | Detalle del evento en texto libre. |
| 7 | `fecha_evento` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento del evento. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_auditoria_accion` | CHECK | `CHECK (((accion)::text = ANY (ARRAY[('INSERT'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text, ('ANULACION'::character varying)::text, ('CAMBIO_ESTADO'::character varying)::text])))` |
| `auditoria_pkey` | PRIMARY KEY | `PRIMARY KEY (id_auditoria)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_auditoria_usuario` | `id_usuario` | `usuario.id_usuario` | CASCADE | SET NULL |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `auditoria_pkey` | `CREATE UNIQUE INDEX auditoria_pkey ON auditoria USING btree (id_auditoria)` |
| `idx_auditoria_tabla` | `CREATE INDEX idx_auditoria_tabla ON auditoria USING btree (tabla_afectada, id_registro_afectado)` |
| `idx_auditoria_usuario` | `CREATE INDEX idx_auditoria_usuario ON auditoria USING btree (id_usuario)` |

### 5.2. Sedes y terceros

#### Tabla `sede`

Sedes de la empresa. Los pedidos del cliente de la app van a la sede por defecto (SEDE_PEDIDOS_CLIENTE en negocio.js, hoy Aranjuez).

Comentario en la base: _Acta - Subproceso de Sedes: Bello Oriente (producción) y Aranjuez (ventas)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_sede` | `integer` | No | `nextval('sede_id_sede_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `nombre` | `character varying(80)` | No |  | UQ | Nombre de la sede (único). |
| 3 | `direccion` | `character varying(255)` | No |  |  | Dirección. |
| 4 | `telefono` | `character varying(20)` | Sí |  |  | Teléfono de contacto. |
| 5 | `horario_atencion` | `character varying(100)` | Sí |  |  | Horario de atención en texto. |
| 6 | `responsable` | `character varying(100)` | Sí |  |  | Persona responsable de la sede, en texto. |
| 7 | `estado` | `character varying(10)` | No | `'Activo'::character varying` |  | Activo o Inactivo. No se pueden registrar pedidos en una sede inactiva. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_sede_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))` |
| `sede_pkey` | PRIMARY KEY | `PRIMARY KEY (id_sede)` |
| `uq_sede_nombre` | UNIQUE | `UNIQUE (nombre)` |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `sede_pkey` | `CREATE UNIQUE INDEX sede_pkey ON sede USING btree (id_sede)` |
| `uq_sede_nombre` | `CREATE UNIQUE INDEX uq_sede_nombre ON sede USING btree (nombre)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `pedido.id_sede` | `fk_pedido_sede` | RESTRICT |
| `venta.id_sede` | `fk_venta_sede` | RESTRICT |

#### Tabla `cliente`

Clientes (HU-099 a HU-105). Los registra el personal o se registran en la app (HU-150); en ese caso tienen cuenta de usuario con rol Cliente.

Comentario en la base: _HU-099 a HU-105: tiendas, supermercados y clientes al detal_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_cliente` | `integer` | No | `nextval('cliente_id_cliente_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `nombre` | `character varying(150)` | No |  |  | Nombre o razón social. |
| 3 | `documento` | `character varying(20)` | No |  | UQ | Número de documento (único). |
| 4 | `telefono` | `character varying(20)` | Sí |  |  | Teléfono (también se usa para WhatsApp). |
| 5 | `correo` | `character varying(150)` | Sí |  |  | Correo (opcional). Único sin distinguir mayúsculas (ux_cliente_correo_lower). |
| 6 | `direccion` | `character varying(255)` | Sí |  |  | Dirección. |
| 7 | `estado` | `character varying(10)` | No | `'Activo'::character varying` |  | Activo o Inactivo. Un cliente inactivo no puede hacer pedidos. |
| 8 | `fecha_creacion` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento del registro. |
| 9 | `id_usuario` | `integer` | Sí |  | FK → `usuario.id_usuario`<br>UQ | Cuenta del cliente que se registró en la app; NULL si lo registró el personal. Una cuenta por cliente (uq_cliente_usuario). |
| 10 | `tipo_documento` | `character varying(5)` | No | `'CC'::character varying` |  | CC, CE, NIT, PP o TI (por defecto CC). |
| 11 | `municipio` | `character varying(60)` | Sí |  |  | Municipio en texto (lista del Área Metropolitana en el backend y en la app; sin catálogo en la base: deuda técnica). |
| 12 | `barrio` | `character varying(80)` | Sí |  |  | Barrio en texto. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_cliente_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))` |
| `ck_cliente_tipodocumento` | CHECK | `CHECK (((tipo_documento)::text = ANY ((ARRAY['CC'::character varying, 'CE'::character varying, 'NIT'::character varying, 'PP'::character varying, 'TI'::character varying])::text[])))` |
| `cliente_pkey` | PRIMARY KEY | `PRIMARY KEY (id_cliente)` |
| `uq_cliente_documento` | UNIQUE | `UNIQUE (documento)` |
| `uq_cliente_usuario` | UNIQUE | `UNIQUE (id_usuario)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_cliente_usuario` | `id_usuario` | `usuario.id_usuario` | NO ACTION | RESTRICT |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `cliente_pkey` | `CREATE UNIQUE INDEX cliente_pkey ON cliente USING btree (id_cliente)` |
| `idx_cliente_estado` | `CREATE INDEX idx_cliente_estado ON cliente USING btree (estado)` |
| `idx_cliente_nombre` | `CREATE INDEX idx_cliente_nombre ON cliente USING gin (nombre gin_trgm_ops)` |
| `uq_cliente_documento` | `CREATE UNIQUE INDEX uq_cliente_documento ON cliente USING btree (documento)` |
| `uq_cliente_usuario` | `CREATE UNIQUE INDEX uq_cliente_usuario ON cliente USING btree (id_usuario)` |
| `ux_cliente_correo_lower` | `CREATE UNIQUE INDEX ux_cliente_correo_lower ON cliente USING btree (lower((correo)::text)) WHERE (correo IS NOT NULL)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `abono.id_cliente` | `fk_abono_cliente` | RESTRICT |
| `credito.id_cliente` | `fk_credito_cliente` | RESTRICT |
| `pedido.id_cliente` | `fk_pedido_cliente` | RESTRICT |
| `venta.id_cliente` | `fk_venta_cliente` | RESTRICT |

#### Tabla `proveedor`

Proveedores de insumos (HU-025 a HU-033). Solo se inactivan; con compras asociadas la base impide borrarlos.

Comentario en la base: _HU-025 a HU-033: solo se inactiva, no se elimina si tiene compras asociadas (CA-030-002)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_proveedor` | `integer` | No | `nextval('proveedor_id_proveedor_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `nombre` | `character varying(150)` | No |  |  | Nombre o razón social. |
| 3 | `nit` | `character varying(20)` | No |  | UQ | NIT (único). |
| 4 | `telefono` | `character varying(20)` | Sí |  |  | Teléfono. |
| 5 | `correo` | `character varying(150)` | Sí |  |  | Correo. |
| 6 | `direccion` | `character varying(255)` | Sí |  |  | Dirección. |
| 7 | `estado` | `character varying(10)` | No | `'Activo'::character varying` |  | Activo o Inactivo. |
| 8 | `fecha_creacion` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento del registro. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_proveedor_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))` |
| `proveedor_pkey` | PRIMARY KEY | `PRIMARY KEY (id_proveedor)` |
| `uq_proveedor_nit` | UNIQUE | `UNIQUE (nit)` |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `idx_proveedor_estado` | `CREATE INDEX idx_proveedor_estado ON proveedor USING btree (estado)` |
| `idx_proveedor_nombre` | `CREATE INDEX idx_proveedor_nombre ON proveedor USING gin (nombre gin_trgm_ops)` |
| `proveedor_pkey` | `CREATE UNIQUE INDEX proveedor_pkey ON proveedor USING btree (id_proveedor)` |
| `uq_proveedor_nit` | `CREATE UNIQUE INDEX uq_proveedor_nit ON proveedor USING btree (nit)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `compra.id_proveedor` | `fk_compra_proveedor` | RESTRICT |
| `insumo.id_proveedor` | `fk_insumo_proveedor` | SET NULL |
| `producto.id_proveedor` | `fk_producto_proveedor` | SET NULL |

### 5.3. Catálogo y recetas

#### Tabla `categoria_producto`

Categorías del catálogo (HU-045 a HU-054).

Comentario en la base: _HU-045 a HU-054: clasificación de las arepas (amarilla, blanca, chócolo)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_categoria` | `integer` | No | `nextval('categoria_producto_id_categoria_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `nombre` | `character varying(80)` | No |  | UQ | Nombre (único). |
| 3 | `descripcion` | `character varying(255)` | Sí |  |  | Descripción. |
| 4 | `estado` | `character varying(10)` | No | `'Activo'::character varying` |  | Activo o Inactivo. Los productos de una categoría inactiva no se pueden pedir. |
| 5 | `imagen_url` | `character varying(255)` | Sí |  |  | Ruta de la imagen (migración 006). Opcional. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_categoria_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))` |
| `categoria_producto_pkey` | PRIMARY KEY | `PRIMARY KEY (id_categoria)` |
| `uq_categoria_nombre` | UNIQUE | `UNIQUE (nombre)` |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `categoria_producto_pkey` | `CREATE UNIQUE INDEX categoria_producto_pkey ON categoria_producto USING btree (id_categoria)` |
| `idx_categoria_nombre` | `CREATE INDEX idx_categoria_nombre ON categoria_producto USING gin (nombre gin_trgm_ops)` |
| `uq_categoria_nombre` | `CREATE UNIQUE INDEX uq_categoria_nombre ON categoria_producto USING btree (nombre)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `producto.id_categoria` | `fk_producto_categoria` | RESTRICT |

#### Tabla `producto`

Productos del catálogo (HU-088 a HU-098).

Comentario en la base: _HU-088 a HU-098: catálogo de arepas (amarilla tela/media tela/extragrande, blanca, chócolo)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_producto` | `integer` | No | `nextval('producto_id_producto_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `nombre` | `character varying(100)` | No |  | UQ | Nombre (único). |
| 3 | `descripcion` | `character varying(255)` | Sí |  |  | Descripción. |
| 4 | `id_categoria` | `integer` | No |  | FK → `categoria_producto.id_categoria` | Referencia a `categoria_producto`. |
| 5 | `id_ficha` | `integer` | Sí |  | FK → `ficha_tecnica.id_ficha` | Ficha técnica (receta) del producto. La base la permite vacía; CA-088-002 pide que sea obligatoria (pendiente del equipo). |
| 6 | `id_proveedor` | `integer` | Sí |  | FK → `proveedor.id_proveedor` | Proveedor del producto (opcional). |
| 7 | `precio_venta` | `numeric(12,2)` | No |  |  | Precio de venta. El pedido copia este precio al detalle al momento de pedir. |
| 8 | `imagen_url` | `character varying(255)` | Sí |  |  | Ruta de la imagen (opcional). |
| 9 | `stock_actual` | `numeric(12,2)` | No | `0` |  | Existencia. Entregar un pedido la descuenta y anular un pedido entregado la repone; los lotes de producción no la suman. |
| 10 | `stock_minimo` | `numeric(12,2)` | No | `0` |  | Umbral de la alerta de stock bajo. |
| 11 | `fecha_vencimiento` | `date` | Sí |  |  | Vencimiento. Un producto vencido no se puede pedir. |
| 12 | `estado` | `character varying(10)` | No | `'Activo'::character varying` |  | Activo o Inactivo. Un producto inactivo no se puede pedir. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_producto_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))` |
| `ck_producto_precio` | CHECK | `CHECK ((precio_venta >= (0)::numeric))` |
| `ck_producto_stock` | CHECK | `CHECK ((stock_actual >= (0)::numeric))` |
| `ck_producto_stockmin` | CHECK | `CHECK ((stock_minimo >= (0)::numeric))` |
| `producto_pkey` | PRIMARY KEY | `PRIMARY KEY (id_producto)` |
| `uq_producto_nombre` | UNIQUE | `UNIQUE (nombre)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_producto_categoria` | `id_categoria` | `categoria_producto.id_categoria` | CASCADE | RESTRICT |
| `fk_producto_ficha` | `id_ficha` | `ficha_tecnica.id_ficha` | CASCADE | SET NULL |
| `fk_producto_proveedor` | `id_proveedor` | `proveedor.id_proveedor` | CASCADE | SET NULL |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `idx_producto_categoria` | `CREATE INDEX idx_producto_categoria ON producto USING btree (id_categoria)` |
| `idx_producto_estado` | `CREATE INDEX idx_producto_estado ON producto USING btree (estado)` |
| `idx_producto_ficha` | `CREATE INDEX idx_producto_ficha ON producto USING btree (id_ficha)` |
| `idx_producto_nombre` | `CREATE INDEX idx_producto_nombre ON producto USING gin (nombre gin_trgm_ops)` |
| `producto_pkey` | `CREATE UNIQUE INDEX producto_pkey ON producto USING btree (id_producto)` |
| `uq_producto_nombre` | `CREATE UNIQUE INDEX uq_producto_nombre ON producto USING btree (nombre)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `detalle_pedido.id_producto` | `fk_detpedido_producto` | RESTRICT |
| `detalle_venta.id_producto` | `fk_detventa_producto` | RESTRICT |

#### Tabla `ficha_tecnica`

Receta de un producto (HU-055 a HU-066). El Vendedor y la Secretaria solo la consultan (migración 007).

Comentario en la base: _HU-055 a HU-066: receta de cada producto (arepa) y su composición_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_ficha` | `integer` | No | `nextval('ficha_tecnica_id_ficha_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `nombre` | `character varying(100)` | No |  | UQ | Nombre (único). |
| 3 | `descripcion` | `character varying(255)` | Sí |  |  | Descripción. |
| 4 | `instrucciones_preparacion` | `text` | Sí |  |  | Pasos de preparación. |
| 5 | `tiempo_estimado_minutos` | `integer` | Sí |  |  | Tiempo de preparación en minutos (mayor que 0). |
| 6 | `rendimiento_lote` | `numeric(12,2)` | Sí |  |  | Unidades que rinde la receta (mayor que 0). Las cantidades de sus insumos son para este rendimiento. |
| 7 | `estado` | `character varying(10)` | No | `'Activo'::character varying` |  | Activo o Inactivo. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_ficha_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))` |
| `ck_ficha_rendimiento` | CHECK | `CHECK ((rendimiento_lote > (0)::numeric))` |
| `ck_ficha_tiempo` | CHECK | `CHECK ((tiempo_estimado_minutos > 0))` |
| `ficha_tecnica_pkey` | PRIMARY KEY | `PRIMARY KEY (id_ficha)` |
| `uq_ficha_nombre` | UNIQUE | `UNIQUE (nombre)` |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `ficha_tecnica_pkey` | `CREATE UNIQUE INDEX ficha_tecnica_pkey ON ficha_tecnica USING btree (id_ficha)` |
| `idx_ficha_nombre` | `CREATE INDEX idx_ficha_nombre ON ficha_tecnica USING gin (nombre gin_trgm_ops)` |
| `uq_ficha_nombre` | `CREATE UNIQUE INDEX uq_ficha_nombre ON ficha_tecnica USING btree (nombre)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `ficha_tecnica_insumo.id_ficha` | `fk_fichainsumo_ficha` | CASCADE |
| `lote_produccion.id_ficha` | `fk_lote_ficha` | RESTRICT |
| `producto.id_ficha` | `fk_producto_ficha` | SET NULL |

#### Tabla `ficha_tecnica_insumo`

Insumos de una receta y sus cantidades, sin repetir insumo (HU-061, HU-062).

Comentario en la base: _HU-061/062: insumos y cantidades que componen la receta (sin duplicados)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_ficha_insumo` | `integer` | No | `nextval('ficha_tecnica_insumo_id_ficha_insumo_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_ficha` | `integer` | No |  | FK → `ficha_tecnica.id_ficha` | Referencia a `ficha_tecnica`. |
| 3 | `id_insumo` | `integer` | No |  | FK → `insumo.id_insumo` | Referencia a `insumo`. |
| 4 | `cantidad` | `numeric(12,2)` | No |  |  | Cantidad del insumo para el rendimiento de la ficha (mayor que 0). |
| 5 | `unidad_medida` | `character varying(20)` | No |  |  | Unidad de la cantidad. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_fichainsumo_cant` | CHECK | `CHECK ((cantidad > (0)::numeric))` |
| `ficha_tecnica_insumo_pkey` | PRIMARY KEY | `PRIMARY KEY (id_ficha_insumo)` |
| `uq_fichainsumo_ficha_insumo` | UNIQUE | `UNIQUE (id_ficha, id_insumo)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_fichainsumo_ficha` | `id_ficha` | `ficha_tecnica.id_ficha` | CASCADE | CASCADE |
| `fk_fichainsumo_insumo` | `id_insumo` | `insumo.id_insumo` | CASCADE | RESTRICT |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `ficha_tecnica_insumo_pkey` | `CREATE UNIQUE INDEX ficha_tecnica_insumo_pkey ON ficha_tecnica_insumo USING btree (id_ficha_insumo)` |
| `uq_fichainsumo_ficha_insumo` | `CREATE UNIQUE INDEX uq_fichainsumo_ficha_insumo ON ficha_tecnica_insumo USING btree (id_ficha, id_insumo)` |

#### Tabla `insumo`

Materias primas y empaques (HU-067 a HU-077).

Comentario en la base: _HU-067 a HU-077: harina de maíz, sal, agua, etc. CA-070-001: incluye proveedor y vencimiento_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_insumo` | `integer` | No | `nextval('insumo_id_insumo_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `nombre` | `character varying(100)` | No |  | UQ | Nombre (único). |
| 3 | `unidad_medida` | `character varying(20)` | No |  |  | Unidad de medida (Kg, Litro, Paquete…). |
| 4 | `stock_actual` | `numeric(12,2)` | No | `0` |  | Existencia registrada. El backend no la cambia con las compras ni con los lotes de producción (pendiente del equipo). |
| 5 | `stock_minimo` | `numeric(12,2)` | No | `0` |  | Umbral de la alerta de stock bajo. |
| 6 | `fecha_vencimiento` | `date` | Sí |  |  | Vencimiento (opcional). |
| 7 | `id_proveedor` | `integer` | Sí |  | FK → `proveedor.id_proveedor` | Proveedor habitual (opcional). |
| 8 | `estado` | `character varying(10)` | No | `'Activo'::character varying` |  | Activo o Inactivo. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_insumo_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))` |
| `ck_insumo_stock` | CHECK | `CHECK ((stock_actual >= (0)::numeric))` |
| `ck_insumo_stock_min` | CHECK | `CHECK ((stock_minimo >= (0)::numeric))` |
| `insumo_pkey` | PRIMARY KEY | `PRIMARY KEY (id_insumo)` |
| `uq_insumo_nombre` | UNIQUE | `UNIQUE (nombre)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_insumo_proveedor` | `id_proveedor` | `proveedor.id_proveedor` | CASCADE | SET NULL |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `idx_insumo_estado` | `CREATE INDEX idx_insumo_estado ON insumo USING btree (estado)` |
| `idx_insumo_nombre` | `CREATE INDEX idx_insumo_nombre ON insumo USING gin (nombre gin_trgm_ops)` |
| `idx_insumo_proveedor` | `CREATE INDEX idx_insumo_proveedor ON insumo USING btree (id_proveedor)` |
| `insumo_pkey` | `CREATE UNIQUE INDEX insumo_pkey ON insumo USING btree (id_insumo)` |
| `uq_insumo_nombre` | `CREATE UNIQUE INDEX uq_insumo_nombre ON insumo USING btree (nombre)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `detalle_compra.id_insumo` | `fk_detcompra_insumo` | RESTRICT |
| `ficha_tecnica_insumo.id_insumo` | `fk_fichainsumo_insumo` | RESTRICT |
| `lote_produccion_insumo.id_insumo` | `fk_loteinsumo_insumo` | RESTRICT |

### 5.4. Producción y compras

#### Tabla `compra`

Compras de insumos a proveedores (HU-034 a HU-044). No se eliminan: se anulan (CA-039-001). Hoy no suman al stock de los insumos.

Comentario en la base: _HU-034 a HU-044: no se elimina, solo se anula (CA-039-001) conservando trazabilidad_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_compra` | `integer` | No | `nextval('compra_id_compra_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_proveedor` | `integer` | No |  | FK → `proveedor.id_proveedor` | Referencia a `proveedor`. |
| 3 | `id_usuario` | `integer` | No |  | FK → `usuario.id_usuario` | Usuario que registró la compra. |
| 4 | `fecha_compra` | `date` | No | `CURRENT_DATE` |  | Día de la compra. |
| 5 | `valor_total` | `numeric(14,2)` | No | `0` |  | Total de la compra (lo envía quien la registra). |
| 6 | `medio_pago` | `character varying(20)` | No |  |  | Efectivo, Transferencia, Credito o Tarjeta. |
| 7 | `comprobante_url` | `character varying(255)` | Sí |  |  | Factura en PDF o imagen (opcional). _(Comentario en la base: CA-042: factura en PDF o imagen (HU-042))_ |
| 8 | `estado` | `character varying(15)` | No | `'Registrada'::character varying` |  | Registrada o Anulada. |
| 9 | `fecha_registro` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento del registro. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_compra_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Registrada'::character varying)::text, ('Anulada'::character varying)::text])))` |
| `ck_compra_mediopago` | CHECK | `CHECK (((medio_pago)::text = ANY (ARRAY[('Efectivo'::character varying)::text, ('Transferencia'::character varying)::text, ('Credito'::character varying)::text, ('Tarjeta'::character varying)::text])))` |
| `ck_compra_total` | CHECK | `CHECK ((valor_total >= (0)::numeric))` |
| `compra_pkey` | PRIMARY KEY | `PRIMARY KEY (id_compra)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_compra_proveedor` | `id_proveedor` | `proveedor.id_proveedor` | CASCADE | RESTRICT |
| `fk_compra_usuario` | `id_usuario` | `usuario.id_usuario` | CASCADE | RESTRICT |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `compra_pkey` | `CREATE UNIQUE INDEX compra_pkey ON compra USING btree (id_compra)` |
| `idx_compra_estado` | `CREATE INDEX idx_compra_estado ON compra USING btree (estado)` |
| `idx_compra_fecha` | `CREATE INDEX idx_compra_fecha ON compra USING btree (fecha_compra)` |
| `idx_compra_proveedor` | `CREATE INDEX idx_compra_proveedor ON compra USING btree (id_proveedor)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `detalle_compra.id_compra` | `fk_detcompra_compra` | CASCADE |

#### Tabla `detalle_compra`

Insumos y cantidades de cada compra, sin repetir insumo.

Comentario en la base: _Insumos y cantidades adquiridas en cada compra (Acta - Subproceso de compras)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_detalle_compra` | `integer` | No | `nextval('detalle_compra_id_detalle_compra_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_compra` | `integer` | No |  | FK → `compra.id_compra` | Referencia a `compra`. |
| 3 | `id_insumo` | `integer` | No |  | FK → `insumo.id_insumo` | Referencia a `insumo`. |
| 4 | `cantidad` | `numeric(12,2)` | No |  |  | Cantidad comprada (mayor que 0). |
| 5 | `valor_unitario` | `numeric(12,2)` | No |  |  | Valor por unidad. |
| 6 | `subtotal` | `numeric(14,2)` | No |  |  | cantidad por valor_unitario (lo envía quien registra la compra). |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_detcompra_cant` | CHECK | `CHECK ((cantidad > (0)::numeric))` |
| `ck_detcompra_subtotal` | CHECK | `CHECK ((subtotal >= (0)::numeric))` |
| `ck_detcompra_valor` | CHECK | `CHECK ((valor_unitario >= (0)::numeric))` |
| `detalle_compra_pkey` | PRIMARY KEY | `PRIMARY KEY (id_detalle_compra)` |
| `uq_detcompra_compra_insumo` | UNIQUE | `UNIQUE (id_compra, id_insumo)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_detcompra_compra` | `id_compra` | `compra.id_compra` | CASCADE | CASCADE |
| `fk_detcompra_insumo` | `id_insumo` | `insumo.id_insumo` | CASCADE | RESTRICT |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `detalle_compra_pkey` | `CREATE UNIQUE INDEX detalle_compra_pkey ON detalle_compra USING btree (id_detalle_compra)` |
| `uq_detcompra_compra_insumo` | `CREATE UNIQUE INDEX uq_detcompra_compra_insumo ON detalle_compra USING btree (id_compra, id_insumo)` |

#### Tabla `lote_produccion`

Lote de producción de una receta (HU-078 a HU-087).

Comentario en la base: _HU-078 a HU-087: lotes de arepas producidos, trazabilidad operativa_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_lote` | `integer` | No | `nextval('lote_produccion_id_lote_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_ficha` | `integer` | No |  | FK → `ficha_tecnica.id_ficha` | Referencia a `ficha_tecnica`. |
| 3 | `id_usuario_responsable` | `integer` | No |  | FK → `usuario.id_usuario` | Usuario responsable del lote. |
| 4 | `fecha_produccion` | `date` | No | `CURRENT_DATE` |  | Día de producción. |
| 5 | `cantidad_producida` | `numeric(12,2)` | No |  |  | Unidades producidas (mayor que 0). |
| 6 | `estado` | `character varying(15)` | No | `'En proceso'::character varying` |  | En proceso, Terminado o Anulado. |
| 7 | `observaciones` | `character varying(255)` | Sí |  |  | Observaciones. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_lote_cant` | CHECK | `CHECK ((cantidad_producida > (0)::numeric))` |
| `ck_lote_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('En proceso'::character varying)::text, ('Terminado'::character varying)::text, ('Anulado'::character varying)::text])))` |
| `lote_produccion_pkey` | PRIMARY KEY | `PRIMARY KEY (id_lote)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_lote_ficha` | `id_ficha` | `ficha_tecnica.id_ficha` | CASCADE | RESTRICT |
| `fk_lote_usuario` | `id_usuario_responsable` | `usuario.id_usuario` | CASCADE | RESTRICT |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `idx_lote_estado` | `CREATE INDEX idx_lote_estado ON lote_produccion USING btree (estado)` |
| `idx_lote_fecha` | `CREATE INDEX idx_lote_fecha ON lote_produccion USING btree (fecha_produccion)` |
| `idx_lote_produccion_ficha` | `CREATE INDEX idx_lote_produccion_ficha ON lote_produccion USING btree (id_ficha)` |
| `lote_produccion_pkey` | `CREATE UNIQUE INDEX lote_produccion_pkey ON lote_produccion USING btree (id_lote)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `lote_produccion_insumo.id_lote` | `fk_loteinsumo_lote` | CASCADE |

#### Tabla `lote_produccion_insumo`

Insumos consumidos por un lote. Se guardan al crear el lote y se reemplazan al editarlo; hoy no descuentan el stock de los insumos.

Comentario en la base: _HU-077/078: insumos efectivamente descontados del inventario por lote producido_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_lote_insumo` | `integer` | No | `nextval('lote_produccion_insumo_id_lote_insumo_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_lote` | `integer` | No |  | FK → `lote_produccion.id_lote` | Referencia a `lote_produccion`. |
| 3 | `id_insumo` | `integer` | No |  | FK → `insumo.id_insumo` | Referencia a `insumo`. |
| 4 | `cantidad_consumida` | `numeric(12,2)` | No |  |  | Cantidad consumida (mayor que 0). La envía quien registra el lote. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_loteinsumo_cant` | CHECK | `CHECK ((cantidad_consumida > (0)::numeric))` |
| `lote_produccion_insumo_pkey` | PRIMARY KEY | `PRIMARY KEY (id_lote_insumo)` |
| `uq_loteinsumo_lote_insumo` | UNIQUE | `UNIQUE (id_lote, id_insumo)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_loteinsumo_insumo` | `id_insumo` | `insumo.id_insumo` | CASCADE | RESTRICT |
| `fk_loteinsumo_lote` | `id_lote` | `lote_produccion.id_lote` | CASCADE | CASCADE |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `lote_produccion_insumo_pkey` | `CREATE UNIQUE INDEX lote_produccion_insumo_pkey ON lote_produccion_insumo USING btree (id_lote_insumo)` |
| `uq_loteinsumo_lote_insumo` | `CREATE UNIQUE INDEX uq_loteinsumo_lote_insumo ON lote_produccion_insumo USING btree (id_lote, id_insumo)` |

### 5.5. Comercial y créditos

#### Tabla `pedido`

Pedido (HU-106 a HU-120). Un pedido Entregado es una venta (fusión de pedidos y ventas). No se elimina: se anula con motivo.

Comentario en la base: _HU-106 a HU-120: pedidos por cliente/sede, no se elimina, solo se anula (CA-111)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_pedido` | `integer` | No | `nextval('pedido_id_pedido_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_cliente` | `integer` | No |  | FK → `cliente.id_cliente` | Referencia a `cliente`. |
| 3 | `id_sede` | `integer` | No |  | FK → `sede.id_sede` | Sede que atiende el pedido. |
| 4 | `id_usuario` | `integer` | No |  | FK → `usuario.id_usuario` | Usuario que registró el pedido (personal o cliente de la app). |
| 5 | `fecha_pedido` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento en que se registró. |
| 6 | `fecha_entrega` | `date` | No |  |  | Día de entrega. |
| 7 | `valor_total` | `numeric(14,2)` | No | `0` |  | Suma de los subtotales del detalle. La calcula siempre el backend; el costo de envío está desactivado. |
| 8 | `estado` | `character varying(20)` | No | `'Pendiente'::character varying` |  | Pendiente, En proceso, Entregado o Anulado (transiciones en TRANSICIONES_PEDIDO de negocio.js). |
| 9 | `observaciones` | `character varying(255)` | Sí |  |  | Observaciones. |
| 10 | `motivo_anulacion` | `character varying(255)` | Sí |  |  | Motivo de la anulación (también queda en el historial). |
| 11 | `medio_pago` | `character varying(20)` | Sí |  |  | Efectivo, Tarjeta o Transferencia. Puede ser NULL en pedidos anteriores a la migración 002. |
| 12 | `comprobante_url` | `character varying(255)` | Sí |  |  | Comprobante de la transferencia del checkout del cliente. El pedido del personal no lo guarda. |
| 13 | `direccion_entrega` | `character varying(255)` | Sí |  |  | Dirección de entrega. |
| 14 | `municipio_entrega` | `character varying(60)` | Sí |  |  | Municipio de entrega (solo lo llena el checkout del cliente). |
| 15 | `barrio_entrega` | `character varying(80)` | Sí |  |  | Barrio de entrega (solo lo llena el checkout del cliente). |
| 16 | `complemento_entrega` | `character varying(120)` | Sí |  |  | Apartamento, torre u otro complemento (checkout del cliente). |
| 17 | `indicaciones_entrega` | `character varying(255)` | Sí |  |  | Indicaciones para la entrega (checkout del cliente). |
| 18 | `origen` | `character varying(10)` | No | `'personal'::character varying` |  | personal (lo registró el personal) o app (checkout del cliente). |
| 19 | `fecha_entregado` | `timestamp without time zone` | Sí |  |  | Momento de la entrega (igual a la fecha de su fila Entregado en el historial). |
| 20 | `fecha_anulacion` | `timestamp without time zone` | Sí |  |  | Momento de la anulación. |
| 21 | `stock_descontado` | `boolean` | No | `false` |  | TRUE mientras el pedido entregado tiene el stock descontado; al anularlo se repone y vuelve a FALSE. |
| 22 | `id_venta_origen` | `integer` | Sí |  | FK → `venta.id_venta` | Venta antigua de la que salió el pedido en la migración 002; NULL en los pedidos nuevos. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_pedido_estado` | CHECK | `CHECK (((estado)::text = ANY ((ARRAY['Pendiente'::character varying, 'En proceso'::character varying, 'Entregado'::character varying, 'Anulado'::character varying])::text[])))` |
| `ck_pedido_mediopago` | CHECK | `CHECK (((medio_pago IS NULL) OR ((medio_pago)::text = ANY ((ARRAY['Efectivo'::character varying, 'Tarjeta'::character varying, 'Transferencia'::character varying])::text[]))))` |
| `ck_pedido_origen` | CHECK | `CHECK (((origen)::text = ANY ((ARRAY['personal'::character varying, 'app'::character varying])::text[])))` |
| `ck_pedido_total` | CHECK | `CHECK ((valor_total >= (0)::numeric))` |
| `pedido_pkey` | PRIMARY KEY | `PRIMARY KEY (id_pedido)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_pedido_cliente` | `id_cliente` | `cliente.id_cliente` | CASCADE | RESTRICT |
| `fk_pedido_sede` | `id_sede` | `sede.id_sede` | CASCADE | RESTRICT |
| `fk_pedido_usuario` | `id_usuario` | `usuario.id_usuario` | CASCADE | RESTRICT |
| `fk_pedido_venta_origen` | `id_venta_origen` | `venta.id_venta` | NO ACTION | SET NULL |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `idx_pedido_cliente` | `CREATE INDEX idx_pedido_cliente ON pedido USING btree (id_cliente)` |
| `idx_pedido_estado` | `CREATE INDEX idx_pedido_estado ON pedido USING btree (estado)` |
| `idx_pedido_fecha` | `CREATE INDEX idx_pedido_fecha ON pedido USING btree (fecha_pedido)` |
| `idx_pedido_sede` | `CREATE INDEX idx_pedido_sede ON pedido USING btree (id_sede)` |
| `pedido_pkey` | `CREATE UNIQUE INDEX pedido_pkey ON pedido USING btree (id_pedido)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `abono.id_pedido` | `fk_abono_pedido` | CASCADE |
| `credito.id_pedido` | `fk_credito_pedido` | RESTRICT |
| `detalle_pedido.id_pedido` | `fk_detpedido_pedido` | CASCADE |
| `notificacion.id_pedido` | `fk_notificacion_pedido` | SET NULL |
| `pedido_estado_historial.id_pedido` | `pedido_estado_historial_id_pedido_fkey` | NO ACTION |
| `venta.id_pedido` | `fk_venta_pedido` | SET NULL |

#### Tabla `detalle_pedido`

Productos de cada pedido, sin repetir producto (HU-112 a HU-116).

Comentario en la base: _HU-112 a HU-116: productos, cantidades y subtotales de cada pedido_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_detalle_pedido` | `integer` | No | `nextval('detalle_pedido_id_detalle_pedido_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_pedido` | `integer` | No |  | FK → `pedido.id_pedido` | Referencia a `pedido`. |
| 3 | `id_producto` | `integer` | No |  | FK → `producto.id_producto` | Referencia a `producto`. |
| 4 | `cantidad` | `numeric(12,2)` | No |  |  | Unidades pedidas (entero mayor o igual a 1). |
| 5 | `precio_unitario` | `numeric(12,2)` | No |  |  | Precio de venta del producto al momento de pedir (lo toma el backend). |
| 6 | `subtotal` | `numeric(14,2)` | No |  |  | cantidad por precio_unitario (lo calcula el backend). |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_detpedido_cant` | CHECK | `CHECK ((cantidad >= (1)::numeric))` |
| `ck_detpedido_precio` | CHECK | `CHECK ((precio_unitario >= (0)::numeric))` |
| `ck_detpedido_subtotal` | CHECK | `CHECK ((subtotal >= (0)::numeric))` |
| `detalle_pedido_pkey` | PRIMARY KEY | `PRIMARY KEY (id_detalle_pedido)` |
| `uq_detpedido_pedido_producto` | UNIQUE | `UNIQUE (id_pedido, id_producto)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_detpedido_pedido` | `id_pedido` | `pedido.id_pedido` | CASCADE | CASCADE |
| `fk_detpedido_producto` | `id_producto` | `producto.id_producto` | CASCADE | RESTRICT |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `detalle_pedido_pkey` | `CREATE UNIQUE INDEX detalle_pedido_pkey ON detalle_pedido USING btree (id_detalle_pedido)` |
| `idx_detalle_pedido_pedido` | `CREATE INDEX idx_detalle_pedido_pedido ON detalle_pedido USING btree (id_pedido)` |
| `idx_detpedido_producto` | `CREATE INDEX idx_detpedido_producto ON detalle_pedido USING btree (id_producto)` |
| `uq_detpedido_pedido_producto` | `CREATE UNIQUE INDEX uq_detpedido_pedido_producto ON detalle_pedido USING btree (id_pedido, id_producto)` |

#### Tabla `pedido_estado_historial`

Historial de estados del pedido (migración 010; HU-109, CA-111-002). Una fila al crear el pedido y otra en cada cambio de estado, en la misma transacción.

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_historial` | `integer` | No | `nextval('pedido_estado_historial_id_historial_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_pedido` | `integer` | No |  | FK → `pedido.id_pedido` | Referencia a `pedido`. |
| 3 | `estado_anterior` | `character varying(20)` | Sí |  |  | Estado antes del cambio; NULL en la fila de creación. |
| 4 | `estado_nuevo` | `character varying(20)` | No |  |  | Estado después del cambio. |
| 5 | `id_usuario` | `integer` | Sí |  | FK → `usuario.id_usuario` | Usuario que hizo el cambio. |
| 6 | `motivo` | `character varying(255)` | Sí |  |  | Motivo; solo se guarda en las anulaciones. |
| 7 | `fecha_cambio` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento del cambio. |
| 8 | `reconstruido` | `boolean` | No | `false` |  | TRUE en las filas que la migración 010 reconstruyó para los pedidos anteriores (solo con fechas conocidas). |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_historial_estado_anterior` | CHECK | `CHECK (((estado_anterior IS NULL) OR ((estado_anterior)::text = ANY ((ARRAY['Pendiente'::character varying, 'En proceso'::character varying, 'Entregado'::character varying, 'Anulado'::character varying])::text[]))))` |
| `ck_historial_estado_nuevo` | CHECK | `CHECK (((estado_nuevo)::text = ANY ((ARRAY['Pendiente'::character varying, 'En proceso'::character varying, 'Entregado'::character varying, 'Anulado'::character varying])::text[])))` |
| `pedido_estado_historial_pkey` | PRIMARY KEY | `PRIMARY KEY (id_historial)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `pedido_estado_historial_id_pedido_fkey` | `id_pedido` | `pedido.id_pedido` | NO ACTION | NO ACTION |
| `pedido_estado_historial_id_usuario_fkey` | `id_usuario` | `usuario.id_usuario` | NO ACTION | NO ACTION |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `ix_historial_pedido_fecha` | `CREATE INDEX ix_historial_pedido_fecha ON pedido_estado_historial USING btree (id_pedido, fecha_cambio)` |
| `pedido_estado_historial_pkey` | `CREATE UNIQUE INDEX pedido_estado_historial_pkey ON pedido_estado_historial USING btree (id_historial)` |

#### Tabla `credito`

Cuenta por cobrar de un pedido, una por pedido. Se crea con el primer abono: un pedido sin abonos no tiene crédito.

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_credito` | `integer` | No | `nextval('credito_id_credito_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_pedido` | `integer` | No |  | FK → `pedido.id_pedido`<br>UQ | Pedido del crédito (único). |
| 3 | `id_cliente` | `integer` | No |  | FK → `cliente.id_cliente` | Cliente del pedido. |
| 4 | `valor_total` | `numeric(14,2)` | No |  |  | Total del pedido; se actualiza si el pedido cambia. |
| 5 | `valor_abonado` | `numeric(14,2)` | No | `0` |  | Suma de los abonos aprobados. |
| 6 | `saldo_pendiente` | `numeric(14,2)` | No |  |  | valor_total menos valor_abonado. |
| 7 | `estado` | `character varying(10)` | No | `'Activo'::character varying` |  | Activo (con saldo), Pagado (saldo 0) o Anulado (el pedido se anuló). De aquí sale la insignia Pagado / Con saldo del pedido. |
| 8 | `fecha_creacion` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento del primer abono (misma transacción). |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_credito_estado` | CHECK | `CHECK (((estado)::text = ANY ((ARRAY['Activo'::character varying, 'Pagado'::character varying, 'Anulado'::character varying])::text[])))` |
| `ck_credito_valores` | CHECK | `CHECK (((valor_total > (0)::numeric) AND (valor_abonado >= (0)::numeric) AND (saldo_pendiente >= (0)::numeric)))` |
| `credito_pkey` | PRIMARY KEY | `PRIMARY KEY (id_credito)` |
| `uq_credito_pedido` | UNIQUE | `UNIQUE (id_pedido)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_credito_cliente` | `id_cliente` | `cliente.id_cliente` | NO ACTION | RESTRICT |
| `fk_credito_pedido` | `id_pedido` | `pedido.id_pedido` | NO ACTION | RESTRICT |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `credito_pkey` | `CREATE UNIQUE INDEX credito_pkey ON credito USING btree (id_credito)` |
| `idx_credito_cliente` | `CREATE INDEX idx_credito_cliente ON credito USING btree (id_cliente)` |
| `uq_credito_pedido` | `CREATE UNIQUE INDEX uq_credito_pedido ON credito USING btree (id_pedido)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `abono.id_credito` | `fk_abono_credito` | RESTRICT |

#### Tabla `abono`

Pago sobre el crédito de un pedido (HU-117, HU-167, HU-171). El del personal queda Aprobado; el del cliente queda En revisión hasta que el personal lo aprueba o lo rechaza.

Comentario en la base: _HU-117 y Acta (Subproceso de Abonos): pago parcial sobre UN pedido O UNA venta (nunca ambos ni ninguno)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_abono` | `integer` | No | `nextval('abono_id_abono_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_cliente` | `integer` | No |  | FK → `cliente.id_cliente` | Cliente que paga (el del pedido). |
| 3 | `id_pedido` | `integer` | Sí |  | FK → `pedido.id_pedido` | Pedido al que se abona. Obligatorio si no hay id_venta (ck_abono_referencia). |
| 4 | `id_venta` | `integer` | Sí |  | FK → `venta.id_venta` | Venta antigua a la que se abonó (datos anteriores a la fusión). El backend actual no la llena. |
| 5 | `fecha_abono` | `date` | No | `CURRENT_DATE` |  | Día del pago. El personal puede elegirla: no futura, no anterior al pedido y no de hace más de 7 días (ABONO_DIAS_ATRAS_MAX); sin fecha, hoy. |
| 6 | `valor_abonado` | `numeric(12,2)` | No |  |  | Valor de este abono (mayor que 0). |
| 7 | `saldo_pendiente` | `numeric(12,2)` | No |  |  | Saldo del crédito después de este abono. |
| 8 | `medio_pago` | `character varying(20)` | No |  |  | Efectivo, Tarjeta o Transferencia. El CHECK también acepta Credito (valor antiguo) que el backend ya no usa. |
| 9 | `comprobante_url` | `character varying(255)` | Sí |  |  | Comprobante subido (/api/v1/comprobantes/<archivo>: JPG, PNG o PDF de máximo 5 MB). Obligatorio con Transferencia (lo exige el backend). |
| 10 | `estado` | `character varying(15)` | No | `'En revisión'::character varying` |  | En revisión, Aprobado, Rechazado o Anulado. Solo los aprobados cuentan en el crédito. |
| 11 | `id_credito` | `integer` | Sí |  | FK → `credito.id_credito` | Crédito del pedido. NULL solo en abonos anteriores a la migración 004. |
| 12 | `fecha_registro` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento en que se guardó. |
| 13 | `id_usuario_registra` | `integer` | Sí |  | FK → `usuario.id_usuario` | Usuario que lo registró (personal o cliente). |
| 14 | `id_usuario_revisa` | `integer` | Sí |  | FK → `usuario.id_usuario` | Usuario que lo aprobó, rechazó o anuló. En los abonos del personal es el mismo que lo registró. |
| 15 | `fecha_revision` | `timestamp without time zone` | Sí |  |  | Momento de la aprobación, el rechazo o la anulación. |
| 16 | `motivo_rechazo` | `character varying(255)` | Sí |  |  | Motivo del rechazo (también cuando se anula el pedido con abonos en revisión). |
| 17 | `motivo_anulacion` | `character varying(255)` | Sí |  |  | Motivo de la anulación del abono. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_abono_estado` | CHECK | `CHECK (((estado)::text = ANY ((ARRAY['En revisión'::character varying, 'Aprobado'::character varying, 'Rechazado'::character varying, 'Anulado'::character varying])::text[])))` |
| `ck_abono_mediopago` | CHECK | `CHECK (((medio_pago)::text = ANY (ARRAY[('Efectivo'::character varying)::text, ('Transferencia'::character varying)::text, ('Credito'::character varying)::text, ('Tarjeta'::character varying)::text])))` |
| `ck_abono_referencia` | CHECK | `CHECK (((id_pedido IS NOT NULL) OR (id_venta IS NOT NULL)))` |
| `ck_abono_saldo` | CHECK | `CHECK ((saldo_pendiente >= (0)::numeric))` |
| `ck_abono_valor` | CHECK | `CHECK ((valor_abonado > (0)::numeric))` |
| `abono_pkey` | PRIMARY KEY | `PRIMARY KEY (id_abono)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_abono_cliente` | `id_cliente` | `cliente.id_cliente` | CASCADE | RESTRICT |
| `fk_abono_credito` | `id_credito` | `credito.id_credito` | NO ACTION | RESTRICT |
| `fk_abono_pedido` | `id_pedido` | `pedido.id_pedido` | CASCADE | CASCADE |
| `fk_abono_usuario_registra` | `id_usuario_registra` | `usuario.id_usuario` | NO ACTION | SET NULL |
| `fk_abono_usuario_revisa` | `id_usuario_revisa` | `usuario.id_usuario` | NO ACTION | SET NULL |
| `fk_abono_venta` | `id_venta` | `venta.id_venta` | CASCADE | CASCADE |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `abono_pkey` | `CREATE UNIQUE INDEX abono_pkey ON abono USING btree (id_abono)` |
| `idx_abono_credito` | `CREATE INDEX idx_abono_credito ON abono USING btree (id_credito)` |
| `idx_abono_estado` | `CREATE INDEX idx_abono_estado ON abono USING btree (estado)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `notificacion.id_abono` | `fk_notificacion_abono` | SET NULL |

#### Tabla `notificacion`

Avisos para el cliente de la app (HU-168, HU-169). Solo se crean si el cliente del pedido tiene cuenta de usuario.

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_notificacion` | `integer` | No | `nextval('notificacion_id_notificacion_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_usuario` | `integer` | No |  | FK → `usuario.id_usuario` | Destinatario. |
| 3 | `id_pedido` | `integer` | Sí |  | FK → `pedido.id_pedido` | Pedido del aviso. |
| 4 | `id_abono` | `integer` | Sí |  | FK → `abono.id_abono` | Abono del aviso. |
| 5 | `tipo` | `character varying(30)` | No |  |  | pedido_creado, pedido_estado, abono_aprobado o abono_rechazado. |
| 6 | `titulo` | `character varying(120)` | No |  |  | Título. |
| 7 | `mensaje` | `character varying(500)` | No |  |  | Mensaje. |
| 8 | `leida` | `boolean` | No | `false` |  | Si el cliente ya la leyó. |
| 9 | `fecha_creacion` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento en que se creó. |
| 10 | `fecha_lectura` | `timestamp without time zone` | Sí |  |  | Momento en que se leyó. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_notificacion_tipo` | CHECK | `CHECK (((tipo)::text = ANY ((ARRAY['pedido_creado'::character varying, 'pedido_estado'::character varying, 'abono_aprobado'::character varying, 'abono_rechazado'::character varying])::text[])))` |
| `notificacion_pkey` | PRIMARY KEY | `PRIMARY KEY (id_notificacion)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_notificacion_abono` | `id_abono` | `abono.id_abono` | NO ACTION | SET NULL |
| `fk_notificacion_pedido` | `id_pedido` | `pedido.id_pedido` | NO ACTION | SET NULL |
| `fk_notificacion_usuario` | `id_usuario` | `usuario.id_usuario` | NO ACTION | CASCADE |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `idx_notificacion_usuario` | `CREATE INDEX idx_notificacion_usuario ON notificacion USING btree (id_usuario, leida, fecha_creacion DESC)` |
| `notificacion_pkey` | `CREATE UNIQUE INDEX notificacion_pkey ON notificacion USING btree (id_notificacion)` |

#### Tabla `venta`

Ventas antiguas (histórica). Tras la fusión, una venta es un pedido Entregado; el backend ya no crea ventas (solo seed.js, que no se ejecuta).

Comentario en la base: _HU-121 a HU-132: registrada directamente o asociada a un pedido previo (Acta - Subproceso de ventas)_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_venta` | `integer` | No | `nextval('venta_id_venta_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_sede` | `integer` | No |  | FK → `sede.id_sede` | Referencia a `sede`. |
| 3 | `id_cliente` | `integer` | No |  | FK → `cliente.id_cliente` | Referencia a `cliente`. |
| 4 | `id_usuario` | `integer` | No |  | FK → `usuario.id_usuario` | Usuario que registró la venta. |
| 5 | `id_pedido` | `integer` | Sí |  | FK → `pedido.id_pedido` | Pedido al que estaba ligada la venta. |
| 6 | `fecha_venta` | `timestamp without time zone` | No | `CURRENT_TIMESTAMP` |  | Momento de la venta. |
| 7 | `valor_total` | `numeric(14,2)` | No | `0` |  | Total de la venta. |
| 8 | `medio_pago` | `character varying(20)` | No |  |  | Efectivo, Transferencia, Credito o Tarjeta. |
| 9 | `comprobante_url` | `character varying(255)` | Sí |  |  | Comprobante (opcional). |
| 10 | `estado` | `character varying(15)` | No | `'Pendiente'::character varying` |  | Pendiente, Pagada o Anulada. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_venta_estado` | CHECK | `CHECK (((estado)::text = ANY (ARRAY[('Pendiente'::character varying)::text, ('Pagada'::character varying)::text, ('Anulada'::character varying)::text])))` |
| `ck_venta_mediopago` | CHECK | `CHECK (((medio_pago)::text = ANY (ARRAY[('Efectivo'::character varying)::text, ('Transferencia'::character varying)::text, ('Credito'::character varying)::text, ('Tarjeta'::character varying)::text])))` |
| `ck_venta_total` | CHECK | `CHECK ((valor_total >= (0)::numeric))` |
| `venta_pkey` | PRIMARY KEY | `PRIMARY KEY (id_venta)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_venta_cliente` | `id_cliente` | `cliente.id_cliente` | CASCADE | RESTRICT |
| `fk_venta_pedido` | `id_pedido` | `pedido.id_pedido` | CASCADE | SET NULL |
| `fk_venta_sede` | `id_sede` | `sede.id_sede` | CASCADE | RESTRICT |
| `fk_venta_usuario` | `id_usuario` | `usuario.id_usuario` | CASCADE | RESTRICT |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `idx_venta_cliente` | `CREATE INDEX idx_venta_cliente ON venta USING btree (id_cliente)` |
| `idx_venta_estado` | `CREATE INDEX idx_venta_estado ON venta USING btree (estado)` |
| `idx_venta_fecha` | `CREATE INDEX idx_venta_fecha ON venta USING btree (fecha_venta)` |
| `idx_venta_pedido` | `CREATE INDEX idx_venta_pedido ON venta USING btree (id_pedido)` |
| `idx_venta_sede` | `CREATE INDEX idx_venta_sede ON venta USING btree (id_sede)` |
| `venta_pkey` | `CREATE UNIQUE INDEX venta_pkey ON venta USING btree (id_venta)` |

La referencian:

| Tabla y columna | Llave foránea | ON DELETE |
| :--- | :--- | :--- |
| `abono.id_venta` | `fk_abono_venta` | CASCADE |
| `detalle_venta.id_venta` | `fk_detventa_venta` | CASCADE |
| `pedido.id_venta_origen` | `fk_pedido_venta_origen` | SET NULL |

#### Tabla `detalle_venta`

Productos de las ventas antiguas (histórica).

Comentario en la base: _HU-126/127: productos vendidos, cantidades y subtotales de cada venta_

| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |
| ---: | :--- | :--- | :---: | :--- | :--- | :--- |
| 1 | `id_detalle_venta` | `integer` | No | `nextval('detalle_venta_id_detalle_venta_seq'::regclass)` | PK | Identificador (llave primaria). |
| 2 | `id_venta` | `integer` | No |  | FK → `venta.id_venta` | Referencia a `venta`. |
| 3 | `id_producto` | `integer` | No |  | FK → `producto.id_producto` | Referencia a `producto`. |
| 4 | `cantidad` | `numeric(12,2)` | No |  |  | Unidades vendidas. |
| 5 | `precio_unitario` | `numeric(12,2)` | No |  |  | Precio por unidad. |
| 6 | `subtotal` | `numeric(14,2)` | No |  |  | cantidad por precio_unitario. |

Restricciones:

| Nombre | Tipo | Definición |
| :--- | :--- | :--- |
| `ck_detventa_cant` | CHECK | `CHECK ((cantidad >= (1)::numeric))` |
| `ck_detventa_precio` | CHECK | `CHECK ((precio_unitario >= (0)::numeric))` |
| `ck_detventa_subtotal` | CHECK | `CHECK ((subtotal >= (0)::numeric))` |
| `detalle_venta_pkey` | PRIMARY KEY | `PRIMARY KEY (id_detalle_venta)` |
| `uq_detventa_venta_producto` | UNIQUE | `UNIQUE (id_venta, id_producto)` |

Llaves foráneas:

| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `fk_detventa_producto` | `id_producto` | `producto.id_producto` | CASCADE | RESTRICT |
| `fk_detventa_venta` | `id_venta` | `venta.id_venta` | CASCADE | CASCADE |

Índices:

| Nombre | Definición |
| :--- | :--- |
| `detalle_venta_pkey` | `CREATE UNIQUE INDEX detalle_venta_pkey ON detalle_venta USING btree (id_detalle_venta)` |
| `idx_detalle_venta_venta` | `CREATE INDEX idx_detalle_venta_venta ON detalle_venta USING btree (id_venta)` |
| `idx_detventa_producto` | `CREATE INDEX idx_detventa_producto ON detalle_venta USING btree (id_producto)` |
| `uq_detventa_venta_producto` | `CREATE UNIQUE INDEX uq_detventa_venta_producto ON detalle_venta USING btree (id_venta, id_producto)` |

<!-- FIN GENERADO -->

## 6. Glosario

| Término | Significado |
| :--- | :--- |
| Pedido | Solicitud de productos de un cliente. Entregado, es una venta. |
| Venta | Pedido Entregado. La tabla `venta` es histórica. |
| Crédito | Cuenta por cobrar de un pedido; nace con el primer abono. |
| Abono | Pago sobre el crédito de un pedido. |
| Ficha técnica | Receta de un producto: insumos, cantidades, rendimiento e instrucciones. |
| Lote de producción | Producción de una receta en una fecha, con los insumos que consumió. |
| Insumo | Materia prima o empaque. |
| Personal | Usuarios con rol Administrador, Secretaria o Vendedor. |
