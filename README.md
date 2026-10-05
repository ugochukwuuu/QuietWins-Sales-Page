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

Prices (₦14,500, ₦15,000, the value stack) are written directly in `index.html`.

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

## Before sharing the link

Once the site has its domain, change `og:image` in `index.html` to the full URL
(for example `https://your-domain.com/og-image.jpg`) and add an `og:url` tag.
WhatsApp and Facebook only show the preview image when the URL is absolute.
