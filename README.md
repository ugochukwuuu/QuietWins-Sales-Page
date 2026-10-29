# Quietwins — sales page

A single-page sales site. Plain HTML, CSS and JavaScript: no framework and no build step.

```
index.html        the page
styles.css        all styles
script.js         sliders, FAQ, offer pop-up, checkout pop-up (Paystack), sticky bar, purchase notifications
offer.json        offer numbers, buyer names and checkout settings (edit this, not the code)
thank-you.html    page buyers land on after paying: Telegram group link (+ thank-you.css, thank-you.js)
email/            Google Sheet script (logs checkouts, sends the welcome email) and a preview of that email
favicon.svg       browser tab icon
og-image.jpg      preview image shown when the link is shared (WhatsApp, Facebook, X)
assets/images/    images
assets/videos/    videos
design-reference/ the original design files (not used by the live page)
```

## Running it

The page has to be opened from a web address, not by double-clicking `index.html`.
Browsers block `offer.json` for files opened straight from disk, so the purchase notifications would not run.

Any static host works (GitHub Pages, Netlify, Vercel, cPanel). To preview on your computer:

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

## Editing the offer: `offer.json`

| Field | What it controls |
|---|---|
| `checkout.paystackPublicKey` | Your Paystack **public** key (`pk_test_…` while testing, `pk_live_…` when live). Never the secret key |
| `checkout.amount` | Amount charged, in naira |
| `checkout.leadEndpoint` | The Google Sheet web-app link (ends in `/exec`), see below |
| `checkout.thankYouUrl` | Page buyers are sent to after paying |
| `spots.total` | Number of founding spots ("/70 spots taken", "first 70 people") |
| `spots.start` | How many spots show as taken when the page loads |
| `notifications.everySeconds` | How often the purchase notification appears |
| `notifications.visibleSeconds` | How long each notification stays on screen |
| `notifications.sound` | `true` plays a short "ching" (only after the visitor has tapped or scrolled the page) |
| `notifications.product` | Product name shown in the notification |
| `notifications.buyers` | Names shown in the notifications, picked in random order |

Prices shown on the page (₦14,500, ₦30,000, the value stack) are written directly in `index.html`.
If the price changes, also update `checkout.amount`, `PRODUCT.value` in `script.js` and `thank-you.js`, and `EXPECTED_AMOUNT_KOBO` in `email/apps-script.gs`.

## Replacing media

Keep the same file names and the page picks the new files up automatically.

| Section | Files | Notes |
|---|---|---|
| Hero video | `videos/hero-video.mp4` | The frame takes the shape of the video |
| AI video slider | `videos/ai-video-1.mp4` … `ai-video-4.mp4` | 9:16 |
| Comment reactions | `images/reaction-1.png` … `reaction-4.png` | Shown whole, never cropped |
| Faceless pages (switches every 4s) | `images/faceless-page-1.webp` … `faceless-page-3.webp` | Cropped from the top |
| Student video slider | `videos/student-video-1.mp4` … `student-video-4.mp4` | 9:16 |
| Product cover | `images/product-cover.webp` | 3:4 frame |
| Payout screenshots | `images/payout-1.webp` … `payout-8.webp` | Each card takes the shape of its image |

To keep the page fast on mobile data, export images as WebP around 1280px on the long side, and keep videos under about 1.5 Mbps.
If you use a different file type (for example `.jpg`), update the matching `src` in `index.html`.

## Checkout (Paystack) and the Google Sheet

Every "Claim discount offer" button opens the checkout pop-up. The visitor enters name, email and phone, presses
**Pay**, pays in the Paystack window and lands on `thank-you.html` with the Telegram link.

Each step is added as a row to a Google Sheet. Rows from one attempt share the same reference (`QW-XXXXXX`):

| Stage | Meaning |
|---|---|
| `details` | Pressed **Pay**. Logged before Paystack opens, so you keep the contact even if they never pay |
| `paid` | Paystack reported success. The script checks it with Paystack (`Verified` column) and emails the Telegram link |
| `cancelled` | Closed the Paystack window without paying |
| `failed` | Paystack couldn't start or complete the payment (`Note` column says why) |
| `already bought` | This email had already paid. No second payment was taken; the access email was re-sent instead (at most once per 10 minutes per address) |

A `details` row with nothing after it means the visitor closed the tab or lost connection while paying.

Before Paystack opens, the pop-up asks the Sheet whether that email already has a confirmed payment. If it does, the visitor
sees "You already own this" instead of paying again. The Telegram link is only ever emailed, never shown, so typing someone
else's email can't reveal it. If the Sheet doesn't answer within 6 seconds, the payment goes ahead as normal.

Setting up the Sheet (the steps are also at the top of `email/apps-script.gs`):

1. Create a Google Sheet with the Google account the welcome email should come from.
2. In the Sheet: Extensions → Apps Script. Delete what's there, paste all of `email/apps-script.gs`, save.
3. Project Settings (gear icon) → Script properties → add `PAYSTACK_SECRET_KEY` with your Paystack **secret** key (`sk_test_…` while testing).
4. Deploy → New deployment → type **Web app** → Execute as **Me**, Who has access **Anyone** → Deploy, allow the permissions, copy the URL ending in `/exec`.
5. Paste that URL into `checkout.leadEndpoint` in `offer.json`.

After editing the script later, use Deploy → Manage deployments → edit → Version **New version**, so the URL stays the same.
To change the Telegram link, edit `TELEGRAM_URL` in `thank-you.js`, `thank-you.html` and `email/apps-script.gs`.

## Ad pixels (TikTok + Meta)

Both pixels are in the `<head>` of `index.html` (TikTok `DB9KC23C77U6POU9AQ2G`, Meta `1118289207283370`).
They only switch on when the page is served from quietwins.online, so local previews don't send test visits.

| Event | When it fires |
|---|---|
| `PageView` (both) | Every page load |
| `ViewContent` (both) | Once, when the visitor reaches the price section |
| `InitiateCheckout` (both) | The checkout pop-up opens |
| `Purchase` (Meta) / `CompletePayment` (TikTok) | The thank-you page loads after a payment (once per payment reference) |

Events carry the product name, `value: 14500` and `currency: NGN`, set in `PRODUCT` near the bottom of `script.js`.
If the price changes, update `PRODUCT.value` too (in `script.js` and `thank-you.js`).

## Link previews

The preview card shown when the link is shared (WhatsApp, Facebook, X) uses `og-image.jpg`.
`index.html` points to it with full URLs on https://www.quietwins.online (the bare domain redirects there). If the domain ever changes,
update `og:url`, `og:image` and the `canonical` link in the `<head>`.

To check the card or refresh a cached one, paste the link into https://developers.facebook.com/tools/debug/.
