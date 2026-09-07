# Eldritch Garden — project instructions

## What this is

A three-loop focus timer for a high school English teacher grading essays. Phone
sits propped beside a laptop. Every interaction has to be a single thumb tap with
zero reading, because the user is mid-essay when it happens.

Reward is a cellular-automaton garden plus a generative drone. The garden grows
slowly and quietly during work, then blooms — fast-forwards, filters open — when
the long timer completes and the break begins.

Target is an installed Android app. See SPEC.md § Platform target for why that
means a PWA now and possibly an APK later, and why it never means a native
rewrite.

## The success metric

The user grades more. Not: opens the app more, or has a prettier garden. If a
change makes the app more engaging but more interruptive, it is a regression.

## Hard constraints

- **No build step, no framework, no dependencies.** `index.html` is the entire
  application — inline CSS, inline JS, editable with nothing installed. The only
  other files are platform metadata (manifest, service worker, icons) and they
  contain no application logic. If a change wants a bundler, the change is wrong.

- **The sim must stay deterministic.** Persistence saves a seed log (species, x,
  y, step index) plus an RNG seed, grid dimensions and the final step count —
  not pixels. Replay re-runs the sim and must produce a byte-identical garden
  and the same voice order. Four ways this breaks, all of which have already
  happened once:

  1. `Math.random()` anywhere in a growth rule. All growth randomness comes from
     `Garden.rng` (mulberry32) and is consumed in a fixed order per step. Audio
     may use `Math.random` freely — it is not the sim.
  2. Reading mutable session state from inside a rule. The lattice bug read
     `this.colonies.length`, which changes as the session goes on, so the same
     cell behaved differently on replay than it did live. **A rule may read the
     grid and its own colony record. Nothing else.**
  3. Wall-clock time entering the sim. Timers are wall-clock; the simulation is
     not. Growth rules never see `performance.now()`.
  4. **Mixing the two RNG streams.** `Garden` has both, and the distinction is
     the whole reason replay works:

     - `rng` — growth rules and `plant()` cluster shape. **The simulation.**
     - `pick` — session decisions: where `openSpot` lands, which species a pool
       yields. Things replay reads from the log instead of re-deciding.

     They used to be one stream, which is why replay never matched the session
     it recorded: live consumed ~80 draws per plant for `openSpot` plus one for
     the species, replay consumed none, and growth was offset from the first
     plant onward. **Anything a replay will not re-run must draw from `pick`.**
     This is also what makes tap-to-place safe — a hand-aimed seed and a
     generated one leave the growth stream in identical states.

  Any change to a growth rule invalidates every stored garden. Grid dimensions
  and step count live in the archive entry so the shape stays recoverable.

- **Nothing is documented in the UI.** No legend, no species names on screen, no
  tooltips explaining what rot does. Discovery is the content. Copy stays terse
  and slightly unfriendly.

- **Timers are wall-clock, not tick-counted.** They use `performance.now()`
  deltas. Do not convert to interval counting; the phone throttles background rAF.

- **Storage goes through the `Store` adapter, never directly.** It is async,
  wrapped in try/catch at every call site, and the app must run correctly with
  storage entirely absent — no config, no archive, no errors. `localStorage`
  today; a phase-2 APK swaps the adapter body and nothing else.

- **No streaks, no shame, no notifications.** Missing a tap plants nothing. That
  is the whole punishment. Never add a "you broke your streak" state. An APK
  makes notifications easy; that is not a reason to add them.

## The three loops

| Loop  | Default | Interaction |
|-------|---------|-------------|
| Micro | 90 sec  | One button lights up. Tap it = plant a common species anywhere; tap the *garden* = plant it exactly there. Ignore = nothing. |
| Meso  | 6 min   | Three buttons: Locked in / Drifted / Gone. Self-report, honor system. Locked in then offers a choice of two seeds, shown grown rather than named. |
| Macro | 30 min  | Bloom, then break: 5 min base + 1 min per Locked-in stretch, cap 5 bonus. |

**The bloom is not the same garden running faster.** For its 22 seconds the field
obeys three rulesets that exist nowhere else — mirror (it acquires a symmetry it
never has in life), efflorescence (organic cells throw off the alien families),
and transmutation (cells convert to whatever surrounds them) — with mortality
suspended and colony caps lifted to 3×. Then `wither()` kills everything
standing. You finish a macro with a dead garden and plant the next one on its
corpse, which stays visible underneath as the husk layer.

That is also what keeps multi-macro sessions from silting up: every macro gets a
fresh grid. If you change the bloom, keep that property.

**Bloom and wither are logged as events**, not just UI phases. A replay that did
not know a bloom happened would diverge from that point onward.

**Touching the garden.** A tap anywhere, at any time, answers with a ripple, a
chime pitched by row and panned by column, and a short haptic. That is the whole
of it: looking away from the essay for a second costs nothing and gives something
back. It must stay this cheap — no counter, no escalation, nothing that could
read as praise or turn the garden into a slot machine. The button always remains
the no-aiming path, because someone mid-essay should never be made to aim.

Ripples are render-layer only. They are not cells, never enter the seed log, and
must never touch `Garden.rng`.

All three run independently from session start. The user is not meant to track
them — one glance at the ring set and the countdown is the whole interface.

