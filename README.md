# Vital Acoustica — vitalacoustica.com

**Experience, Amplified.** Website for Vital Acoustica: pro audio, lighting and visual production for techno and house shows across South India.

Built with React + TypeScript + Vite, with a real-time 3D stage (Three.js via React Three Fiber) in the hero.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run lint
```

## Where things live

| What | Where |
| --- | --- |
| All business copy, cities, services, contact details | `src/content/site.ts` |
| Gear list (names, specs, descriptions) | `src/content/gear.ts` |
| Show photos, captions and gear markers on them | `src/content/shows.ts` + `public/shows/` |
| Where each piece of gear sits in 3D | `src/three/hotspots.ts` |
| Brand colours, fonts, spacing | top of `src/index.css` |
| Logo files (PNG + vector) | `public/brand/` |
| 3D hero scene | `src/three/` — `HeroScene.tsx` composes the stage |
| Page sections | `src/components/` |

The 3D lights run on a shared show clock (`src/three/show.ts`, default 124 BPM). The lighting desk in "Explore the rig" writes to the same object, so BPM, movement, colour, master and haze change live.

To add a show photo: export it as `name-1600.webp` and `name-800.webp` into `public/shows/`, then add an entry in `src/content/shows.ts` with marker positions as percentages of the image.
