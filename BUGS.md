# Field test 1 — findings

First real session on Android (Chrome, artifact viewer), ~30 min. Four screenshots
reviewed. Ordered by severity.

---

## 1. `openSpot()` returns null once the grid is crowded — CRASH

**Symptom:** repeating `Uncaught TypeError: object null is not iterable (cannot
read property Symbol.iterator)`. Fired continuously from about 12 minutes in.

**Cause:** in `Garden.openSpot()`:

```js
let best=null,bestScore=-1;
...
const score = -occ + this.rng()*2;
if(score>bestScore){bestScore=score;best=[x,y]}
```

`occ` counts occupied cells in a 6×6 sample, so it reaches 36. Once every one of
the 40 candidate locations has `occ >= 3`, no score ever exceeds the initial
`-1`, `best` stays `null`, and `plantSeed`'s `const [x,y] = g.openSpot()`
destructures null.

**Fix:** initialise `bestScore = -Infinity`. Also give `openSpot` a guaranteed
fallback (random in-bounds cell) so it can never return null regardless.

**Second-order:** the crash means every plant after saturation was lost — no
seed logged, no voice added. So the seed log from that session is incomplete and
its replay will not match what was on screen. Worth knowing before trusting the
archive.

---

## 2. Lattice has a dead parity check and floods the grid

```js
if(((tx+ty)&1)===((this.colonies.length)&1)||true){put(tx,ty,SP.lattice)}
```

The `|| true` makes the condition unconditional — leftover from drafting. Lattice
spreads to all four diagonals at p=0.25 (0.5 on substrate) with no cap, so a
single locked-in seed becomes the solid pale-green block visible at the bottom of
screenshots 1 and 4.

**Fix:** implement the parity rule properly (parity from the colony id, not
`colonies.length`, which changes as new colonies are added — that alone makes the
rule non-deterministic under replay). Cap colony extent.

---

## 3. The whole garden reads as one green maze

All four screenshots show near-total coverage in crust/filament green within one
macro cycle. Individual species are indistinguishable; the rot family shows only
as isolated purple pixels. The garden has no composition, so the bloom has nothing
to reveal.

**Causes, in order of contribution:**
- Crust spreads at p=0.16 per cell per step with death only at 6+ neighbours,
  which is net-positive growth without bound.
- Filament converts its tail to bead rather than dying, so it never costs anything.
- Nothing ages out. There is no mortality anywhere except crowded crust.
- 76×112 = 8,512 cells is small for ~25 colonies over 30 minutes.

**Direction (not prescriptive):** give every species a lifespan or an energy
budget; cap total living cells at something like 35–45% and stop growth above it;
consider per-colony extent limits so colonies stay legible as objects. The garden
should look like a dozen distinct organisms competing, not a texture.

---

## 4. Canvas uses cover-fit, cropping the grid

`blit()` uses `Math.max(cv.width/W, cv.height/H)`, so the grid is cropped on the
short axis and growth happening off-screen is invisible. The ochre vertical bars
at the left and right edges of the screenshots are bead/substrate piling against
the grid boundary, visible only because of the crop.

**Fix:** switch to contain-fit (`Math.min`), and pick a grid aspect closer to the
actual stage aspect so letterboxing is minimal. Consider making W/H derive from
the stage rect at session start (recorded in the seed log so replay matches).

---

## 5. Unverified

- **Audio.** No confirmation it played. Android Chrome should allow it after the
  Begin tap, but the artifact viewer may be in a context that blocks or mutes it.
  Verify first — half the design depends on it.
- **Wake lock.** Unknown whether the screen stayed on for the full 30 minutes.
- **Break bonus.** Screenshot 1 shows a 9:39 break countdown, consistent with
  5 base + bonus, but the tally was not visible.

---

## 6. Smaller things

- The bloom is 9 seconds. Probably wants to be 20–30 — it is the payoff for
  half an hour of work and it currently reads as a blip.
- Micro at 90 seconds produced roughly 20 taps per macro. Whether that is right
  is the main open question of the whole design; it needs a full grading block
  with real essays to judge, not a bench test.
- `mouth` colonies set `alive=false` at r>26 but their cells persist as static
  red; they should decay or leave substrate.
- Pause adjusts `breakEnds` and `bloomUntil` even when in work mode, which is
  harmless now but will break if those become meaningful outside their phases.
