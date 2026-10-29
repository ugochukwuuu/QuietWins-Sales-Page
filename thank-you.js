/* =========================================================
   Thank you page — thank-you.js
   Shows the buyer's first name, email and Paystack reference, and sends the Purchase pixel event.
   Sources: URL (?name=&ref=, set by script.js after payment) → localStorage 'qw-buyer' (saved at checkout).
   ========================================================= */
(function () {
  var TELEGRAM_URL = 'https://t.me/+oFJn_kHmTOk1ZWJk';
  var PRODUCT = { id: 'photo-to-viral-video', name: 'From Photo to Viral Video: The Realistic AI Method', value: 14500, currency: 'NGN' };
  var q = new URLSearchParams(location.search), buyer = {};
  try { buyer = JSON.parse(localStorage.getItem('qw-buyer')) || {}; } catch (e) {}
  var $ = function (s) { return document.querySelector(s); };

  var first = (q.get('name') || buyer.name || '').trim().split(/\s+/)[0];
  if (first) {
    first = first.charAt(0).toUpperCase() + first.slice(1);
    $('[data-ty-name]').textContent = first;
    $('[data-ty-name-wrap]').hidden = false;
    document.title = "You're in, " + first + '! — Quietwins';
  }
  if (buyer.email) $('[data-ty-email]').textContent = buyer.email;
  var ref = q.get('ref');
  if (ref) { $('[data-ty-ref]').textContent = ref; $('[data-ty-ref-wrap]').hidden = false; }

  document.querySelectorAll('[data-ty-tg]').forEach(function (a) { a.href = TELEGRAM_URL; });
  var t = $('[data-ty-tg-text]'); if (t) { t.href = TELEGRAM_URL; t.textContent = TELEGRAM_URL.replace(/^https?:\/\//, ''); }

  var btn = $('[data-ty-copy]'), timer;
  if (btn) btn.addEventListener('click', function () {
    var done = function () { btn.textContent = 'Copied ✓'; btn.classList.add('is-copied'); clearTimeout(timer); timer = setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('is-copied'); }, 2200); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(TELEGRAM_URL).then(done, fallback); else fallback();
    function fallback() { var i = document.createElement('textarea'); i.value = TELEGRAM_URL; i.style.position = 'fixed'; i.style.opacity = '0'; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); done(); } catch (e) {} i.remove(); }
  });

  // Purchase pixel event: once per payment reference, so a page refresh doesn't count a second sale.
  // If the price changes, update PRODUCT.value here and in script.js.
  if (ref) {
    var key = 'qw-purchase-' + ref, seen = false;
    try { seen = !!localStorage.getItem(key); localStorage.setItem(key, '1'); } catch (e) {}
    if (!seen) try {
      if (window.ttq) window.ttq.track('CompletePayment', {
        contents: [{ content_id: PRODUCT.id, content_type: 'product', content_name: PRODUCT.name }],
        value: PRODUCT.value, currency: PRODUCT.currency,
      });
      if (window.fbq) window.fbq('track', 'Purchase', {
        content_ids: [PRODUCT.id], content_type: 'product', content_name: PRODUCT.name,
        value: PRODUCT.value, currency: PRODUCT.currency,
      }, { eventID: ref });
    } catch (e) { /* tracking must never break the page */ }
  }
})();
