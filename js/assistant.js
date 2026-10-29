/**
 * assistant.js — Asistente de consultas basado ÚNICAMENTE en los registros locales.
 * Funciones deterministas sobre el JSON. No simula un modelo de IA.
 *
 * Reglas del dataset (reglas_asistente):
 *  - responder_solo_con_dataset: true
 *  - citar_id: true (cada respuesta cita el ID del registro que la respalda)
 *  - respuesta sin datos: "No dispongo de esa información en el catálogo local de MovieSearch."
 *  - prohibido_inventar_sinopsis: true
 */

const NO_DATA = "No dispongo de esa información en el catálogo local de MovieSearch.";

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Quita tildes para comparar sin depender de acentos ("cuaron" == "cuarón"). */
function stripAccents(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Encuentra la película cuyo título se menciona como palabra completa en la consulta.
 * La comparación ignora tildes. Elige la coincidencia más larga.
 */
function findMovieByTitleMentioned(query, movies) {
  const q = stripAccents(query).toLowerCase();
  let best = null;
  for (const m of movies) {
    const t = stripAccents(m.titulo).toLowerCase();
    const regex = new RegExp('\\b' + escapeRegExp(t) + '\\b', 'i');
    if (regex.test(q) && (!best || t.length > best.titulo.toLowerCase().length)) {
      best = m;
    }
  }
  return best;
}

/** Encuentra un director mencionado como palabra completa (sin tildes). */
function findDirectorMentioned(query, movies) {
  const q = stripAccents(query).toLowerCase();
  let best = null;
  for (const m of movies) {
    for (const d of m.directores) {
      const regex = new RegExp('\\b' + escapeRegExp(stripAccents(d)) + '\\b', 'i');
      if (regex.test(q) && (!best || stripAccents(d).toLowerCase().length > best.toLowerCase().length)) {
        best = d;
      }
    }
  }
  return best;
}

/** Encuentra un género mencionado como palabra completa (sin tildes). */
function findGenreMentioned(query, movies) {
  const q = stripAccents(query).toLowerCase();
  let best = null;
  for (const m of movies) {
    for (const g of m.generos) {
      const regex = new RegExp('\\b' + escapeRegExp(stripAccents(g)) + '\\b', 'i');
      if (regex.test(q) && (!best || stripAccents(g).toLowerCase().length > best.toLowerCase().length)) {
        best = g;
      }
    }
  }
  return best;
}

/** Encuentra un año mencionado en la consulta (formato 19xx o 20xx). */
function findYearMentioned(query) {
  const match = query.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Elimina el título y las palabras vacías de la consulta (todo sin tildes).
 * Si queda algo significativo (p. ej. "Avatar 2" sobra el "2"), la consulta no
 * se refiere exactamente a ese registro del catálogo.
 */
function residualTokens(q, title) {
  let s = stripAccents(q).toLowerCase();
  s = s.replace(/[¿?¡!,.:;()""'«»]/g, ' ');
  s = s.replace(new RegExp('\\b' + escapeRegExp(stripAccents(title)) + '\\b', 'gi'), ' ');
  const stops = [
    'anos','ano','de','la','el','las','los','en','se','que','quien','cual','cuales',
    'cuando','estreno','estrenos','pelicula','peliculas','titulo','titulos',
    'del','registro','registros','local','catalogo','informacion','genero','generos',
    'director','directores','dirigio','dirigieron','sobre','y','o','una','un',
    'existe','existen','hay','mostrar','ver','dame','busca','buscar','busque',
    'cuales','seria','serían','quiero','necesito','por','favor','me',
  ];
  stops.forEach((w) => {
    s = s.replace(new RegExp('\\b' + escapeRegExp(w) + '\\b', 'gi'), ' ');
  });
  s = s.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Responde una consulta de forma determinista usando solo el dataset local.
 * @returns {{text: string, ids: string[], type: string}}
 */
export function answerQuery(question, movies) {
  const q = (question || '').trim();
  if (!q) {
    return { text: 'Escribe una consulta sobre el catálogo local de MovieSearch.', ids: [], type: 'empty' };
  }

  const ql = q.toLowerCase();
  const movie = findMovieByTitleMentioned(ql, movies);
  const director = findDirectorMentioned(ql, movies);
  const genre = findGenreMentioned(ql, movies);
  const year = findYearMentioned(ql);

  const isCount = /cu[aá]ntas|n[uú]mero|total|cu[aá]ntos/.test(ql);
  const isYearOf = /a[nñ]o|estren|cu[aá]ndo/.test(ql);
  const isDirectorOf = /director|dirig|realiz/.test(ql);
  const isGenreOf = /género|genero|tipo|categor[aí]a/.test(ql);
  const isExist = /existe|hay (?:una )?película|título/.test(ql);

  // 1. Cuántas películas hay en el catálogo
  if (isCount && !movie && !director && !genre && !year) {
    return {
      text: `El catálogo local contiene <strong>${movies.length}</strong> películas registradas (1921–2024).`,
      ids: [...new Set(movies.map((m) => m.id))],
      type: 'count',
    };
  }

  // 2. Consultas sobre una película concreta (título exacto, palabra completa)
  if (movie) {
    const residual = residualTokens(ql, movie.titulo);
    const cleanQuery = residual === '' || /^\d{4}$/.test(residual);
    if (!cleanQuery) {
      // El usuario pidió algo que no está en el catálogo (p. ej. "Avatar 2")
      return { text: NO_DATA, ids: [], type: 'none' };
    }
    if (isYearOf) {
      return {
        text: `Según el registro local, <strong>${movie.titulo}</strong> se estrenó en <strong>${movie.anio}</strong>.`,
        ids: [movie.id],
        type: 'year',
      };
    }
    if (isDirectorOf) {
      const dirs = movie.directores.join(', ');
      return {
        text: `Según el registro local, <strong>${movie.titulo}</strong> fue dirigida por <strong>${dirs}</strong>.`,
        ids: [movie.id],
        type: 'director',
      };
    }
    if (isGenreOf) {
      const gens = movie.generos.join(', ');
      return {
        text: `Según el registro local, <strong>${movie.titulo}</strong> pertenece al/los género(s): <strong>${gens}</strong>.`,
        ids: [movie.id],
        type: 'genre',
      };
    }
    return {
      text: `Registro encontrado: <strong>${movie.titulo}</strong> (${movie.anio}). Géneros: ${movie.generos.join(', ')}. Director(es): ${movie.directores.join(', ')}.`,
      ids: [movie.id],
      type: 'movie',
    };
  }

  // 3. Películas de un director
  if (director && /películas|peliculas/.test(ql)) {
    const list = movies.filter((m) => m.directores.some((d) => d.toLowerCase() === director.toLowerCase()));
    if (list.length) {
      return {
        text: `Películas de <strong>${director}</strong> en el catálogo local: <strong>${list.map((m) => m.titulo).join(', ')}</strong>.`,
        ids: list.map((m) => m.id),
        type: 'director-list',
      };
    }
    return { text: NO_DATA, ids: [], type: 'none' };
  }

  // 4. Películas de un año
  if (year && (/películas|peliculas|estrenadas/.test(ql) || isYearOf)) {
    const list = movies.filter((m) => m.anio === year);
    if (list.length) {
      return {
        text: `Películas estrenadas en <strong>${year}</strong>: <strong>${list.map((m) => m.titulo).join(', ')}</strong>.`,
        ids: list.map((m) => m.id),
        type: 'year-list',
      };
    }
    return { text: NO_DATA, ids: [], type: 'none' };
  }

  // 5. Películas de un género
  if (genre && /películas|peliculas|género|genero/.test(ql)) {
    const list = movies.filter((m) => m.generos.some((g) => g.toLowerCase() === genre.toLowerCase()));
    if (list.length) {
      return {
        text: `Películas del género <strong>${genre}</strong>: <strong>${list.map((m) => m.titulo).join(', ')}</strong>.`,
        ids: list.map((m) => m.id),
        type: 'genre-list',
      };
    }
    return { text: NO_DATA, ids: [], type: 'none' };
  }

  // 6. Existencia de una película
  if (isExist) {
    if (movie) {
      return {
        text: `Sí, <strong>${movie.titulo}</strong> (${movie.anio}) está registrada en el catálogo local.`,
        ids: [movie.id],
        type: 'exist',
      };
    }
    return { text: NO_DATA, ids: [], type: 'none' };
  }

  // 7. No se pudo responder con los datos disponibles
  return { text: NO_DATA, ids: [], type: 'none' };
}
