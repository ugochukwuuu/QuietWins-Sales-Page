/* =========================================================
   Quietwins landing page — script.js
   Offer numbers, buyer names and the checkout settings come from offer.json.
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

  /* ---------- Ad pixel events (TikTok + Meta) ----------
     The base pixels and PageView live in <head>; they only exist on the live domain.
     If the price changes, update PRODUCT.value so ad reports show the right amount. */
  const PRODUCT = { id: 'photo-to-viral-video', name: 'From Photo to Viral Video: The Realistic AI Method', value: 14500, currency: 'NGN' };

  function trackEvent(name) {
    try {
      if (window.ttq) window.ttq.track(name, {
        contents: [{ content_id: PRODUCT.id, content_type: 'product', content_name: PRODUCT.name }],
        value: PRODUCT.value, currency: PRODUCT.currency,
      });
      if (window.fbq) window.fbq('track', name, {
        content_ids: [PRODUCT.id], content_type: 'product', content_name: PRODUCT.name,
        value: PRODUCT.value, currency: PRODUCT.currency,
      });
    } catch (e) { /* tracking must never break the page */ }
  }

  // ViewContent: once, when the price section comes into view
  (function () {
    const section = document.querySelector(POPUP_TRIGGER);
    if (!section || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); trackEvent('ViewContent'); }
    }, { rootMargin: '0px 0px -30% 0px' });
    io.observe(section);
  })();

  /* ---------- Checkout pop-up: details → Paystack → thank-you page ----------
     Settings come from offer.json → "checkout". Every [data-checkout] button opens it.
     Each attempt is logged to the Google Sheet (leadEndpoint) with one of these stages:
       details   → the visitor pressed "Pay" (logged before Paystack opens, so nobody is lost)
       paid      → Paystack reported success (the Sheet script double-checks it with Paystack)
       cancelled → the visitor closed the Paystack window without paying
       failed    → Paystack could not start or complete the payment
     Before Paystack opens, the Sheet is asked whether this email has already paid. If so, no second
     payment is taken: the Sheet re-sends the access email and logs an "already bought" row.
     All rows of one attempt share the same reference (QW-XXXXXX). */
  const Checkout = (() => {
    const modal = document.getElementById('checkout-modal');
    if (!modal) return { configure() {} };
    const STORE = 'qw-buyer';
    let cfg = { paystackPublicKey: '', amount: PRODUCT.value, currency: PRODUCT.currency, leadEndpoint: '', thankYouUrl: 'thank-you.html' };
    const form = modal.querySelector('form');
    const steps = [...modal.querySelectorAll('[data-co-step]')];
    const views = [...modal.querySelectorAll('[data-co-view]')];
    const payBtn = modal.querySelector('[data-co-pay]'), payLabel = modal.querySelector('[data-co-pay-label]');
    const payErr = modal.querySelector('[data-co-pay-err]'), payLabelHTML = payLabel.innerHTML;
    let buyer = {}; try { buyer = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) {}
    let lastFocus, sdk;

    const keyOk = () => /^pk_(test|live)_[a-z0-9]{20,}$/i.test(cfg.paystackPublicKey || '');
    // Paystack Inline is loaded on first open so it doesn't slow the page down
    const loadSdk = () => sdk || (sdk = new Promise((res, rej) => {
      if (window.PaystackPop) return res();
      const s = document.createElement('script');
      s.src = 'https://js.paystack.co/v2/inline.js'; s.async = true;
      s.onload = res; s.onerror = () => { sdk = null; rej(new Error('sdk')); };
      document.head.appendChild(s);
    }));
    // 6 characters without look-alikes (0/O, 1/I/L); Paystack needs a fresh reference per attempt
    function makeRef() {
      const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = new Uint32Array(6);
      crypto.getRandomValues(r);
      return 'QW-' + Array.from(r, n => A[n % A.length]).join('');
    }
    const normPhone = v => { let d = v.replace(/\D/g, ''); if (d.startsWith('234')) d = d.slice(3); if (d.startsWith('0')) d = d.slice(1); return d; };
    const rules = {
      name: v => v.trim().length >= 2,
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      phone: v => /^[789]\d{9}$/.test(normPhone(v)),
    };
    function send(stage, extra) {
      if (!cfg.leadEndpoint) return Promise.resolve();
      try {
        // text/plain + no-cors avoids a CORS preflight, which Google Apps Script can't answer
        return fetch(cfg.leadEndpoint, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ stage, ...buyer, ...extra, amount: cfg.amount, page: location.href, time: new Date().toISOString() }) }).catch(() => {});
      } catch (e) { return Promise.resolve(); }
    }
    // Asks the Sheet if this email already paid. Any error or slow reply (>6s) lets the payment go ahead.
    async function alreadyOwned(email) {
      if (!cfg.leadEndpoint) return false;
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 6000);
      try {
        const res = await fetch(cfg.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctrl.signal,
          body: JSON.stringify({ stage: 'check', email, page: location.href, time: new Date().toISOString() }) });
        return !!(await res.json()).owned;
      } catch (e) { return false; } finally { clearTimeout(timer); }
    }
    function show(name) {
      views.forEach(v => { v.hidden = v.dataset.coView !== name; });
      modal.classList.toggle('is-owned', name === 'owned');
      modal.querySelector('.co__card').scrollTop = 0;
      if (name === 'owned') {
        modal.querySelectorAll('[data-co-first]').forEach(el => { el.textContent = buyer.name.split(' ')[0]; });
        modal.querySelectorAll('[data-co-email]').forEach(el => { el.textContent = buyer.email; });
      }
    }
    function busy(on, label) { payBtn.disabled = on; payLabel.innerHTML = on ? label : payLabelHTML; }
    function step(i) { steps.forEach((s, n) => { s.classList.toggle('is-active', n === i); s.classList.toggle('is-done', n < i); }); }
    function open() {
      const offer = document.getElementById('offer-modal');
      if (offer && !offer.hidden) offer.querySelector('[data-modal-close]').click();
      loadSdk().catch(() => {});
      lastFocus = document.activeElement;
      ['name', 'email', 'phone'].forEach(k => { if (buyer[k] && !form[k].value) form[k].value = buyer[k]; });
      form.querySelectorAll('.is-invalid').forEach(f => f.classList.remove('is-invalid'));
      payErr.textContent = '';
      busy(false); step(0); show('details');
      modal.hidden = false;
      document.body.classList.add('modal-open');
      const firstEmpty = [...form.querySelectorAll('input')].find(i => !i.value) || payBtn;
      setTimeout(() => firstEmpty.focus({ preventScroll: true }), 60);
      trackEvent('InitiateCheckout');
    }
    function close() {
      modal.hidden = true;
      document.body.classList.remove('modal-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    document.addEventListener('click', e => {
      if (!e.target.closest('[data-checkout]')) return;
      e.preventDefault();
      open();
    });
    if (location.hash === '#checkout') { history.replaceState(null, '', location.pathname + location.search); setTimeout(open, 300); }
    modal.querySelector('[data-co-back]').addEventListener('click', () => { show('details'); form.email.focus(); form.email.select(); });
    modal.querySelectorAll('[data-co-close]').forEach(b => b.addEventListener('click', () => { if (!payBtn.disabled) close(); }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden && !payBtn.disabled) close(); });

    form.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
      const f = inp.closest('.co__field');
      if (f.classList.contains('is-invalid') && rules[inp.name](inp.value)) f.classList.remove('is-invalid');
    }));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      payErr.textContent = '';
      let bad = null;
      Object.keys(rules).forEach(k => {
        const ok = rules[k](form[k].value);
        form.querySelector(`[data-co-field="${k}"]`).classList.toggle('is-invalid', !ok);
        if (!ok && !bad) bad = form[k];
      });
      if (bad) return bad.focus();
      const p = normPhone(form.phone.value);
      buyer = { name: form.name.value.trim().replace(/\s+/g, ' '), email: form.email.value.trim().toLowerCase(), phone: `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}` };
      try { localStorage.setItem(STORE, JSON.stringify(buyer)); } catch (e) {}
      busy(true, 'Checking your details…');
      const owned = await alreadyOwned(buyer.email);
      busy(false);
      if (owned) return show('owned');
      const reference = makeRef();
      send('details', { reference });
      if (!keyOk()) { payErr.textContent = 'Payments aren\'t switched on yet. Add your Paystack public key in offer.json.'; return; }
      busy(true, 'Opening secure checkout…');
      try { await loadSdk(); } catch (err) { busy(false); send('failed', { reference, note: 'Paystack script did not load' }); payErr.textContent = 'Couldn\'t reach Paystack. Check your connection and try again.'; return; }
      const [firstName, ...rest] = buyer.name.split(' ');
      try {
        new window.PaystackPop().newTransaction({
          key: cfg.paystackPublicKey,
          email: buyer.email,
          amount: Math.round(cfg.amount * 100), // kobo
          currency: cfg.currency,
          ...(cfg.channels && cfg.channels.length ? { channels: cfg.channels } : {}), // payment methods shown in Paystack
          reference,
          firstName, lastName: rest.join(' '),
          phone: '+234' + p,
          metadata: { custom_fields: [
            { display_name: 'Full name', variable_name: 'full_name', value: buyer.name },
            { display_name: 'Phone', variable_name: 'phone', value: '+234' + p },
            { display_name: 'Product', variable_name: 'product', value: PRODUCT.name },
          ] },
          // Paystack's window opens underneath our pop-up, so step aside while it's open
          onLoad: () => { busy(true, 'Complete payment in the Paystack window…'); step(1); modal.hidden = true; },
          onSuccess: async tx => {
            const ref = (tx && tx.reference) || reference;
            busy(true, 'Payment confirmed. Taking you in…');
            modal.hidden = false;
            // Leave only once the Sheet has the "paid" row (it sends the welcome email), or after 8s at most
            await Promise.race([send('paid', { reference: ref, transaction: tx && tx.transaction }), new Promise(r => setTimeout(r, 8000))]);
            location.href = cfg.thankYouUrl + '?ref=' + encodeURIComponent(ref) + '&name=' + encodeURIComponent(firstName);
          },
          onCancel: () => { send('cancelled', { reference }); modal.hidden = false; busy(false); step(0); payErr.textContent = 'Payment was cancelled. You can try again whenever you\'re ready.'; },
          onError: err => { send('failed', { reference, note: (err && err.message) || '' }); modal.hidden = false; busy(false); step(0); payErr.textContent = 'Something went wrong starting the payment. Please try again.'; },
        });
      } catch (err) { send('failed', { reference, note: String((err && err.message) || err) }); busy(false); payErr.textContent = 'Something went wrong starting the payment. Please try again.'; }
    });

    return {
      configure(c) {
        cfg = { ...cfg, ...c };
        const amt = '₦' + Number(cfg.amount).toLocaleString('en-NG');
        modal.querySelectorAll('[data-pay="amount"]').forEach(el => { el.textContent = amt; });
      },
    };
  })();

  /* ---------- Load offer.json ---------- */
  fetch('offer.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      if (data.checkout) Checkout.configure(data.checkout);
      if (data.spots) Spots.configure(data.spots);
      if (data.notifications) startNotifications(data.notifications);
    })
    .catch(err => console.warn('offer.json could not be loaded; showing the numbers written in index.html.', err));
})();
