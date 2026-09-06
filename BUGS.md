# Defect record

Status key: **OPEN** · **FIXED** · **CLOSED** (verified or no longer applicable)

Field test 1 was the first real session on Android — Chrome, ~30 min, run inside
the Claude artifact viewer. Four screenshots reviewed. Its findings are §1–§6.
§7 was added during the v0.2 handover review and covers things the field test
could not have surfaced.

---

## 1. `openSpot()` returns null once the grid is crowded — CRASH · FIXED

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

## 2. Lattice: dead parity check, flood, and a replay break · FIXED

```js
if(((tx+ty)&1)===((this.colonies.length)&1)||true){put(tx,ty,SP.lattice)}
```

Two defects in one line.

**The flood.** `|| true` makes the condition unconditional — leftover from
drafting. Lattice spreads to all four diagonals at p=0.25 (0.5 on substrate) with
no cap, so a single locked-in seed becomes the solid pale-green block visible at
the bottom of screenshots 1 and 4.

**The determinism violation, which is worse.** The rule reads
`this.colonies.length` — mutable session state that grows as the user plants. The
same lattice cell therefore evaluates differently at step 400 of a live session
than at step 400 of a replay, because the replay's colony count at that moment
depends on log ordering. This is a direct breach of the one hard invariant, and
it was invisible only because `|| true` short-circuited it.

**Fix:** implement parity from the colony's own id, captured at plant time and
stored on the colony record. Cap colony extent. Then verify replay equality.

---

## 3. The whole garden reads as one green maze · FIXED

All four screenshots show near-total coverage in crust/filament green within one
macro cycle. Individual species are indistinguishable, and the rot family shows
only as isolated purple pixels. The garden has no composition, so the bloom has
nothing to reveal.

**Causes, in order of contribution:**
- Crust spreads at p=0.16 per cell per step with death only at 6+ neighbours,
  which is net-positive growth without bound.
- Filament converts its tail to bead rather than dying, so it never costs anything.
- Nothing ages out. There is no mortality anywhere except crowded crust.
- 76×112 = 8,512 cells is small for ~25 colonies over 30 minutes.

**Direction:** see SPEC.md § Direction for the rebalance. Summary — add mortality
everywhere, a state-derived population ceiling, per-colony extent caps, and rate
tuning on crust/bead/filament. Tune against multi-macro sessions, not one.

---

## 4. Canvas uses cover-fit, cropping the grid · FIXED

`blit()` uses `Math.max(cv.width/W, cv.height/H)`, so the grid is cropped on the
short axis and growth happening off-screen is invisible. The ochre vertical bars
at the left and right edges of the screenshots are bead/substrate piling against
the grid boundary, visible only because of the crop.

**Fix:** switch to contain-fit (`Math.min`). Then pick a grid aspect closer to the
real stage aspect so letterboxing is minimal — but note the stage aspect is about
to change substantially when the app goes fullscreen, so measure after §7.1, not
before. Grid dimensions must be recorded per archive entry either way (see §7.3).

---

## 5. Previously unverified

- **Audio — CLOSED.** Confirmed working on Android. This was the largest open
  risk in the handover and it is closed.
- **Wake lock — OPEN.** Still unknown whether the screen stayed on for the full
  30 minutes. `requestWake()` is called on begin and on `visibilitychange`, but
  nothing reports failure. Worth a one-line on-screen tell during a field test.
- **Break bonus — OPEN.** Screenshot 1 shows a 9:39 break countdown, consistent
  with 5 base + bonus, but the tally was not visible. Arithmetic in `enterBreak()`
  reads correct on inspection; unconfirmed in the field.

---

## 6. Smaller things · MOSTLY FIXED

- The bloom is 9 seconds. Probably wants to be 20–30 — it is the payoff for
  half an hour of work and it currently reads as a blip.
- Micro at 90 seconds produced roughly 20 taps per macro. Whether that is right
  is the main open question of the whole design; it needs a full grading block
  with real essays to judge, not a bench test. Note that field test 1's read on
  this is compromised — see §7.4.
- `mouth` colonies set `alive=false` at r>26 but their cells persist as static
  red; they should decay or leave substrate.
- Pause adjusts `breakEnds` and `bloomUntil` even when in work mode, which is
  harmless now but will break if those become meaningful outside their phases.
- "Skip the break" should be removed. See SPEC.md § Resolved, question 2.

---

## 7. Found during the v0.2 handover review

Not observable in field test 1 — either masked by the host environment or only
visible in the source.

### 7.1 `window.storage` does not exist outside the artifact host · FIXED

Every persistence path — `saveCfg`, `loadCfg`, `getArchive`, `endSession` — calls
`window.storage`, an artifact-hosted key/value API. Off-host it is `undefined`,
the `try/catch` swallows the throw, and the app runs looking healthy while saving
nothing. Config resets every launch and the archive is permanently empty.

This is not a bug in the artifact; it is the single largest blocker to the app
existing anywhere else.

**Fixed:** a `Store` adapter over `localStorage`, async so a phase-2 APK swaps
three method bodies and nothing else. `putArchive` degrades on quota by dropping
oldest entries rather than losing the newest, and `endSession` now shows "not
saved" when nothing was saved instead of claiming success. Verified over HTTP:
config survives reload, a session round-trips to the archive and its thumbnail
regrows. A 14-plant session serialises to 922 bytes, so the 40-entry cap is far
inside the localStorage budget.

### 7.2 The app has no standalone shell · FIXED, SW UNVERIFIED

No manifest, no service worker, no icons. It can only run as a page inside
whatever chrome is hosting it — which in field test 1 meant a title bar and a
reply composer taking roughly 40% of a 2340 px screen.

