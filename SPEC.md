# Eldritch Garden — spec v0.2

Supersedes v0.1. The change between them is the target: v0.1 described a Claude
artifact, v0.2 describes an Android app. The design is unchanged; the platform
assumptions around it are not.

---

## Origin

A "Polydoro" — a pomodoro with nested loops. Built for grading English I essays:
a task that is long, repetitive, and easy to avoid. The design brief was a micro
loop that rewards finishing a unit of work, a meso loop that rewards staying on
task, and a macro loop that grants a real bonus break.

## The design problem, and the answer

The system is entirely self-reported and unenforceable. The user grades alone; the
app cannot tell focus from distraction; lying is free. Enforcement was rejected as
an approach because it would make the app adversarial toward someone already
avoiding a chore.

The answer is to make honesty pay in a different currency than focus:

- **Focus buys time.** Each Locked-in meso adds a minute of break, capped at five.
- **Honesty buys garden.** Answering Gone plants the rot family, which produces
  the strangest and most alive-looking growth in the sim.

So the cheater gets a long break and a dull garden. The design never says this
out loud and never should.

## The success metric

The user grades more. Not: opens the app more, or has a prettier garden. If a
change makes the app more engaging but more interruptive, it is a regression.

---

## Platform target

**Phase 1 — installed PWA.** `index.html` plus a web app manifest, a service
worker, and an icon set. Served once over HTTPS, then installed to the Android
home screen. Runs fullscreen with no browser chrome, works offline afterward,
and gets real persistent storage.

**Phase 2 — APK, if and when distribution matters.** Bubblewrap wraps the phase-1
PWA into a Trusted Web Activity with no code changes; Capacitor is the alternative
if native plugins are ever needed. Both consume the phase-1 app as input, so
phase 1 is not throwaway work — it is the first half of phase 2.

**Explicitly rejected: a native rewrite.** The generative drone is a Web Audio
node graph — dozens of concurrent voices, biquad filters, convolution reverb,
stereo panning, scheduled gain envelopes. Reimplementing it on Oboe or AudioTrack
is a multi-week DSP project that would buy nothing the WebView does not already
provide. Audio is half the reward; it stays on the platform that renders it well.

### What the platform change forces

1. **Storage must be replaced.** v0.1 used `window.storage`, an artifact-host
   key/value API that does not exist anywhere else. Everything behind it — config
   and the entire session archive — silently no-ops off-host. It becomes a small
   `Store` adapter over `localStorage`, with the same async shape so the phase-2
   swap is one file.
2. **The one-file rule relaxes, in letter only.** `index.html` remains the whole
   *application* — inline CSS and JS, no framework, no npm, no build step. The
   added files are platform metadata, not code.
3. **Field test 1's numbers are suspect.** It ran inside the artifact viewer,
   whose title bar and reply composer consumed roughly 40% of a 2340 px screen.
   The garden never had the space it was designed for. Every tuning question
   below needs re-measuring once the app is fullscreen.

---

## Loops

Three independent wall-clock timers from session start. Defaults 90 s / 6 min /
30 min, all user-settable, plus a base break length.

**Micro — presence.** A single button lights and a voice enters the drone. One
tap plants a common species. Untapped micros expire silently and plant nothing.
Deliberately not a question: at ~20 per macro, any judgment call at this frequency
would be a tax on the work it is supposed to protect.

**Meso — honesty.** Three buttons in sentence case: Locked in / Drifted / Gone.
Sentence case matters — "GONE" is harder to tap truthfully than "Gone". Each
answer plants from a three-species pool; which species inside the pool is random.
That randomness is the variable reward, so no second decision is needed.

**Macro — bloom and break.** The sim fast-forwards, the master filter opens, the
accumulated voices become an actual piece of music. Then the break countdown, with
the garden still slowly alive.

---

## The garden

