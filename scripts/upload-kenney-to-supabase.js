/**
 * Sube todos los PNG de kenney-temp al bucket "kenney" en Supabase Storage.
 * Mantiene la estructura de carpetas con nombres normalizados (minúsculas, guiones).
 *
 * Uso: node scripts/upload-kenney-to-supabase.js
 * Requiere: .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const fs = require('fs');
const path = require('path');

// Cargar .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
} else {
  console.error('No se encontró .env.local. Crea el archivo con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL en .env.local');
  process.exit(1);
}
// Para subir a Storage con RLS activo hace falta la service role key
const key = serviceRoleKey || anonKey;
if (!key) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, key);

const KENNEY_TEMP = path.join(__dirname, '..', 'kenney-temp');
const BUCKET = 'kenney';

// Packs específicos a subir (según nombre normalizado en Storage)
const TARGET_PACKS = new Set([
  'roguelike-characters-pack',
  'toon-characters-pack-1',
  'sports-pack',
  'topdown-shooter',
  'space-shooter-redux',
  'simple-space',
]);

/** Normaliza un nombre: minúsculas y espacios → guiones */
function normalizeSegment(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/** Dado un path relativo a kenney-temp, devuelve el path para Storage (normalizado). */
function toStoragePath(relativePath) {
  const parts = relativePath.split(path.sep).map((p) => normalizeSegment(p));
  return parts.join('/');
}

/** Recorre un directorio y devuelve todos los .png con path relativo a baseDir */
function collectPngs(dir, baseDir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const relative = path.relative(baseDir, full);
    if (ent.isDirectory()) {
      collectPngs(full, baseDir, list);
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.png')) {
      list.push({ fullPath: full, relativePath: relative });
    }
  }
  return list;
}

/** Primera carpeta del path relativo (para el resumen) */
function topLevelFolder(relativePath) {
  const first = relativePath.split(path.sep)[0];
  return first || 'root';
}

/** Primera carpeta del path normalizado para Storage (ej. space-shooter-redux) */
function storageTopLevelFromRelative(relativePath) {
  const storagePath = toStoragePath(relativePath);
  const first = storagePath.split('/')[0];
  return first || 'root';
}

/**
 * Lista recursivamente todos los paths del bucket y devuelve un Set.
 * Reutiliza la lógica de generate-kenney-json (is_prefix o nombre sin punto = carpeta).
 */
async function listExistingPaths(folderPath) {
  const prefix = folderPath ? folderPath.replace(/\/$/, '') : '';
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix);

  if (error) throw new Error(`list ${prefix}: ${error.message}`);

  const paths = [];
  const entries = data || [];

  for (const entry of entries) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const isFolder = entry.is_prefix || !entry.name.includes('.');
    if (isFolder) {
      const sub = await listExistingPaths(fullPath);
      paths.push(...sub);
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}

async function main() {
  if (!fs.existsSync(KENNEY_TEMP)) {
    console.error('No existe la carpeta kenney-temp en la raíz del proyecto.');
    process.exit(1);
  }

  console.log('Buscando archivos PNG en kenney-temp...');
  const allFiles = collectPngs(KENNEY_TEMP, KENNEY_TEMP);
  console.log(`Encontrados ${allFiles.length} archivos PNG en total.`);

  // Filtrar solo los PNG que pertenecen a los packs objetivo (por nombre normalizado en Storage)
  const files = allFiles.filter(({ relativePath }) =>
    TARGET_PACKS.has(storageTopLevelFromRelative(relativePath))
  );

  if (files.length === 0) {
    console.log('No se encontraron PNG de los packs objetivo en kenney-temp.');
    return;
  }

  // Contar archivos por pack objetivo antes de subir
  const preSummary = {};
  for (const { relativePath } of files) {
    const pack = storageTopLevelFromRelative(relativePath);
    preSummary[pack] = (preSummary[pack] || 0) + 1;
  }

  console.log('\n--- Archivos encontrados por pack objetivo (antes de subir) ---\n');
  for (const pack of Object.keys(preSummary).sort()) {
    console.log(`  ${pack}: ${preSummary[pack]} archivos PNG`);
  }
  console.log('');

  console.log('Listando archivos ya existentes en el bucket...');
  const existingPaths = new Set(await listExistingPaths(''));
  console.log(`Hay ${existingPaths.size} archivos en el bucket. Se omitirán si ya existen.\n`);

  const summary = {};
  const summarySkipped = {};
  const BATCH = 15;
  let done = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async ({ fullPath, relativePath }) => {
        const storagePath = toStoragePath(relativePath);
        const folder = topLevelFolder(relativePath);
        if (existingPaths.has(storagePath)) {
          return { folder, status: 'skipped' };
        }
        const buffer = fs.readFileSync(fullPath);
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });
        if (error) {
          return { folder, status: 'error', err: error.message };
        }
        return { folder, status: 'uploaded' };
      })
    );

    for (const r of results) {
      if (r.status === 'uploaded') {
        summary[r.folder] = (summary[r.folder] || 0) + 1;
        done++;
      } else if (r.status === 'skipped') {
        summarySkipped[r.folder] = (summarySkipped[r.folder] || 0) + 1;
        skipped++;
      } else {
        errors++;
        if (errors <= 5) console.error('Error:', r.err);
      }
    }

    if ((i + BATCH) % 150 === 0 || i + BATCH >= files.length) {
      console.log(`Procesados ${i + batch.length}/${files.length} (subidos: ${done}, omitidos: ${skipped})...`);
    }
  }

  console.log('\n--- Resumen por carpeta (subidos) ---\n');
  const folders = Object.keys(summary).sort();
  for (const folder of folders) {
    console.log(`  ${folder}: ${summary[folder]} archivos`);
  }
  console.log('\n--- Total ---');
  console.log(`  Subidos: ${done}`);
  console.log(`  Omitidos (ya existían): ${skipped}`);
  if (errors) console.log(`  Errores: ${errors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