**Fixed:** manifest (fullscreen, portrait, three icons), service worker, and
icons generated from the app's ring glyph.

**Still unverified: that the service worker actually registers and caches.** The
in-app browser pane blocks service worker registration — the request for `sw.js`
never reaches the network — and the real-Chrome surface was not connected. The
file parses and every `SHELL` entry resolves 200, but install, activate, and
offline behaviour have not been exercised. First thing to check once the app is
hosted: DevTools > Application > Service Workers, then reload with the network
off.

### 7.3 Grid dimensions are not recorded in the archive · OPEN

`W` and `H` are module-level constants baked into `Garden`, `paint`, the offscreen
canvas, and the archive thumbnails. Archive entries store the seed and the log but
not the dimensions, so the first change to the grid — which §4 makes likely —
silently invalidates every stored garden with no way to detect it.

**Fix now, cheaply:** write `w` and `h` into each entry, default missing ones to
76×112 on read. Making `W`/`H` per-instance can follow later; recording them
cannot, because the data is unrecoverable once written without them.

### 7.4 Field test 1's tuning numbers should not be trusted · OPEN

The session ran in a viewer with roughly 40% of the screen occupied by host
chrome, on top of the §4 crop. The garden was never seen at the size it was
designed for. Anything the test says about pacing, density, or whether the bloom
lands needs re-measuring on the phase-1 shell. The crash (§1) and the flood (§2)
are real regardless — those are source defects, not observations.

### 7.5 `plant()` consumes a variable number of RNG draws · RESOLVED

`plant()` draws `2 + floor(rng()*4)` cluster cells, then one `rng()` per cell for
direction, so the number of draws depends on the first draw. That is fine for
determinism — replay runs the same code — but it means the RNG stream position
after N plants is not predictable from N alone, and any future change to plant
ordering, or any dedup of the log, shifts every subsequent draw. Fragile rather
than broken. A replay-equality assertion in the archive path would catch it.

---

## 8. Status after the rebalance pass

**§1 openSpot crash — FIXED.** `bestScore` initialises to `-Infinity` plus an
unreachable fallback. Reproduced against the old code first (355 nulls in 400
plants, first at #37); now 0 nulls at any load.

**§2 lattice — FIXED.** Parity comes from the colony's own id, carried on the new
`cid` array. The `this.colonies.length` read is gone, so the rule is
replay-stable. Note the fix BUGS.md originally proposed would not have worked:
diagonal moves preserve `(x+y)` parity, so checking the *cell's* parity is a
tautology. It only bites against the *colony's* parity, because `plant()` seeds a
mixed-parity cluster with orthogonal steps.

**§3 the green maze — FIXED.** ~23 legible colonies at 21–26% coverage, against
100% before. See SPEC.md § The rebalance, as built — the load-bearing lever was
the per-colony standing cap, not mortality.

**§4 cover-fit — FIXED.** Contain-fit, verified visually.

**§6 — mouth decay fixed, bloom now 22 s, "Skip the break" removed, pause math
fixed.** Still open: whether 90 s is the right micro (§7.4 — needs a real field
test), which is now the only item left on that list.

**§7.5 — RESOLVED** by the RNG split, not by removing the variance. `plant()`
still draws a variable number of times, but it draws from the growth stream only,
and both live and replay call it identically. The fragility was never the
variance — it was that `openSpot` and species selection shared that stream.

### 8.1 Replay never matched the session it recorded · FIXED

Not previously known. Live, `plantSeed` consumed `Garden.rng` for the species
pick and roughly 80 draws for `openSpot`; replay read both from the log and
consumed neither, so the growth stream was offset from the first plant onward and
every subsequent step diverged. SPEC calls byte-identical replay the one hard
invariant — it had never held.

Fixed by splitting the RNG: `rng` for growth and cluster shape, `pick` for
session decisions. Replay is now byte-identical to the session it recorded,
verified over 900 steps including substrate. See CLAUDE.md, determinism item 4.

### 8.2 Bloom and break stepping was frame-rate dependent · FIXED

The bloom ran 7 steps per animation frame for 9 seconds — about 3,800 steps
against roughly 1,000 for the entire work period — and the break added another
1,500. The garden was evolving mostly while nobody was working, which is backwards
for a reward meant to be fed by attention. It was also frame-rate dependent, so a
fast phone and a slow one ended on different gardens.

The bloom is now a fixed step budget spread across its duration by elapsed
fraction. Break stepping slowed to a simmer.

### 8.3 Archive thumbnails were squashed · FIXED

`.entry canvas` forced a 76×112 grid into a 52px square, distorting every
thumbnail by about 32%. Now 44×65.

### 8.4 Still open

- **Micro at 90 seconds** (§6, §7.4) — the core design question, still unmeasured.
- **Wake lock** (§5) — never confirmed on a real 30-minute session.
- **Break bonus** (§5) — arithmetic reads correct, unconfirmed in the field.
- **Service worker** (§7.2) — parses, never observed installing.
- **Multi-macro sessions** — the rebalance is tuned against one macro. A second
  bloom on an already-populated field is untested, and it is the likeliest place
  for this tuning to fall over.
- **The gone family burns out.** rot, mouth and mycelium are all transient by
  construction: rot converts until it runs out of neighbours then ages out, mouth
  eats a ring and decays to substrate, mycelium mutates once and stops. Planted
  early, none of them are visible at the bloom — only their scars. The design
  promises the gone family produces the wildest growth, and right now it produces
  the most dramatic *absence*. Whether that reads as eldritch or as nothing is a
  judgment call for a real session.
