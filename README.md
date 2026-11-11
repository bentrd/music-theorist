# Cadence

A harmony-first music learning app for classical and electronic composition. Short lessons, immediate feedback, audible examples, and a clean responsive interface.

## Learn by playing

- A 12-unit harmony path: tonal center, intervals, triads, inversions, keys, Roman numerals, function, cadences, sevenths, modes, chromatic harmony, and composition.
- Visual score exercises and ear training, with explanations after every answer.
- A 60-second treble/bass Note Sprint with a personal best.
- An interactive circle of fifths covering 12 major keys and their relative natural minors.
- A progression lab with transposition, inversions, classical/electronic presets, and an audible piano.
- A searchable harmony glossary.
- XP, daily goals, streaks, mastery, and JSON progress backups.

Rhythm lessons are intentionally deferred. This first course teaches harmonic understanding.

## Run

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

The production build is written to `docs/`, ready for GitHub Pages. Asset URLs are relative, so the app works at a repository subpath. Pages serves `main` → `/docs`; rebuild and commit `docs/` when changing source. `.nojekyll` bypasses Jekyll processing.

## Local data

No backend, account, analytics, or server credentials. Learning progress uses the versioned `cadence.progress.v1` localStorage key. The progression lab saves separately as `cadence-composition-v1`.

Local data belongs to the current browser and origin. Clearing browser data removes it; preview and production have separate histories. Export a learning backup in Settings and import it on another device. Storage failures fall back to an in-memory session. Audio starts only after interaction, using Web Audio synthesis, with no remote audio downloads.

## Learning model

Score at least 80% to master a lesson. Correct lesson answers earn 10 XP; the first mastery adds 20 XP. Practice answers earn 5 XP. There are no lives or paywalls. Streaks use the learner’s local calendar day.

The curriculum introduces traditional tonal conventions with context; electronic/modal harmony can use different expectations. A key label is context, not a claim that a short chord sequence uniquely determines a key. Natural minor palettes are distinguished from classical minor’s raised leading tone.

## Built with

React, TypeScript, Vite, [Base UI Drawer](https://base-ui.com/react/components/drawer), Lucide, and [Liquid Glass React](https://github.com/rdev/liquid-glass-react). Glass refraction follows browser capabilities; blur and highlights remain available where displacement is unsupported. Fonts fall back to system fonts if Google Fonts is unavailable.

Interaction inspiration: [Duolingo Music](https://blog.duolingo.com/music-course/). Cadence is an independent app with original branding, curriculum, and artwork.

Theory terminology was checked against [Open Music Theory](https://viva.pressbooks.pub/openmusictheory/) and Puget Sound’s [Music Theory for the 21st-Century Classroom](https://musictheory.pugetsound.edu/mt21c/).
