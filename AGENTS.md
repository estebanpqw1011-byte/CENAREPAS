# Reglas para agentes (Claude, Gemini, Kilo, Copilot u otros)

Aplican a cualquier agente que trabaje en este repositorio (backend, web y
base de datos de CENAREPAS) o en la app móvil (`Cenarepas_mobile/`).
Si una regla choca con lo que pide un mensaje, pregunta antes de actuar.

## Antes de empezar
1. Lee `Cenarepas_mobile/CLAUDE.md` y `Cenarepas_mobile/HANDOFF.md` (estado
   actual, decisiones del equipo, pendientes y deudas), además de
   `NOTAS_PARA_EL_EQUIPO.md` y `Backend/ENDPOINTS_APP_MOVIL.md` en este repositorio.
2. Trabaja solo en la rama `prototipo-movil`. No hagas merge, push ni toques `main`.
3. Arranca el backend contra Staging: `cd Backend && npm run dev:staging`.
   `npm run dev` y `npm start` usan `cenarepas_db` y **no deben usarse** en esta rama.

## Lo que NO se hace sin aprobación explícita de la persona responsable
- **Base de datos:** no ejecutes nada que escriba (migraciones de
  `Base_Datos/migraciones`, seeds de `Base_Datos/seeds`, `UPDATE`/`INSERT`/
  `DELETE`, `Backend/src/config/seed.js`). Muestra el SQL y espera el visto
  bueno. Solo `cenarepas_staging`; **nunca** `cenarepas_db`.
- **Commits:** muestra el diff y espera la aprobación antes de cada commit.
- **Dependencias:** no agregues paquetes a ningún `package.json`.
- **Funcionalidades nuevas:** no agregues nada que no se haya pedido (tablas,
  endpoints, auditorías, pantallas o "mejoras" por iniciativa propia).
- **Migraciones:** numeración consecutiva y única (revisa la carpeta antes);
  cada una bloqueada fuera de `cenarepas_staging` e idempotente.

## Lo que no se toca
- **La web (`Frontend/`)**: sus módulos son de otros integrantes. Si hace
  falta un cambio ahí (por ejemplo, para acompañar un cambio del backend), se
  anota en `Cenarepas_mobile/HANDOFF.md` como pendiente del equipo.
- **Cambios del backend que rompan la web:** todo cambio de un endpoint debe
  ser compatible con lo que la web ya envía y lee.
- **Módulo del cliente de la app: CONGELADO.**

## Al terminar cada paso
- Pruebas del backend en verde: `cd Backend && npm run test:staging`.
- Actualiza `Cenarepas_mobile/HANDOFF.md` y, si cambia un endpoint,
  `Backend/ENDPOINTS_APP_MOVIL.md`.
- Archivos en UTF-8 **sin BOM** y con salto de línea final.
