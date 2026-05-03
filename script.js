/* ============================================================
   SÉRÉNITÉ — Massage à Domicile
   script.js
   ============================================================ */

/* ---- Header scroll effect ---- */
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ---- Mobile bottom nav — active state on scroll ---- */
const sections = document.querySelectorAll('section[id], div[id]');
const mobileNavItems = document.querySelectorAll('.mobile-nav__item');

const observerNav = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      mobileNavItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === `#${id}`) {
          item.classList.add('active');
        }
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => observerNav.observe(s));

/* ---- Smooth scroll for all anchor links ---- */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = window.innerWidth < 768 ? 0 : 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ---- Scroll animations ---- */
const animElements = document.querySelectorAll(
  '.service-card, .step, .review-card, .faq__item, .info-card, .about__content, .about__img, .hero__trust'
);

animElements.forEach((el, i) => {
  el.setAttribute('data-animate', '');
  if (i % 3 === 1) el.setAttribute('data-animate-delay', '1');
  if (i % 3 === 2) el.setAttribute('data-animate-delay', '2');
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

animElements.forEach(el => observer.observe(el));

/* ---- Set min date for reservation (24h minimum) ---- */
const dateInput = document.getElementById('date');
if (dateInput) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  dateInput.setAttribute('min', tomorrow.toISOString().split('T')[0]);
}

/* ---- Booking form with Supabase ---- */
const bookingForm = document.getElementById('bookingForm');
const heureSelect = document.getElementById('heure');

const ALL_SLOTS = ['09h00','10h00','11h00','12h00','13h00','14h00','15h00','16h00','17h00','18h00','19h00','20h00','21h00'];

async function updateAvailableSlots(date) {
  if (!heureSelect || !date) return;
  heureSelect.innerHTML = '<option value="">Choisir un créneau</option>';
  ALL_SLOTS.forEach(slot => {
    const opt = document.createElement('option');
    opt.value = slot;
    opt.textContent = slot;
    heureSelect.appendChild(opt);
  });
  const { data, error } = await sb.rpc('get_booked_slots', { date_param: date });
  if (error) { console.error(error); return; }
  const booked = data.map(r => r.heure);
  heureSelect.querySelectorAll('option[value]').forEach(opt => {
    if (booked.includes(opt.value)) {
      opt.disabled = true;
      opt.textContent = opt.value + ' — Indisponible';
    }
  });
}

if (dateInput) {
  dateInput.addEventListener('change', () => updateAvailableSlots(dateInput.value));
}

if (bookingForm) {
  bookingForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = bookingForm.querySelector('[type="submit"]');
    const original = btn.innerHTML;

    const soin    = document.getElementById('soin').value;
    const date    = dateInput ? dateInput.value : '';
    const heure   = heureSelect ? heureSelect.value : '';
    const prenom  = document.getElementById('prenom').value.trim();
    const nom     = document.getElementById('nom').value.trim();
    const email   = document.getElementById('email').value.trim();
    const tel     = document.getElementById('tel').value.trim();
    const adresse = document.getElementById('adresse').value.trim();
    const message = document.getElementById('message').value.trim() || null;

    // Validation explicite (les navigateurs mobiles n'appliquent pas toujours required)
    if (!prenom || !nom || !email || !tel || !adresse || !soin || !date || !heure) {
      btn.innerHTML = '⚠ Veuillez remplir tous les champs';
      btn.style.background = '#C0392B';
      setTimeout(() => { btn.innerHTML = original; btn.style.background = ''; }, 3000);
      return;
    }

    btn.innerHTML = 'Envoi en cours…';
    btn.disabled = true;

    const duree = soin.includes('90 min') ? 90 : soin.includes('30 min') ? 30 : 60;

    try {
      const { error } = await sb.from('reservations').insert([{
        prenom, nom, email, tel, adresse, soin, duree, date, heure, message,
      }]);

      if (error) {
        console.error('Supabase error:', error);
        if (error.code === '23505') {
          btn.innerHTML = '⚠ Ce créneau vient d\'être pris — choisissez une autre heure';
          updateAvailableSlots(date);
        } else {
          btn.innerHTML = '⚠ Erreur, réessayez';
        }
        btn.style.background = '#C0392B';
        setTimeout(() => { btn.innerHTML = original; btn.style.background = ''; btn.disabled = false; }, 4000);
        return;
      }

      showConfirmModal({ prenom, nom, soin, date, heure, adresse });
      btn.innerHTML = original;
      btn.style.background = '';
      btn.disabled = false;
      bookingForm.reset();
      if (date) {
        await updateAvailableSlots(date);
      } else {
        heureSelect.innerHTML = '<option value="">Choisir un créneau</option>';
        ALL_SLOTS.forEach(slot => {
          const opt = document.createElement('option');
          opt.value = slot;
          opt.textContent = slot;
          heureSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('Submit error:', err);
      btn.innerHTML = '⚠ Erreur réseau, réessayez';
      btn.style.background = '#C0392B';
      setTimeout(() => { btn.innerHTML = original; btn.style.background = ''; btn.disabled = false; }, 4000);
    }
  });
}

/* ---- Modal confirmation ---- */
function formatDateFr(isoDate) {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Africa/Brazzaville'
  });
}

