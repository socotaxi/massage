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

/* ---- Set min date for reservation ---- */
const dateInput = document.getElementById('date');
if (dateInput) {
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
}

/* ---- Booking form ---- */
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  bookingForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = bookingForm.querySelector('[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = '✓ Demande envoyée — Confirmation sous 15 min';
    btn.style.background = '#5F8264';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = '';
      btn.disabled = false;
      bookingForm.reset();
    }, 5000);
  });
}

/* ---- Burger menu (mobile header) ---- */
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
if (burger && nav) {
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('nav--open');
    burger.setAttribute('aria-expanded', open);
  });
}
