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
| Brand colours, fonts, spacing | top of `src/index.css` |
| Logo files (PNG + vector) | `public/brand/` |
| 3D hero scene | `src/three/` — `HeroScene.tsx` composes the stage |
| Page sections | `src/components/` |

The 3D lights run on a shared tempo clock (`site.bpm`, default 124 BPM) — see `src/three/beat.ts`.
