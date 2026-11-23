-- Datos de prueba de Staging: asigna las 3 fichas técnicas existentes a su
-- producto, por nombre, para poder ver la ficha en el detalle del producto.
-- NO es una migración: no cambia la estructura ni permisos.
--   - Solo corre en cenarepas_staging.
--   - Idempotente: una segunda corrida no cambia nada.
--   - No pisa una ficha ya asignada a otro producto ni otra ficha ya asignada
--     al producto: en ese caso se detiene sin cambiar nada.
-- Ejecutar: psql -d cenarepas_staging -v ON_ERROR_STOP=1 -f Base_Datos/seeds/staging_fichas_productos.sql
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Datos de prueba bloqueados: solo se aplican en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

-- Pares por nombre exacto (ficha -> producto).
CREATE TEMP TABLE pares (ficha TEXT, producto TEXT) ON COMMIT DROP;
INSERT INTO pares VALUES
  ('Ficha: Arepa Rellena de Pollo y Queso', 'Arepa Rellena de Pollo y Queso'),
  ('Ficha: Arepa de Chócolo con Quesillo', 'Arepa de Chócolo con Quesillo'),
  ('Ficha: Arepa con Queso Doble Crema', 'Arepa de Queso Doble Crema x5');

DO $$
DECLARE
  problemas TEXT;
  asignados INT;
BEGIN
  -- Cada nombre debe existir exactamente una vez.
  SELECT string_agg(detalle, '; ') INTO problemas FROM (
    SELECT 'ficha "' || pa.ficha || '": ' || count(f.id_ficha) || ' coincidencias' AS detalle
    FROM pares pa LEFT JOIN ficha_tecnica f ON f.nombre = pa.ficha
    GROUP BY pa.ficha HAVING count(f.id_ficha) <> 1
    UNION ALL
    SELECT 'producto "' || pa.producto || '": ' || count(p.id_producto) || ' coincidencias'
    FROM pares pa LEFT JOIN producto p ON p.nombre = pa.producto
    GROUP BY pa.producto HAVING count(p.id_producto) <> 1
  ) x;
  IF problemas IS NOT NULL THEN
    RAISE EXCEPTION 'No se asignó nada: %', problemas;
  END IF;

  -- No pisar asignaciones distintas ya existentes.
  SELECT string_agg('"' || p.nombre || '" ya tiene la ficha ' || p.id_ficha, '; ') INTO problemas
  FROM pares pa
  JOIN producto p ON p.nombre = pa.producto
  JOIN ficha_tecnica f ON f.nombre = pa.ficha
  WHERE p.id_ficha IS NOT NULL AND p.id_ficha <> f.id_ficha;
  IF problemas IS NOT NULL THEN
    RAISE EXCEPTION 'No se asignó nada: %', problemas;
  END IF;

  -- Solo productos sin ficha: nunca pisa una asignación existente.
  UPDATE producto p
  SET id_ficha = f.id_ficha
  FROM pares pa
  JOIN ficha_tecnica f ON f.nombre = pa.ficha
  WHERE p.nombre = pa.producto AND p.id_ficha IS NULL;
  GET DIAGNOSTICS asignados = ROW_COUNT;
  RAISE NOTICE 'Productos con ficha asignada en esta corrida: %', asignados;
END $$;

-- Resultado: los 3 pares deben quedar asignados.
SELECT p.id_producto, p.nombre AS producto, f.id_ficha, f.nombre AS ficha
FROM pares pa
JOIN producto p ON p.nombre = pa.producto
LEFT JOIN ficha_tecnica f ON f.id_ficha = p.id_ficha
ORDER BY p.id_producto;

COMMIT;
