'use strict';

/* ============================================================
   ADMIN — Maison Anaya
   Authentification Supabase Auth (email + mot de passe)
   Créer le compte admin dans : Supabase dashboard > Auth > Users
   ============================================================ */

const SUPABASE_URL = 'https://goqetlemaqvcdhjqrygx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_e8D5ARaw7MAILFZGNXYwBg_UjoWBrOK';
const REVIEWS_PER_PAGE = 10;

let sb;
let allReservations = [];
let allReviews      = [];
let currentPeriod   = 'day';
let reviewsPage     = 1;
let pendingDeleteId = null;

/* ── Initialisation ──────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    showDashboard(session.user);
    loadAll();
  } else {
    showLogin();
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      showDashboard(session.user);
      loadAll();
    } else if (event === 'SIGNED_OUT') {
      showLogin();
    }
  });

  bindEvents();
});

/* ── Événements ──────────────────────────────────────────── */

function bindEvents() {
  // Login / logout
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('refreshBtn').addEventListener('click', handleRefresh);

  // Onglets de période
  document.querySelectorAll('.period-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPeriod = btn.dataset.period;
      document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateStats();
      updateServicesChart();
    });
  });

  // Filtres
  document.getElementById('reservationsFilter').addEventListener('change', renderReservations);
  document.getElementById('reviewsSort').addEventListener('change', () => {
    reviewsPage = 1;
    renderReviews();
  });

  // Modal suppression
  document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);
  document.getElementById('deleteModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDeleteModal();
  });

  // Modal détail
  document.getElementById('detailCloseBtn').addEventListener('click', closeDetailModal);
  document.getElementById('detailModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetailModal();
  });

  // Délégation : actions sur les avis
  document.getElementById('reviewsList').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="delete-review"]');
    if (btn) openDeleteModal(btn.dataset.id, btn.dataset.prenom);
  });

  // Délégation : actions sur les réservations
  document.getElementById('reservationsTbody').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="show-detail"]');
    if (btn) showReservationDetail(btn.dataset.id);
  });

  // Délégation : pagination
  document.getElementById('reviewsPagination').addEventListener('click', e => {
    const btn = e.target.closest('button[data-page]');
    if (btn) {
      reviewsPage = parseInt(btn.dataset.page, 10);
      renderReviews();
      document.getElementById('reviewsList').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Échap ferme les modales
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDeleteModal(); closeDetailModal(); }
  });
}

/* ── Authentification ────────────────────────────────────── */

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const btn      = document.getElementById('loginBtn');
  const errEl    = document.getElementById('loginError');

  btn.disabled    = true;
  btn.textContent = 'Connexion…';
  errEl.hidden    = true;

  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    errEl.textContent = 'Email ou mot de passe incorrect.';
    errEl.hidden      = false;
    btn.disabled      = false;
    btn.textContent   = 'Connexion';
  }
}

async function handleLogout() {
  await sb.auth.signOut();
}

/* ── Changement de vue ───────────────────────────────────── */

function showLogin() {
  document.getElementById('loginView').hidden    = false;
  document.getElementById('dashboardView').hidden = true;
  allReservations = [];
  allReviews      = [];
}

function showDashboard(user) {
  document.getElementById('loginView').hidden    = true;
  document.getElementById('dashboardView').hidden = false;
  document.getElementById('adminUserEmail').textContent = user.email;
}

/* ── Chargement des données ──────────────────────────────── */

async function loadAll() {
  await Promise.all([loadReservations(), loadReviews()]);
  setLastUpdated();
}

async function loadReservations() {
  const { data, error } = await sb
    .from('reservations')
    .select('*')
    .order('date',  { ascending: true })
    .order('heure', { ascending: true });

  if (!error && data) {
    allReservations = data;
    updateStats();
    renderReservations();
    updateServicesChart();
  }
}

async function loadReviews() {
  const { data, error } = await sb
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (!error && data) {
    allReviews = data;
    renderReviewStats();
    renderReviews();
  }
}

async function handleRefresh() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');
  btn.disabled = true;
  await loadAll();
  btn.classList.remove('spinning');
  btn.disabled = false;
}

function setLastUpdated() {
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('lastUpdated').textContent = `Données mises à jour à ${now}`;
}

/* ── Statistiques ────────────────────────────────────────── */

function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateRange(period) {
  const now   = new Date();
  const today = toLocalDateStr(now);

  if (period === 'day') return { start: today, end: today };

  if (period === 'week') {
    const d   = new Date(now);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return { start: toLocalDateStr(d), end: today };
  }

  if (period === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toLocalDateStr(d), end: today };
  }

  return { start: '2000-01-01', end: '9999-12-31' };
}

function filterByPeriod(reservations, period) {
  const { start, end } = getDateRange(period);
  return reservations.filter(r => r.date >= start && r.date <= end);
}

function extractPrice(soin) {
  if (!soin) return 0;
  const clean = soin.replace(/[\s  ]/g, '');
  const match = clean.match(/(\d+)FCFA/i);
  return match ? parseInt(match[1], 10) : 0;
}

