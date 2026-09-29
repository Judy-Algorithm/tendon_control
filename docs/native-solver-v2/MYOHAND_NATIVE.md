# Native MyoHand V2: reproducible scope and checks

## Identity and geometry

This branch runs `myoHandPoseFixed-v0`, MyoSuite 2.11.6 and MuJoCo 3.3.0, reset seed 11. It is a native template, not a personalized human. There are 39 muscle actuators and activation states, 23 independent hinge coordinates, 39 bodies, 99 geoms and 333 sites. Five additional visualization tendons explain why the engine contains 44 tendons rather than 39.

`explainer/native-v2/data/myohand-model.json` contains the complete native names and 29 native hand/forearm meshes. It does not use the legacy display skeleton or infer paths from muscle names. Each recorded frame exports native body transforms, tangent points and active wrapping objects for all 39 muscle paths. Sphere/cylinder arcs are sampled from native tangent solutions. Coordinates are metres/radians, quaternions are `wxyz`, and transforms are native world-space. Source hashes and pinned public source links are in the model/run manifests. MyoSuite/myo_sim asset attribution remains Apache-2.0; see the existing license files.

Four-pose geometry checks compare exported transforms and mesh vertices against native compiled geometry, compare raw path points against native engine buffers, and check analytic lengths against the native tendon length. Maximum mesh-vertex discrepancy is below 8 nm; native path-length discrepancy is below 0.3 nm; rendered chord approximation is below 0.8 micrometres. These are software/geometry checks, not biological accuracy claims. The check file is `myohand-geometry-check.json`.

## What is actually computed

The runner advances native physics at 2 ms. Controls are held for 20 ms. The normalized MyoSuite action transformation is `ctrl = sigmoid(5*(raw_action - 0.5))`; consequently raw zero is not zero excitation. Allowed raw actions in [-1,1] reach controls approximately [0.000553,0.924142]. Saved `ctrl`, activation, force and motion are distinct native values.

MuJoCo's muscle actuator force is signed negative for tension. The displayed positive tension is its negation. Signed generalized torque is `actuator_moment × actuator_force`; the exported per-muscle contributions sum to native `qfrc_actuator`. The full equations-of-motion check includes passive, bias and constraint forces. Numerical agreement does not imply a target was tracked successfully.

The pulse mode applies a selected-muscle control pulse. The tracking mode uses a **custom all-39 bounded least-squares allocation, activation-lag compensation and computed-torque PD controller**, not a pretrained MyoSuite policy and not OpenSim static optimization. Target values are never substituted for simulated motion.

## Original ROM clips and honest coverage

All 48 original directional actions from 17 display groups are audited in `myohand-action-audit.json`. Axis sign is checked against the native joint axis. Thumb display/native axis signs differ. Only 12 original actions fit native coordinate definitions and limits. Thirty-two exceed native ranges; four use absent additional coordinates. They remain unsupported: targets and joint limits were not reduced to make them work.

The 12 mapped clips retain their 2.4-second cubic-easing target, original angle amplitude, sign and declared prepositioned starting pose. Their 121 canonical samples at 20 ms are linearly interpolated onto the 2 ms native step. Other native coordinates target neutral zero, with actual drift retained. Public playback samples are 40 ms; numerical and tracking checks use every 2 ms step.

Initial controller v1 used kp=100, kd=20. Its weak feedback left substantial tracking lag, especially in middle/ring PIP extension. A bounded diagnostic compared torque, diagonal-inertia and full-inertia metrics. The selected update uses **one common kp=800, kd=60, torque metric for all 12 clips**, not per-clip tuning. No native parameter, force, target, initial state or acceptance threshold changed. Original files remain available alongside `-tuned.json` files.

| Original action | v1 selected RMSE (deg) | Tuned selected RMSE (deg) | Tuned maximum all-coordinate error (deg) | Tracking gate |
|---|---:|---:|---:|---|
| Thumb CMC flexion | 1.351 | 2.272 | 10.868 | Fail |
| Thumb CMC abduction | 3.351 | 4.073 | 15.427 | Fail |
| Thumb MCP flexion | 1.139 | 0.779 | 4.243 | Pass |
| Thumb IP flexion | 5.766 | 4.729 | 11.765 | Fail |
| Index PIP extension | 6.389 | 0.597 | 7.557 | Pass |
| Middle PIP extension | 20.998 | 2.550 | 7.950 | Pass |
| Ring PIP extension | 17.096 | 2.551 | 7.919 | Pass |
| Little PIP extension | 5.968 | 1.809 | 8.675 | Pass |
| Index DIP extension | 9.134 | 1.778 | 7.650 | Pass |
| Middle DIP extension | 6.293 | 0.718 | 7.926 | Pass |
| Ring DIP extension | 7.035 | 1.264 | 8.886 | Pass |
| Little DIP extension | 19.127 | 3.343 | 8.981 | Pass |

The frozen tracking gate is selected-coordinate RMSE <5 degrees **and** maximum error over every coordinate and time <10 degrees. The tuned result is 9/12 tracking passes versus 0/12 initially; all 12 pass numerical QC in both versions. The remaining three failures are driven by coupled thumb MCP deviation, not missing data. Native soft-limit overshoots of about 0.20–0.42 degrees are reported separately; a tracking pass is not strict anatomical-limit certification. `myohand-tracking-report.json` includes every original/tuned QC result, largest saved error location and control saturation rates.

