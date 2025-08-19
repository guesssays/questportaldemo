// ===== helpers =====
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ===== год в футере ===== */
const y = $('#y');
if (y) y.textContent = new Date().getFullYear();

/* ===== header height -> CSS var + body padding ===== */
const header = $('.site-header');
function setHeaderH(){
  const h = header ? header.offsetHeight : 58;
  document.documentElement.style.setProperty('--header-h', h + 'px');
}
setHeaderH();
window.addEventListener('resize', setHeaderH);

/* ===== burger & nav (full-screen + iOS fix) ===== */
const burger = $('#burger');
const nav = $('#nav');
const navOriginalParent = nav ? nav.parentElement : null;

function openNav(){
  if (!nav) return;
  if (nav.parentElement !== document.body) document.body.appendChild(nav); // iOS safari fixed-in-sticky баг
  nav.classList.add('open');
  burger?.classList.add('open');
  document.body.classList.add('nav-open');
}
function closeNav(){
  if (!nav) return;
  nav.classList.remove('open');
  burger?.classList.remove('open');
  document.body.classList.remove('nav-open');
  if (navOriginalParent && nav.parentElement === document.body){
    navOriginalParent.appendChild(nav);
  }
}
burger?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (nav.classList.contains('open')) closeNav(); else openNav();
});
document.addEventListener('click', closeNav);
nav?.addEventListener('click', e => e.stopPropagation());

/* ===== modal windows (robust) ===== */
function openModal(id){
  const modal = document.getElementById(id.replace(/^#/, ''));
  if (!modal) return;
  modal.classList.add('open');
  document.body.classList.add('modal-open');
}
function closeModal(){
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  document.body.classList.remove('modal-open');
}

// делегирование кликов: открытие/закрытие
document.addEventListener('click', (e) => {
  // открыть: [data-modal] ИЛИ [data-target] ИЛИ .open-booking
  const openBtn = e.target.closest('[data-modal], [data-target], .open-booking');
  if (openBtn) {
    e.preventDefault();
    const raw = openBtn.dataset.modal ?? openBtn.dataset.target ?? 'bookingModal';
    const id = String(raw).replace(/^#/, '');
    openModal(id);
    return;
  }

  // закрыть: [data-close] ИЛИ клик по фону .modal (оверлей с data-close тоже поймается)
  if (e.target.closest('[data-close]')) {
    e.preventDefault();
    closeModal();
    return;
  }

  const m = e.target.closest('.modal');
  if (m && e.target === m) { // клик по самому контейнеру модалки
    closeModal();
  }
});

// Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});


/* ===== toast notifications ===== */
function showToast(msg, type='success', timeout=3000){
  const wrap = $('#toast-wrap') || Object.assign(document.body.appendChild(document.createElement('div')), {
    id: 'toast-wrap',
    className: 'toast-wrap'
  });
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{
    t.classList.remove('show');
    setTimeout(()=>t.remove(),300);
  }, timeout);
}

/* ===== form submit -> Netlify Function (Telegram) ===== */
const form = document.getElementById('booking-form') || document.getElementById('bookingForm');


function validate(data){
  const required = ['name','phone','date','time','quest','players'];
  for (let k of required){
    if (!data[k] || String(data[k]).trim() === '') return 'Заполните поле: ' + k;
  }
  return null;
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('.btn-submit');
    submitBtn?.setAttribute('disabled','disabled');

    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const err = validate(data);
      if (err) { showToast(err, 'error'); return; }

      showToast('Отправка...', 'success', 1200);

      const resp = await fetch('/.netlify/functions/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      let res = {};
      try { res = await resp.json(); } catch {}

      if (!resp.ok || !res.ok) {
        const msg = res && res.error ? res.error : 'Серверная ошибка';
        throw new Error(msg);
      }

      showToast('Заявка принята! Мы свяжемся с вами в ближайшее время.', 'success');
      form.reset();
      closeModal();
    } catch (e2) {
      console.error(e2);
      showToast('Ошибка при отправке. Попробуйте ещё раз.', 'error');
    } finally {
      submitBtn?.removeAttribute('disabled');
    }
  });
}

/* ===== video: hide badges while playing (scoped & safe) ===== */
(function(){
  const qvIO = new IntersectionObserver(entries => {
    entries.forEach(({isIntersecting, target}) => {
      if (!isIntersecting && !target.paused) target.pause();
    });
  }, { threshold: 0.2 });

  $$('.qvideo').forEach(v => {
    if (v.dataset.badgeBound) return; // чтобы не навешивать повторно
    v.dataset.badgeBound = '1';

    v.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (v.paused) v.play(); else v.pause();
    });
    v.addEventListener('mousedown', (e) => e.stopPropagation());

    v.addEventListener('play', () => {
      $$('.qvideo').forEach(o => { if (o !== v && !o.paused) o.pause(); });
      const thumb = v.closest('.thumb');
      if (thumb) thumb.classList.add('is-playing');
    });
    const off = () => {
      const thumb = v.closest('.thumb');
      if (thumb) thumb.classList.remove('is-playing');
    };
    v.addEventListener('pause', off);
    v.addEventListener('ended', off);

    qvIO.observe(v);
  });
})();
