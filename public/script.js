console.log('script.js build v9 connected');

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
  // Крестик – просто закрываем меню
  if (e.target.closest('.nav__close')) {
    e.preventDefault();
    e.stopPropagation();
    closeNav();
    return;
  }

  // CTA «Забронировать» в меню – закрываем меню и открываем модалку
  if (e.target.closest('.open-booking')) {
    // НЕ делаем preventDefault/stopPropagation — пусть глобальные обработчики тоже сработают
    closeNav();
    openModal('bookingModal');
    return;
  }

  // Любая ссылка в меню – позволяем ей работать и просто закрываем меню
  if (e.target.closest('a[href]')) {
    closeNav();
    return;
  }

  // Любые другие клики внутри меню не должны закрывать его глобальным слушателем
  e.stopPropagation();
});


/* ===== modal windows (robust) ===== */
// === MODALS ===
function openModal(id){
  const modal = document.getElementById(id.replace(/^#/, ''));
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false'); // важно для a11y
  document.body.classList.add('modal-open');
}
function closeModal(){
  document.querySelectorAll('.modal.is-open')
          .forEach(m => {
            m.classList.remove('is-open');
            m.setAttribute('aria-hidden','true');
          });
  document.body.classList.remove('modal-open');

  // если модалка была открыта через hash — убираем его из URL
  if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

/* ===== Booking helpers: prefill quest ===== */
function getQuestNameFromBtn(btn){
  if (!btn) return '';
  if (btn.dataset.quest) return btn.dataset.quest.trim();

  // карточка на главной
  const card = btn.closest('.quest');
  const title1 = card?.querySelector('.qtitle')?.textContent?.trim();
  if (title1) return title1;

  // модалка «Подробнее»
  const qmodal = btn.closest('.quest-modal');
  const title2 = qmodal?.querySelector('.qm-title')?.textContent?.trim();
  if (title2) return title2;

  return '';
}

function prefillBooking(questName){
  const sel = document.getElementById('quest');
  if (!sel) return;
  if (!questName) { sel.value = ''; return; }

  const norm = s => String(s).trim().toLowerCase();
  let opt = Array.from(sel.options).find(o => norm(o.text) === norm(questName));

  if (!opt){
    // если по тексту не нашли — пробуем по value
    opt = Array.from(sel.options).find(o => norm(o.value) === norm(questName));
  }

  if (opt){
    sel.value = opt.value;
  } else {
    // добавим опцию на лету, если название нестандартно
    const o = document.createElement('option');
    o.value = questName;
    o.textContent = questName;
    sel.appendChild(o);
    sel.value = o.value;
  }
  sel.dispatchEvent(new Event('change', { bubbles: true }));

  // лёгкий фокус после открытия модалки
  setTimeout(() => sel.focus({ preventScroll: true }), 60);
}


// делегирование кликов: открытие/закрытие
document.addEventListener('click', (e) => {
  // открыть: [data-modal] ИЛИ [data-target] ИЛИ .open-booking
  const openBtn = e.target.closest('[data-modal], .open-booking, [data-target]:not(.story-toggle)');
  if (openBtn) {
    e.preventDefault();
    const raw = openBtn.dataset.modal ?? openBtn.dataset.target ?? 'bookingModal';
    const id = String(raw).replace(/^#/, '');

    // если открываем форму брони — подставим квест
    if (id === 'bookingModal') {
      const questName = getQuestNameFromBtn(openBtn);
      if (questName) prefillBooking(questName);
    }

    openModal(id);

    // Если открыли модалку квеста – добавим # в URL, чтобы ссылка была шарибельной
    const modalEl = document.getElementById(id);
    if (modalEl?.classList.contains('quest-modal') && location.hash !== ('#' + id)) {
      history.replaceState(null, '', '#' + id);
    }

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

// === deep-link: открыть модалку, если URL уже содержит #qm-... ===
function openHashModalIfAny(){
  const id = location.hash.replace(/^#/, '');
  if (!id) return;
  const el = document.getElementById(id);
  if (el && el.classList.contains('modal')) {
    openModal(id);
  }
}
window.addEventListener('hashchange', openHashModalIfAny);
openHashModalIfAny();


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
  t.className = `toast toast--${type}`; // toast--success / toast--error / toast--info
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
  const labels = {
    name: 'Имя',
    phone: 'Телефон',
    date: 'Дата',
    time: 'Время',
    quest: 'Квест',
    players: 'Игроки'
  };

  for (let k of required){
    if (!data[k] || String(data[k]).trim() === ''){
      return { field: k, message: `Заполните поле «${labels[k]}»` };
    }
  }

  // honeypot
  if (data.botcheck && String(data.botcheck).trim() !== ''){
    return { field: null, message: 'Похоже, это спам. Попробуйте ещё раз.' };
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
      if (err) {
        showToast(err.message, 'error', 4000);
        if (err.field && form.elements[err.field]) form.elements[err.field].focus();
        submitBtn?.removeAttribute('disabled');
        return;
      }

      // статус «Отправка…» — как информационный
      showToast('Отправка…', 'info', 1200);

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
    // Теперь .qvideo может стоять и на iframe YouTube — работаем только с <video>
    if (!(v instanceof HTMLVideoElement)) return;

    if (v.dataset.badgeBound) return;
    v.dataset.badgeBound = '1';

    // Вешаем клик-тоггл ТОЛЬКО если у видео нет нативных контролов
    if (!v.hasAttribute('controls')) {
      v.addEventListener('click', (e) => {
        // e.preventDefault() больше не трогаем!
        e.stopPropagation();
        v.paused ? v.play() : v.pause();
      });
    }

    v.addEventListener('play', () => {
      $$('.qvideo').forEach(o => {
        if (o !== v && o instanceof HTMLVideoElement && !o.paused) o.pause();
      });
      v.closest('.thumb')?.classList.add('is-playing');
    });

    const off = () => v.closest('.thumb')?.classList.remove('is-playing');
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
    // если фото открыто поверх модалки квеста — страницу под ней не разблокируем
    if (!document.querySelector('.modal.is-open')) document.body.classList.remove('modal-open');
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
  const card = targetSel ? document.querySelector(targetSel) : null;

  // Нам нужен именно .qm-story внутри карточки
  const box = card?.querySelector('.qm-story') || document.querySelector(targetSel) || null;
  if (!box) return;

  const isExpanded = box.getAttribute('data-expanded') === 'true';
  box.setAttribute('data-expanded', isExpanded ? 'false' : 'true');
  btn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
  btn.textContent = isExpanded ? 'Развернуть' : 'Свернуть';
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

// ===== Модалка "услуги/франшиза" =====
(function(){
  const openBtns = document.querySelectorAll('.open-services');
  const modal = document.getElementById('servicesModal');
  if (!modal || !openBtns.length) return;

  function openModalLocal(m){
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModalLocal(m){
    m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  openBtns.forEach(b => b.addEventListener('click', () => openModalLocal(modal)));
  modal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close') || e.target.classList.contains('modal')) closeModalLocal(modal);
  });
  // закрытие по Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModalLocal(modal);
  });
})();

/* ===== Авто-калькулятор стоимости в форме брони ===== */
(function(){
  const BASE_PRICE   = 800000; // за команду до 4 человек (день)
  const NIGHT_PRICE  = 900000; // базовая цена с ночной доплатой (с 23:00)
  const BASE_PLAYERS = 4;
  const EXTRA_PRICE  = 200000; // за каждого игрока свыше базы

  const input  = document.getElementById('players');
  const timeEl  = document.getElementById('time');
  const box     = document.getElementById('priceBox');
  const countEl = document.getElementById('priceCount');
  const valueEl = document.getElementById('priceValue');
  const hintEl  = document.getElementById('priceHint');
  // праздничный набор
  const addonsWrap    = document.getElementById('priceAddons');
  const addonsValueEl = document.getElementById('priceAddonsValue');
  const addonsListEl  = document.getElementById('priceAddonsList');
  const totalRow      = document.getElementById('priceTotalRow');
  const totalEl       = document.getElementById('priceTotal');
  const addonsTotalField = document.getElementById('addonsTotalField');
  const totalField       = document.getElementById('totalField');
  const addonBoxes = () => Array.from(document.querySelectorAll('#bookingForm .addon-cb'));
  if (!input || !box) return;

  // Ночная доплата действует с 23:00 и до утра (00:00–05:59)
  function isNight(){
    if (!timeEl || !timeEl.value) return false;
    const h = parseInt(timeEl.value.split(':')[0], 10);
    if (Number.isNaN(h)) return false;
    return h >= 23 || h < 6;
  }

  const fmt = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ');
  const plural = (n) => {
    const d = n % 10, dd = n % 100;
    if (dd >= 11 && dd <= 14) return 'игроков';
    if (d === 1) return 'игрок';
    if (d >= 2 && d <= 4) return 'игрока';
    return 'игроков';
  };

  // выбранные позиции праздничного набора
  function selectedAddons(){
    return addonBoxes()
      .filter(cb => cb.checked)
      .map(cb => ({
        price: parseInt(cb.dataset.price, 10) || 0,
        name: (cb.closest('.addon')?.querySelector('.addon__name')?.textContent || '').trim()
      }));
  }

  function update(){
    const raw = parseInt(input.value, 10);
    const min = parseInt(input.min, 10) || 2;
    const max = parseInt(input.max, 10) || 12;

    // --- праздничный набор (считаем всегда, не зависит от числа игроков) ---
    const addons    = selectedAddons();
    const addonsSum = addons.reduce((s, a) => s + a.price, 0);

    if (addonsWrap){
      addonsWrap.hidden = addonsSum === 0;
      if (addonsSum > 0){
        addonsValueEl.textContent = `${fmt(addonsSum)} сум`;
        addonsListEl.textContent  = addons.map(a => a.name).join(' · ');
      }
    }
    if (addonsTotalField) addonsTotalField.value = addonsSum ? String(addonsSum) : '';

    // --- стоимость квеста ---
    const night = isNight();
    box.classList.toggle('is-night', night);

    if (!raw || raw < min) {
      countEl.textContent = '—';
      valueEl.textContent = '—';
      hintEl.textContent  = `Укажите количество игроков (от ${min} до ${max})`;
      box.classList.remove('is-active');
      if (totalRow) totalRow.hidden = true;
      if (totalField) totalField.value = '';
      return;
    }

    const players    = Math.min(raw, max);
    const extra      = Math.max(0, players - BASE_PLAYERS);
    const base       = night ? NIGHT_PRICE : BASE_PRICE;
    const questTotal = base + extra * EXTRA_PRICE;

    countEl.textContent = `${players} ${plural(players)}`;
    valueEl.textContent = `${fmt(questTotal)} сум`;

    const baseLabel = night
      ? `Команда до ${BASE_PLAYERS} чел. — ${fmt(NIGHT_PRICE)} сум (ночная доплата с 23:00)`
      : `Базовая цена за команду до ${BASE_PLAYERS} человек`;
    hintEl.textContent = extra > 0
      ? `${baseLabel} + ${extra} × ${fmt(EXTRA_PRICE)} сум`
      : baseLabel;

    // --- итого ---
    const grand = questTotal + addonsSum;
    if (totalRow){
      totalRow.hidden = addonsSum === 0; // без набора итог = цене квеста
      if (addonsSum > 0) totalEl.textContent = `${fmt(grand)} сум`;
    }
    if (totalField) totalField.value = String(grand);

    box.classList.add('is-active');
  }

  input.addEventListener('input', update);
  input.addEventListener('change', update);
  if (timeEl){
    timeEl.addEventListener('input', update);
    timeEl.addEventListener('change', update);
  }
  // пересчёт при переключении позиций набора
  document.addEventListener('change', (e) => {
    if (e.target.classList && e.target.classList.contains('addon-cb')) update();
  });

  // «Взять всё сразу» внутри формы
  document.getElementById('addonsAll')?.addEventListener('click', () => {
    const boxes = addonBoxes();
    const allOn = boxes.every(cb => cb.checked);
    boxes.forEach(cb => { cb.checked = !allOn; }); // повторное нажатие снимает выбор
    update();
  });

  // кнопки из секции «Праздник в квесте» — отмечают нужные позиции
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-addon]');
    if (trigger){
      const key = trigger.dataset.addon;
      setTimeout(() => {
        addonBoxes().forEach(cb => {
          if (key === 'all' || cb.dataset.addonKey === key) cb.checked = true;
        });
        update();
      }, 120);
      return;
    }
    // пересчёт при открытии модалки брони
    if (e.target.closest('.open-booking')) setTimeout(update, 80);
  });

  update();
})();

/* ===== Выбор принта на футболку (модалка #printModal) ===== */
(function(){
  const grid = document.getElementById('printGrid');
  const form = document.getElementById('printForm');
  if (!grid || !form) return;

  const count  = parseInt(grid.dataset.count, 10) || 0;
  const field  = document.getElementById('printField');
  const selImg = document.getElementById('printSelectedImg');
  const selTxt = document.getElementById('printSelectedTxt');
  const dateEl = document.getElementById('printDate');
  const src = (n) => `/images/prints/print-${String(n).padStart(2, '0')}.jpg`;

  // карточки принтов: /images/prints/print-01.jpg … print-NN.jpg
  for (let n = 1; n <= count; n++){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'print-item';
    b.dataset.print = String(n);
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', `Принт №${n}`);
    b.innerHTML = `<img src="${src(n)}" alt="Принт №${n}" loading="lazy" decoding="async" width="600" height="800"><span class="print-num">№${n}</span>`;
    grid.appendChild(b);
  }

  // выбранный принт остаётся подсвеченным и показывается над формой
  function select(n){
    grid.querySelectorAll('.print-item').forEach(b => {
      const on = b.dataset.print === String(n);
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    field.value = n ? String(n) : '';
    if (n){
      selImg.src = src(n);
      selImg.alt = `Выбранный принт №${n}`;
      selImg.hidden = false;
      selTxt.innerHTML = `Выбран принт <b>№${n}</b>`;
    } else {
      selImg.hidden = true;
      selImg.removeAttribute('src');
      selTxt.textContent = 'Принт ещё не выбран — нажмите на понравившийся выше';
    }
  }

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.print-item');
    if (b) select(b.dataset.print);
  });

  // самый быстрый срок — сутки, поэтому дата не раньше завтрашней
  function tomorrowISO(){
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  if (dateEl) dateEl.min = tomorrowISO();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.print){
      showToast('Выберите принт', 'error', 3500);
      // прокручиваем только окно модалки, а не страницу под ней
      const sc = grid.closest('.qm-scroll');
      if (sc) sc.scrollTo({ top: sc.scrollTop + grid.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12, behavior: 'smooth' });
      return;
    }
    const labels = { name: 'Имя', phone: 'Телефон', date: 'К какой дате' };
    for (const k of ['name', 'phone', 'date']){
      if (!data[k] || String(data[k]).trim() === ''){
        showToast(`Заполните поле «${labels[k]}»`, 'error', 4000);
        form.elements[k]?.focus();
        return;
      }
    }
    if (data.date < tomorrowISO()){
      showToast('Футболка готовится минимум за сутки — выберите дату не раньше завтрашней', 'error', 5000);
      dateEl?.focus();
      return;
    }

    const btn = form.querySelector('.print-submit');
    btn?.setAttribute('disabled', 'disabled');
    try {
      showToast('Отправка…', 'info', 1200);
      const resp = await fetch('/.netlify/functions/send-print-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      let res = {};
      try { res = await resp.json(); } catch {}
      if (!resp.ok || !res.ok) throw new Error(res && res.error ? res.error : 'Серверная ошибка');

      showToast('Заказ принят! Мы свяжемся с вами для подтверждения.', 'success');
      form.reset();
      select(null);
      if (dateEl) dateEl.min = tomorrowISO();
      closeModal();
    } catch (err) {
      console.error(err);
      showToast('Ошибка при отправке. Попробуйте ещё раз.', 'error');
    } finally {
      btn?.removeAttribute('disabled');
    }
  });
})();

/* ===== Подпись «бронь по предоплате» под кнопками брони ===== */
(function(){
  const NOTE = 'Бронь подтверждается только после предоплаты';
  document.querySelectorAll('.open-booking').forEach((btn) => {
    // не дублируем и пропускаем кнопку в шапке-меню
    if (btn.closest('#nav')) return;
    if (btn.nextElementSibling && btn.nextElementSibling.classList.contains('prepay-note')) return;
    const note = document.createElement('small');
    note.className = 'prepay-note';
    note.textContent = NOTE;
    btn.insertAdjacentElement('afterend', note);
  });
})();
