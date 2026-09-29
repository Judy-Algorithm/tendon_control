# Explainer release QA

Date: 2026-09-30 (Asia/Shanghai). This report records the implemented educational
website, not validation of a personalized physiological estimator.

## Automated checks

`npm test`: 133 tests passed, zero failures (101 existing regression tests and
32 new numerical, source, scene and native-SO checks). No production build is
required by this static repository.

- Existing ROM directions, tendon search, endpoint mapping and labels retained.
- Canonical geometry is immutable through explosion, scaling and reset.
- Four-point IK residual is computed from the actual displayed proxy points.
- Force/lever sign and units checked in 36 combinations; educational allocation
  checked against bounds, balance and optimality conditions.
- Native SO renderer contract, preserved engine outputs and hashes verified.
- Source records and model counts are namespaced and checked.
- Native MyoHand generation checks: actuator-force mapping error 0 Nm;
  dynamics reconciliation maximum 6.66e-16 Nm. See fixture CHECKS.json.

## Local browser acceptance

Actual browser interactions, not HTTP-only checks:

| Area | Observed result |
|---|---|
| Navigation | All three routes, direct step URLs, previous/next and back navigation work. Leaving original ROM pauses it. |
| Existing controls | FDS3 search resolves the original FDSM mapping; ROM selection, playback, neutral/slider and camera controls work. |
| Scale | Ratio and exploded display change geometry; reset restores it. |
| IK | Default 10° produces 15.26 mm RMS; fitting recovers 25° and displayed 0.00 mm. |
| ID | 2 N × 35 mm + 0.020 Nm = 0.090 Nm. Zero external force retains 0.020 Nm gravity. |
| SO | Load/strength/angle recompute allocation; native 0/2/4 N record selector changes activation and torque. |
| Parameters | Fmax/lopt/lTS inspector updates diagram, curve and force; 250 N, lopt=100 mm gives 125 N under its declared assumptions. |
| Moco | Three problem explanations, time scrub, play and pause work; pause preserves button focus. |
| MyoHand | Native time scrub, playback, control/activation/force traces and internal-state comparison work. |
| Sources | Clickable hotspots, official-source drawer, glossary and muscle-class comparison open; Escape closes modal. |
| Accessibility | Keyboard slider and button use, modal Escape/focus return, reduced-motion no-autoplay verified. |
| Fallback | WebGL creation failure tested in an isolated tab: explanation/calculation remain available; IK fitting is disabled rather than fabricated. |
| Console | No errors/warnings in normal tested local flows. Deliberate WebGL failure produces the expected renderer error only in the isolated test. |

Rendered views inspected at 1440×900, 1920×1080 and 390×844. Mobile controls
stack below the scene; the step rail scrolls horizontally. Desktop and mobile
screenshots are in `screenshots/`. Touch-sized layout was tested by browser
interaction, not on physical phone hardware. One old test tab retained a stale
viewport; a fresh test tab was used and actual innerWidth/innerHeight verified.

One observed localhost reload: DOMContentLoaded 230.3 ms, load 235 ms. These
are single-run observations, not a speed benchmark or frame-rate claim.

## Scientific and product limits

1. Stage interactions are separate teaching examples, not a continuous native
   Scale→IK→ID→SO processing service. No visitor upload or subject fitting.
2. Original hand meshes and routed tendons remain display geometry; native
   MyoHand traces are not a fully registered 23-coordinate visual replay.
3. The native SO example has one hinge, two Millard muscles and one reserve,
   with prescribed external loads. It is not a native 43-muscle hand solve.
4. Moco is an explicitly marked schematic, not an optimized recorded solution.
5. Three relevant muscle classes are explained, not an exhaustive catalog or
   benchmark. MarkerPlacer is explained in expert content but not interactively solved.
6. Native MyoHand traces are contact-free. The different-activation example uses
   controlled initial-state interventions, not naturally reached human states.
7. No physical mobile-device or broad multi-browser compatibility certification.

## Publication gate

Local acceptance complete. Production publication and exact deployed commit
are recorded separately after GitHub/Vercel verification; this local QA alone
does not assert production success.
