/* =========================================================
   Landing page — main.js
   ========================================================= */
const CONFIG = {
  // Founding spots — price goes to ₦15,000 once all spots are taken.
  // Every visit starts the counter at spotsStart; each purchase notification adds 1.
  spotsTotal: 70,
  spotsStart: 42,             // every visit starts here; resets here once all spots fill
  // Offer pop-up — opens once per visit when this section scrolls into view
  popupTrigger: '#price-offer-guarantee',
  // Purchase notifications
  toastEveryMs: 30000,
  toastVisibleMs: 6000,
  toastSound: true,           // "ching" (plays only after the visitor has interacted with the page — browser rule)
  // Replace with real recent buyers from your checkout if you have them
  buyers: ['Chinedu O.', 'Aisha B.', 'Tunde A.', 'Ngozi E.', 'Ibrahim S.', 'Funmi K.', 'Emeka N.', 'Zainab M.', 'Segun F.', 'Blessing U.', 'Yusuf D.', 'Kemi O.', 'Obinna C.', 'Hauwa L.'],
  // Checkout link used by every CTA marked [data-checkout] (e.g. your Selar URL)
  checkoutUrl: 'https://selar.com/7cs3v1tu78',
  // true  → empty image/video placeholders accept uploads (click or drag & drop).
  //         Uploads are saved in this browser only (IndexedDB) for previewing.
  // false → production: placeholders are inert; media loads from /assets only.
  editMode: true,
};

/* ---------- Founding spots (progress bars) ---------- */
const Spots = (() => {
  let taken = CONFIG.spotsStart;
  const pct = () => (taken / CONFIG.spotsTotal) * 100;
  function render(bump) {
    document.querySelectorAll('[data-spots-count]').forEach(el => {
      el.textContent = taken;
      if (bump) { el.classList.remove('spots-bump'); void el.offsetWidth; el.classList.add('spots-bump'); }
    });
    document.querySelectorAll('[data-spots-left]').forEach(el => { el.textContent = CONFIG.spotsTotal - taken; });
    document.querySelectorAll('[data-spots-bar]').forEach(el => { el.style.width = pct().toFixed(1) + '%'; });
  }
  render();
  return {
    get taken() { return taken; },
    canAdd: () => true,
    add() { taken = taken >= CONFIG.spotsTotal ? CONFIG.spotsStart : taken + 1; render(true); return taken; },
  };
})();

/* ---------- Sticky offer bar: appears once the product has been introduced ----------
   Before that, visitors don't yet know what they'd be buying, so a checkout bar is premature.
   Trigger: the top of #product-introduction reaches the middle of the screen. */
(function () {
  const nav = document.querySelector('.offerbar');
  const trigger = document.getElementById('product-introduction');
  if (!nav || !trigger) return;
  const onScroll = () => nav.classList.toggle('is-visible', trigger.getBoundingClientRect().top < window.innerHeight * 0.5);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ---------- Checkout links ---------- */
if (CONFIG.checkoutUrl && CONFIG.checkoutUrl !== '#') {
  document.querySelectorAll('[data-checkout]').forEach(a => { a.href = CONFIG.checkoutUrl; });
}

/* ---------- Local media store (IndexedDB) ---------- */
const MediaStore = (() => {
  let dbp;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('landing-media', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('files', mode); const q = fn(t.objectStore('files')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  return {
    get: key => tx('readonly', s => s.get(key)).catch(() => null),
    set: (key, val) => tx('readwrite', s => s.put(val, key)).catch(() => null),
    del: key => tx('readwrite', s => s.delete(key)).catch(() => null),
  };
})();

const ALT_EXT = { image: ['jpg', 'jpeg', 'png', 'webp'], video: ['mp4', 'webm', 'mov'] };
function candidates(src, type) {
  const base = src.replace(/\.[a-z0-9]+$/i, '');
  return [src, ...ALT_EXT[type].map(e => `${base}.${e}`)].filter((v, i, a) => a.indexOf(v) === i);
}
function probe(url, type) {
  return new Promise(res => {
    if (type === 'image') { const i = new Image(); i.onload = () => res(url); i.onerror = () => res(null); i.src = url; }
    else { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => res(url); v.onerror = () => res(null); v.src = url; }
  });
}
async function firstAvailable(src, type) {
  for (const u of candidates(src, type)) { const ok = await probe(u, type); if (ok) return ok; }
  return null;
}
function wireDrop(el, onFiles) {
  if (!CONFIG.editMode) return;
  el.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); el.classList.add('is-dragover'); } });
  el.addEventListener('dragleave', () => el.classList.remove('is-dragover'));
  el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('is-dragover'); if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); });
}
if (CONFIG.editMode) document.body.classList.add('is-editing');

