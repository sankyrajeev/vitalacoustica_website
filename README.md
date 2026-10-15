# Vital Acoustica — vitalacoustica.com

**We shape the way an experience feels.** Website for Vital Acoustica: sound and lighting rental with the crew to run it, production, and consulting for permanent installations.

React + TypeScript + Vite. 3D with Three.js via React Three Fiber, loaded lazily so text, navigation and forms never wait for it.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run lint
```

Requires Node 20.19+ (or 22.12+).

## Pages

Routes are clean URLs (`vitalacoustica.com/equipment/v10p`). The host must serve `index.html` for every path that isn't a file; the rules for that ship with the site:

- Apache / GoDaddy cPanel hosting: `public/.htaccess` (copied into `dist/`)
- Netlify or Cloudflare Pages: `public/_redirects`
- Vercel: `vercel.json`

Old `/#/page` links redirect to `/page`. A build with `VITE_HASH_ROUTER=1` uses `#/` routes and relative asset paths instead, for previews that can only serve one file.

| Route | Page |
| --- | --- |
| `/` | Home: logo opening frame, Entrance, Statement, Testimonials (one at a time, swipeable), Get a quote; the 3D Resonance Form changes with each section |
| `/equipment`, `/equipment/<id>` | Hire catalogue: photo, description and specs for each item, then "View in the 3D rig"; how hiring works |
| `/work`, `/work/<slug>` | Selected work index and case studies |
| `/capabilities`, `/capabilities/<sound\|light\|visuals\|production>` | Services |
| `/studio` | Philosophy and process |
| `/journal` | Studies and experiments (always labelled as such) |
| `/deck` | One-page capability deck |
| `/contact` | Quote request (`/contact?item=<id>` pre-fills the item) |
| `/testimonials` | Client testimonials (from `src/content/testimonials.ts`) and a form to send one |
| `/careers` | Careers: open positions from `src/content/careers.ts`, or a "crew is full" message while it's empty |
| `/privacy`, `/legal` | Privacy notice (DPDP Act 2023) and legal information / terms of use — `src/pages/Legal.tsx` |

## Where things live

| What | Where |
| --- | --- |
| Brand copy, taglines, contact details, enquiry endpoint | `src/content/site.ts` |
| Projects and case studies | `src/content/projects.ts` + photos in `public/shows/` |
| Disciplines and process | `src/content/capabilities.ts` |
| Equipment: names, descriptions, specs, photos | `src/content/gear.ts` + photos in `public/gear/` |
| Journal entries | `src/content/journal.ts` |
| Design tokens (palette, type, spacing, motion) | top of `src/index.css` |
| The Resonance Form (homepage sculpture) | `src/three/resonance/` — `director.ts` maps sections to sculpture states |
| Stage model (explore, lighting desk, drone) | `src/three/StageScene.tsx`, `src/three/gear/`, `src/components/StageModel.tsx` |

### Palette

Obsidian `#101010` · Charcoal `#1C1C1B` · Ivory `#F0EDE5` · Brass `#B8A47B` · Grey `#AAA69E`.
A light "ivory edition" uses the same palette (toggle in the navigation); the dark edition is the default.

## Enquiry form

The form posts JSON to the endpoint in `site.enquiry` (or the `VITE_ENQUIRY_ENDPOINT` / `VITE_ENQUIRY_KEY` build variables). Any of these work without a server:

- **Formspree** — create a form, set `endpoint: 'https://formspree.io/f/<form-id>'`
- **FormSubmit** — set `endpoint: 'https://formsubmit.co/ajax/<your-email>'`, then confirm the activation email it sends
- **Web3Forms** — set `endpoint: 'https://api.web3forms.com/submit'` and `accessKey`

Until one is set, the form validates normally but tells visitors it can’t send.

## Dummy content

Gaps are filled with stand-ins until the photo shoot: equipment models and stock counts, contact details, company details, project years and some case-study text, plus sample photos (tagged "Sample photo") in empty photo slots. Every stand-in value is marked `DUMMY` in the code (`grep -rn DUMMY src`). The shot list and everything to replace is in [`docs/photo-shoot.md`](docs/photo-shoot.md).

Until an enquiry endpoint is set, the form opens the visitor's email app with the enquiry written out and addressed to `site.contact.email`.

To add an equipment photo: put a square-ish `.webp` in `public/gear/` and set `photo` on the item in `src/content/gear.ts` (`source: 'product'` for white-background shots, which sit on the studio surface; add `fit: 'cover'` for photos with their own background).

To add a show photo: export `name-1600.webp` and `name-800.webp` into `public/shows/` and reference `name` in `src/content/projects.ts` (gear markers are percentages of the image).
