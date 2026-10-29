/**
 * Quietwins — Google Apps Script web app (checkout.leadEndpoint in offer.json)
 *
 * What it does
 *  - Logs every checkout step to the active Google Sheet, one row per step:
 *      details   → visitor pressed "Pay" (before Paystack opens)
 *      paid      → Paystack reported success (checked with Paystack, see "Verified")
 *      cancelled → visitor closed the Paystack window without paying
 *      failed    → Paystack could not start or complete the payment
 *      already bought → this email had already paid; the access email was re-sent instead of
 *                       taking a second payment (at most once per 10 minutes per address)
 *    Rows from the same attempt share a reference. A "details" row with no later row for the same
 *    reference means the visitor left the page (closed the tab) while paying.
 *  - On "paid": verifies the reference with Paystack (secret key, server-side), then emails
 *    the buyer their order details + the Telegram group link. One email per reference.
 *    Optional: set OWNER_EMAIL to get a copy of every sale.
 *
 * Setup (5 minutes)
 *  1. Create a Google Sheet → Extensions → Apps Script → paste this file.
 *  2. Project Settings → Script properties → add PAYSTACK_SECRET_KEY = sk_live_… (never put it in the website).
 *  3. Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone → copy the /exec URL.
 *  4. Paste that URL into "leadEndpoint" in offer.json.
 *     After editing this script later: Deploy → Manage deployments → edit → Version: New version (keeps the same URL).
 *  5. Make a test payment with a pk_test_/sk_test_ pair and check the email arrives.
 *
 * Sends from the Google account that deploys the script (Gmail daily quota: ~100/day free, 1,500/day Workspace).
 * For higher volume, swap MailApp for Brevo / Resend / Mailchimp Transactional with the same HTML.
 */
var TELEGRAM_URL = 'https://t.me/+xAI86HNgojcwMWY0';
var EXPECTED_AMOUNT_KOBO = 14500 * 100; // keep in sync with checkout.amount in offer.json
var FROM_NAME = 'Quietwins';
var SUBJECT = "You're in! Your order details + Telegram group link 🎉";
var PRODUCT = 'From Photo to Viral Video: The Realistic AI Method + 4 bonuses';
var OWNER_EMAIL = ''; // optional: your email — you'll get a copy of every new sale's details

var RESEND_COOLDOWN_SECONDS = 600; // re-send the access email to the same address at most once per 10 minutes
var COLUMNS = ['Time', 'Stage', 'Name', 'Email', 'Phone', 'Reference', 'Verified', 'Email sent', 'Note', 'Page'];

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false }); }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUMNS);
  if (d.stage === 'check') return out_(checkOwned_(sheet, d));
  var verified = '', sent = '';

  if (d.stage === 'paid' && d.reference) {
    var props = PropertiesService.getScriptProperties();
    var key = 'sent_' + d.reference;
    var tx = verify_(d.reference);
    verified = tx ? 'yes' : 'no';
    if (tx && !props.getProperty(key)) {
      var o = order_(tx, d.name, d.phone ? '+234 ' + d.phone : '');
      sendWelcome_(o);
      if (OWNER_EMAIL) MailApp.sendEmail({ to: OWNER_EMAIL, subject: 'New sale: ' + o.name + ' · ' + o.amount, name: FROM_NAME, body: orderText_(o) });
      props.setProperty(key, '1');
      sent = 'yes';
    }
  }
  sheet.appendRow([d.time || new Date().toISOString(), d.stage, d.name, d.email, d.phone ? "'+234 " + d.phone : '', d.reference || '', verified, sent, d.note || '', d.page]);
  return out_({ ok: true });
}

// Before payment: has this email already paid? If so, re-send the access email to that address
// (the Telegram link only ever goes to the inbox on file, never back to the browser).
function checkOwned_(sheet, d) {
  var email = String(d.email || '').trim().toLowerCase();
  if (!email) return { owned: false };
  var rows = sheet.getDataRange().getValues(), h = rows[0];
  var col = function (name) { return h.indexOf(name); };
  var cStage = col('Stage'), cEmail = col('Email'), cRef = col('Reference'), cVer = col('Verified'), cName = col('Name'), cPhone = col('Phone');
  for (var i = rows.length - 1; i > 0; i--) {
    var r = rows[i];
    if (r[cStage] !== 'paid' || r[cVer] !== 'yes' || String(r[cEmail]).trim().toLowerCase() !== email) continue;
    var cache = CacheService.getScriptCache(), ck = 'resent_' + email, sent = '';
    if (!cache.get(ck)) {
      var tx = verify_(r[cRef]);
      if (tx) {
        sendWelcome_(order_(tx, r[cName], String(r[cPhone] || '')));
        cache.put(ck, '1', RESEND_COOLDOWN_SECONDS);
        sent = 'yes';
      }
    }
    sheet.appendRow([d.time || new Date().toISOString(), 'already bought', r[cName], email, r[cPhone] ? "'" + r[cPhone] : '', r[cRef], 'yes', sent, sent ? 'access email re-sent' : 're-sent recently, skipped', d.page]);
    return { owned: true };
  }
  return { owned: false };
}

function order_(tx, name, phone) {
  var c = tx.customer || {};
  var o = {
    name: name || [c.first_name, c.last_name].filter(String).join(' ') || 'Customer',
    email: c.email, // trust Paystack's email over the browser's
    phone: phone || c.phone || '—',
    product: PRODUCT,
    amount: '₦' + Number(tx.amount / 100).toLocaleString('en-NG'),
    ref: tx.reference,
    date: Utilities.formatDate(new Date(tx.paid_at || new Date()), 'Africa/Lagos', 'd MMM yyyy, h:mm a')
  };
  o.first = String(o.name).split(' ')[0];
  return o;
}

