/**
 * download-posters.js
 * Busca imágenes en Wikimedia Commons para cada película del catálogo local,
 * las descarga con fetch (encabezados de navegador) si la licencia lo permite,
 * y actualiza el JSON con los campos poster y poster_attribution.
 *
 * Uso: node scripts/download-posters.js [indiceInicial] [cantidad]
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'dataset_principal.json');
const POSTERS_DIR = path.join(__dirname, '..', 'images', 'posters');
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Referer': 'https://commons.wikimedia.org/',
  'Origin': 'https://commons.wikimedia.org',
};

let dataset = null;
let movies = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchCommons(title) {
  const query = encodeURIComponent(title + ' movie film');
  const url =
    'https://commons.wikimedia.org/w/api.php?' +
    'action=query&list=search&srsearch=' + query +
    '&srnamespace=6&srlimit=8&format=json&origin=*';

  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error('Commons search failed: ' + response.status);
  const data = await response.json();
  return (data.query && data.query.search) || [];
}

async function getFileInfo(filename) {
  const title = 'File:' + filename;
  const encoded = encodeURIComponent(title);
  const url =
    'https://commons.wikimedia.org/w/api.php?' +
    'action=query&titles=' + encoded +
    '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400&format=json&origin=*';

  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error('Commons info failed: ' + response.status);
  const data = await response.json();
  const pages = data.query && data.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || !page.imageinfo) return null;
  return page.imageinfo[0];
}

function isLicensePermissive(extmetadata) {
  if (!extmetadata) return false;
  const licenseShort =
    (extmetadata.LicenseShortName && extmetadata.LicenseShortName.value) ||
    (extmetadata.UsageTerms && extmetadata.UsageTerms.value) ||
    '';
  const l = licenseShort.toLowerCase();

  if (
    l.includes('all rights reserved') ||
    l.includes('non-commercial') ||
    l.includes('nc ') ||
    l.includes('nc-') ||
    l.includes('no derivatives') ||
    l.includes('nd ') ||
    l.includes('nd-') ||
    l === ''
  ) {
    return false;
  }

  if (
    l.includes('cc0') ||
    l.includes('pdm') ||
    l.includes('public domain') ||
    l.includes('cc-by') ||
    l.includes('creative commons attribution') ||
    l.startsWith('cc-by')
  ) {
    return true;
  }

  return false;
}

function extractAttribution(extmetadata, filename) {
  if (!extmetadata) {
    return { autor: 'Desconocido', fuente: 'Wikimedia Commons', licencia: 'Desconocida', archivo: filename };
  }
  const artista =
    (extmetadata.Artist && extmetadata.Artist.value) ||
    (extmetadata.Credit && extmetadata.Credit.value) ||
    '';
  const licencia =
    (extmetadata.LicenseShortName && extmetadata.LicenseShortName.value) ||
    (extmetadata.UsageTerms && extmetadata.UsageMetadata.value) ||
    (extmetadata.UsageTerms && extmetadata.UsageTerms.value) ||
    'Desconocida';
  return {
    autor: artista || 'Desconocido',
    fuente: 'Wikimedia Commons',
    licencia: licencia || 'Desconocida',
    archivo: filename,
  };
}

async function downloadImage(url, destPath) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error('Download failed: ' + response.status);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
  return destPath;
}

async function main() {
  const startIndex = parseInt(process.argv[2] || '0', 10);
  const limit = parseInt(process.argv[3] || '20', 10);

  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  dataset = JSON.parse(raw);
  movies = dataset.peliculas || [];

  const endIndex = Math.min(startIndex + limit, movies.length);
  let success = 0;
  let skipped = 0;
  let errors = 0;

  console.log('Procesando películas del índice', startIndex, 'al', endIndex - 1, 'de', movies.length);

  for (let i = startIndex; i < endIndex; i++) {
    const movie = movies[i];
    const id = movie.id;
    const title = movie.titulo;
    console.log(`[${i + 1}/${movies.length}] ${id} - ${title}`);

    if (movie.poster && movie.poster !== 'images/posters/placeholder.svg') {
      skipped++;
      console.log('  -> Ya tiene poster real, saltando.');
      continue;
    }

    try {
      const results = await searchCommons(title);
      let downloaded = false;

      for (const result of results) {
        const filename = result.title.replace(/^File:/, '');
        try {
          const info = await getFileInfo(filename);
          if (!info || !info.url) continue;

          const extmeta = info.extmetadata || {};
          if (!isLicensePermissive(extmeta)) {
            continue;
          }

          const attribution = extractAttribution(extmeta, filename);

          // Preferir URL de thumb de upload.wikimedia.org; si no, usar url directa
          let imageUrl = info.thumburl || info.url;

          const urlLower = imageUrl.toLowerCase();
          let ext = '.jpg';
          if (urlLower.endsWith('.png')) ext = '.png';
          else if (urlLower.endsWith('.gif')) ext = '.gif';
          else if (urlLower.endsWith('.webp')) ext = '.webp';
          else if (urlLower.endsWith('.svg')) ext = '.svg';

          const destName = id + ext;
          const destPath = path.join(POSTERS_DIR, destName);

          try {
            await downloadImage(imageUrl, destPath);
          } catch (dlErr) {
            console.log('  -> Descarga falló para', filename, ':', dlErr.message);
            continue;
          }

          if (!fs.existsSync(destPath) || fs.statSync(destPath).size < 1000) {
            console.log('  -> Archivo demasiado pequeño:', destName);
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            continue;
          }

          movie.poster = 'images/posters/' + destName;
          movie.poster_attribution = attribution;
          downloaded = true;
          success++;
          console.log('  -> Descargado:', destName, '| Licencia:', attribution.licencia);
          break;
        } catch (err) {
          console.log('  -> Error con archivo', filename, ':', err.message);
          continue;
        }
      }

      if (!downloaded) {
        movie.poster = 'images/posters/placeholder.svg';
        movie.poster_attribution = {
          autor: 'MovieSearch',
          fuente: 'Diseño original',
          licencia: 'Original (MovieSearch)',
          archivo: 'placeholder.svg',
        };
        skipped++;
        console.log('  -> Sin imagen reutilizable, usando placeholder.');
      }
    } catch (err) {
      errors++;
      console.log('  -> ERROR:', err.message);
      movie.poster = 'images/posters/placeholder.svg';
      movie.poster_attribution = {
        autor: 'MovieSearch',
        fuente: 'Diseño original',
        licencia: 'Original (MovieSearch)',
        archivo: 'placeholder.svg',
      };
    }

    await sleep(5000);
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(dataset, null, 2), 'utf8');

  console.log('\n=== Resumen del lote ===');
  console.log('Descargadas:', success);
  console.log('Placeholder / sin imagen:', skipped);
  console.log('Errores:', errors);
  console.log('Dataset actualizado en:', DATA_PATH);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
