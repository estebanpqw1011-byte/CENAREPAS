# Notas para el equipo: hallazgos que afectan la base real

Encontradas durante la conexión de la app móvil (rama `prototipo-movil`). **Ninguna se corrigió en
`cenarepas_db`**: todos los cambios se aplicaron solo en la copia `cenarepas_staging`. Cada punto
necesita una decisión del equipo.

## 1. No hay ningún Administrador activo

- `admin@sistema.com` tiene rol **Secretaria** y estado **Inactivo**. Ningún usuario de la base tiene
  rol Administrador.
- Antes esto no se notaba porque el backend dejaba pasar como Administrador a cualquiera sin token y
  aceptaba contraseñas demo. Con la seguridad nueva nadie puede administrar usuarios ni roles.
- **Acción sugerida:** decidir quién es el administrador y corregirlo en la base real, por ejemplo
  `UPDATE usuario SET id_rol = 1, estado = 'Activo' WHERE correo = '<correo>'`.
- En Staging se crearon usuarios de prueba propios (`*@staging.test`) y no se tocó `admin@sistema.com`.

## 2. La base real no coincide con `CenArepa.sql`

- La base tiene restricciones `ck_*` que el script no incluye:
  - `ck_pedido_estado`, que admitía "En preparacion" y "Listo para entregar".
  - `ck_abono_estado`, que solo admitía Registrado y Anulado.
  - `ck_venta_mediopago`, que admite "Credito".
  - Otras de estado, stock y valores.
- También tiene índices (`idx_pedido_estado`, `idx_cliente_nombre`, …) y estados con mayúscula
  (`'Activo'`), mientras el script usa `DEFAULT 'activo'`.
- **Acción sugerida:** usar `Base_Datos/CenArepa_v2.sql` para actualizar la documentación.
  - Es el DDL real de `cenarepas_staging` después de las migraciones 001 a 006 de `Base_Datos/migraciones/`.
  - `CenArepa.sql` se dejó sin cambios.

## 3. Usuario de prueba suelto en la base real

- `test_curl_123@example.com` existe con rol Secretaria y estado **Activo**. Parece una prueba manual
  con `curl` que quedó en la base y hoy tiene acceso real al sistema.
- **Acción sugerida:** inactivarlo en la base real. No se modificó en ninguna base.

## 4. `seed.js` no debe ejecutarse sobre bases con datos

`Backend/src/config/seed.js`:
- **reescribe las contraseñas** de los usuarios iniciales (`ON CONFLICT (correo) DO UPDATE SET contrasena_hash = …`)
  y los reactiva;
- **inserta pedidos, ventas y abonos cada vez** que corre, sin control de duplicados;
- usa los estados viejos ("En preparacion", ventas "Pagada" o "Pendiente", abonos "Registrado"),
  que con las migraciones nuevas violan los CHECK.

**Acción sugerida:** usarlo solo en bases vacías de desarrollo y actualizarlo a los estados nuevos
antes de volver a usarlo.

## 5. "Credito" como medio de pago

- `ck_venta_mediopago` y `ck_abono_mediopago` admiten `'Credito'`. Con el modelo nuevo, un pago a
  crédito **no es un medio de pago**: se maneja con la tabla `credito` y sus abonos.
- Las migraciones convierten los medios de pago a Efectivo, Tarjeta o Transferencia. Si aparece
  `'Credito'`, la migración **se detiene y se revierte a propósito**, para decidir cada caso. Hoy no
  existe ningún registro con ese valor.
- **Acción sugerida:** no volver a usar `'Credito'` en ventas ni abonos, y quitarlo de esos CHECK
  cuando se migre la base real.

## 6. Otros puntos para revisar

- Los pedidos entregados antes de esta versión quedaron con `stock_descontado = false`, porque el
  sistema nunca descontó stock. Si se anulan, no reponen inventario. Desde ahora, entregar descuenta
  y anular un pedido entregado repone.
- La venta Pendiente #6 (pedido 8, $210.000 con abono de $105.000) quedó como pedido Entregado con un
  crédito de **$105.000 de saldo**.
- `JWT_SECRET` tiene un valor por defecto escrito en `config/env.js`. En un despliegue real debe
  venir solo del `.env` y ser distinto por ambiente.
- Los comprobantes de pago se guardan en `Backend/comprobantes/` (ignorada por git) y solo se
  descargan con sesión. En producción conviene un almacenamiento con respaldo.
- Para aplicar las migraciones a la base real: sacar respaldo, quitar la guarda
  `current_database() <> 'cenarepas_staging'` y correr 001 → 006 **en orden** (el 900 es solo para Staging).
