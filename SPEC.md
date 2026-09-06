# Eldritch Garden — spec v0.1

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

## The garden

Twelve species on a 76×112 grid, four families of three. Rules are simple
per-cell automata plus a few colony-level behaviours (mouth's expanding ring,
mycelium's hunt). Nothing about the rules is documented anywhere in the product.

The eldritch part is not the palette, it is that the rewards are not obviously
good. Rot consumes your other colonies. Mouths eat holes. Mycelium mutates
whatever it reaches into something else. The garden is fed by your attention but
is not on your side.

## Audio

One voice per planted cell. Pitch by row, pan by column, timbre by family. Under
a 340 Hz lowpass during work; sweeps to 4.2 kHz across the bloom. A four-oscillator
pad underneath from the first tap.

The point of audio-primary reward: it delivers the dopamine hit without requiring
the user to look away from an essay. A visual-only reward makes every micro a
context switch.

## Persistence

Sessions save a seed log — `{step, species, x, y, kind}` per plant, plus the RNG
seed and tallies. Roughly 2 KB per session. The garden is regrown deterministically
on replay, with voices entering in the original order, so a past session can be
replayed as both image and piece of music.

This is why determinism is a hard invariant rather than a nice property.

## Explicitly rejected

- **Cross-session accumulation of a single persistent garden.** Decay would punish
  weekends and sick days; no decay makes it a monotonic counter. Per-session
  gardens plus an archive gives permanence without a debt mechanic.
- **Choice of two seeds at the meso prompt.** Redundant with the three-way answer
  and adds a decision at the worst moment.
- **Streaks and any failure penalty.** Missing a tap plants nothing; that is all.
- **Any legend, tutorial, or species reference.**

## Open questions for round two

1. **Is 90 seconds the right micro?** The core uncertainty. It may need to be
   task-triggered rather than time-triggered — a tap when an essay is done, with
   the timer as a floor rather than a prompt.
2. **Should the break be able to end early on its own terms?** "Skip the break"
   currently exists and is probably a mistake.
3. **Does the archive want a way to see a garden's tally next to the garden**, so
   the user can notice that their honest sessions look better? That would make the
   mechanism legible, which may be worth more than keeping it hidden — or may
   destroy it.
4. **Multi-macro sessions.** The garden currently persists across macros within a
   session and blooms repeatedly. Untested past one macro.
