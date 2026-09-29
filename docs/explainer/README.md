# Tendon explainer

Three adjacent routes preserve the original atlas and add two explanatory labs.
From the repository root, run `npm start`, then open `http://127.0.0.1:4173`.
The site is static: no build, solver server, or native Python runtime is required
to view it. Run `npm test` for the automated checks.

## Navigation

| Route | Purpose |
|---|---|
| `#control` | Existing ROM and tendon atlas. |
| `#opensim/overview` | Scale → IK → ID → SO, with Moco as a separate trajectory route. |
| `#myohand/overview` | Control → activation → geometry → force → transmission → dynamics → integration. |

Use the step rail, previous/next controls, reset and camera presets. Drag to
rotate; scroll to zoom. “原理与假设” opens deeper explanations and
“官方依据” links to specific official sections. The OpenSim parameter lab
compares Fmax, optimal fiber length and tendon slack length. SO offers a separate
native-record drawer. MyoHand offers time scrubbing and an equal-pose,
different-initial-activation comparison.

## What is actually computed?

| Tier | Included examples | Boundary |
|---|---|---|
| Geometric/conceptual illustration | Layering, bone scaling, proxy-marker IK, Moco timeline | Not native OpenSim Scale/IK/Moco runs; display anatomy is not registered to replay models. |
| Simplified calculation | Single-axis ID, two-actuator allocation, three-parameter muscle lab | Declared teaching equations, not the full displayed hand's mechanical model. |
| Native replay | OpenSim SO and MyoHand traces below | Saved engine outputs, not a solver running in the browser; interpolation is not new simulation. |

## Modules and evidence

- `explainer/main.js`: navigation, controls, drawers and numerical readouts.
- `explainer/scene.js`: Three.js teaching geometry and selectable structures.
- `explainer/math.js`: explicit simplified calculation utilities.
- `explainer/muscle-lab.js`: isolated Fmax/lopt/lTS teaching experiment.
- `explainer/content.js`: curricula, glossary, muscle-class summaries and the
  `SOURCES` registry. Version-specific native MyoHand sources also live in
  `myohand-native.json → manifest.officialSources`.
- `explainer/model-manifests.json`: display/teaching/native namespaces and units.
- `explainer/fixtures/myohand-native.json`: MyoSuite 2.11.6 / MuJoCo 3.3.0,
  `myoHandPoseFixed-v0`, 39 muscles and 23 hinge coordinates. Contains a
  201-sample 400-ms pulse and two 51-sample 100-ms controlled-state traces.
  `MODEL_MANIFEST.json` and `CHECKS.json` accompany it. See
  [MyoHand audit](MYOHAND_AUDIT.md).
- `explainer/fixtures/opensim-so-native.json`: three actual OpenSim 4.4.1 SO
  runs, 0/2/4 N prescribed external loads on a one-joint, two-Millard-muscle
  teaching lever. Each run contains 21 repeated static frames, not 21 independent
  trials. See [SO audit](NATIVE_SO_AUDIT.md) and `native-so-evidence/` for the tiny
  model, motion, logs and output files. This is not a 43-muscle hand validation.
- `scripts/explainer/generate_myohand.py` and
  `scripts/explainer/generate_opensim_teaching.py`: portable `--output`
  generators. Native dependencies are needed only to regenerate the records.
- [PPT coverage](PPT_COVERAGE.md): deck-to-implementation review and remaining gaps.

## Asset provenance and licensing

The explainer reuses the repository's existing bone meshes and tendon display
assets. It adds code-native diagrams and numerical fixtures, not new third-party
anatomy imagery. Existing assets retain their provenance and notices in the root
`THIRD_PARTY_NOTICES.md`, `LICENSE-MYOSUITE`, `LICENSE-THREEJS` and
`docs/data-provenance.json`. Three.js is MIT; the existing MyoHand/MyoSuite-derived
visual assets are recorded under Apache 2.0. The SHM table is a separate source,
not native MyoHand kinematics. Do not interpret this page as relicensing it.

Native exports record software versions, source hashes, manually specified
conditions and limitations. No participant recordings, private model, credentials,
or local absolute paths are required by the public explainer. No publication or
production-deployment status is asserted here.
