/**
 * Lista todos los archivos del bucket "kenney" en Supabase Storage y genera
 * public/kenney-assets.json con la estructura: { "carpeta": { "archivo.png": "url" } }
 *
 * Uso: node scripts/generate-kenney-json.js
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
  console.error('No se encontró .env.local.');
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
const key = serviceRoleKey || anonKey;
if (!key) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, key);

const BUCKET = 'kenney';
const OUT_PATH = path.join(__dirname, '..', 'public', 'kenney-assets.json');

/** URL pública de un objeto en el bucket kenney */
function publicUrl(objectPath) {
  const base = supabaseUrl.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

/**
 * Lista todos los archivos del bucket "kenney" usando la función RPC
 * Postgres `list_kenney_objects`, que devuelve al menos una columna `name`.
 *
 * Usa paginación con range() de a 1000 filas, ordenadas por name.
 */
async function listAllViaRpc() {
  const files = [];
  const PAGE_SIZE = 1000;
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .rpc('list_kenney_objects')
      .range(from, to);

    if (error) {
      throw new Error(`list_kenney_objects page ${page} (rows ${from}-${to}): ${error.message}`);
    }

    const rows = data || [];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (row.name) files.push(row.name);
    }

    if (files.length % 5000 === 0) {
      console.log(`Listado hasta ahora: ${files.length} archivos...`);
    }

    if (rows.length < PAGE_SIZE) break;
    page += 1;
  }

  return files;
}

/**
 * Agrupa rutas en { "carpeta": { "archivo.png": "url" } }.
 * "carpeta" es el primer segmento del path (ej. space-shooter-redux).
 * Archivos en la raíz del bucket se agrupan en "_root".
 */
function buildManifest(filePaths) {
  const manifest = {};

  for (const filePath of filePaths) {
    const parts = filePath.split('/');
    const folder = parts.length > 1 ? parts[0] : '_root';
    const fileName = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
    if (!fileName) continue;

    if (!manifest[folder]) manifest[folder] = {};
    manifest[folder][fileName] = publicUrl(filePath);
  }

  return manifest;
}

async function main() {
  console.log('Listando archivos del bucket "kenney"...');
  const filePaths = await listAllViaRpc();
  console.log(`Encontrados ${filePaths.length} archivos.`);

  const manifest = buildManifest(filePaths);
  const json = JSON.stringify(manifest, null, 2);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, json, 'utf8');

  console.log(`Guardado ${OUT_PATH}`);
  console.log(`Carpetas: ${Object.keys(manifest).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
