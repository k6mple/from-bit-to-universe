# FROM BIT TO UNIVERSE · 从比特到数字宇宙

An interactive digital-art exhibition that travels from a single bit to a universe
of thought — bits → transistor → processor → network → operating system → mind → cosmos.

Built as **one continuous WebGL space**, not seven separate scenes.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/
npm run preview
npm run typecheck
```

> **WSL note.** This repo was installed with a Linux npm. If `npm` on your PATH is the
> Windows one (`/mnt/c/Program Files/nodejs/npm`), native optional dependencies resolve
> to win32 binaries and the build fails with `Cannot find module '@rolldown/binding-linux-x64-gnu'`.
> Install with a Linux npm instead — `corepack npm@11 install` is enough.

---

## The argument

Everything in the piece is the same matter. One particle field holds eight baked
shape targets, and each chapter morphs it into a new formation:

```
0 scatter  →  1 the numeral "1"  →  2 silicon lattice  →  3 processor die
          →  4 network graph  →  5 kernel orrery  →  6 neural mesh  →  7 galaxy
```

That is the whole thesis of the work expressed as an implementation detail: the bit,
the atom, the packet and the thought are rendered by the same shader, because they
are the same thing arranged differently.

## Architecture

```
src/
  lib/
    world.ts       mutable state shared by DOM and WebGL — no React re-renders
                   during motion; the render loop reads it once per frame
    scroll.ts      maps raw scroll onto the film timeline
    device.ts      tier detection (particle count, dpr, post-processing)
  three/
    world/         shape generators — glyph, lattice, chip, network, core,
                   neural, galaxy. Deterministic (seeded RNG) so the artwork
                   is identical on every load.
    shaders/       the master particle material + trace/packet materials
    BitField.tsx   every structure in the exhibition, in ONE draw call
    Rig.tsx        seven camera stops with chapter-local moves
    Scene.tsx      the Director: scroll → cinema, plus node picking and hover
    Effects.tsx    bloom / vignette / grain, graded per chapter
  ui/              the DOM narrative layer
```

**One canvas, one draw call for the matter.** Eight morph-target attributes are baked
at boot; the vertex shader blends two of them with a per-particle stagger and an
outward arc, so structures are *thrown* into shape rather than cross-faded.

**Scroll is the timeline.** Each chapter is a section of `H` viewport-heights with a
sticky stage; the stage is pinned for `H − 1` viewports and that window *is* the
chapter. Between two pinned windows the outgoing stage slides up while the next
slides in, and the 3D shape holds steady through the hand-off — which is what makes
the transitions read as one continuous world.

**The boundary rule.** Chapter c is on stage for `seg ∈ [c, c+1)` — nothing
earlier. Two things follow, and both were bugs before they were rules:

- Never clamp `seg` to the last chapter *index*. `Math.min(CHAPTER_COUNT - 1, seg)`
  destroys the final chapter's progress outright and freezes it on the previous
  chapter's shape. `seg` is continuous; only lookups clamp.
- Never damp a blend factor whose meaning inverts. On a boundary the morph pair
  flips (c, c+1) → (c+1, c+2) and `t` resets 1 → 0 in the same instant; both sides
  describe the same shape only if all three move together. A damped `t` left
  dangling at 1 means `to`, so the next chapter's structure flashes up on every
  transition and decays back. **Damp the position, never the blend** — see
  `morphAt()` and `chapterGlow()` in `lib/world.ts`.

`chapterGlow(seg, c)` keys a chapter's scenery to its own progress. Keying it to
`1 - |seg - c|` instead peaks at exactly the hand-off — the moment the previous
structure is still on screen — so the die's signal traces light up over the silicon
lattice, half a chapter before the die exists.

**Everything is graded, per chapter.** Temperature, emission, point size, depth
reference and bloom are all table-driven (`STAGE` in `three/Scene.tsx`). A volumetric
fill needs far less light than a sparse galaxy; driving those from one global number
is what turns dense scenes into white-out.

## Interaction

| Chapter | What you can do |
| --- | --- |
| 00 the bit | Move the pointer — the point of light answers |
| 02 the processor | Sweep across the die; each functional region lifts and names itself |
| 03 the network | Press any node to fire real transmissions along arcing paths |
| 04 the OS | Live scheduler, allocating memory map, and a working console — `help`, `ps`, `sched`, `fork`, `stress` |
| 05 the mind | Type something. There is no model, and the panel says so |

## Performance and access

- **Tier detection** (`lib/device.ts`) sets particle count (150k / 26k), DPR and
  whether post-processing runs at all.
- **`prefers-reduced-motion`** drops the opening overture, the pointer parallax and
  the idle drift, and reveals every chapter immediately.
- The preloader reports **real** generation progress across eight yields, not a timer.
- Sizing is safe: the memory-map canvas is absolutely positioned inside a
  fixed-height frame so its intrinsic aspect ratio can never feed back into layout.
- `npm run build` output: ~264 kB gzip of three, ~71 kB React, ~44 kB GSAP.
  Fonts are self-hosted via `@fontsource-variable`; nothing is fetched at runtime.

## Typography — Chinese headlines, English captions

The headline of every chapter is Chinese; the English line beneath it is set as a
museum plaque (small, tracked out, upper case, clearly subordinate). The Latin
display rules were **not** reused for the Chinese, because three of them are
actively wrong for CJK:

| | Latin display | Chinese headline |
| --- | --- | --- |
| tracking | negative (−0.045em) gathers the letters | neutral (0.012em) — CJK glyphs already fill the em box, so tightening collides the strokes |
| line height | 0.9, the ascenders and descenders supply the air | 1.14 — CJK has neither, so 0.9 stacks characters into a solid brick |
| size ramp | baseline | ~0.7×, because a Chinese character carries far more mass per em |

Chinese also has no word spaces, so a line break can land anywhere. Left to wrap,
`数十亿个晶体管，一台非凡的机器。` breaks mid-phrase at whatever character reaches the
margin. `cjkLines()` in `ui/Split.tsx` sets the break at the comma instead — where the
sentence already pauses — keeping the copy itself a single clean sentence.

The Chinese relies on system fonts (`PingFang SC`, `Noto Sans SC`, `Microsoft YaHei`,
`Hiragino Sans GB`). Headless containers without a CJK font installed render them as
tofu — an environment gap, not a bug. Bundling a CJK webfont would add several
megabytes, a bad trade for a piece that is otherwise fast to open.