function formatCFA(amount) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

function updateStats() {
  const filtered = filterByPeriod(allReservations, currentPeriod);
  const revenue  = filtered.reduce((s, r) => s + extractPrice(r.soin), 0);

  document.getElementById('statReservations').textContent = filtered.length;
  document.getElementById('statRevenue').textContent      = formatCFA(revenue);

  const labels = { day: "aujourd'hui", week: 'cette semaine', month: 'ce mois', all: 'au total' };
  document.getElementById('servicesPeriodLabel').textContent = labels[currentPeriod] || '';
}

function renderReviewStats() {
  const count = allReviews.length;
  const avg   = count > 0
    ? (allReviews.reduce((s, r) => s + (r.note || 0), 0) / count).toFixed(1)
    : null;

  document.getElementById('statReviews').textContent   = count;
  document.getElementById('statAvgRating').textContent = avg ? `${avg} ★` : '—';
  document.getElementById('reviewsBadge').textContent  = count;
}

/* ── Graphique revenus par soin ──────────────────────────── */

function updateServicesChart() {
  const filtered  = filterByPeriod(allReservations, currentPeriod);
  const container = document.getElementById('servicesChart');

  if (filtered.length === 0) {
    container.innerHTML = '<p class="no-data-msg">Aucune réservation sur cette période.</p>';
    return;
  }

  const map = {};
  filtered.forEach(r => {
    const raw  = r.soin || '';
    const name = raw.includes('·') ? raw.split('·')[0].trim() : raw.split('—')[0].trim() || 'Inconnu';
    const price = extractPrice(raw);
    if (!map[name]) map[name] = { count: 0, revenue: 0 };
    map[name].count++;
    map[name].revenue += price;
  });

  const entries = Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  const maxRev  = Math.max(...entries.map(e => e[1].revenue), 1);

  container.innerHTML = entries.map(([name, s]) => {
    const pct = ((s.revenue / maxRev) * 100).toFixed(1);
    return `
      <div class="service-bar-row">
        <div class="service-bar-label" title="${esc(name)}">${esc(name)}</div>
        <div class="service-bar-track">
          <div class="service-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="service-bar-stats">
          <span class="service-bar-count">${s.count} rés.</span>
          <span class="service-bar-revenue">${formatCFA(s.revenue)}</span>
        </div>
      </div>`;
  }).join('');
}

/* ── Tableau des réservations ────────────────────────────── */

