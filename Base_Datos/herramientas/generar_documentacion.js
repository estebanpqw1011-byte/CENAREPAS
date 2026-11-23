/**
 * CENAREPAS - Genera las partes técnicas de la documentación de la base
 * a partir del esquema real (pg_catalog), no redactadas a mano:
 *
 *   Base_Datos/diccionario_datos.md: resumen, llaves foráneas por acción al
 *     borrar y, por tabla, columnas (tipo, nulos, valor por defecto),
 *     restricciones, llaves foráneas (ON UPDATE / ON DELETE), índices y
 *     tablas que la referencian.
 *   Base_Datos/diagrama_fisico.md: diagrama general (llaves) y un diagrama
 *     Mermaid por dominio (todas las columnas), con las relaciones sacadas de
 *     las llaves foráneas.
 *
 * Solo reemplaza lo que está entre las marcas
 *   <!-- INICIO GENERADO ... -->  y  <!-- FIN GENERADO -->
 * de cada archivo. Lo de afuera (introducción, decisiones de diseño) se edita
 * a mano. Las descripciones de negocio y los dominios salen de
 * herramientas/descripciones.json.
 *
 * Falla (código 1, sin escribir nada) si descripciones.json menciona una tabla
 * o columna que no existe, si una columna sin llave no tiene descripción o si
 * una tabla no está en exactamente un dominio.
 *
 * USO (desde la raíz de PROTOTIPO; solo lee la base):
 *   node Base_Datos/herramientas/generar_documentacion.js [base]
 *     Por defecto lee cenarepas_verificacion (una base recién creada con
 *     cenarepas_completo.sql, idéntica a Staging).
 *   node Base_Datos/herramientas/generar_documentacion.js [base] --comprobar
 *     No escribe: termina con código 1 si los documentos no están al día.
 */

const fs = require('fs');
const path = require('path');
const { config, conectar } = require('./conexion');

const args = process.argv.slice(2);
const comprobar = args.includes('--comprobar');
const base = args.find((a) => !a.startsWith('--')) || 'cenarepas_verificacion';
const esquema = config.esquema;

const DIR = path.resolve(__dirname, '..');
const ARCHIVO_DICCIONARIO = path.join(DIR, 'diccionario_datos.md');
const ARCHIVO_DIAGRAMA = path.join(DIR, 'diagrama_fisico.md');
const descripciones = JSON.parse(fs.readFileSync(path.join(__dirname, 'descripciones.json'), 'utf8'));

const ACCION = { a: 'NO ACTION', r: 'RESTRICT', c: 'CASCADE', n: 'SET NULL', d: 'SET DEFAULT' };
const TIPO_RESTRICCION = { p: 'PRIMARY KEY', u: 'UNIQUE', c: 'CHECK', f: 'FOREIGN KEY', x: 'EXCLUDE' };

