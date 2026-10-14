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

Routes use the URL hash (`/#/work`), so the site runs on any static host with no rewrite rules.

| Route | Page |
| --- | --- |
| `/` | Home: hero over a show photo with the kit strip, Equipment, Services, How hiring works, Selected work, Technical, Get a quote |
| `/equipment`, `/equipment/<id>` | Hire catalogue: photo, description and specs for each item, then "View in the 3D rig" |
| `/work`, `/work/<slug>` | Selected work index and case studies |
| `/capabilities`, `/capabilities/<sound\|light\|visuals\|production>` | Services |
| `/studio` | Philosophy and process |
| `/journal` | Studies and experiments (always labelled as such) |
| `/deck` | One-page capability deck |
| `/contact` | Quote request (`/contact?item=<id>` pre-fills the item) |
| `/privacy`, `/legal` | Draft legal pages |

## Where things live

| What | Where |
| --- | --- |
| Brand copy, taglines, contact details, enquiry endpoint | `src/content/site.ts` |
| Projects and case studies | `src/content/projects.ts` + photos in `public/shows/` |
| Disciplines and process | `src/content/capabilities.ts` |
| Equipment: names, descriptions, specs, photos | `src/content/gear.ts` + photos in `public/gear/` |
| Journal entries | `src/content/journal.ts` |
| Design tokens (palette, type, spacing, motion) | top of `src/index.css` |
| The Resonance Form (behind the homepage enquiry) | `src/three/resonance/` |
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

## Still to supply

- Photos of our own kit for the beam moving heads (currently a 3D render), retro 3-blade fan, retro hex light and truss (currently crops from show photos), plus model names and quantities — `src/content/gear.ts`
- The d&b and LED product images are manufacturer/supplier photos; replace them with photos of our own units when possible

- Contact details (email, phone, WhatsApp, Instagram) and an approved location line — `site.contact`
- An enquiry endpoint — see above
- Project facts: years, venues, objectives, technical planning notes, production films
- More project photography, especially the d&b system, amplifiers and control positions
- Team portraits and short biographies (Studio page)
- Company registration details and a reviewed privacy notice

To add an equipment photo: put a square-ish `.webp` in `public/gear/` and set `photo` on the item in `src/content/gear.ts` (`source: 'product'` for white-background shots, which sit on the studio surface; add `fit: 'cover'` for photos with their own background).

To add a show photo: export `name-1600.webp` and `name-800.webp` into `public/shows/` and reference `name` in `src/content/projects.ts` (gear markers are percentages of the image).
