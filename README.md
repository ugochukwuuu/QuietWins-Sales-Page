# Quietwins — sales page

A single-page sales site. Plain HTML, CSS and JavaScript: no framework and no build step.

```
index.html        the page
styles.css        all styles
script.js         sliders, FAQ, offer pop-up, sticky bar, purchase notifications
offer.json        offer numbers, buyer names and checkout link (edit this, not the code)
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
| `checkoutUrl` | Where every "Claim discount offer" button goes |
| `spots.total` | Number of founding spots ("/70 spots taken", "first 70 people") |
| `spots.start` | How many spots show as taken when the page loads |
| `notifications.everySeconds` | How often the purchase notification appears |
| `notifications.visibleSeconds` | How long each notification stays on screen |
| `notifications.sound` | `true` plays a short "ching" (only after the visitor has tapped or scrolled the page) |
| `notifications.product` | Product name shown in the notification |
| `notifications.buyers` | Names shown in the notifications, picked in random order |

Prices (₦14,500, ₦20,000, the value stack) are written directly in `index.html`.

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

## Ad pixels (TikTok + Meta)

Both pixels are in the `<head>` of `index.html` (TikTok `DB9KC23C77U6POU9AQ2G`, Meta `1118289207283370`).
They only switch on when the page is served from quietwins.online, so local previews don't send test visits.

| Event | When it fires |
|---|---|
| `PageView` (both) | Every page load |
| `ViewContent` (both) | Once, when the visitor reaches the price section |
| `InitiateCheckout` (both) | Any "Claim discount offer" click; the jump to Selar waits 0.3s so the event can send |

Events carry the product name, `value: 14500` and `currency: NGN`, set in `PRODUCT` near the bottom of `script.js`.
If the price changes, update `PRODUCT.value` too. Purchases happen on Selar, so add the same pixel IDs in Selar to track sales.

## Link previews

The preview card shown when the link is shared (WhatsApp, Facebook, X) uses `og-image.jpg`.
`index.html` points to it with full URLs on https://www.quietwins.online (the bare domain redirects there). If the domain ever changes,
update `og:url`, `og:image` and the `canonical` link in the `<head>`.

To check the card or refresh a cached one, paste the link into https://developers.facebook.com/tools/debug/.