function orderText_(o) {
  return "You're in, " + o.first + '!\n\nYour order details\nName: ' + o.name + '\nEmail: ' + o.email + '\nPhone: ' + o.phone +
    '\nProduct: ' + o.product + '\nAmount paid: ' + o.amount + '\nReference: ' + o.ref + '\nDate: ' + o.date +
    '\n\nJoin the private Telegram group: ' + TELEGRAM_URL;
}

function sendWelcome_(o) {
  MailApp.sendEmail({ to: o.email, subject: SUBJECT, name: FROM_NAME, htmlBody: emailHtml_(o), body: orderText_(o) });
}

function verify_(ref) {
  var secret = PropertiesService.getScriptProperties().getProperty('PAYSTACK_SECRET_KEY');
  if (!secret) return null;
  var res = UrlFetchApp.fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(ref),
    { headers: { Authorization: 'Bearer ' + secret }, muteHttpExceptions: true });
  try {
    var j = JSON.parse(res.getContentText());
    return j.status && j.data && j.data.status === 'success' && j.data.amount >= EXPECTED_AMOUNT_KOBO ? j.data : null;
  } catch (err) { return null; }
}

function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// Same design as email/welcome-email.html (preview that file in a browser).
function emailHtml_(o) {
  return '<!DOCTYPE html>' +
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>You\'re in — your order details + Telegram group</title></head>' +
    '<body style="margin:0;padding:0;background:#0A0A0A">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your payment is confirmed. Here are your order details and the Telegram group link.</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A0A0A"><tr><td align="center" style="padding:32px 16px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">' +
    '<tr><td style="padding:0 4px 24px;font-family:Poppins,Arial,sans-serif;font-weight:600;font-size:20px;letter-spacing:-0.5px;color:#FFFFFF">Quietwins<span style="color:#FF5A1F">.</span></td></tr>' +
    '<tr><td style="background:#111111;border:1px solid #2A2A2A;border-radius:20px;padding:36px 28px">' +
    '  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
    '  <tr><td style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#FF8A4C;padding-bottom:14px">Payment confirmed</td></tr>' +
    '  <tr><td style="font-family:Poppins,Arial,sans-serif;font-weight:600;font-size:28px;line-height:1.2;letter-spacing:-0.6px;color:#FFFFFF;padding-bottom:16px">You\'re in, <span style="color:#FF5A1F">' + esc(o.first) + '</span>!</td></tr>' +
    '  <tr><td style="font-family:Arial,sans-serif;font-size:16px;line-height:1.65;color:#BDBDBD;padding-bottom:28px">Welcome to <strong style="color:#FFFFFF">From Photo to Viral Video: The Realistic AI Method</strong>. Your next step is to join the private Telegram group. Your guide, your 4 bonuses, the step-by-step recorded videos and the community are all inside.</td></tr>' +
    '  <tr><td align="center" style="padding-bottom:22px">' +
    '    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#FF5A1F" style="border-radius:999px">' +
    '      <a href="' + TELEGRAM_URL + '" target="_blank" style="display:inline-block;padding:17px 34px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px">Join the Telegram group →</a>' +
    '    </td></tr></table>' +
    '  </td></tr>' +
    '  <tr><td style="padding:4px 0 26px">' +
    '    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0B0B;border:1px solid #222222;border-radius:14px"><tr><td style="padding:16px 18px 6px">' +
    '      <div style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8C8C8C;padding-bottom:4px">Your order details</div>' +
    '      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
    '      <tr><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:13px;color:#8C8C8C;width:42%">Name</td><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-align:right;word-break:break-word">' + esc(o.name) + '</td></tr><tr><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:13px;color:#8C8C8C;width:42%">Email</td><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-align:right;word-break:break-word">' + esc(o.email) + '</td></tr><tr><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:13px;color:#8C8C8C;width:42%">Phone</td><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-align:right;word-break:break-word">' + esc(o.phone) + '</td></tr><tr><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:13px;color:#8C8C8C;width:42%">Product</td><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-align:right;word-break:break-word">' + esc(o.product) + '</td></tr><tr><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:13px;color:#8C8C8C;width:42%">Amount paid</td><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-align:right;word-break:break-word">' + esc(o.amount) + '</td></tr><tr><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:13px;color:#8C8C8C;width:42%">Reference</td><td style="padding:11px 0;border-bottom:1px solid #1F1F1F;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-align:right;word-break:break-word">' + esc(o.ref) + '</td></tr><tr><td style="padding:11px 0;font-family:Arial,sans-serif;font-size:13px;color:#8C8C8C;width:42%">Date</td><td style="padding:11px 0;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#FFFFFF;text-align:right;word-break:break-word">' + esc(o.date) + '</td></tr>' +
    '      </table>' +
    '    </td></tr></table>' +
    '  </td></tr>' +
    '  <tr><td style="border-top:1px solid #222222;padding-top:20px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#8C8C8C">Button not working? Copy this link into your browser:<br><a href="' + TELEGRAM_URL + '" target="_blank" style="color:#FF8A4C;text-decoration:underline;word-break:break-all">' + esc(TELEGRAM_URL) + '</a></td></tr>' +
    '  </table>' +
    '</td></tr>' +
    '<tr><td style="padding:22px 4px 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#6B6B6B">Order reference: ' + esc(o.ref) + ' · Paystack has sent your payment receipt separately.<br>You\'re receiving this because you bought From Photo to Viral Video: The Realistic AI Method.</td></tr>' +
    '</table>' +
    '</td></tr></table>' +
    '</body></html>';
}
