/**
 * ui.js — Renderizado de la interfaz: tarjetas, filtros, modal y asistente.
 */
import { findById } from './data.js';

/** Escapa HTML para evitar inyección de contenido. */
export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/** Renderiza una lista de películas como tarjetas en el contenedor dado. */
export function renderMovies(list, container) {
  container.innerHTML = '';
  if (list.length === 0) {
    container.innerHTML = '<div class="empty">No se encontraron películas con esos filtros.</div>';
    return;
  }
  const fragment = document.createDocumentFragment();
  list.forEach((movie) => fragment.appendChild(createCard(movie)));
  container.appendChild(fragment);
}

/** Crea una tarjeta de película. */
function createCard(movie) {
  const article = document.createElement('article');
  article.className = 'card';
  article.dataset.id = movie.id;

  const genChips = movie.generos.map((g) => `<span class="chip">${escapeHtml(g)}</span>`).join('');
  const directores = escapeHtml(movie.directores.join(', '));

  article.innerHTML = `
    <div class="card-media" aria-label="Póster de ${escapeHtml(movie.titulo)}">
      <img class="card-poster" src="${escapeHtml(movie.poster)}" alt="Póster de ${escapeHtml(movie.titulo)}" loading="lazy" decoding="async" onerror="this.src='images/posters/placeholder.svg'">
      <span class="card-year">${movie.anio}</span>
    </div>
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(movie.titulo)}</h3>
      <div class="card-genres">${genChips}</div>
      <div class="card-director"><span class="label">Dir.</span> ${directores}</div>
      <button class="card-btn" type="button">Ver detalles</button>
    </div>
  `;

  const btn = article.querySelector('.card-btn');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDetail(movie);
  });
  article.addEventListener('click', () => openDetail(movie));

  return article;
}

/** Abre el modal con los detalles disponibles de una película. */
export function openDetail(movie) {
  const modal = document.getElementById('detail-modal');
  const body = document.getElementById('modal-body');

  const generos = movie.generos.length ? movie.generos.map(escapeHtml).join(', ') : 'No disponible';
  const directores = movie.directores.length ? movie.directores.map(escapeHtml).join(', ') : 'No disponible';
  const sinopsis = movie.sinopsis
    ? escapeHtml(movie.sinopsis)
    : '<span style="color: var(--text-muted)">Sinopsis no disponible en el registro local.</span>';

  body.innerHTML = `
    <span class="detail-id">${escapeHtml(movie.id)}</span>
    <span class="detail-year">${movie.anio}</span>
    <h1>${escapeHtml(movie.titulo)}</h1>
    <div class="detail-row"><strong>Géneros</strong><span>${generos}</span></div>
    <div class="detail-row"><strong>Director(es)</strong><span>${directores}</span></div>
    <div class="detail-row"><strong>Sinopsis</strong><span>${sinopsis}</span></div>
    <div class="detail-source">${escapeHtml(movie.fuente_verificacion)}</div>
  `;

  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

/** Cierra el modal de detalles. */
export function closeDetail() {
  const modal = document.getElementById('detail-modal');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/** Rellena un <select> de filtros con valores únicos. */
export function populateFilters(select, values) {
  const current = select.value;
  select.innerHTML = '<option value="">Seleccionar</option>';
  values.forEach((v) => {
    const option = document.createElement('option');
    option.value = v;
    option.textContent = v;
    select.appendChild(option);
  });
  if (values.includes(current)) select.value = current;
}

/** Muestra la respuesta del asistente, citando los IDs de los registros que la respaldan. */
export function showAssistantResponse(el, html, ids) {
  let idsHtml = '';
  if (ids && ids.length) {
    const chips = ids.map((id) => `<span class="id-chip">${escapeHtml(id)}</span>`).join('');
    const extra = ids.length > 10 ? `<span class="id-chip">… +${ids.length - 10} más</span>` : '';
    idsHtml = `<div class="ids"><strong>Registros:</strong> ${chips}${extra}</div>`;
  }
  el.innerHTML = html + idsHtml;
}
