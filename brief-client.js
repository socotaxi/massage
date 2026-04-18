/* ============================================================
   BRIEF CLIENT — script.js
   ============================================================ */

/* ---- Année courante dans le footer ---- */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---- Date du jour auto dans l'en-tête ---- */
const metaDate = document.getElementById('metaDate');
if (metaDate && !metaDate.value) {
  metaDate.value = new Date().toISOString().split('T')[0];
}

/* ---- Sync input color ↔ texte hex ---- */
document.querySelectorAll('.color-input-wrap').forEach(wrap => {
  const picker = wrap.querySelector('input[type="color"]');
  const hex    = wrap.querySelector('input[type="text"]');
  if (!picker || !hex) return;

  picker.addEventListener('input', () => {
    hex.value = picker.value.toUpperCase();
  });
  hex.addEventListener('input', () => {
    const val = hex.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) picker.value = val;
  });
});

/* ---- Ajouter un soin dynamiquement ---- */
let soinCount = 2;
const addSoinBtn = document.getElementById('addSoin');
if (addSoinBtn) {
  addSoinBtn.addEventListener('click', () => {
    soinCount++;
    const container = addSoinBtn.parentElement;
    const newBlock = document.createElement('div');
    newBlock.className = 'soin-block';
    newBlock.id = `soin-${soinCount}`;
    newBlock.innerHTML = `
      <div class="soin-block__header">
        <span class="soin-block__label">Soin n°${soinCount}</span>
        <button type="button" class="soin-remove" title="Supprimer ce soin" style="background:none;border:none;cursor:pointer;color:#999;font-size:1.1rem;padding:0 4px;">✕</button>
      </div>
      <table class="brief-table">
        <thead><tr><th>Information demandée</th><th>Votre réponse</th></tr></thead>
        <tbody>
          <tr>
            <td><strong>Nom exact du massage</strong></td>
            <td><textarea name="soin${soinCount}_nom" placeholder="À compléter..." rows="2"></textarea></td>
          </tr>
          <tr>
            <td><strong>Description courte</strong></td>
            <td><textarea name="soin${soinCount}_desc" placeholder="À compléter..." rows="3"></textarea></td>
          </tr>
          <tr>
            <td><strong>Durées proposées</strong></td>
            <td><textarea name="soin${soinCount}_durees" placeholder="À compléter..." rows="2"></textarea></td>
          </tr>
          <tr>
            <td><strong>Prix par durée</strong></td>
            <td><textarea name="soin${soinCount}_prix" placeholder="À compléter..." rows="2"></textarea></td>
          </tr>
          <tr>
            <td><strong>Contre-indications</strong></td>
            <td><textarea name="soin${soinCount}_ci" placeholder="À compléter..." rows="2"></textarea></td>
          </tr>
          <tr>
            <td><strong>Matériel utilisé</strong></td>
            <td><textarea name="soin${soinCount}_materiel" placeholder="À compléter..." rows="2"></textarea></td>
          </tr>
        </tbody>
      </table>`;

    container.insertBefore(newBlock, addSoinBtn);

    /* Supprimer le bloc */
    newBlock.querySelector('.soin-remove').addEventListener('click', () => {
      newBlock.remove();
    });

    /* Scroll vers le nouveau bloc */
    newBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/* ---- Progression du formulaire ---- */
function updateProgress() {
  const allTextareas = document.querySelectorAll('textarea');
  const allInputs    = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"]');
  const filled = [...allTextareas, ...allInputs].filter(el => el.value.trim() !== '').length;
  const total  = allTextareas.length + allInputs.length;
  const pct    = Math.round((filled / total) * 100);

  let bar = document.getElementById('progressBar');
  if (!bar) {
    const actionRight = document.querySelector('.action-bar__right');
    if (!actionRight) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:.78rem;color:#666;';
    wrap.innerHTML = `
      <span id="progressPct">${pct}%</span>
      <div style="width:80px;height:6px;background:#E5E5E5;border-radius:3px;overflow:hidden;">
        <div id="progressBar" style="height:100%;background:#2E5D4B;border-radius:3px;transition:width .4s;width:${pct}%"></div>
      </div>`;
    actionRight.prepend(wrap);
    return;
  }
  bar.style.width = pct + '%';
  document.getElementById('progressPct').textContent = pct + '%';
}

document.addEventListener('input', updateProgress);
document.addEventListener('change', updateProgress);
updateProgress();

/* ---- Sauvegarde locale (localStorage) ---- */
const STORAGE_KEY = 'brief_massage_draft';

function saveDraft() {
  const data = {};
  document.querySelectorAll('[name]').forEach(el => {
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (el.checked) {
        if (!data[el.name]) data[el.name] = [];
        if (Array.isArray(data[el.name])) data[el.name].push(el.value);
        else data[el.name] = el.value;
      }
    } else if (el.type !== 'color') {
      data[el.name] = el.value;
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.entries(data).forEach(([name, val]) => {
      const els = document.querySelectorAll(`[name="${name}"]`);
      els.forEach(el => {
        if (el.type === 'checkbox') {
          el.checked = Array.isArray(val) ? val.includes(el.value) : el.value === val;
        } else if (el.type === 'radio') {
          el.checked = el.value === val;
        } else {
          el.value = val;
        }
      });
    });
    showToast('Brouillon restauré automatiquement.');
  } catch (e) { /* silent */ }
}

/* Auto-save toutes les 20 secondes */
setInterval(saveDraft, 20000);
document.addEventListener('input', saveDraft);
document.addEventListener('change', saveDraft);

/* Charger le brouillon au démarrage */
loadDraft();

/* ---- Partage du brief rempli ---- */
const btnShare      = document.getElementById('btnShare');
const shareDropdown = document.getElementById('shareDropdown');

/* Ouvrir / fermer le dropdown */
if (btnShare && shareDropdown) {
  btnShare.addEventListener('click', (e) => {
    e.stopPropagation();
    shareDropdown.hidden = !shareDropdown.hidden;
  });
  document.addEventListener('click', () => { shareDropdown.hidden = true; });
  shareDropdown.addEventListener('click', (e) => e.stopPropagation());
}

/* ---- Construction du résumé texte du brief rempli ---- */
function val(name) {
  const el = document.querySelector(`[name="${name}"]`);
  return el?.value?.trim() || '';
}

function checkboxValues(name) {
  return [...document.querySelectorAll(`[name="${name}"]:checked`)]
    .map(el => el.value).join(', ') || '';
}

function line(label, value) {
  return value ? `${label} : ${value}` : '';
}

function buildBriefTexte() {
  const nom = val('marque_nom') || 'N/A';
  const sections = [];

  sections.push(`📋 BRIEF CLIENT — ${nom}`);
  sections.push(`Soumis le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`);
  sections.push('─'.repeat(40));

  // 1. Identité
  const s1 = [
    '▸ IDENTITÉ & MARQUE',
    line('Marque / Service', val('marque_nom')),
    line('Thérapeute', val('therapeute_nom')),
    line('Slogan', val('slogan')),
    line('Ambiance souhaitée', checkboxValues('ambiance')),
  ].filter(Boolean).join('\n');
  sections.push(s1);

  // 2. Thérapeute
  const s2 = [
    '▸ THÉRAPEUTE',
    line('Diplômes', val('diplomes')),
    line('Expérience', val('experience')),
    line('Bio', val('bio')),
  ].filter(Boolean).join('\n');
  sections.push(s2);

  // 3. Soins (on récupère jusqu'à 6 soins)
  const soinsLines = ['▸ SOINS PROPOSÉS'];
  for (let i = 1; i <= 6; i++) {
    const nom_soin = val(`soin${i}_nom`);
    if (!nom_soin) break;
    soinsLines.push(`  Soin ${i} : ${nom_soin}`);
    const durees = val(`soin${i}_durees`);
    const prix   = val(`soin${i}_prix`);
    const desc   = val(`soin${i}_desc`);
    if (durees) soinsLines.push(`    Durée : ${durees}`);
    if (prix)   soinsLines.push(`    Prix : ${prix}`);
    if (desc)   soinsLines.push(`    Description : ${desc}`);
  }
  sections.push(soinsLines.join('\n'));

  // 4. Zone & disponibilités
  const s4 = [
    '▸ ZONE & DISPONIBILITÉS',
    line('Villes desservies', val('zone_villes')),
    line('Rayon', val('zone_rayon')),
    line('Horaires', val('horaires')),
    line('Délai réservation', val('delai_details') || checkboxValues('delai_resa')),
  ].filter(Boolean).join('\n');
  sections.push(s4);

  // 5. Réservation & paiement
  const s5 = [
    '▸ RÉSERVATION & PAIEMENT',
    line('Système de réservation', checkboxValues('resa_sys')),
    line('Prépaiement', checkboxValues('prepaiement') || val('prepaiement')),
    line('Annulation', val('annulation')),
  ].filter(Boolean).join('\n');
  sections.push(s5);

  // 6. Contact
  const s6 = [
    '▸ CONTACT',
    line('Téléphone', val('tel')),
    line('Email', val('email')),
    line('Ville', val('ville')),
    line('Statut juridique', checkboxValues('statut') || val('statut')),
    line('SIRET', val('siret')),
  ].filter(Boolean).join('\n');
  sections.push(s6);

  // 7. Objectifs
  const s7 = [
    '▸ OBJECTIFS',
    line('Objectif principal', checkboxValues('objectif') || val('objectif')),
    line('Offre de lancement', val('offre_lancement')),
    line('À éviter', val('eviter')),
  ].filter(Boolean).join('\n');
  sections.push(s7);

  return sections.join('\n\n');
}

/* WhatsApp */
document.getElementById('shareWhatsApp')?.addEventListener('click', (e) => {
  e.preventDefault();
  const text = encodeURIComponent(buildBriefTexte());
  window.open(`https://wa.me/?text=${text}`, '_blank');
  shareDropdown.hidden = true;
});

/* Email */
document.getElementById('shareEmail')?.addEventListener('click', (e) => {
  e.preventDefault();
  const nom     = val('marque_nom') || 'Massage à domicile';
  const subject = encodeURIComponent(`Brief client — ${nom}`);
  const body    = encodeURIComponent(buildBriefTexte());
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  shareDropdown.hidden = true;
});

/* SMS */
document.getElementById('shareSMS')?.addEventListener('click', (e) => {
  e.preventDefault();
  const body = encodeURIComponent(buildBriefTexte());
  window.location.href = `sms:?body=${body}`;
  shareDropdown.hidden = true;
});

/* Copier le brief */
document.getElementById('shareCopy')?.addEventListener('click', () => {
  navigator.clipboard.writeText(buildBriefTexte()).then(() => {
    showToast('Brief copié dans le presse-papiers !');
  }).catch(() => {
    showToast('Non supporté — utilisez l\'export PDF.');
  });
  shareDropdown.hidden = true;
});

/* ---- Toast notifications ---- */
function showToast(msg, duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#2E5D4B; color:#fff; padding:12px 24px; border-radius:50px;
      font-size:.85rem; font-family:'Inter',sans-serif; font-weight:500;
      box-shadow:0 4px 20px rgba(0,0,0,.2); z-index:9999;
      opacity:0; transition:opacity .3s, transform .3s; pointer-events:none;
      white-space:nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, duration);
}

/* ---- Indicateur visuel sur les champs requis ---- */
document.querySelectorAll('.section-header--teal').forEach(header => {
  if (!header.querySelector('.badge--priority')) return;
  const section = header.closest('.brief-section');
  if (!section) return;
  section.querySelectorAll('textarea, input[type="text"], input[type="email"], input[type="tel"]').forEach(el => {
    el.addEventListener('blur', function () {
      this.style.borderColor = this.value.trim() ? '#2E5D4B' : '';
    });
  });
});