The inventory additionally lists both directions of all 23 native coordinates. The initial audit preserved 34 nonzero recipes as NOT_RUN. A subsequent, separately declared **new-native-coordinate-demo-v2** batch executes all 34 at 25% of each available native range over 2 seconds, using common kp=800/kd=60. Twelve neutral-to-zero directions have no excursion and remain unsupported. These demonstrations are not counted as successful original ROM actions. The default playback is the baseline FDS2 pulse; parameter variants follow, then the successful tuned original index PIP clip. Archived failures remain selectable.

All 34 new demonstrations pass numerical QC; 28 pass the unchanged tracking gate. Six tracking failures remain: negative pronation/supination, negative thumb MCP, positive middle DIP, positive ring DIP, positive little PIP and positive little DIP. No failing target was reduced or removed. The new recipe is minimum-jerk motion for 1.5 seconds followed by a 0.5-second hold, not the original atlas's cubic 2.4-second motion. Other coordinates target neutral zero. Native physics/QC remains at 2 ms, controls at 20 ms; compact public playback records 21 frames at 100 ms, each with all 39 channels and native geometry. The complete latest inventory is in the index and `myohand-native-coordinate-report.json`; the earlier action audit remains the original pre-expansion ledger.

## Parameters and perturbation evidence

The model inspector exports 480 numeric compiled-model fields and 29 engine-option fields. Large arrays are represented by shape, dtype and hash, rather than pretending that every compiled array is a user-editable parameter. All 39 native actuator names and full gain/bias/dynamics arrays are explicit.

Supported editable families are global/per-muscle force scale and global/per-muscle activation-time scale. Force scales multiply native gain and passive-bias force entries; time scales multiply both native activation/deactivation constants. Requested and effective values are recorded in every run. Bounds (force 0.5–1.5; time 0.5–2) are engineering exploration limits, not population physiology ranges. Other compiled parameters are inspectable, read-only in this implementation.

Same-control pulse comparisons genuinely change native equations:

- Force ×1.25 changes maximum force by 11.156 N and coordinate response by 0.12575 rad; activation stays identical, as expected when only the force scale changes.
- Activation-time ×1.5 changes activation by up to 0.06692, force by 4.592 N and coordinates by 0.14705 rad.

These are paired differences, not claims of improved control. `myohand-run-independent113.json` additionally provides a non-library force×1.13/time×1.3 request for independent fresh replay.

Two further native runs edit only FDS2 (native channel index 11). Its force ×1.1 changes maximum force by 2.788 N and coordinates by 0.05452 rad, with unchanged activation. Its activation-time ×1.2 changes activation by 0.02984, force by 1.833 N and coordinates by 0.06659 rad. An effective-parameter comparison confirms all other channels retain their baseline parameters. `myohand-parameter-check.json` records these checks and malformed/bounded-request tests. Global and per-muscle products must remain inside the stated effective bounds; requests exceeding them are rejected, not silently clipped.

## Moment signs, not name-based agonist claims

`myohand-moment-audit.json` audits all 39×23 native moment entries at five wrist poses, with finite-difference path derivatives agreeing within 2.91e-10 m. At neutral, torque per positive newton of tension about native positive `flexion` is ECRB −0.01533, ECRL −0.01166, ECU −0.00755, FCR +0.01846, FCU +0.01841 and PL +0.02511 Nm/N. Thus ECRB must not be labelled a positive-flexion agonist in this native model. These native signs do not, by themselves, anatomically register the legacy display skeleton.

## Reproduce

Use a Python environment containing MyoSuite 2.11.6, MuJoCo 3.3.0, NumPy and SciPy. Native sources are installed by the runtime; no private model path is accepted.

```sh
OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 python scripts/native-v2/myohand_runner.py --request request.json --output run.json
python scripts/native-v2/myohand_runner.py --export-model myohand-model.json
python scripts/native-v2/myohand_catalog.py --catalog explainer/native-v2/data/action-catalog.json --output explainer/native-v2/data --execute --kp 800 --kd 60 --suffix tuned
python scripts/native-v2/myohand_geometry_check.py --help
python scripts/native-v2/myohand_report.py --output explainer/native-v2/data
python scripts/native-v2/myohand_coordinate_batch.py --output explainer/native-v2/data
```

The CLI whitelists request fields, versions and bounded domains. Every output records source hashes, generator hash, request, effective parameters, raw action sequence, checks and measured wall time. Initial pulse runs took roughly 0.7 seconds warm and 2-second tracking/export roughly 1.3 seconds warm on the development machine; these are measured examples, not guaranteed latency. No OpenSim/MyoSuite process runs inside the Vercel browser replay. A live computation requires the separate local native service.

`myohand_runner_v1.py` preserves the source hash that generated the original fixtures. New tuned runs identify the current runner hash. Independent fresh-engine replay is documented separately by the reviewer; this author report does not relabel self-checks as independent validation.

`myohand_runner_v2.py` additionally preserves the tuned controller source before combined-parameter validation was tightened. The index's `generatorVersions` registry maps all three generator hashes to their scripts; existing run manifests are not rewritten.
