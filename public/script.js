console.log('script.js build v3 connected');


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

// === NAV ===
function openNav(){
  if (!nav) return;
  if (nav.parentElement !== document.body) document.body.appendChild(nav);
  nav.classList.add('is-open');
  nav.setAttribute('aria-hidden','false');
  burger?.setAttribute('aria-expanded','true');
  document.body.classList.add('nav-open');
}
function closeNav(){
  if (!nav) return;
  nav.classList.remove('is-open');
  nav.setAttribute('aria-hidden','true');
  burger?.setAttribute('aria-expanded','false');
  document.body.classList.remove('nav-open');
  if (navOriginalParent && nav.parentElement === document.body){
    navOriginalParent.appendChild(nav);
  }
}
burger?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (nav.classList.contains('is-open')) closeNav(); else openNav();
});

document.addEventListener('click', closeNav);
nav?.addEventListener('click', (e) => {
  // клики по ссылкам/CTA/крестику — закрывают меню
  if (e.target.closest('a, .cta, .nav__close')) {
    e.preventDefault();
    e.stopPropagation();
    closeNav();
  } else {
    // внутри меню клики не должны закрывать его документ-слушателем
    e.stopPropagation();
  }
});

/* ===== modal windows (robust) ===== */
// === MODALS ===
function openModal(id){
  const modal = document.getElementById(id.replace(/^#/, ''));
  if (!modal) return;
  modal.classList.add('is-open');   // было 'open'
  document.body.classList.add('modal-open');
}
function closeModal(){
  document.querySelectorAll('.modal.is-open')   // было '.modal.open'
          .forEach(m => m.classList.remove('is-open'));
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
// === TOASTS (совместимо с твоим CSS) ===
function showToast(msg, type='success', timeout=3000){
  let root = document.getElementById('toast-root');
  if (!root){
    root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }

  const t = document.createElement('div');
  t.className = `toast toast--${type}`; // <-- toast--success / toast--error / toast--info
  t.innerHTML = `<div>${msg}</div><button class="toast__close" aria-label="Закрыть">×</button>`;

  root.appendChild(t);

  const remove = () => t.remove();
  const timer = setTimeout(remove, timeout);
  t.querySelector('.toast__close')?.addEventListener('click', () => {
    clearTimeout(timer);
    remove();
  });
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
/* ===== lightbox for galleries ===== */
(function(){
  const lb = document.getElementById('lightbox');
  if (!lb) return;

  const lbImg = lb.querySelector('.lightbox__img');
  const btnPrev = lb.querySelector('.lightbox__prev');
  const btnNext = lb.querySelector('.lightbox__next');
  const btnClose = lb.querySelector('.lightbox__close');

  const imgs = Array.from(document.querySelectorAll('.mini-img, .qm-gallery img'));
  let idx = -1;

// === LIGHTBOX ===
function openLB(i){
  idx = i;
  const src = imgs[idx].getAttribute('src');
  lbImg.src = src;
  lb.classList.add('is-open');    // было 'open'
  document.body.classList.add('modal-open');
}
function closeLB(){
  lb.classList.remove('is-open'); // было 'open'
  document.body.classList.remove('modal-open');
}

  function navLB(step){
    if (idx < 0) return;
    idx = (idx + step + imgs.length) % imgs.length;
    lbImg.src = imgs[idx].getAttribute('src');
    lbImg.alt = imgs[idx].getAttribute('alt') || '';
  }

  imgs.forEach((img, i) => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openLB(i); });
  });

  btnClose?.addEventListener('click', closeLB);
  btnPrev?.addEventListener('click', () => navLB(-1));
  btnNext?.addEventListener('click', () => navLB(1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
  document.addEventListener('keydown', e => {
   if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') navLB(-1);
    if (e.key === 'ArrowRight') navLB(1);
  });
})();
// === STORY TOGGLE (разворот текста в модалках квестов) ===
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.story-toggle');
  if (!btn) return;

  e.preventDefault();

  const targetSel = btn.dataset.target || btn.getAttribute('aria-controls');
  const box = targetSel ? document.querySelector(targetSel) : null;
  if (!box) return;

  const expanded = box.getAttribute('data-expanded') === 'true';
  box.setAttribute('data-expanded', expanded ? 'false' : 'true');
  btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  btn.textContent = expanded ? 'Развернуть' : 'Свернуть';
});
// === ANNOUNCEMENTS SLIDER (работает только если секция есть в DOM) ===
(function(){
  const slider = document.getElementById('annSlider');
  const dotsWrap = document.getElementById('annDots');
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll('.ann-slide'));
  if (slides.length < 2) return;

  let i = slides.findIndex(s => s.classList.contains('is-active'));
  if (i < 0) i = 0;

  function go(n){
    slides[i].classList.remove('is-active');
    dotsWrap?.children[i]?.setAttribute('aria-selected','false');
    i = (n + slides.length) % slides.length;
    slides[i].classList.add('is-active');
    dotsWrap?.children[i]?.setAttribute('aria-selected','true');
  }

  if (dotsWrap){
    dotsWrap.innerHTML = '';
    slides.forEach((_, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-selected', idx === i ? 'true' : 'false');
      b.addEventListener('click', () => go(idx));
      dotsWrap.appendChild(b);
    });
  }

  let timer = setInterval(() => go(i + 1), 5000);
  slider.addEventListener('mouseenter', () => { clearInterval(timer); });
  slider.addEventListener('mouseleave', () => { timer = setInterval(() => go(i + 1), 5000); });
})();
