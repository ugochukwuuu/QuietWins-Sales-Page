# Landing page — handoff notes

Plain HTML / CSS / JS. No build step.

```
landing/
├── index.html          # all sections, in order
├── css/styles.css      # tokens, components, responsive rules
├── js/main.js          # CONFIG + countdown, nav, sliders, media, switcher, FAQ
└── assets/
    ├── images/         # drop image files here (names below)
    └── videos/         # drop video files here (names below)
```

## Configure (top of `js/main.js`)
- `spotsTotal` / `spotsStart` / `spotsStopAt` – founding-spots counter. Every visit starts at 35/50; each purchase notification adds one (stops at 49).
- `popupDelayMs` – offer pop-up opens once per visit after 60s.
- `toastEveryMs` / `toastVisibleMs` / `toastSound` / `buyers` – purchase notification (every 45s, synced with the spots counter, "ching" sound synthesised in-browser).
- `checkoutUrl` – Selar checkout link applied to every `[data-checkout]` CTA.
- `editMode` – `true` while building (placeholders accept click / drag-and-drop uploads, stored in the browser only). Set `false` before launch.

## Media slots
Each placeholder has `data-key` and `data-src`. The page loads `assets/<type>/<key>.<ext>` automatically
(`.jpg/.jpeg/.png/.webp` for images, `.mp4/.webm/.mov` for videos). Browser uploads are for previewing only —
put the final files in `assets/` with these names:

| Section | File(s) | Frame |
|---|---|---|
| 1 · Hero video | `videos/hero-video.mp4` | adapts to the video's shape |
| 2 · AI video slider (4) | `videos/ai-video-1.mp4` … `ai-video-4.mp4` | 9:16 |
| 3 · Reactions / comments (4) | `images/reaction-1.png` … `reaction-4.png` | 5:2, contained |
| 5 · Faceless pages switcher (3, every 4s) | `images/faceless-page-1.png` … `faceless-page-3.png` | 5:4 |
| 5 · Student videos slider (4) | `videos/student-video-1.mp4` … `student-video-4.mp4` | 9:16 |
| 6 · Product cover / mockup | `images/product-cover.jpeg` | 3:4 |
| 9 · Payout screenshots slider (8) | `images/payout-1.png` … `payout-8.png` | 4:5, contained |

Frames are sized to the average shape of each group. `js/main.js → fitMedia()` uses cover only when a file is within 12%
of its frame's shape; otherwise it letterboxes (contain) and fills the bars with the image's own edge colour, so nothing important is cropped.

## Sections
Each `<section>` has an SEO-friendly `id`, a readable `data-section` name, `aria-labelledby` → its heading, and a comment banner.

1. `#hero` — Hero Section
2. `#story-problem` — Story / Problem Section (+ AI video slider)
3. `#realism-proof` — Realism Proof Section
4. `#how-it-works` — How It Works (The Method)
5. `#credibility` — Credibility — My Pages & Student Results
6. `#product-introduction` — Product Introduction
7. `#three-step-system` — The 3-Step System + CTA
8. `#free-bonuses` — Free Bonuses
9. `#money-proof` — Money Proof — Payouts & Sales
10. `#cost-value-stack` — Cost & Value Stack
11. `#price-offer-guarantee` — Price Offer & Guarantee
12. `#faq` — FAQ
13. `#final-call-to-action` — Final Call to Action

## Notes for refactoring
Sections after the story were ported from the design canvas with inline styles; responsive behaviour is layered on via
utility classes in `styles.css` (`r-grid`, `r-split`, `r-bento`, `r-stack`, `r-pill`, `slider__*`). Sliders show 2 items on
mobile.