/* ---------- Fit media to its frame without cutting off important parts ----------
   data-fit="cover" | "contain" forces a mode; otherwise cover is used only when the file's
   shape is within 12% of the frame's shape, else contain (letterbox blended with the image's edge colour).
   data-pos sets object-position. data-adapt="frame" reshapes the frame to the file (hero video). */
function edgeColor(img) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, 8, 8);
    const d = x.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < 64; i++) { const px = i % 8, py = (i / 8) | 0; if (px && py && px < 7 && py < 7) continue; r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; n++; }
    return `rgb(${(r / n) | 0}, ${(g / n) | 0}, ${(b / n) | 0})`;
  } catch (e) { return '#141414'; }
}
function fitMedia(el, node, type) {
  const w = type === 'image' ? node.naturalWidth : node.videoWidth, h = type === 'image' ? node.naturalHeight : node.videoHeight;
  if (!w || !h) return;
  const r = w / h;
  if (el.dataset.adapt === 'slide') {
    const slide = el.closest('.slider__slide');
    if (slide) slide.style.width = `calc((var(--sh) - 18px) * ${r.toFixed(4)} + 18px)`;
    node.style.objectFit = 'cover';
    node.style.background = 'transparent';
    window.dispatchEvent(new Event('resize'));
    return;
  }
  if (el.dataset.adapt === 'frame') {
    el.style.aspectRatio = `${w} / ${h}`;
    if (r < 1.2) el.style.maxWidth = Math.round(620 * r) + 'px';
    node.style.objectFit = 'cover';
    return;
  }
  const R = el.clientWidth / Math.max(1, el.clientHeight);
  const mode = el.dataset.fit || (Math.abs(r / R - 1) <= 0.12 ? 'cover' : 'contain');
  node.style.objectFit = mode;
  if (el.dataset.pos) node.style.objectPosition = el.dataset.pos;
  if (mode === 'contain') {
    const bg = type === 'image' ? edgeColor(node) : '#000';
    node.style.background = bg;
    el.style.background = bg;
    const frame = el.parentElement; if (frame && getComputedStyle(frame).padding !== '0px') frame.style.background = bg;
  }
}

/* ---------- Single image / video placeholders ---------- */
document.querySelectorAll('[data-media]').forEach(el => {
  const type = el.dataset.media, key = el.dataset.key, input = el.querySelector('input[type=file]');
  let objectUrl;
  function show(url) {
    el.querySelectorAll('.media__el, .media__tools').forEach(n => n.remove());
    if (!url) { el.classList.remove('is-filled'); return; }
    const node = document.createElement(type === 'image' ? 'img' : 'video');
    node.className = 'media__el';
    if (type === 'image') { node.alt = ''; node.loading = 'lazy'; node.draggable = false; }
    else { node.controls = true; node.playsInline = true; node.preload = 'metadata'; }
    node.addEventListener(type === 'image' ? 'load' : 'loadedmetadata', () => fitMedia(el, node, type), { once: true });
    node.src = url;
    el.appendChild(node);
    el.classList.add('is-filled');
    if (CONFIG.editMode) {
      const tools = document.createElement('div');
      tools.className = 'media__tools';
      tools.innerHTML = '<button type="button" class="media__action" data-act="replace">Replace</button><button type="button" class="media__action" data-act="remove">Remove</button>';
      tools.addEventListener('click', async e => {
        const act = e.target.dataset.act;
        if (act === 'replace') input.click();
        if (act === 'remove') { await MediaStore.del(key); load(); }
      });
      el.appendChild(tools);
    }
  }
  async function useFile(file) {
    if (!file || !file.type.startsWith(type)) return;
    await MediaStore.set(key, file);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    show(objectUrl);
  }
  async function load() {
    const blob = await MediaStore.get(key);
    if (blob) { objectUrl = URL.createObjectURL(blob); return show(objectUrl); }
    show(await firstAvailable(el.dataset.src, type));
  }
  if (input) {
    if (!CONFIG.editMode) input.disabled = true;
    input.addEventListener('change', () => { useFile(input.files[0]); input.value = ''; });
  }
  wireDrop(el, files => useFile(files[0]));
  load();
});

