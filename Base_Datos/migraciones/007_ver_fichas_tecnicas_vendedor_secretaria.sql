-- 007 · Permiso fichas-tecnicas:ver para el Vendedor y la Secretaria
-- (decisión del equipo, 2026-09-27): el detalle del producto en la app
-- muestra la ficha técnica completa (HU-091). Solo "ver": no da crear,
-- editar ni cambiar estado.
-- Solo datos (rol_permiso); idempotente. Aplica SOLO en cenarepas_staging.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM rol r
JOIN permiso p ON p.modulo = 'fichas-tecnicas' AND p.accion = 'ver'
WHERE r.nombre IN ('Vendedor', 'Secretaria')
  AND NOT EXISTS (
    SELECT 1 FROM rol_permiso rp WHERE rp.id_rol = r.id_rol AND rp.id_permiso = p.id_permiso
  );

-- Los dos roles deben quedar con "ver" y con ninguna otra acción de fichas.
DO $$
DECLARE
  faltan TEXT;
  de_mas TEXT;
BEGIN
  SELECT string_agg(esperado.rol, ', ') INTO faltan
  FROM unnest(ARRAY['Vendedor', 'Secretaria']) AS esperado(rol)
  WHERE NOT EXISTS (
    SELECT 1 FROM rol_permiso rp
    JOIN rol r ON r.id_rol = rp.id_rol
    JOIN permiso p ON p.id_permiso = rp.id_permiso
    WHERE r.nombre = esperado.rol AND p.modulo = 'fichas-tecnicas' AND p.accion = 'ver'
  );
  IF faltan IS NOT NULL THEN
    RAISE EXCEPTION 'No se pudo asignar fichas-tecnicas:ver a: % (¿existen el rol y el permiso?)', faltan;
  END IF;

  SELECT string_agg(r.nombre || ':' || p.accion, ', ') INTO de_mas
  FROM rol_permiso rp
  JOIN rol r ON r.id_rol = rp.id_rol
  JOIN permiso p ON p.id_permiso = rp.id_permiso
  WHERE r.nombre IN ('Vendedor', 'Secretaria') AND p.modulo = 'fichas-tecnicas' AND p.accion <> 'ver';
  IF de_mas IS NOT NULL THEN
    RAISE EXCEPTION 'Estos roles tienen acciones de fichas distintas de ver: %', de_mas;
  END IF;
END $$;

COMMIT;
