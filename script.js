/* =========================================================
   Quietwins landing page — script.js
   Offer numbers, buyer names and the checkout link come from offer.json.
   ========================================================= */
(function () {
  'use strict';

  const POPUP_TRIGGER = '#price-offer-guarantee';
  const pad = n => String(n).padStart(2, '0');

  /* ---------- Founding spots (progress bars + counts) ---------- */
  const Spots = (() => {
    let total = 70, start = 42, taken = 42;
    const pct = () => (taken / total) * 100;
    function render(bump) {
      document.querySelectorAll('[data-spots-total]').forEach(el => { el.textContent = total; });
      document.querySelectorAll('[data-spots-count]').forEach(el => {
        el.textContent = taken;
        if (bump) { el.classList.remove('spots-bump'); void el.offsetWidth; el.classList.add('spots-bump'); }
      });
      document.querySelectorAll('[data-spots-left]').forEach(el => { el.textContent = total - taken; });
      document.querySelectorAll('[data-spots-bar]').forEach(el => { el.style.width = pct().toFixed(1) + '%'; });
    }
    return {
      configure(cfg) { total = cfg.total; start = cfg.start; taken = start; render(); },
      add() { taken = taken >= total ? start : taken + 1; render(true); return taken; },
    };
  })();

  /* ---------- Sticky offer bar: appears once the product has been introduced ---------- */
  (function () {
    const bar = document.querySelector('.offerbar');
    const trigger = document.getElementById('product-introduction');
    if (!bar || !trigger) return;
    const onScroll = () => bar.classList.toggle('is-visible', trigger.getBoundingClientRect().top < window.innerHeight * 0.5);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  /* ---------- Fit media to its frame without cutting off important parts ----------
     data-fit="cover" | "contain" forces a mode; otherwise cover is used only when the file's
     shape is within 12% of the frame's shape, else contain (letterbox blended with the image's edge colour).
     data-pos sets object-position. data-adapt="frame" reshapes the frame to the file (hero video);
     data-adapt="slide" sizes the slider slide to the file's shape (payouts). */
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
      const frame = el.parentElement;
      if (frame && getComputedStyle(frame).padding !== '0px') frame.style.background = bg;
    }
  }

  document.querySelectorAll('[data-media]').forEach(el => {
    const type = el.dataset.media, node = el.querySelector('.media__el');
    if (!node) return;
    const ready = type === 'image' ? node.complete && node.naturalWidth : node.readyState >= 1;
    if (ready) fitMedia(el, node, type);
    else node.addEventListener(type === 'image' ? 'load' : 'loadedmetadata', () => fitMedia(el, node, type), { once: true });
  });

  /* ---------- Image switcher (faceless pages, every 4s) ---------- */
  document.querySelectorAll('[data-switcher]').forEach(el => {
    const interval = +el.dataset.interval || 4000;
    const imgs = [...el.querySelectorAll('.switcher__img')];
    const dots = [...el.querySelectorAll('.switcher__dot')];
    const label = el.querySelector('[data-switcher-label]');
    let i = 0, timer;
    function render() {
      imgs.forEach((im, n) => im.classList.toggle('is-active', n === i));
      dots.forEach((d, n) => d.classList.toggle('is-active', n === i));
      label.textContent = `${pad(i + 1)} / ${pad(imgs.length)}`;
    }
    function start() { clearInterval(timer); if (imgs.length > 1) timer = setInterval(() => { i = (i + 1) % imgs.length; render(); }, interval); }
    dots.forEach((d, n) => d.addEventListener('click', () => { i = n; render(); start(); }));
    render(); start();
  });

  /* ---------- Sliders (arrows, dots, counter, mouse drag) ---------- */
  document.querySelectorAll('[data-slider-track]').forEach(track => {
    let root = track.parentElement;
    while (root && !root.querySelector('[data-slider-next]')) root = root.parentElement;
    root = root || track.parentElement;
    const prev = root.querySelector('[data-slider-prev]'), next = root.querySelector('[data-slider-next]');
    const dotsEl = root.querySelector('[data-slider-dots]'), counter = root.querySelector('[data-slider-counter]');
    const slides = [...track.children];

    function metrics() {
      const max = Math.max(0, track.scrollWidth - track.clientWidth);
      const base = slides[0].offsetLeft;
      const lefts = slides.map(s => s.offsetLeft - base);
      let pages = lefts.findIndex(l => l >= max - 2) + 1; if (pages <= 0) pages = slides.length;
      const view = track.scrollLeft + track.clientWidth;
      const visible = slides.filter(s => { const l = s.offsetLeft - base; return l >= track.scrollLeft - 2 && l + s.offsetWidth <= view + 2; }).length || 1;
      return { lefts, max, visible, pages: Math.max(1, pages) };
    }
    const current = () => {
      const { lefts, max, pages } = metrics();
      if (track.scrollLeft >= max - 2) return pages - 1;
      let best = 0;
      lefts.forEach((l, i) => { if (Math.abs(l - track.scrollLeft) < Math.abs(lefts[best] - track.scrollLeft)) best = i; });
      return Math.min(best, pages - 1);
    };
    function go(n) { const { lefts, max, pages } = metrics(); const i = Math.max(0, Math.min(pages - 1, n)); track.scrollTo({ left: Math.min(max, lefts[i]), behavior: 'smooth' }); }

    let lastPages = -1;
    function render() {
      const { visible, pages } = metrics(), c = current();
      if (prev) prev.disabled = c <= 0;
      if (next) next.disabled = c >= pages - 1;
      if (dotsEl) {
        if (pages !== lastPages) {
          dotsEl.innerHTML = Array.from({ length: pages }, (_, n) => `<button type="button" class="slider__dot" aria-label="Go to slide ${n + 1}"></button>`).join('');
          lastPages = pages;
        }
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

  /* ---------- FAQ accordion (one open at a time) ---------- */
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
    const trigger = document.querySelector(POPUP_TRIGGER);
    if (trigger && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { io.disconnect(); open(); }
      }, { rootMargin: '0px 0px -55% 0px' }); // fires when the section's top passes ~45% of the screen
      io.observe(trigger);
    }
  })();

  /* ---------- "Ching" sound (synthesised, no audio file needed) ---------- */
  const Ching = (() => {
    let ctx, unlocked = false, enabled = true;
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
      set enabled(v) { enabled = v; },
      play() {
        if (!enabled || !unlocked || !ctx) return;
        const t = ctx.currentTime;
        [[0, 1], [0.13, 0.85]].forEach(([d, v]) => {
          tone(2093, t + d, 0.55, 0.18 * v); tone(3136, t + d, 0.4, 0.09 * v); tone(4186, t + d, 0.25, 0.05 * v);
        });
      },
    };
  })();

  /* ---------- Purchase notifications (synced with spots) ---------- */
  function startNotifications(cfg) {
    const toast = document.getElementById('purchase-toast');
    if (!toast || !cfg.buyers || !cfg.buyers.length) return;
    const nameEl = toast.querySelector('[data-toast-name]'), timeEl = toast.querySelector('[data-toast-time]');
    const spotEl = toast.querySelector('[data-toast-spot]'), productEl = toast.querySelector('[data-toast-product]');
    if (productEl && cfg.product) productEl.textContent = cfg.product;
    Ching.enabled = cfg.sound !== false;
    const pool = cfg.buyers.slice().sort(() => Math.random() - 0.5);
    let n = 0, hideT;
    function hide() { toast.classList.remove('is-visible'); clearTimeout(hideT); setTimeout(() => { if (!toast.classList.contains('is-visible')) toast.hidden = true; }, 450); }
    function show() {
      const spot = Spots.add();
      nameEl.textContent = pool[n++ % pool.length];
      timeEl.textContent = 'Just now';
      spotEl.textContent = spot;
      toast.hidden = false;
      requestAnimationFrame(() => toast.classList.add('is-visible'));
      Ching.play();
      clearTimeout(hideT);
      hideT = setTimeout(hide, (cfg.visibleSeconds || 6) * 1000);
    }
    toast.querySelector('[data-toast-close]').addEventListener('click', hide);
    setInterval(show, (cfg.everySeconds || 30) * 1000);
  }

  /* ---------- Load offer.json ---------- */
  fetch('offer.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      if (data.checkoutUrl) document.querySelectorAll('[data-checkout]').forEach(a => { a.href = data.checkoutUrl; });
      if (data.spots) Spots.configure(data.spots);
      if (data.notifications) startNotifications(data.notifications);
    })
    .catch(err => console.warn('offer.json could not be loaded; showing the numbers written in index.html.', err));
})();
