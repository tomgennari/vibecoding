/**
 * Genera public/kenney-assets-curated.json a partir de public/kenney-assets.json
 * con máximo 30 archivos representativos por pack y reglas de filtrado.
 *
 * Uso: node scripts/curate-kenney-json.js
 */

const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '..', 'public', 'kenney-assets.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'kenney-assets-curated.json');
const MAX_PER_PACK = 30;

const EXCLUDE_KEYWORDS = ['damage', 'disabled', 'shadow', 'hurt', 'climb'];
const EXCLUDE_PATH_PARTS = ['1x1', 'pixel'];

// Packs que no deben ser filtrados agresivamente por "pixel"/"1x1"
const SPECIAL_PACKS = new Set([
  'toon-characters-pack-1',
  'sports-pack',
  'topdown-shooter',
  'space-shooter-redux',
  'simple-space',
]);
const SPECIAL_MAX_PER_PACK = 15;

/** True si el path debe ignorarse por keywords o por carpetas 1x1/pixel */
function shouldExclude(filePath, packName) {
  const lower = filePath.toLowerCase();
  if (EXCLUDE_KEYWORDS.some((k) => lower.includes(k))) return true;
  // Para ciertos packs (space-shooter, topdown, deportes, toon chars) NO filtramos por "pixel"/"1x1"
  if (!SPECIAL_PACKS.has(packName) && EXCLUDE_PATH_PARTS.some((p) => lower.includes(p))) return true;
  return false;
}

/**
 * Base de variante: _1.png / _2.png -> misma base; 1.png / 2.png -> misma base.
 * Devuelve string para agrupar (ej. "enemy_1.png" y "enemy_2.png" -> "enemy.png").
 */
function variantBase(filePath) {
  return filePath
    .replace(/_\d+\.(png)$/i, '.$1')
    .replace(/(\D)\d+\.(png)$/i, '$1.$2');
}

/** True si el path tiene variante numerada (_N o N antes de .png) */
function hasNumberVariant(filePath) {
  return /_\d+\.png$/i.test(filePath) || /\d+\.png$/i.test(filePath);
}

/** Número de la variante (para ordenar); sin variante = -1 */
function variantNumber(filePath) {
  const m1 = filePath.match(/_(\d+)\.png$/i);
  if (m1) return parseInt(m1[1], 10);
  const m2 = filePath.match(/(\d+)\.png$/i);
  if (m2) return parseInt(m2[1], 10);
  return -1;
}

/**
 * De una lista de [path, url], agrupa por variantBase y se queda con uno por grupo:
 * prioriza el que no tiene número; si todos tienen, el de número más bajo.
 */
function onePerVariant(entries) {
  const byBase = new Map();
  for (const [filePath, url] of entries) {
    const base = variantBase(filePath);
    if (!byBase.has(base)) {
      byBase.set(base, []);
    }
    byBase.get(base).push({ path: filePath, url });
  }
  const result = [];
  for (const group of byBase.values()) {
    const sorted = group.sort((a, b) => {
      const aNum = variantNumber(a.path);
      const bNum = variantNumber(b.path);
      if (aNum < 0 && bNum < 0) return a.path.localeCompare(b.path);
      if (aNum < 0) return -1;
      if (bNum < 0) return 1;
      return aNum - bNum;
    });
    result.push(sorted[0]);
  }
  return result;
}

/**
 * Ordena entradas: primero sin número al final, luego con número (por número).
 */
function sortPrioritizeNoNumber(entries) {
  return entries.sort((a, b) => {
    const aHas = hasNumberVariant(a.path);
    const bHas = hasNumberVariant(b.path);
    if (!aHas && bHas) return -1;
    if (aHas && !bHas) return 1;
    if (aHas && bHas) return variantNumber(a.path) - variantNumber(b.path);
    return a.path.localeCompare(b.path);
  });
}

/** Curar un pack: filtrar, una por variante, priorizar sin número, max N */
function curatePack(entries, packName) {
  const filtered = entries.filter(([filePath]) => !shouldExclude(filePath, packName));
  const onePer = onePerVariant(filtered);
  const sorted = sortPrioritizeNoNumber(onePer);
  const limit = SPECIAL_PACKS.has(packName)
    ? Math.min(SPECIAL_MAX_PER_PACK, MAX_PER_PACK)
    : MAX_PER_PACK;
  const chosen = sorted.slice(0, limit);
  return Object.fromEntries(chosen.map(({ path: p, url }) => [p, url]));
}

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('No se encontró public/kenney-assets.json');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const curated = {};
  let totalFiles = 0;

  for (const [pack, files] of Object.entries(data)) {
    const entries = Object.entries(files);
    const packCurated = curatePack(entries, pack);
    curated[pack] = packCurated;
    totalFiles += Object.keys(packCurated).length;
  }

  const json = JSON.stringify(curated, null, 2);
  fs.writeFileSync(OUTPUT_PATH, json, 'utf8');

  const stats = fs.statSync(OUTPUT_PATH);
  const sizeKb = (stats.size / 1024).toFixed(2);

  console.log('--- Kenney curated ---');
  console.log(`Archivos en total: ${totalFiles}`);
  console.log(`Tamaño del archivo generado: ${sizeKb} KB`);
  console.log(`Guardado: ${OUTPUT_PATH}`);
}

main();