/* ---------- Image switcher (uploads 3 images at once, switches every 4s) ---------- */
document.querySelectorAll('[data-switcher]').forEach(el => {
  const key = el.dataset.key, count = +el.dataset.count || 3, interval = +el.dataset.interval || 4000;
  const slidesEl = el.querySelector('[data-switcher-slides]'), label = el.querySelector('[data-switcher-label]');
  const dotsEl = el.querySelector('[data-switcher-dots]'), input = el.querySelector('input[type=file]');
  const replaceBtn = el.querySelector('[data-switcher-replace]');
  let imgs = [], i = 0, timer, urls = [];
  const pad = n => String(n).padStart(2, '0');
  function render() {
    imgs.forEach((im, n) => im.classList.toggle('is-active', n === i));
    const total = imgs.length || count;
    dotsEl.innerHTML = Array.from({ length: total }, (_, n) => `<button type="button" class="switcher__dot${n === i ? ' is-active' : ''}" aria-label="Show page ${n + 1}"></button>`).join('');
    label.textContent = `${pad(i + 1)} / ${pad(total)}`;
  }
  function start() { clearInterval(timer); if (imgs.length > 1) timer = setInterval(() => { i = (i + 1) % imgs.length; render(); }, interval); }
  dotsEl.addEventListener('click', e => { const b = e.target.closest('.switcher__dot'); if (!b) return; i = [...dotsEl.children].indexOf(b); render(); start(); });
  function show(list) {
    urls.forEach(u => u.startsWith('blob:') && URL.revokeObjectURL(u));
    urls = list; slidesEl.innerHTML = ''; i = 0;
    imgs = list.map((u, n) => { const im = document.createElement('img'); im.className = 'switcher__img'; im.alt = `Faceless page ${n + 1}`; im.draggable = false; im.src = u; slidesEl.appendChild(im); return im; });
    el.classList.toggle('is-filled', imgs.length > 0);
    if (replaceBtn) replaceBtn.hidden = !(CONFIG.editMode && imgs.length);
    render(); start();
  }
  async function useFiles(files) {
    const list = files.filter(f => f.type.startsWith('image')).slice(0, count);
    if (!list.length) return;
    await MediaStore.set(key, list);
    show(list.map(f => URL.createObjectURL(f)));
  }
  async function load() {
    const saved = await MediaStore.get(key);
    if (saved && saved.length) return show(saved.map(b => URL.createObjectURL(b)));
    const found = [];
    for (let n = 1; n <= count; n++) { const u = await firstAvailable(`assets/images/${key}-${n}.jpg`, 'image'); if (u) found.push(u); }
    show(found);
  }
  if (input) {
    if (!CONFIG.editMode) input.disabled = true;
    input.addEventListener('change', () => { useFiles([...input.files]); input.value = ''; });
  }
  if (replaceBtn) replaceBtn.addEventListener('click', () => input.click());
  wireDrop(el, useFiles);
  load();
});

/* ---------- Sliders (arrows, dots, counter, drag) ---------- */
document.querySelectorAll('[data-slider-track]').forEach(track => {
  let root = track.parentElement;
  while (root && !root.querySelector('[data-slider-next]')) root = root.parentElement;
  root = root || track.parentElement;
  const prev = root.querySelector('[data-slider-prev]'), next = root.querySelector('[data-slider-next]');
  const dotsEl = root.querySelector('[data-slider-dots]'), counter = root.querySelector('[data-slider-counter]');
  const slides = [...track.children];
  const pad = n => String(n).padStart(2, '0');
  function metrics() {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    const base = slides[0].offsetLeft;
    const lefts = slides.map(s => s.offsetLeft - base);
    let pages = lefts.findIndex(l => l >= max - 2) + 1; if (pages <= 0) pages = slides.length;
    const view = track.scrollLeft + track.clientWidth;
    let visible = slides.filter(s => { const l = s.offsetLeft - base; return l >= track.scrollLeft - 2 && l + s.offsetWidth <= view + 2; }).length || 1;
    return { lefts, max, visible, pages: Math.max(1, pages) };
  }
  const current = () => { const { lefts, max, pages } = metrics(); if (track.scrollLeft >= max - 2) return pages - 1; let best = 0; lefts.forEach((l, i) => { if (Math.abs(l - track.scrollLeft) < Math.abs(lefts[best] - track.scrollLeft)) best = i; }); return Math.min(best, pages - 1); };
  function go(n) { const { lefts, max, pages } = metrics(); const i = Math.max(0, Math.min(pages - 1, n)); track.scrollTo({ left: Math.min(max, lefts[i]), behavior: 'smooth' }); }
  let lastPages = -1;
  function render() {
    const { visible, pages } = metrics(), c = current();
    if (prev) prev.disabled = c <= 0;
    if (next) next.disabled = c >= pages - 1;
    if (dotsEl) {
      if (pages !== lastPages) { dotsEl.innerHTML = Array.from({ length: pages }, (_, n) => `<button type="button" class="slider__dot" aria-label="Go to slide ${n + 1}"></button>`).join(''); lastPages = pages; }
      [...dotsEl.children].forEach((d, n) => d.classList.toggle('is-active', n === c));
    }
    if (counter) counter.textContent = `${pad(c + 1)}–${pad(Math.min(slides.length, c + visible))} / ${pad(slides.length)}`;
  }
  prev && prev.addEventListener('click', () => go(current() - 1));
  next && next.addEventListener('click', () => go(current() + 1));
  dotsEl && dotsEl.addEventListener('click', e => { const d = e.target.closest('.slider__dot'); if (d) go([...dotsEl.children].indexOf(d)); });
  let raf;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); }, { passive: true });
  window.addEventListener('resize', render);

  // Mouse drag (touch scrolls natively)
  let down = false, moved = false, startX = 0, startLeft = 0;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('video, button, input')) return;
    down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
  });
  window.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 5) { moved = true; track.classList.add('is-dragging'); }
    if (moved) track.scrollLeft = startLeft - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!down) return; down = false;
    if (moved) { track.classList.remove('is-dragging'); go(current()); }
  });
  track.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  render();
});

