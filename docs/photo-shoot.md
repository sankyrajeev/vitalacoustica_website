# Photo shoot: shot list

Everything on the site that is a stand-in today, and the photo that replaces it.
Search the code for `DUMMY` to find every placeholder value.

## How to deliver

- Shoot RAW/JPEG at full size; we export them for the web.
- **Equipment**: one unit per shot on a plain white or light-grey sweep (a white sheet is fine), soft even light, no clutter. The site places them on an ivory surface, so a clean white background blends in.
- **Show and team photos**: landscape, 3:2 or 4:3.
- Name the files as below. Equipment photos go in `public/gear/` as `.webp`, around 1000 px on the long side. Show photos go in `public/shows/` as `name-1600.webp` and `name-800.webp`.

## Equipment (one per item, 3/4 front angle, unlit + one lit version if possible)

| File | Item | Today |
| --- | --- | --- |
| `v10p.webp` | d&b V10P top | manufacturer photo |
| `b22.webp` | d&b B22-SUB | manufacturer photo |
| `art915.webp` | RCF ART 915-A | manufacturer photo |
| `dm3.webp` | Yamaha DM3 mixer, from above at an angle, screen on | "Photo to come" tile |
| `pioneer.webp` | Pioneer DJ players + mixer set up together | "Photo to come" tile |
| `di.webp` | DI boxes, a few together | "Photo to come" tile |
| `sharpy.webp` | Beam moving head (head tilted, lens visible) | 3D render |
| `trefoil.webp` | Retro 3-blade fan light | crop from a show photo |
| `hex.webp` | Retro hex light | crop from a show photo |
| `matrix.webp` | LED matrix panel, face-on | supplier photo |
| `pixelbar.webp` | LED pixel bar, lit and unlit | supplier photo |
| `dotbar.webp` | LED wall washer bar, with brackets | supplier photo |
| `rope.webp` | LED neon flex, a few lengths lit red/amber | supplier photo |
| `truss.webp` | Box truss section or a built goal post | crop from a show photo |

Also note for each: exact model name and how many you hold (they are dummy values in `src/content/gear.ts`). For the Pioneer setup, the exact players and mixer; for DI boxes, the make and whether passive or active.

For the three "Photo to come" items, set `photo` in `src/content/gear.ts` to the new file (copy the shape of the RCF entry).

## Shows and studio

| Where it appears | What to shoot |
| --- | --- |
| Case study "Behind the scenes" | Load-in, rigging, cabling, system tuning (laptop + measurement mic) |
| Homepage "Your next show" card | Hero photo of the next production: stage, crowd and rig in one frame |
| Services: Sound system rental | The V10P + B22 system set up at a venue, wide |
| Services: Installations & visuals | A permanent install or a projection-mapping test |
| Studio page: team | Team portrait, plus one photo per lead (sound, light, production) |
| Case study "Production film" | 30–60 s film of a show (MP4) |

## Other dummy values to replace

- Contact email, phone, WhatsApp and Instagram — `src/content/site.ts`
- Company name, address, GSTIN — `src/pages/Other.tsx` (Legal)
- Project years, venue for "A Night with Jovah", and the case study objectives / planning text — `src/content/projects.ts`
