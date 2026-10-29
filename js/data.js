/**
 * data.js — Acceso al dataset local (única fuente de datos)
 * No hay APIs externas ni bases de datos.
 */
const DATA_PATH = 'data/dataset_principal.json';

let dataset = null;
let movies = [];

/**
 * Carga el dataset JSON desde el archivo local.
 * @returns {Promise<{dataset: Object, movies: Array}>}
 */
async function loadDataset() {
  const response = await fetch(DATA_PATH);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el dataset local (${response.status}): ${DATA_PATH}`);
  }
  dataset = await response.json();
  movies = Array.isArray(dataset.peliculas) ? dataset.peliculas : [];
  return { dataset, movies };
}

/** Devuelve el array de películas cargado. */
function getMovies() {
  return movies;
}

/** Devuelve los metadatos del dataset (_metadata). */
function getMetadata() {
  return dataset && dataset._metadata ? dataset._metadata : null;
}

/** Devuelve las reglas del asistente (reglas_asistente). */
function getRules() {
  return dataset && dataset.reglas_asistente ? dataset.reglas_asistente : null;
}

/** Busca una película por su ID de registro. */
function findById(id) {
  return movies.find((m) => m.id === id);
}

export { loadDataset, getMovies, getMetadata, getRules, findById, DATA_PATH };
