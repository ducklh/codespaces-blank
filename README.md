# Siam & Soul

React + TypeScript implementation of the Pen.dev export in [`design/index.html`](./design/index.html). The source contains seven travel-guide screens, an open review-reader state, inline SVGs, and photos embedded as base64 data URLs. The original checkout artboard is not shown; booking CTAs go to `https://www.example.com/`. The 65 unique embedded photos are extracted unchanged to `public/assets/` for static delivery.

## Stack

- Vite
- React and TypeScript
- React Router for the screens present in the source
- Tailwind CSS v4

## Run locally

```sh
npm install
npm run dev
```

## Build and preview

```sh
npm run build
npm run preview
```

The production site is written to `dist/`.

## Routes

`/` is the home screen. The travel-guide screens are available at `/destinations`, `/itinerary`, `/about`, `/food`, `/logistics`, and `/map`. Booking buttons navigate to `https://www.example.com/`. The review-reader design is shown as a modal from a review card.

The source has no mobile-specific layout. Desktop preserves the 1440px composition; at widths up to 1200px, spacing and typography scale for the viewport and content reflows for easier reading. In narrow layouts, location lists, story cards, itinerary statistics, transport passes, and logistics panels use mobile-friendly columns instead of compressing side-by-side. Source text sizes at or below 12px remain at least 12px; larger source text remains at least 14px. Photo layers fill their responsive image frames, preventing collapsed or missing photos. The large interactive map panels scroll within their own sections, while the page itself stays within the viewport.

On tablet and mobile, a shared sticky navigation bar provides links to Destinations, Itineraries, Map & Guide, Food & Drinks, Logistics, and About Me. On phones, it starts collapsed, shows the current section, and closes after a link is selected. The source announcement ribbon is omitted from the rendered pages, and the original in-page navigation is hidden at responsive widths to avoid duplicates.

## Plesk static deployment

1. Run `npm run build`.
2. Upload the **contents** of `dist/` (including `.htaccess`) to the Plesk document root, commonly `httpdocs/`.
3. Keep Apache rewrite support enabled so the included `.htaccess` can serve clean React Router URLs.
4. If Nginx is configured to serve the site directly, use this location rule instead:

   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

5. No Node.js process is needed after deployment; the `dist/` output is static.

## Source notes

See [`docs/SOURCE_ANALYSIS.md`](./docs/SOURCE_ANALYSIS.md) for the screens and source details, and [`docs/IMPLEMENTATION_REPORT.md`](./docs/IMPLEMENTATION_REPORT.md) for implementation choices and limitations.
