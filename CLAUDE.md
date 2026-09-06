# Eldritch Garden — project instructions

## What this is

A three-loop focus timer for a high school English teacher grading essays. Phone
sits propped beside a laptop. Every interaction has to be a single thumb tap with
zero reading, because the user is mid-essay when it happens.

Reward is a cellular-automaton garden plus a generative drone. The garden grows
slowly and quietly during work, then blooms — fast-forwards, filters open — when
the long timer completes and the break begins.

Single self-contained `index.html`. No build step, no dependencies, no framework.
Keep it that way. It has to be openable from a file URL on an Android phone.

## The success metric

The user grades more. Not: opens the app more, or has a prettier garden. If a
change makes the app more engaging but more interruptive, it is a regression.

## Hard constraints

- **One file.** Inline CSS and JS. Only external resource is the Google Fonts link.
- **The sim must stay deterministic.** Persistence saves a seed log (species, x, y,
  step index) plus an RNG seed — not pixels. Replay re-runs the sim from the seed
  and must produce a byte-identical garden and the same voice order. Any new
  randomness must come from `Garden.rng` (mulberry32), never `Math.random`,
  and must be consumed in a fixed order per step. This is the one invariant that
  will silently break if someone adds a `Math.random()` to a growth rule.
- **Nothing is documented in the UI.** No legend, no species names on screen, no
  tooltips explaining what rot does. Discovery is the content. Copy stays terse
  and slightly unfriendly.
- **Timers are wall-clock, not tick-counted.** They already use `performance.now()`
  deltas. Do not convert to interval counting; the phone throttles background rAF.
- **Storage:** `window.storage` only (artifact-hosted key/value). Wrapped in
  try/catch everywhere; the app must run with storage entirely absent.
- **No streaks, no shame, no notifications.** Missing a tap plants nothing. That
  is the whole punishment. Never add a "you broke your streak" state.

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

## Audio

Web Audio, continuous from session start. One voice per planted cell: pitch by
row (minor-pentatonic degrees), pan by column, timbre by family — filtered saw
for commons, sine partials for locked-in, detuned pairs for drifted, bandpassed
noise for the rot family. A master lowpass sits at 340 Hz during work and sweeps
to 4.2 kHz over the bloom.

The user makes drone/noise music. Audio is not an accessory here — it is half the
reward, and it is the half that does not require looking away from the essay.
Treat it with the same care as the visuals.

## Working style

Field-test changes on a phone before polishing them. The numbers that matter
(is 90 seconds too often, does the break feel earned) are only visible while
actually grading. See BUGS.md for the first field test's findings and SPEC.md for
the reasoning behind the design.