Twelve species on a rectangular grid, four families of three. Rules are simple
per-cell automata plus a few colony-level behaviours (mouth's expanding ring,
mycelium's hunt). Nothing about the rules is documented anywhere in the product.

The eldritch part is not the palette, it is that the rewards are not obviously
good. Rot consumes your other colonies. Mouths eat holes. Mycelium mutates
whatever it reaches into something else. The garden is fed by your attention but
is not on your side.

### What field test 1 revealed

The garden read as a single green maze at near-total coverage within one macro.
Individual species were indistinguishable and the rot family showed only as
isolated pixels, so the bloom had nothing to reveal. Three causes, all structural:

- Crust spreads without bound and dies only when crowded — net-positive growth.
- Filament converts its tail to bead rather than dying, so movement is free.
- **Nothing ages out anywhere in the sim.** There is no mortality except crowded
  crust. Every rule adds cells; almost none remove them.

### The rebalance, as built

The target was a dozen distinct organisms competing, not a texture. Four levers
were proposed; the order of importance turned out to be different from the guess.

1. **Per-colony standing cap** — how many cells a colony may hold at once. This
   is the load-bearing lever and it was not on the original list. Mortality alone
   *inverts* the design: species that reproduce in place (crust, spire) renew
   themselves with young cells indefinitely, while movers and converters age out.
   The first tuning pass produced a field of nothing but crust and spire, with
   the entire gone family absent — the dullest species crowding out the ones the
   design depends on. A standing cap bounds every colony the same way.
2. **Mortality.** A lifespan per species, probabilistic past the threshold so a
   colony fades from its oldest cells outward. Death leaves substrate: the corpse
   still feeds the next thing, and the ground keeps a scar permanently.
3. **Per-colony extent caps**, so a colony holds a shape.
4. **Rate tuning** on crust, bead and filament.

Plus a global ceiling, which in practice acts only as a backstop.

**Coverage lands at 21–26%, not the 35–45% this spec originally guessed.** That
number was written when a population ceiling was expected to do the shaping. With
colony caps doing it instead, the ceiling is rarely reached, and the lower figure
reads better: negative space is what lets ~23 colonies be told apart. The number
was a means, not the goal, and the goal is met. Left low deliberately.

Still to be tuned against **multi-macro** sessions. See open question 4.

### Undocumented interactions that survive any refactor

Rot leaves substrate that doubles growth rate for whatever grows on it. Mycelium
hunts across the field for a foreign colony and mutates a disc of it into a random
species on contact. Mouth eats an expanding ring and leaves rich substrate behind.

---

## Audio

One voice per planted cell. Pitch by row (minor-pentatonic degrees), pan by
column, timbre by family — filtered saw for commons, sine partials for locked-in,
detuned pairs for drifted, bandpassed noise for the rot family. A four-oscillator
pad underneath from the first tap. Master lowpass at 340 Hz during work, sweeping
to 4.2 kHz across the bloom.

The point of audio-primary reward: it delivers the hit without requiring the user
to look away from an essay. A visual-only reward makes every micro a context
switch.

**Status: confirmed working on Android.** This was the largest open risk in v0.1
and it is closed.

---

## Persistence

Sessions save a seed log — `{step, species, x, y, kind}` per plant, plus the RNG
seed, the grid dimensions, and tallies. Roughly 2 KB per session. The garden is
regrown deterministically on replay, with voices entering in the original order,
so a past session can be replayed as both image and piece of music.

This is why determinism is a hard invariant rather than a nice property. The
archive is not a list of screenshots; it is a list of instructions for rebuilding
gardens, and it is only worth anything if the instructions still work.

**Grid dimensions belong in the archive entry.** v0.1 hardcoded 76×112 globally.
Any future change to the grid — and the aspect ratio is likely to change once the
app is fullscreen — silently invalidates every stored garden. Recording `w` and
`h` per entry costs nothing now and is unrecoverable later. Entries without them
default to 76×112.

---

## Resolved from v0.1's open questions

**2. Should the break be able to end early?** Yes, "Skip the break" was a mistake
and it goes. The break is the thing the work bought; a one-tap way to throw it
away invites exactly the self-defeat the app exists to interrupt. But the user
must not be trapped — the escape hatch is *ending the session*, which already
exists behind Pause and keeps the garden. Leaving early should cost the session,
not the break.

**3. Should the archive show a tally next to the garden?** Yes — and it already
does; v0.1 shipped it and the spec's worry was moot. Keep it. The concern was
that legibility would destroy the honesty mechanism, but a retrospective tally is
not a prescription. It never says rot is good. The user has to notice that their
honest sessions look stranger, and noticing is the same act as discovering what
rot does. That is the content, not a leak of it.

## Still open

**1. Is 90 seconds the right micro?** The core uncertainty, and now genuinely
unmeasured — field test 1 ran in a viewer that halved the screen. It may need to
be task-triggered rather than time-triggered: a tap when an essay is done, with
the timer as a floor rather than a prompt. Needs a full grading block with real
essays, not a bench test.

**4. Multi-macro sessions.** The garden persists across macros within a session
and blooms repeatedly. Untested past one macro, and the most likely place the
rebalance falls over — a population ceiling tuned for 30 minutes may leave macro 3
with a static field and nothing to reveal. The second bloom needs to be worth
watching or the design does not survive a real two-hour grading block.

**5. What happens when a session ends mid-macro?** Currently the partial macro is
saved and simply stops. Whether the garden should get a final short bloom on
"End session" is unexplored, and it is the last thing the user sees.

---

## Explicitly rejected

- **Cross-session accumulation of a single persistent garden.** Decay would punish
  weekends and sick days; no decay makes it a monotonic counter. Per-session
  gardens plus an archive gives permanence without a debt mechanic.
- ~~**Choice of two seeds at the meso prompt.**~~ **Reversed.** It now exists,
  scoped to Locked in only. The original objection — a decision at the worst
  moment — holds for Drifted and Gone, and those still plant instantly; someone
  who has just admitted they were gone is the last person to hand a choice. But
  Locked in is by definition the answer that means you had attention to spare,
  and the two options are shown as the species actually grown for a few steps
  rather than named, so the no-legend rule survives and picking is a look rather
  than a read.
- **Streaks and any failure penalty.** Missing a tap plants nothing; that is all.
- **Any legend, tutorial, or species reference.**
- **A native Android rewrite.** See Platform target.
- **Notifications.** Including the ones an APK would make easy. The app has no
  claim on attention it did not earn by being open.
