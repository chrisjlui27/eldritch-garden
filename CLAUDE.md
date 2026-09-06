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
  y, step index) plus an RNG seed and grid dimensions — not pixels. Replay
  re-runs the sim and must produce a byte-identical garden and the same voice
  order. Three ways this breaks, all of which have already happened once:

  1. `Math.random()` anywhere in a growth rule. All randomness comes from
     `Garden.rng` (mulberry32) and is consumed in a fixed order per step.
  2. Reading mutable session state from inside a rule. The lattice bug read
     `this.colonies.length`, which changes as the session goes on, so the same
     cell behaved differently on replay than it did live. **A rule may read the
     grid and its own colony record. Nothing else.**
  3. Wall-clock time entering the sim. Timers are wall-clock; the simulation is
     not. Growth rules never see `performance.now()`.

  Any change to a growth rule invalidates every stored garden. Grid dimensions
  live in the archive entry so at least the *shape* stays recoverable.

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
| Micro | 90 sec  | One button lights up. Tap = plant a common species. Ignore = nothing. |
| Meso  | 6 min   | Three buttons: Locked in / Drifted / Gone. Self-report, honor system. |
| Macro | 30 min  | Bloom, then break: 5 min base + 1 min per Locked-in stretch, cap 5 bonus. |

All three run independently from session start. The user is not meant to track
them — one glance at the ring set and the countdown is the whole interface.

**Design decision worth preserving:** focus buys break *minutes*; honesty buys
*garden*. Answering Gone costs you break time but plants rot, mouths, and
mycelium, which produce the wildest growth. Lying to get a longer break gets you
a boring garden. That trade is the entire integrity mechanism — there is no
enforcement and there should never be any.

## Species families

- **Common** (micro tap): crust, filament, bead — green, bulk filler.
- **Locked in**: spire, lattice, cistern — pale green/teal, structural.
- **Drifted**: drifter, spore, tendril — purple, mobile.
- **Gone**: rot, mouth, mycelium — mauve/red.

Undocumented interactions that should survive any refactor: rot leaves substrate
that doubles growth rate for whatever grows on it; mycelium hunts across the field
for a foreign colony and mutates a disc of it into a random species on contact;
mouth eats an expanding ring and leaves rich substrate behind.

**The sim currently has almost no mortality**, which is why field test 1 produced
one undifferentiated green maze. Rebalancing means adding death, not subtracting
growth. See SPEC.md § Direction for the rebalance.

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
never pruned; if a long multi-macro session ever runs out of headroom, that is a
mixing problem to solve, not a reason to cap the garden.

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
folder over HTTPS once (GitHub Pages off this repo is the least work), open it in
Android Chrome, and use Add to home screen. After that it is installed and works
with the radio off.

## Working style

Field-test changes on a phone before polishing them. The numbers that matter
(is 90 seconds too often, does the break feel earned) are only visible while
actually grading — and field test 1's numbers do not count, because it ran inside
the artifact viewer with 40% of the screen taken by chrome.

Before shipping a change that touches a growth rule, verify replay equality: two
`regrow()` calls on the same archive entry must produce identical grids.

BUGS.md is the running defect record. SPEC.md holds the reasoning, the resolved
questions, and the ones still open.
