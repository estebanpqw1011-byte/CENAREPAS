-- 001 · Seguridad: limpieza de roles y permisos de abonos
-- Aplica SOLO en cenarepas_staging. No borra datos con historial.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

-- 1. Roles basura: se eliminan solo si no tienen usuarios asignados.
--    (rol_permiso se borra en cascada; ninguno de los dos tiene permisos.)
DELETE FROM rol r
WHERE r.nombre IN ('sjdsjm', 'fjosfnsdzx')
  AND NOT EXISTS (SELECT 1 FROM usuario u WHERE u.id_rol = r.id_rol);

-- 2. Permisos de abonos para Secretaria (todas las acciones)
--    y Vendedor (ver, crear, anular y cambiar_estado = aprobar/rechazar).
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM rol r
JOIN permiso p ON p.modulo = 'abonos'
WHERE (r.nombre = 'Secretaria')
   OR (r.nombre = 'Vendedor' AND p.accion IN ('ver', 'crear', 'anular', 'cambiar_estado'))
ON CONFLICT DO NOTHING;

COMMIT;