const md = (texto) => String(texto ?? '').replace(/\|/g, '\\|');
const codigo = (texto) => '`' + String(texto).replace(/`/g, "'").replace(/\|/g, '\\|') + '`';
const sinEsquema = (texto) => String(texto).split(`${esquema}.`).join('');

async function leerEsquema(client) {
  const q = async (sql) => (await client.query(sql, [esquema])).rows;
  const columnas = await q(`
    SELECT c.relname AS tabla, a.attname AS columna, a.attnum AS posicion,
           format_type(a.atttypid, a.atttypmod) AS tipo, a.attnotnull AS no_nulo,
           pg_get_expr(d.adbin, d.adrelid) AS defecto,
           col_description(c.oid, a.attnum) AS comentario
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE n.nspname = $1 AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY c.relname, a.attnum`);
  const tablas = await q(`
    SELECT c.relname AS tabla, obj_description(c.oid, 'pg_class') AS comentario
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relkind = 'r' ORDER BY c.relname`);
  const restricciones = await q(`
    SELECT r.conname AS nombre, r.contype AS tipo, c.relname AS tabla, pg_get_constraintdef(r.oid) AS definicion,
           f.relname AS tabla_ref, r.confupdtype AS al_actualizar, r.confdeltype AS al_borrar,
           ARRAY(SELECT a.attname FROM unnest(r.conkey) WITH ORDINALITY k(n, i)
                 JOIN pg_attribute a ON a.attrelid = r.conrelid AND a.attnum = k.n ORDER BY k.i)::text[] AS columnas,
           ARRAY(SELECT a.attname FROM unnest(r.confkey) WITH ORDINALITY k(n, i)
                 JOIN pg_attribute a ON a.attrelid = r.confrelid AND a.attnum = k.n ORDER BY k.i)::text[] AS columnas_ref
    FROM pg_constraint r
    JOIN pg_class c ON c.oid = r.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_class f ON f.oid = r.confrelid
    WHERE n.nspname = $1 AND r.contype <> 'n'
    ORDER BY c.relname, r.contype, r.conname`);
  const indices = await q(`
    SELECT tablename AS tabla, indexname AS nombre, indexdef AS definicion
    FROM pg_indexes WHERE schemaname = $1 ORDER BY tablename, indexname`);
  const secuencias = await q(`SELECT count(*)::int AS total FROM pg_sequences WHERE schemaname = $1`);
  const noNulos = await q(`
    SELECT count(*)::int AS total FROM pg_constraint r JOIN pg_namespace n ON n.oid = r.connamespace
    WHERE n.nspname = $1 AND r.contype = 'n'`);
  return { columnas, tablas, restricciones, indices, secuencias: secuencias[0].total, noNulos: noNulos[0].total };
}

/** Modelo por tabla, con la validación de descripciones.json. */
function armarModelo(datos) {
  const errores = [];
  const modelo = new Map();
  for (const t of datos.tablas) {
    modelo.set(t.tabla, { nombre: t.tabla, comentario: t.comentario, columnas: [], restricciones: [], fks: [], referenciadaPor: [], indices: [] });
  }
  for (const c of datos.columnas) modelo.get(c.tabla).columnas.push(c);
  for (const r of datos.restricciones) {
    const t = modelo.get(r.tabla);
    if (r.tipo === 'f') {
      t.fks.push(r);
      modelo.get(r.tabla_ref).referenciadaPor.push(r);
    } else {
      t.restricciones.push(r);
    }
  }
  for (const i of datos.indices) modelo.get(i.tabla).indices.push(i);

  // Llaves de cada columna.
  for (const t of modelo.values()) {
    const pk = t.restricciones.find((r) => r.tipo === 'p');
    const unicas = t.restricciones.filter((r) => r.tipo === 'u');
    for (const c of t.columnas) {
      c.pk = pk?.columnas.includes(c.columna) ?? false;
      c.fks = t.fks.filter((f) => f.columnas.includes(c.columna));
      c.uq = unicas.some((u) => u.columnas.length === 1 && u.columnas[0] === c.columna);
    }
    // Relación 1 a 1: la llave foránea es además única.
    for (const f of t.fks) {
      f.unica = unicas.some((u) => u.columnas.join(',') === f.columnas.join(','));
      f.nulable = f.columnas.some((col) => !t.columnas.find((c) => c.columna === col).no_nulo);
    }
  }

  // Validación de descripciones.
  const desc = descripciones.tablas;
  for (const nombre of Object.keys(desc)) {
    if (!modelo.has(nombre)) errores.push(`descripciones.json: la tabla "${nombre}" no existe`);
  }
  for (const t of modelo.values()) {
    const d = desc[t.nombre];
    if (!d) {
      errores.push(`descripciones.json: falta la tabla "${t.nombre}"`);
      continue;
    }
    if (!d.descripcion) errores.push(`descripciones.json: falta la descripción de la tabla "${t.nombre}"`);
    for (const col of Object.keys(d.columnas || {})) {
      if (!t.columnas.some((c) => c.columna === col)) errores.push(`descripciones.json: la columna "${t.nombre}.${col}" no existe`);
    }
    for (const c of t.columnas) {
      c.descripcion = d.columnas?.[c.columna] || '';
      if (!c.descripcion && !c.pk && c.fks.length === 0) errores.push(`descripciones.json: falta la descripción de "${t.nombre}.${c.columna}"`);
    }
    t.descripcion = d.descripcion;
  }
  const enDominios = descripciones.dominios.flatMap((d) => d.tablas);
  for (const t of modelo.keys()) {
    const veces = enDominios.filter((x) => x === t).length;
    if (veces !== 1) errores.push(`descripciones.json: la tabla "${t}" está en ${veces} dominios (debe estar en 1)`);
  }
  for (const t of enDominios) if (!modelo.has(t)) errores.push(`descripciones.json: el dominio incluye "${t}", que no existe`);
  return { modelo, errores };
}

/** Descripción final de una columna: la de negocio y, en las llaves, su destino. */
function descripcionColumna(c) {
  const partes = [];
  if (c.descripcion) partes.push(md(c.descripcion));
  else if (c.pk && c.fks.length === 0) partes.push('Identificador (llave primaria).');
  for (const f of c.fks) {
    if (!c.descripcion) partes.push(`Referencia a ${codigo(f.tabla_ref)}.`);
  }
  return partes.join(' ');
}

function claveColumna(c) {
  const k = [];
  if (c.pk) k.push('PK');
  for (const f of c.fks) k.push(`FK → ${codigo(f.tabla_ref + '.' + f.columnas_ref[f.columnas.indexOf(c.columna)])}`);
  if (c.uq) k.push('UQ');
  return k.join('<br>');
}

function generarDiccionario(datos, modelo) {
  const l = [];
  const n = (tipo) => datos.restricciones.filter((r) => r.tipo === tipo).length;
  l.push('## 3. Resumen del esquema');
  l.push('');
  l.push(`Esquema \`${esquema}\` leído de la base \`${base}\`.`);
  l.push('');
  l.push('| Elemento | Cantidad |');
  l.push('| :--- | ---: |');
  l.push(`| Tablas | ${modelo.size} |`);
  l.push(`| Columnas | ${datos.columnas.length} |`);
  l.push(`| Llaves primarias | ${n('p')} |`);
  l.push(`| Llaves foráneas | ${n('f')} |`);
  l.push(`| Restricciones UNIQUE | ${n('u')} |`);
  l.push(`| Restricciones CHECK | ${n('c')} |`);
  l.push(`| Restricciones NOT NULL (se ven en la columna "Nulo") | ${datos.noNulos} |`);
  l.push(`| Índices (incluye los de llaves primarias y UNIQUE) | ${datos.indices.length} |`);
  l.push(`| Secuencias | ${datos.secuencias} |`);
  l.push('');

  l.push('## 4. Llaves foráneas por acción al borrar');
  l.push('');
  l.push('Qué hace la base si se intenta borrar la fila referenciada (la de la columna "Referencia a"). RESTRICT y NO ACTION impiden el borrado mientras existan filas que la referencien; CASCADE borra también esas filas; SET NULL las deja sin referencia.');
  l.push('');
  for (const accion of ['r', 'a', 'c', 'n', 'd']) {
    const fks = datos.restricciones.filter((r) => r.tipo === 'f' && r.al_borrar === accion);
    if (fks.length === 0) continue;
    l.push(`### ON DELETE ${ACCION[accion]} (${fks.length})`);
    l.push('');
    l.push('| Tabla y columna | Referencia a | Llave foránea |');
    l.push('| :--- | :--- | :--- |');
    for (const f of fks.sort((a, b) => a.tabla_ref.localeCompare(b.tabla_ref) || a.tabla.localeCompare(b.tabla))) {
      l.push(`| ${codigo(f.tabla + '.' + f.columnas.join(', '))} | ${codigo(f.tabla_ref)} | ${codigo(f.nombre)} |`);
    }
    l.push('');
  }

  l.push('## 5. Tablas por dominio');
  l.push('');
  let numero = 0;
  for (const dominio of descripciones.dominios) {
    numero += 1;
    l.push(`### 5.${numero}. ${dominio.titulo}`);
    l.push('');
    for (const nombre of dominio.tablas) {
      const t = modelo.get(nombre);
      l.push(`#### Tabla \`${t.nombre}\``);
      l.push('');
      l.push(md(t.descripcion));
      l.push('');
      if (t.comentario) {
        l.push(`Comentario en la base: _${md(t.comentario)}_`);
        l.push('');
      }
      l.push('| # | Columna | Tipo | Nulo | Por defecto | Clave | Descripción |');
      l.push('| ---: | :--- | :--- | :---: | :--- | :--- | :--- |');
      for (const c of t.columnas) {
        const defecto = c.defecto ? codigo(sinEsquema(c.defecto)) : '';
        const comentario = c.comentario ? ` _(Comentario en la base: ${md(c.comentario)})_` : '';
        l.push(`| ${c.posicion} | ${codigo(c.columna)} | ${codigo(c.tipo)} | ${c.no_nulo ? 'No' : 'Sí'} | ${defecto} | ${claveColumna(c)} | ${descripcionColumna(c)}${comentario} |`);
      }
      l.push('');
      if (t.restricciones.length > 0) {
        l.push('Restricciones:');
        l.push('');
        l.push('| Nombre | Tipo | Definición |');
        l.push('| :--- | :--- | :--- |');
        for (const r of t.restricciones) l.push(`| ${codigo(r.nombre)} | ${TIPO_RESTRICCION[r.tipo]} | ${codigo(sinEsquema(r.definicion))} |`);
        l.push('');
      }
      if (t.fks.length > 0) {
        l.push('Llaves foráneas:');
        l.push('');
        l.push('| Nombre | Columna | Referencia a | ON UPDATE | ON DELETE |');
        l.push('| :--- | :--- | :--- | :--- | :--- |');
        for (const f of t.fks) {
          l.push(`| ${codigo(f.nombre)} | ${codigo(f.columnas.join(', '))} | ${codigo(f.tabla_ref + '.' + f.columnas_ref.join(', '))} | ${ACCION[f.al_actualizar]} | ${ACCION[f.al_borrar]} |`);
        }
        l.push('');
      }
      if (t.indices.length > 0) {
        l.push('Índices:');
        l.push('');
        l.push('| Nombre | Definición |');
        l.push('| :--- | :--- |');
        for (const i of t.indices) l.push(`| ${codigo(i.nombre)} | ${codigo(sinEsquema(i.definicion))} |`);
        l.push('');
      }
      if (t.referenciadaPor.length > 0) {
        l.push('La referencian:');
        l.push('');
        l.push('| Tabla y columna | Llave foránea | ON DELETE |');
        l.push('| :--- | :--- | :--- |');
        for (const f of t.referenciadaPor) l.push(`| ${codigo(f.tabla + '.' + f.columnas.join(', '))} | ${codigo(f.nombre)} | ${ACCION[f.al_borrar]} |`);
        l.push('');
      }
    }
  }
  return l.join('\n');
}

// ─── Diagramas Mermaid ───

const TIPO_MERMAID = [
  [/^integer/, 'int'], [/^bigint/, 'bigint'], [/^character varying/, 'varchar'], [/^numeric/, 'numeric'],
  [/^timestamp/, 'timestamp'], [/^date/, 'date'], [/^boolean/, 'boolean'], [/^text/, 'text'],
];
const tipoMermaid = (tipo) => (TIPO_MERMAID.find(([re]) => re.test(tipo)) || [null, tipo.split(/[\s(]/)[0]])[1];

function atributo(c) {
  const k = [];
  if (c.pk) k.push('PK');
  if (c.fks.length > 0) k.push('FK');
  if (c.uq) k.push('UK');
  return `        ${tipoMermaid(c.tipo)} ${c.columna}${k.length ? ' ' + k.join(', ') : ''}`;
}

function relacion(f) {
  // Padre (referenciado) a la izquierda. Hijo: cero o muchos, o cero o uno si la FK es única.
  const padre = f.nulable ? '|o' : '||';
  const hijo = f.unica ? 'o|' : 'o{';
  return `    ${f.tabla_ref} ${padre}--${hijo} ${f.tabla} : "${f.columnas.join(', ')}"`;
}

function diagrama(modelo, tablas, { soloLlaves, externas = new Set() }) {
  const l = ['```mermaid', 'erDiagram'];
  const incluidas = new Set([...tablas, ...externas]);
  const fks = [...modelo.values()].flatMap((t) => t.fks)
    .filter((f) => incluidas.has(f.tabla) && incluidas.has(f.tabla_ref) && (tablas.includes(f.tabla) || tablas.includes(f.tabla_ref)))
    .sort((a, b) => a.tabla_ref.localeCompare(b.tabla_ref) || a.tabla.localeCompare(b.tabla) || a.nombre.localeCompare(b.nombre));
  for (const f of fks) l.push(relacion(f));
  for (const nombre of [...tablas, ...[...externas].sort()]) {
    const t = modelo.get(nombre);
    const externa = externas.has(nombre);
    const cols = t.columnas.filter((c) => (externa ? c.pk : !soloLlaves || c.pk || c.fks.length > 0 || c.uq));
    l.push(`    ${nombre} {`);
    for (const c of cols) l.push(atributo(c));
    l.push('    }');
  }
  l.push('```');
  return { texto: l.join('\n'), fks };
}

function generarDiagrama(modelo) {
  const l = [];
  const todas = descripciones.dominios.flatMap((d) => d.tablas);
  l.push('## 2. Diagrama general');
  l.push('');
  l.push(`Las ${modelo.size} tablas con sus llaves (PK, FK y UK). Las columnas completas están en los diagramas por dominio.`);
  l.push('');
  const general = diagrama(modelo, todas, { soloLlaves: true });
  l.push(general.texto);
  l.push('');
  l.push(`Relaciones: ${general.fks.length} (una por llave foránea).`);
  l.push('');
  l.push('## 3. Diagramas por dominio');
  l.push('');
  l.push('Cada diagrama muestra las tablas del dominio con todas sus columnas y, solo con su llave primaria, las tablas de otros dominios con las que se relacionan.');
  l.push('');
  let numero = 0;
  for (const dominio of descripciones.dominios) {
    numero += 1;
    const propias = new Set(dominio.tablas);
    const externas = new Set();
    for (const t of dominio.tablas) {
      for (const f of modelo.get(t).fks) if (!propias.has(f.tabla_ref)) externas.add(f.tabla_ref);
      for (const f of modelo.get(t).referenciadaPor) if (!propias.has(f.tabla)) externas.add(f.tabla);
    }
    const d = diagrama(modelo, dominio.tablas, { soloLlaves: false, externas });
    l.push(`### 3.${numero}. ${dominio.titulo}`);
    l.push('');
    l.push(`Tablas: ${dominio.tablas.map(codigo).join(', ')}.`);
    if (externas.size > 0) l.push(`De otros dominios: ${[...externas].sort().map(codigo).join(', ')}.`);
    l.push('');
    l.push(d.texto);
    l.push('');
    l.push('| Tabla y columna | Referencia a | Cardinalidad | ON DELETE |');
    l.push('| :--- | :--- | :--- | :--- |');
    for (const f of d.fks) {
      const card = `${f.unica ? '0..1' : '0..N'} por cada ${f.tabla_ref}${f.nulable ? ' (opcional)' : ''}`;
      l.push(`| ${codigo(f.tabla + '.' + f.columnas.join(', '))} | ${codigo(f.tabla_ref)} | ${card} | ${ACCION[f.al_borrar]} |`);
    }
    l.push('');
  }
  return l.join('\n');
}

// ─── Escritura entre marcas ───

const INICIO = /<!-- INICIO GENERADO[^>]*-->/;
const FIN = '<!-- FIN GENERADO -->';

function reemplazar(archivo, contenido) {
  const actual = fs.readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n');
  const m = INICIO.exec(actual);
  const fin = actual.indexOf(FIN);
  if (!m || fin === -1 || fin < m.index) throw new Error(`${path.basename(archivo)}: faltan las marcas INICIO GENERADO / FIN GENERADO`);
  const nuevo = actual.slice(0, m.index + m[0].length) + '\n\n' + contenido.trim() + '\n\n' + actual.slice(fin);
  const limpio = nuevo.split('\n').map((x) => x.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '') + '\n';
  return { actual, limpio };
}

async function main() {
  const client = await conectar(base);
  let datos;
  try {
    datos = await leerEsquema(client);
  } finally {
    await client.end();
  }
  const { modelo, errores } = armarModelo(datos);
  if (errores.length > 0) {
    errores.forEach((e) => console.error('❌ ' + e));
    process.exitCode = 1;
    return;
  }
  const salidas = [
    [ARCHIVO_DICCIONARIO, generarDiccionario(datos, modelo)],
    [ARCHIVO_DIAGRAMA, generarDiagrama(modelo)],
  ].map(([archivo, contenido]) => ({ archivo, ...reemplazar(archivo, contenido) }));

  let desactualizados = 0;
  for (const { archivo, actual, limpio } of salidas) {
    const nombre = path.relative(path.resolve(DIR, '..'), archivo);
    if (actual === limpio) {
      console.log(`✅ ${nombre}: al día`);
    } else if (comprobar) {
      console.error(`❌ ${nombre}: no está al día con la base ${base}`);
      desactualizados += 1;
    } else {
      fs.writeFileSync(archivo, limpio, 'utf8');
      console.log(`📝 ${nombre}: actualizado desde ${base}`);
    }
  }
  if (desactualizados > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exitCode = 1;
});
