# Pen.dev source analysis

## Source and structure

The only design source is [`design/index.html`](../design/index.html). The complete 24,378,645-byte document was scanned before implementation. It contains one large Pen.dev canvas (13,160 × 10,226 px) with eight separate 1,440 px desktop artboards, plus a review-reader modal state. The artboards are positioned side by side in the canvas; they are independent screens, not sections to render in one long page. The checkout artboard is retained in the source but intentionally omitted from the application; booking actions navigate to `https://www.example.com/`.

| Screen | Source sections, in order | Route |
|---|---|---|
| Siam & Soul — Home | Top Ribbon, Header, Header Divider, Hero, Featured Reviews, Journal Feed, Trip Route, Long Read, When To Go, History Section, More Stories, Home Booking Band, Footer | `/` |
| Siam & Soul — Destinations | Top Ribbon, Header, Header Divider, Page Intro, Region Banner, Filter Bar, Destination Grid, Region Weather, Regional Context, Footer Rule, Footer | `/destinations` |
| Siam & Soul — Itinerary & Map | Top Ribbon, Header, Header Divider, Page Intro, Hero Summary, Timeline Section, Book and Scams, Packing Section, Packing Footer, Footer Rule, Footer | `/itinerary` |
| Siam & Soul — About & Gallery | Top Ribbon, Header, Header Divider, About Split, Footer Rule, Footer | `/about` |
| Siam & Soul — Food & Drinks | Top Ribbon, Header, Header Divider, Hero, Category Tabs, Food Grid, Little Black Book, Footer Rule, Footer | `/food` |
| Siam & Soul — Trip Logistics | Top Ribbon, Header, Header Divider, Page Intro, Dashboard Card, Transport Section, Accommodation and Hacks, Converter and ATM, Book Transport Section, Logistics Booking Band, Footer Rule, Footer | `/logistics` |
| Siam & Soul — Interactive Map | Top Ribbon, Header, Header Divider, Page Intro, View Switcher Row, Map 01 Section, Map 02 Section, Pin Index, Atlas Notes, Booking Band, Footer Rule, Footer | `/map` |
| Review Reader — Open | Reader Panel | Modal state opened from review cards |

The source contains 3,006 `div`s, 453 inline SVGs, 473 SVG paths, 859 distinct utility tokens, and 71 inline styles. Its visible structure is primarily nested `div` and SVG elements; it has no actual `<a>`, `<button>`, `<form>`, or `<img>` elements.

## Styling and assets

- The source loads Inter, Noto Sans Thai, Playfair Display, and Plus Jakarta Sans from Google Fonts.
- Tailwind classes include arbitrary dimensions, colors, typography, outlines, shadows, gradients, and positioning. No responsive breakpoint-prefixed classes or CSS custom properties were found.
- The source config explicitly disables Tailwind preflight and includes a small box-sizing/body reset. Tailwind v4 utilities are built locally; the CDN script is not used.
- All 71 photo backgrounds in the source are encoded as `data:image/jpeg;base64,...` in inline style attributes. The implementation extracts the 65 unique JPEG payloads unchanged to hashed files under `public/assets/`; repeated source references reuse the same file. Inline SVGs provide the icons and map artwork. No local image paths or external image URLs are referenced by the original export.
- Booking buttons use the requested external destination, `https://www.example.com/`.
- The Trip Logistics screen includes a visible `MAP [USER_MAP_EMBED]` placeholder but supplies no map URL or tiles. It is documented in [`MISSING_ASSETS.md`](./MISSING_ASSETS.md) and preserved rather than replaced.

## Conversion plan and fidelity notes

Each travel-guide artboard is converted into its own lazy-loaded React/TypeScript component and exposed at the route listed above. The original source classes, text, inline style values, SVG attributes, hierarchy, and image payloads are retained. The artboard's canvas-only absolute offset is neutralized so its corresponding screen can render independently. The 1,440 px desktop composition is preserved at desktop sizes; screens reflow and use a 14px minimum text size at widths up to 1,200px. The two fixed-coordinate map canvases remain pannable inside their own horizontal scroll containers.

Source-visible navigation and booking CTAs are wired to the matching source screens, and review cards open the supplied reader design as a modal. No backend behavior is inferred for the example booking destination.