function showConfirmModal({ prenom, nom, soin, date, heure, adresse }) {
  const modal   = document.getElementById('confirmModal');
  const details = document.getElementById('confirmDetails');
  if (!modal || !details) return;

  const SVG = {
    client:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
    soin:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c-4.97-2.5-8-6-8-10V5l8-3 8 3v7c0 4-3.03 7.5-8 10z"/></svg>`,
    date:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    heure:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
    adresse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  };

  const rows = [
    { icon: SVG.client,  label: 'Client',  val: `${prenom} ${nom}` },
    { icon: SVG.soin,    label: 'Soin',    val: soin },
    { icon: SVG.date,    label: 'Date',    val: formatDateFr(date) },
    { icon: SVG.heure,   label: 'Heure',   val: heure },
    { icon: SVG.adresse, label: 'Adresse', val: adresse },
  ];

  details.innerHTML = rows.map(r => `
    <div class="confirm-modal__row">
      <span class="confirm-modal__row-icon">${r.icon}</span>
      <span class="confirm-modal__row-label">${r.label}</span>
      <span class="confirm-modal__row-val">${escapeHtml(r.val)}</span>
    </div>`).join('');

  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

function closeConfirmModal() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

document.getElementById('confirmModalClose')?.addEventListener('click', closeConfirmModal);
document.getElementById('confirmModalOk')?.addEventListener('click', closeConfirmModal);
document.getElementById('confirmModalOverlay')?.addEventListener('click', closeConfirmModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeConfirmModal(); });

/* ---- Burger menu (mobile header) ---- */
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
if (burger && nav) {
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('nav--open');
    burger.setAttribute('aria-expanded', open);
  });
}

/* ---- Avis clients — Supabase ---- */
const sb = window.supabase.createClient(
  'https://goqetlemaqvcdhjqrygx.supabase.co',
  'sb_publishable_e8D5ARaw7MAILFZGNXYwBg_UjoWBrOK'
);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function relativeDate(isoStr) {
  const days = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'il y a 1 jour';
  if (days < 7) return `il y a ${days} jours`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? 'il y a 1 semaine' : `il y a ${weeks} semaines`;
  const months = Math.floor(days / 30);
  return months <= 1 ? 'il y a 1 mois' : `il y a ${months} mois`;
}

function updateReviewStats(reviews) {
  const total = reviews.length;
  if (total === 0) return;
  const avg = reviews.reduce((s, r) => s + r.note, 0) / total;
  const fullStars = Math.round(avg);
  const starsEl = document.getElementById('reviewsStars');
  const avgEl   = document.getElementById('reviewsAvg');
  const countEl = document.getElementById('reviewsCount');
  if (starsEl) starsEl.textContent = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  if (avgEl)   avgEl.textContent   = `${avg.toFixed(1)} / 5`;
  if (countEl) countEl.textContent = `${total} avis vérifiés`;
}

function buildReviewCard(rv) {
  const initials = escapeHtml(rv.prenom.trim().slice(0, 2).toUpperCase());
  const stars = '★'.repeat(rv.note) + '☆'.repeat(5 - rv.note);
  const loc = rv.quartier ? escapeHtml(rv.quartier) + ' · ' : '';
  return `<div class="review-card review-card--new">
      <span class="review-card__new-badge">Avis client</span>
      <div class="review-card__stars">${stars}</div>
      <p>"${escapeHtml(rv.texte)}"</p>
      <div class="review-card__author">
        <div class="avatar">${initials}</div>
        <div>
          <strong>${escapeHtml(rv.prenom)}</strong>
          <span>${loc}${relativeDate(rv.created_at)}</span>
        </div>
      </div>
    </div>`;
}

function appendReviewCard(rv, grid) {
  const temp = document.createElement('div');
  temp.innerHTML = buildReviewCard(rv);
  const card = temp.firstElementChild;
  grid.appendChild(card);
  card.setAttribute('data-animate', '');
  requestAnimationFrame(() => card.classList.add('is-visible'));
  return card;
}

const reviewsGrid = document.getElementById('reviewsGrid');
const REVIEWS_PER_PAGE = 3;
let allReviews = [];
let currentPage = 1;

