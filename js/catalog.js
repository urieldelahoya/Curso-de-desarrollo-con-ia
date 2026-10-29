/**
 * catalog.js — Consultas deterministas sobre el catálogo local.
 * Búsqueda por título y filtros por año, género y director.
 */

/** Búsqueda por título (coincidencia parcial, sin distinción de mayúsculas). */
export function searchByTitle(movies, query) {
  const q = query.trim().toLowerCase();
  if (!q) return movies.slice();
  return movies.filter((m) => m.titulo.toLowerCase().includes(q));
}

/** Filtro exacto por año de estreno. */
export function filterByYear(movies, year) {
  if (!year) return movies.slice();
  const y = String(year);
  return movies.filter((m) => String(m.anio) === y);
}

/** Filtro por género (el género debe estar en el array de géneros de la película). */
export function filterByGenre(movies, genre) {
  if (!genre) return movies.slice();
  const g = genre.toLowerCase();
  return movies.filter((m) => m.generos.some((gen) => gen.toLowerCase() === g));
}

/** Filtro por director (el director debe estar en el array de directores de la película). */
export function filterByDirector(movies, director) {
  if (!director) return movies.slice();
  const d = director.toLowerCase();
  return movies.filter((m) => m.directores.some((dir) => dir.toLowerCase() === d));
}

/** Aplica todos los filtros activos a la vez. */
export function applyFilters(movies, { title, year, genre, director }) {
  let result = searchByTitle(movies, title);
  result = filterByYear(result, year);
  result = filterByGenre(result, genre);
  result = filterByDirector(result, director);
  return result;
}

/** Valores únicos de años, ordenados descendente. */
export function getUniqueYears(movies) {
  return [...new Set(movies.map((m) => m.anio))].sort((a, b) => b - a);
}

/** Valores únicos de géneros, ordenados alfabéticamente. */
export function getUniqueGenres(movies) {
  const set = new Set();
  movies.forEach((m) => m.generos.forEach((g) => set.add(g)));
  return [...set].sort();
}

/** Valores únicos de directores, ordenados alfabéticamente. */
export function getUniqueDirectors(movies) {
  const set = new Set();
  movies.forEach((m) => m.directores.forEach((d) => set.add(d)));
  return [...set].sort();
}