/* ---------- FAQ accordion ---------- */
document.querySelectorAll('[data-faq-toggle]').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item'), list = item.parentElement, open = !item.classList.contains('is-open');
    list.querySelectorAll('.faq-item').forEach(it => {
      it.classList.remove('is-open');
      it.querySelector('[data-faq-toggle]').setAttribute('aria-expanded', 'false');
      it.querySelector('[data-faq-answer]').hidden = true;
    });
    if (open) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); item.querySelector('[data-faq-answer]').hidden = false; }
  });
});

/* ---------- Offer pop-up (once per visit, when the price section is reached) ---------- */
(function () {
  const modal = document.getElementById('offer-modal');
  if (!modal) return;
  let lastFocus;
  function open() {
    if (!modal.hidden) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modal.querySelector('.offer-modal__cta').focus({ preventScroll: true });
  }
  function close() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  modal.querySelectorAll('[data-modal-close]').forEach(b => b.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) close(); });
  const trigger = document.querySelector(CONFIG.popupTrigger);
  if (trigger && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); open(); }
    }, { rootMargin: '0px 0px -55% 0px' }); // fires when the section's top passes ~45% of the screen
    io.observe(trigger);
  }
  window.openOfferModal = open;
})();

/* ---------- "Ching" sound (synthesised, no audio file needed) ---------- */
const Ching = (() => {
  let ctx, unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume(); unlocked = true; } catch (e) {}
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { once: true, passive: true }));
  function tone(freq, start, dur, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(ctx.destination); o.start(start); o.stop(start + dur + 0.02);
  }
  return {
    play() {
      if (!CONFIG.toastSound || !unlocked || !ctx) return;
      const t = ctx.currentTime;
      // two bright bell strikes: "ching-ching"
      [[0, 1], [0.13, 0.85]].forEach(([d, v]) => {
        tone(2093, t + d, 0.55, 0.18 * v); tone(3136, t + d, 0.4, 0.09 * v); tone(4186, t + d, 0.25, 0.05 * v);
      });
    },
  };
})();

/* ---------- Purchase notifications (every 30s, synced with spots) ---------- */
(function () {
  const toast = document.getElementById('purchase-toast');
  if (!toast) return;
  const nameEl = toast.querySelector('[data-toast-name]'), timeEl = toast.querySelector('[data-toast-time]'), spotEl = toast.querySelector('[data-toast-spot]');
  const pool = CONFIG.buyers.slice().sort(() => Math.random() - 0.5);
  let n = 0, hideT;
  function hide() { toast.classList.remove('is-visible'); clearTimeout(hideT); setTimeout(() => { if (!toast.classList.contains('is-visible')) toast.hidden = true; }, 450); }
  function show() {
    if (!Spots.canAdd()) return clearInterval(timer);
    const spot = Spots.add();
    nameEl.textContent = pool[n++ % pool.length];
    timeEl.textContent = 'Just now';
    spotEl.textContent = spot;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    Ching.play();
    clearTimeout(hideT);
    hideT = setTimeout(hide, CONFIG.toastVisibleMs);
  }
  toast.querySelector('[data-toast-close]').addEventListener('click', hide);
  const timer = setInterval(show, CONFIG.toastEveryMs);
})();