function renderPage(page) {
  reviewsGrid.innerHTML = '';
  const start = (page - 1) * REVIEWS_PER_PAGE;
  allReviews.slice(start, start + REVIEWS_PER_PAGE).forEach(rv => appendReviewCard(rv, reviewsGrid));

  const totalPages = Math.ceil(allReviews.length / REVIEWS_PER_PAGE);
  const paginationEl = document.getElementById('reviewsPagination');
  const infoEl       = document.getElementById('paginationInfo');
  const prevBtn      = document.getElementById('paginationPrev');
  const nextBtn      = document.getElementById('paginationNext');

  if (totalPages > 1) {
    paginationEl.removeAttribute('hidden');
    infoEl.textContent = `${page} / ${totalPages}`;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages;
  } else {
    paginationEl.setAttribute('hidden', '');
  }
}

async function loadReviews() {
  if (!reviewsGrid) return;
  const { data, error } = await sb
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('Supabase load error:', error); return; }
  allReviews = data;
  renderPage(1);
  updateReviewStats(data);
}

loadReviews();

document.getElementById('paginationPrev')?.addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; renderPage(currentPage); }
});
document.getElementById('paginationNext')?.addEventListener('click', () => {
  if (currentPage < Math.ceil(allReviews.length / REVIEWS_PER_PAGE)) { currentPage++; renderPage(currentPage); }
});

/* Toggle form */
const SVG_EDIT  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
const SVG_CLOSE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const toggleReviewBtn = document.getElementById('toggleReviewForm');
const reviewForm = document.getElementById('reviewForm');
if (toggleReviewBtn && reviewForm) {
  toggleReviewBtn.addEventListener('click', () => {
    const hidden = reviewForm.hasAttribute('hidden');
    if (hidden) {
      reviewForm.removeAttribute('hidden');
      toggleReviewBtn.innerHTML = `${SVG_CLOSE}<span>Annuler</span>`;
      setTimeout(() => reviewForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } else {
      reviewForm.setAttribute('hidden', '');
      toggleReviewBtn.innerHTML = `${SVG_EDIT}<span>Partager votre expérience</span>`;
    }
  });
}

/* Star picker */
const starPicker = document.getElementById('starPicker');
const rvNote    = document.getElementById('rv-note');
let starBtns    = [];

if (starPicker && rvNote) {
  starBtns = [...starPicker.querySelectorAll('.star-btn')];

  function highlightStars(upTo) {
    starBtns.forEach(b => {
      b.style.color = parseInt(b.dataset.val) <= upTo ? 'var(--gold)' : '';
    });
  }

  starBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.val);
      rvNote.value = val;
      starBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.val) <= val));
    });
    btn.addEventListener('mouseenter', () => highlightStars(parseInt(btn.dataset.val)));
  });
  starPicker.addEventListener('mouseleave', () => highlightStars(parseInt(rvNote.value) || 0));
}

/* Soumission de l'avis */
if (reviewForm) {
  reviewForm.addEventListener('submit', async e => {
    e.preventDefault();
    const prenom = document.getElementById('rv-prenom').value.trim();
    const note   = parseInt(rvNote.value) || 0;
    const texte  = document.getElementById('rv-texte').value.trim();
    const rvError = document.getElementById('rv-error');

    if (!prenom || note === 0 || !texte) {
      rvError.removeAttribute('hidden');
      return;
    }
    rvError.setAttribute('hidden', '');

    const submitBtn   = reviewForm.querySelector('[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Envoi en cours…';
    submitBtn.disabled  = true;

    const { data, error } = await sb
      .from('reviews')
      .insert([{
        prenom,
        quartier: document.getElementById('rv-quartier').value.trim() || null,
        note,
        texte
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      submitBtn.innerHTML = '⚠ Erreur, réessayez';
      submitBtn.style.background = '#C0392B';
      setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
      }, 3000);
      return;
    }

    /* Insère le nouvel avis en tête et repasse à la page 1 */
    allReviews.unshift(data);
    updateReviewStats(allReviews);
    currentPage = 1;
    renderPage(1);

    submitBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Merci pour votre avis !';
    submitBtn.style.background = 'var(--sage-dark)';

    setTimeout(() => {
      reviewForm.reset();
      rvNote.value = '0';
      starBtns.forEach(b => { b.classList.remove('active'); b.style.color = ''; });
      reviewForm.setAttribute('hidden', '');
      if (toggleReviewBtn) toggleReviewBtn.innerHTML = `${SVG_EDIT}<span>Partager votre expérience</span>`;
      submitBtn.innerHTML = originalText;
      submitBtn.style.background = '';
      submitBtn.disabled = false;
      reviewsGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 2000);
  });
}