**Design decision worth preserving:** focus buys break *minutes*; honesty buys
*garden*. Answering Gone costs you break time but plants rot, mouths, and
mycelium, which produce the wildest growth. Lying to get a longer break gets you
a boring garden. That trade is the entire integrity mechanism — there is no
enforcement and there should never be any.

## Species families

Eighteen species, six families of three.

- **Common** (micro tap): crust, filament, bead — violet-slate, bulk filler.
- **Locked in**: spire, lattice, cistern — pale, structural.
- **Drifted**: drifter, spore, tendril — violet, mobile.
- **Gone**: rot, mouth, mycelium — magenta/rose, destructive.
- **Geometry**: prism, helix, tessera — cold and mineral. Six fixed rays, a
  winding arm, a rigid lattice with square holes.
- **Aberration**: hollow, stutter, veil — a ring that forbids its own interior,
  something that moves in jumps and never lands adjacent, and one that will only
  grow on ground something has already died on.

The first twelve are all, underneath, blobs and wanderers — organic. **The last
six are the ones that make it alien**, because they produce geometry a growing
thing would not: symmetry, straight rays, holes. Do not let them drift back
toward blobs.

The last two families have no trigger of their own. Any plant may come up alien
instead of what its pool intended, per `ALIEN_CHANCE` — rarest on a micro tap,
commonest on Gone. Specific conditions can come later.

**The commons decide the colour of the field.** At ~20 colonies a macro they
carry its mass, so while they were green the garden was green whatever else was
planted. That is why they are violet-slate and why bead's ochre is the only warm
thing left — the contrast is worth more than the consistency.

Undocumented interactions that should survive any refactor: rot leaves substrate
that doubles growth rate for whatever grows on it; mycelium hunts across the field
for a foreign colony and mutates a disc of it into a random species on contact;
mouth eats an expanding ring and leaves rich substrate behind.

Growth is bounded by the `TRAIT` table — a lifespan, an extent radius, and a
standing cell cap per species — plus a global `POP_CAP`. **The colony cap is the
load-bearing one.** Lifespan alone inverts the design: species that reproduce in
place (crust, spire) renew themselves with young cells forever while movers and
converters age out, so the dullest species crowd out the interesting ones. Tune
the caps before reaching for anything else.

Commons outnumber meso colonies four to one, because a macro brings ~20 micro
taps and only ~5 meso answers. The caps compensate — a common is small and
frequent, a meso colony is large and rare — so the families carry comparable
weight on screen.

## Audio

Web Audio, continuous from session start. One voice per planted cell: pitch by
row (minor-pentatonic degrees), pan by column, timbre by family — filtered saw
for commons, sine partials for locked-in, detuned pairs for drifted, bandpassed
noise for the rot family. A master lowpass sits at 340 Hz during work and sweeps
to 4.2 kHz over the bloom.

The user makes drone/noise music. Audio is not an accessory here — it is half the
reward, and it is the half that does not require looking away from the essay.
Treat it with the same care as the visuals.

Confirmed working on Android. Voices accumulate for the life of a session and are
never pruned; the voice bus loses gain as 1/√n so the choir thickens and each
voice recedes, which is how headroom is held without dropping anything.

**The garden feeds the noise.** `Garden.ev` counts births, deaths, bites and
mutations per step; `Audio_.setActivity` reads those counters and drives a noise
bed whose filter and level follow them, so the texture shifts as the field grows,
crowds and dies. Two accents — a mouth biting, mycelium mutating a colony — are
hard-limited to a few seconds apart.

Keep it continuous. One sound per cell event is the obvious idea and it is wrong:
at thousands of cells a step it becomes a wall of noise within a minute. The sim
never calls into `Audio_`; the audio reads counters. Sound must never be able to
affect growth.

## Files

```
index.html              the entire application
manifest.webmanifest    name, icons, fullscreen, portrait lock
sw.js                   offline cache
icon-*.png              generated, see below
```

`icon-192`, `icon-512` and `icon-maskable-512` are rendered from the app's own
ring glyph. There is no image toolchain in this project and there should not be
one; regenerate them with the GDI+ script in the commit that added them. The
maskable variant is drawn at 0.78 scale to stay inside Android's 80% safe zone.

**Bump `CACHE` in `sw.js` whenever `index.html` changes.** The browser re-fetches
`sw.js` on navigation, sees the new constant, and drops the old cache. Forget and
users keep running the previous build. Navigations are network-first so an online
phone gets the new version immediately; the cache is the offline fallback, not
the primary source.

## Shipping it

A service worker needs a secure context, so `file://` gets no offline support and
no install prompt — the app still runs, it just cannot become an app. Serve the
folder over HTTPS once, open it in Android Chrome, and use Add to home screen.
After that it is installed and works with the radio off.

See DEPLOY.md for the exact steps.

## Working style

Field-test changes on a phone before polishing them. The numbers that matter
(is 90 seconds too often, does the break feel earned) are only visible while
actually grading — and field test 1's numbers do not count, because it ran inside
the artifact viewer with 40% of the screen taken by chrome.

Before shipping a change that touches a growth rule, verify replay equality: two
`regrow()` calls on the same archive entry must produce identical grids.

BUGS.md is the running defect record. SPEC.md holds the reasoning, the resolved
questions, and the ones still open.
