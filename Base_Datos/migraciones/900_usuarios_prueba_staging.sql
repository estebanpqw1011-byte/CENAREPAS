-- 900 · Usuarios de prueba SOLO para staging (uno por rol del personal).
-- Contraseña de los cuatro: Staging123*  (hash bcrypt, costo 10).
-- Los clientes de prueba se crean con el registro público durante la verificación.
-- No modifica los usuarios existentes del equipo.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

INSERT INTO usuario (nombre, correo, contrasena_hash, id_rol, estado)
SELECT v.nombre, v.correo, v.hash, r.id_rol, 'Activo'
FROM (VALUES
  ('Admin Staging',        'admin@staging.test',        'Administrador', '$2b$10$j7hxi5D/lT/X.O1FnF5N/OfkW3ziljU7AQYlFbvLCUcAYHX/AcRqO'),
  ('Secretaria Staging',   'secretaria@staging.test',   'Secretaria',    '$2b$10$N0qLi5Jr7n2makgXebc3/uZfCLlCvxXLzN2hPA6Up41DqNaIIyNcq'),
  ('Vendedor Staging',     'vendedor@staging.test',     'Vendedor',      '$2b$10$J5jgQZZyL944P2iFVd9Ud.sFvF7dOR6O8BL1RQl98OQ8KitDeB3ke'),
  ('Domiciliario Staging', 'domiciliario@staging.test', 'Domiciliario',  '$2b$10$mEc80CM9pWJ6nYie./cGaeJNlJ7VB8gHz7y1hYFpjK2j4uD/MlDNW')
) AS v(nombre, correo, rol, hash)
JOIN rol r ON r.nombre = v.rol
ON CONFLICT (correo) DO NOTHING;

COMMIT;
