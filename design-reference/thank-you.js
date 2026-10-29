/* =========================================================
   Thank you page — thank-you.js
   Shows the buyer's first name, email and Paystack reference.
   Sources: URL (?name=&ref=, set by main.js after payment) → localStorage 'qw-buyer' (saved at checkout).
   ========================================================= */
(function () {
  var TELEGRAM_URL = 'https://t.me/+xAI86HNgojcwMWY0';
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
})();