function renderReservations() {
  const filter   = document.getElementById('reservationsFilter').value;
  const todayStr = toLocalDateStr(new Date());
  const in7days  = toLocalDateStr(new Date(Date.now() + 7 * 86400000));

  let list = [...allReservations];

  switch (filter) {
    case 'upcoming': list = list.filter(r => r.date >= todayStr && r.date <= in7days); break;
    case 'today':    list = list.filter(r => r.date === todayStr); break;
    case 'past':     list = list.filter(r => r.date < todayStr);  break;
  }

  list.sort((a, b) => {
    const da = `${a.date}${a.heure || ''}`;
    const db = `${b.date}${b.heure || ''}`;
    return da < db ? -1 : da > db ? 1 : 0;
  });

  const upcoming = allReservations.filter(r => r.date >= todayStr && r.date <= in7days).length;
  document.getElementById('reservationsBadge').textContent = upcoming;

  const tbody = document.getElementById('reservationsTbody');

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="td-center td-muted">Aucune réservation sur cette période.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => {
    const isToday = r.date === todayStr;
    const isPast  = r.date < todayStr;
    const cls     = isToday ? 'row-today' : isPast ? 'row-past' : '';
    const phone   = esc(r.tel || '');
    const id      = esc(String(r.id));
    return `
      <tr class="${cls}">
        <td>${formatDateShort(r.date)}</td>
        <td>${esc(r.heure || '—')}</td>
        <td><strong>${esc(r.prenom || '')} ${esc(r.nom || '')}</strong></td>
        <td class="soin-cell" title="${esc(r.soin || '')}">${esc(r.soin || '—')}</td>
        <td><a href="tel:${phone}">${phone}</a></td>
        <td>${esc(r.adresse || '—')}</td>
        <td>
          <button class="btn-detail" data-action="show-detail" data-id="${id}" title="Voir les détails">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function formatDateShort(isoDate) {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/* ── Liste des avis ──────────────────────────────────────── */

function renderReviews() {
  const sort   = document.getElementById('reviewsSort').value;
  let sorted   = [...allReviews];

  if (sort === 'best')  sorted.sort((a, b) => b.note - a.note);
  if (sort === 'worst') sorted.sort((a, b) => a.note - b.note);

  const start = (reviewsPage - 1) * REVIEWS_PER_PAGE;
  const page  = sorted.slice(start, start + REVIEWS_PER_PAGE);

  const container = document.getElementById('reviewsList');

  if (page.length === 0) {
    container.innerHTML = '<p class="no-data-msg">Aucun avis pour le moment.</p>';
    renderPagination(0);
    return;
  }

  container.innerHTML = page.map(buildReviewRow).join('');
  renderPagination(sorted.length);
}

function buildReviewRow(rv) {
  const note     = rv.note || 0;
  const stars    = '★'.repeat(note) + '☆'.repeat(5 - note);
  const date     = new Date(rv.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const location = rv.quartier ? ` · ${esc(rv.quartier)}` : '';
  const id       = esc(String(rv.id));
  const prenom   = esc(rv.prenom || '');

  return `
    <div class="review-item" id="review-${id}">
      <div class="review-header">
        <span class="review-stars">${stars}</span>
        <div class="review-meta">
          <strong>${prenom}</strong>${location}
          <span class="review-date">${date}</span>
        </div>
        <button class="btn-delete"
          data-action="delete-review"
          data-id="${id}"
          data-prenom="${prenom}"
          aria-label="Supprimer l'avis de ${prenom}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
          Supprimer
        </button>
      </div>
      <p class="review-text">&ldquo;${esc(rv.texte || '')}&rdquo;</p>
    </div>`;
}

function renderPagination(total) {
  const totalPages = Math.ceil(total / REVIEWS_PER_PAGE);
  const container  = document.getElementById('reviewsPagination');

  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  if (reviewsPage > 1) {
    html += `<button data-page="${reviewsPage - 1}">← Précédent</button>`;
  }
  html += `<span>Page ${reviewsPage} / ${totalPages}</span>`;
  if (reviewsPage < totalPages) {
    html += `<button data-page="${reviewsPage + 1}">Suivant →</button>`;
  }
  container.innerHTML = html;
}

/* ── Modal : suppression d'un avis ──────────────────────── */

function openDeleteModal(id, prenom) {
  pendingDeleteId = id;
  document.getElementById('deleteModalText').textContent =
    `Supprimer l'avis de "${prenom}" ? Cette action est irréversible.`;
  document.getElementById('deleteModal').hidden = false;
  document.getElementById('deleteCancelBtn').focus();
}

function closeDeleteModal() {
  document.getElementById('deleteModal').hidden = true;
  pendingDeleteId = null;
}

async function confirmDelete() {
  if (!pendingDeleteId) return;

  const btn = document.getElementById('deleteConfirmBtn');
  btn.disabled    = true;
  btn.textContent = 'Suppression…';

  const idValue = isNaN(pendingDeleteId) ? pendingDeleteId : Number(pendingDeleteId);
  const { error } = await sb.from('reviews').delete().eq('id', idValue);

  if (error) {
    alert(
      'Erreur lors de la suppression.\n\n' +
      'Si le problème persiste, allez dans Supabase > Table Editor > reviews > RLS,\n' +
      'et ajoutez une policy DELETE pour les utilisateurs authentifiés.'
    );
  } else {
    allReviews = allReviews.filter(r => String(r.id) !== String(pendingDeleteId));
    renderReviewStats();
    renderReviews();
  }

  btn.disabled  = false;
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg> Supprimer définitivement`;

  closeDeleteModal();
}

/* ── Modal : détail d'une réservation ───────────────────── */

function showReservationDetail(id) {
  const r = allReservations.find(x => String(x.id) === String(id));
  if (!r) return;

  const price    = extractPrice(r.soin || '');
  const dateStr  = formatDateShort(r.date);

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-grid">
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value">${dateStr}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Heure</span>
        <span class="detail-value">${esc(r.heure || '—')}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Prénom</span>
        <span class="detail-value">${esc(r.prenom || '—')}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Nom</span>
        <span class="detail-value">${esc(r.nom || '—')}</span>
      </div>
      <div class="detail-row full">
        <span class="detail-label">Soin</span>
        <span class="detail-value">${esc(r.soin || '—')}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Téléphone</span>
        <span class="detail-value">
          <a href="tel:${esc(r.tel || '')}">${esc(r.tel || '—')}</a>
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Email</span>
        <span class="detail-value">
          <a href="mailto:${esc(r.email || '')}">${esc(r.email || '—')}</a>
        </span>
      </div>
      <div class="detail-row full">
        <span class="detail-label">Adresse</span>
        <span class="detail-value">${esc(r.adresse || '—')}</span>
      </div>
      ${r.message ? `
      <div class="detail-row full">
        <span class="detail-label">Notes / Contraindications</span>
        <span class="detail-value">${esc(r.message)}</span>
      </div>` : ''}
      ${price > 0 ? `
      <div class="detail-row">
        <span class="detail-label">Montant</span>
        <span class="detail-value detail-amount">${formatCFA(price)}</span>
      </div>` : ''}
    </div>`;

  document.getElementById('detailModal').hidden = false;
  document.getElementById('detailCloseBtn').focus();
}

function closeDetailModal() {
  document.getElementById('detailModal').hidden = true;
}

/* ── Utilitaires ─────────────────────────────────────────── */

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
