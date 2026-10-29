/**
 * app.js — Punto de entrada. Conecta datos, catálogo, asistente e interfaz.
 */
import { loadDataset, getMovies, getMetadata, getRules } from './data.js';
import { applyFilters, getUniqueYears, getUniqueGenres, getUniqueDirectors } from './catalog.js';
import { answerQuery } from './assistant.js';
import {
  renderMovies, populateFilters, showAssistantResponse, openDetail, closeDetail,
} from './ui.js';

const els = {
  gallery: document.getElementById('gallery'),
  search: document.getElementById('search'),
  resetSearch: document.getElementById('reset-search'),
  filterYear: document.getElementById('filter-year'),
  filterGenre: document.getElementById('filter-genre'),
  filterDirector: document.getElementById('filter-director'),
  clearFilters: document.getElementById('clear-filters'),
  resultsCount: document.getElementById('results-count'),
  count: document.getElementById('count'),
  total: document.getElementById('total'),
  statCount: document.getElementById('stat-count'),
  statYears: document.getElementById('stat-years'),
  assistantQuery: document.getElementById('assistant-query'),
  assistantAsk: document.getElementById('assistant-ask'),
  assistantResponse: document.getElementById('assistant-response'),
  detailModal: document.getElementById('detail-modal'),
  modalBackdrop: document.getElementById('modal-backdrop'),
  modalClose: document.getElementById('modal-close'),
};

let movies = [];

function getFilters() {
  return {
    title: els.search.value,
    year: els.filterYear.value,
    genre: els.filterGenre.value,
    director: els.filterDirector.value,
  };
}

function handleFilters() {
  const filters = getFilters();
  const filtered = applyFilters(movies, filters);
  const anyActive =
    filters.title || filters.year || filters.genre || filters.director;
  els.resultsCount.style.display = anyActive ? 'block' : 'none';
  els.count.textContent = filtered.length;
  els.total.textContent = movies.length;
  renderMovies(filtered, els.gallery);
}

function handleAssistant() {
  const q = els.assistantQuery.value.trim();
  if (!q) return;
  const { text, ids } = answerQuery(q, movies);
  showAssistantResponse(els.assistantResponse, text, ids);
}

async function init() {
  try {
    await loadDataset();
    movies = getMovies();

    const metadata = getMetadata();
    const rules = getRules();
    if (metadata) {
      els.statCount.textContent = movies.length;
      const years = getUniqueYears(movies);
      els.statYears.textContent = years.length ? `${years[years.length - 1]}–${years[0]}` : '-';
    }
    if (rules && rules.respuesta_sin_datos) {
      // La respuesta sin datos proviene de las reglas del dataset; assistant.js la usa.
    }

    // Poblar selects de filtros
    populateFilters(els.filterYear, getUniqueYears(movies));
    populateFilters(els.filterGenre, getUniqueGenres(movies));
    populateFilters(els.filterDirector, getUniqueDirectors(movies));

    // Render inicial
    renderMovies(movies, els.gallery);

    // Eventos de búsqueda y filtros
    els.search.addEventListener('input', () => {
      els.resetSearch.style.display = els.search.value ? 'block' : 'none';
      handleFilters();
    });
    els.resetSearch.addEventListener('click', () => {
      els.search.value = '';
      els.resetSearch.style.display = 'none';
      handleFilters();
    });
    [els.filterYear, els.filterGenre, els.filterDirector].forEach((select) => {
      select.addEventListener('change', handleFilters);
    });
    els.clearFilters.addEventListener('click', () => {
      els.search.value = '';
      els.filterYear.value = '';
      els.filterGenre.value = '';
      els.filterDirector.value = '';
      els.resetSearch.style.display = 'none';
      handleFilters();
    });

    // Eventos del asistente
    els.assistantAsk.addEventListener('click', handleAssistant);
    els.assistantQuery.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAssistant();
    });

    // Cierre del modal
    els.modalClose.addEventListener('click', closeDetail);
    els.modalBackdrop.addEventListener('click', closeDetail);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDetail();
    });
  } catch (error) {
    console.error(error);
    els.gallery.innerHTML =
      '<div class="empty">No se pudo cargar el catálogo local. Inicia un servidor local (ver instrucciones del README) y recarga la página.</div>';
  }
}

init();
