// Hallazgos 6 y 8: verificación de encabezados y lectura del archivo de obras (Excel / CSV).
// Columnas por posición: A = #, B = Participante (autor), C = Nombre Obra (título), D = Descripción (opcional).
// Funciones puras (sin DOM ni Firebase) para poder probarlas por separado.

export const EXPECTED_COLUMNS = [
  { col: 'A', label: '#', field: 'participantNumber', name: '#', keyword: '#', required: true },
  { col: 'B', label: 'Participante', field: 'author', name: 'participante', keyword: 'participante', required: true },
  { col: 'C', label: 'Nombre Obra', field: 'title', name: 'nombre obra', keyword: 'obra', required: true },
  { col: 'D', label: 'Descripción', field: 'description', name: 'descripcion', keyword: 'descripcion', required: false },
];

/** Minúsculas, sin acentos, sin signos y con espacios simples. */
export function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9#ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distancia de Levenshtein (letras distintas, faltantes o sobrantes). */
export function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/**
 * Compara un encabezado con una columna esperada.
 * 'exact' = igual · 'typo' = pocas letras distintas · 'partial' = contiene la palabra clave · 'wrong' = otra cosa · 'empty' = vacío
 */
export function matchHeader(cell, column) {
  const h = normalizeHeader(cell);
  if (!h) return 'empty';
  if (h === column.name) return 'exact';
  const tolerance = column.name.length <= 1 ? 0 : column.name.length <= 6 ? 1 : 2;
  if (tolerance > 0 && editDistance(h, column.name) <= tolerance) return 'typo';
  if (h.includes(column.keyword)) return 'partial';
  return 'wrong';
}

const ID_PATTERN = /^[IJA][\s-]?\d+/i;
const isMatch = (m) => m === 'exact' || m === 'typo' || m === 'partial';

/**
 * Verifica la fila 1 del archivo.
 * Devuelve { status: 'ok' | 'warn' | 'error', noHeader, swapped, columns: [...] }.
 */
export function checkHeaders(headerRow) {
  const row = Array.isArray(headerRow) ? headerRow : [];
  const [colA, colB, colC] = EXPECTED_COLUMNS;

  // ¿La fila 1 parece una obra y no un encabezado?
  const noHeader = ID_PATTERN.test(String(row[0] ?? '').trim())
    && !isMatch(matchHeader(row[1], colB)) && !isMatch(matchHeader(row[2], colC));

  // ¿B y C intercambiadas? (el error original de los hallazgos 6 y 8)
  const swapped = !noHeader
    && isMatch(matchHeader(row[1], colC)) && isMatch(matchHeader(row[2], colB))
    && !isMatch(matchHeader(row[1], colB));

  const columns = EXPECTED_COLUMNS.map((column, i) => {
    const found = row[i] == null ? '' : String(row[i]).trim();
    let state = matchHeader(found, column);
    if (!column.required && state === 'empty') state = 'absent';
    else if (column.required && state === 'empty') state = 'wrong';
    if (swapped && (column === colB || column === colC)) state = 'swapped';
    return { ...column, found, state };
  });

  let status = 'ok';
  if (noHeader || columns.some(c => c.state === 'wrong' || c.state === 'swapped')) status = 'error';
  else if (columns.some(c => c.state === 'typo' || c.state === 'partial')) status = 'warn';

  return { status, noHeader, swapped, columns };
}

/**
 * Convierte las filas en obras leyendo las columnas por posición.
 * startRow = 1 si la fila 1 es encabezado, 0 si no lo hay.
 * Lanza un error si un identificador no empieza con I, J o A (igual que antes).
 */
export function parseWorks(rows, { startRow = 1, withLocation = false } = {}) {
  const works = [];
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    if (row.length < 3) continue; // Se necesitan al menos 3 columnas (#, Participante, Nombre Obra)

    const idPart = String(row[0] ?? '').trim().toUpperCase();
    const author = String(row[1] ?? '').trim();  // Columna B: Participante
    const title = String(row[2] ?? '').trim();   // Columna C: Nombre Obra
    const description = row.length > 3 && row[3] != null ? String(row[3]).trim() : '';
    const location = withLocation && row.length > 4 && row[4] != null ? String(row[4]).trim() : '';

    let category = '';
    if (idPart.startsWith('I')) category = 'infantil';
    else if (idPart.startsWith('J')) category = 'juvenil';
    else if (idPart.startsWith('A')) category = 'adulto';

    if (!category) {
      throw new Error(`Fila ${i + 1}: El identificador "${idPart}" no comienza con I (Infantil), J (Juvenil) o A (Adulto).`);
    }

    const work = { title, author, category, description, participantNumber: idPart };
    if (withLocation) work.location = location;
    works.push(work);
  }
  return works;
}

/** Escapar texto que viene del archivo antes de mostrarlo. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}
