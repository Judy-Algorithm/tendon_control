# Scientific content audit — 2026-09-30

Scope: educational copy and evidence registry for OpenSim Scale / IK / ID / SO, Moco, and the MyoHand dependency view. Native fixture provenance and numerical replay checks are separate artifacts. This file does not certify an unimplemented browser-native musculoskeletal solver.

## Version and source policy

- Native OpenSim available during audit: `4.4.1-2023-07-13-710e13be5` (queried through `GetVersionAndDate()`). All three discussed muscle classes, MocoInverse and MocoTrack are available.
- OpenSim implementation claims reference commit `710e13be5`. The installed headers were examined for Thelen and De Groote class-specific behavior. The 4.4 SO target was also read directly; the 4.4 tag resolves to `0e9fedc9039284fa94fe9d1cfbe1fc4d27cd0234`.
- The official Moco 1.3.0 API pages identify themselves as OpenSim `4.5-2024-01-10-34fd6af0b`; do not label those pages as 4.4.1 documentation. Stable conceptual claims are used; numerical default settings are not transplanted into this website.
- MuJoCo sources are pinned to documentation version 3.3.0, matching the native fixture worker's selected engine. The correct muscle-model section anchor is `#muscles`, not `#muscle-actuators`.
- Official Confluence pages are cited by page ID plus actual heading when a reliable deep anchor was not inspected. We do not invent source line numbers or anchors.
- All source records are in `explainer/content.js`, keyed by claim-family IDs. They contain title, URL, section, and interpretation note.

## Non-negotiable distinctions

1. **Anatomy ≠ constitutive law ≠ optimization algorithm.** An anatomical hand model supplies bodies/joints/paths. Millard, Thelen, and De Groote classes supply muscle mechanics. SO and Moco are different inference/optimization approaches. Selecting explanatory text must never pretend to rerun native model numbers.
2. **Activation ≠ excitation ≠ force.** Passive tendon has no independent muscle activation. A muscle force can be signed under an engine transmission convention; activation is not a signed force.
3. **Model namespaces remain separate.** Current website search catalog is reported by the integration audit as 43 muscles, with 37 enabled ROM-mapped paths. Native MyoHand is a separately audited environment. These counts do not establish exact mapping between all meshes, coordinates or muscle routes. Updated manifests, not a stale README, determine the deployed counts.
4. **Computation labels are local.** A recorded native trace is native replay; the browser is not rerunning OpenSim/MuJoCo. A one-joint force/lever calculation is a simplified calculation. Moco node animation is a schematic unless accompanied by a solved trajectory's provenance.

## OpenSim workflow checks

| Step | Verified content | Common error prevented |
|---|---|---|
| Scale | Segment scaling, frame/attachment/wrap updates, mass/inertia rules and muscle length-property rules are separate operations. | Fmax does **not** automatically personalize from bone size. A single factor is not asserted for every component. |
| IK | Fits observed/model marker correspondence with weighted errors and model constraints; optional coordinate tracking. | IK outputs joint coordinates, not activation. The 2018 web page's historical solver tolerances are not assumed current. |
| ID | Known motion derivatives, model mechanics and external loads determine generalized demand. | A static pose alone cannot determine dynamic inverse mechanics. Zero contact does not mean zero gravity. |
| SO | Per-frame recruitment selection with declared objective/bounds and force capacity. | SO is not a unique physiological measurement; not every SO objective is quadratic. |
| Moco | Direct collocation jointly handles a trajectory under configured dynamics and objectives. | Moco is an alternative branch, not a required post-SO step. |

### Scale nuance

Official `How Scaling Works` describes updates to `optimal_fiber_length` and `tendon_slack_length`, and explicitly says muscle strengths are not scaled. The documentation's verbal ratio ordering is not used as a numeric implementation specification. A browser ratio visualization is labeled as a geometric teaching model rather than an exact ScaleTool execution. Displaced exploded components are display-only and must never enter physical length or moment computations.

### Official SO versus complete muscle dynamics

`StaticOptimizationTarget::prepareToOptimize()` computes per-muscle capacity using `calcInextensibleTendonActiveFiberForce(s, 1.0)` when `use_muscle_physiology` is enabled; otherwise capacity is `getMaxIsometricForce()`. Other scalar actuators use their `optimal_force`. The official SO description excludes the muscle parallel-elastic fiber contribution in this active-capacity approximation. SO does not integrate excitation-to-activation dynamics or compliant-tendon dynamics between frames. Other forces in the model are a separate accounting issue; do not imply that all passive forces everywhere are necessarily removed.

For a teaching linear-capacity allocation, `R F + tau_reserve = tau_required` is valid only under explicitly declared independent coordinates and force accounting. A quadratic objective and linear constraints permit a QP interpretation; arbitrary activation exponent/settings do not. Official OpenSim target code enforces acceleration constraints; a simplified torque allocation is a reduction, not a claim about the exact tool's code path.

Reserve is a supplementary generalized actuator. For a rotational CoordinateActuator, `control × optimal_force` is torque in N·m; its control is dimensionless. A 5% acceptance rule is not an OpenSim default. If project checks are shown, loaded coordinates must come from contact generalized torque, and near-zero denominators must not create artificial rejection. The native educational example need not reuse this research-specific threshold at all.

### Three muscle classes

| Class | Full dynamics / configuration | SO distinction |
|---|---|---|
| Millard2012EquilibriumMuscle | Equilibrium model with optional tendon compliance, activation dynamics, and fiber damping. | SO requests active inextensible-tendon capacity, not full forward evolution. |
| Thelen2003Muscle | Classic activation and fiber-length states. Installed 4.4.1 header explicitly warns about `ignore_tendon_compliance` implementation. | Dedicated `calcInextensibleTendonActiveFiberForce` exists. Do not claim arbitrary runtime switch equivalence to Millard simply because inherited properties are listed. |
| DeGrooteFregly2016Muscle | Uses normalized tendon force as state with compliant tendon. Supports explicit/implicit forms, property-controlled activation/tendon simplifications. | Has an active-capacity entry point; availability alone is not a benchmark or a drop-in performance guarantee. Implicit tendon mode is for a supporting solver such as Moco, not ordinary Manager time stepping. |

These classes were verified available, not all simulated or benchmarked in this work package. The selector is explanatory unless a separately identified fixture changes.

### Moco distinctions

- `MocoInverse`: prescribed kinematics, optimize actuator behavior; default cost concerns squared controls and optionally activations. This is not identical to isolated-frame SO when activation/tendon dynamics are present.
- `MocoTrack`: reference states and/or markers appear in a tracking objective; kinematics and controls can be optimized together.
- Custom predictive Moco: task costs and boundary/path constraints determine a trajectory rather than prescribing all motion.
- Time-node displays illustrate collocation constraints. They must not fabricate a convergence score, iteration count, or solved residual. Finer mesh requires convergence checking, not a promise of correctness.

## MyoHand checks

The teaching order is a dependency view: control → activation, while kinematics → transmission lengths/velocities; those branches meet in force generation → generalized actuator force → total dynamics → integration. This is not literal call ordering. Policy evaluation/training is distinct from simulation.

Specific environment/XML/action transformation and counts belong to the native fixture audit. The copy does not assume actions equal `ctrl`. `actuator_length` is transmission length, not elastic tendon stretch. MuJoCo reference-length normalization is not copied from OpenSim lopt/lTS equations. Transmission moment data and force signs must be read in the selected engine version. Quaternion qpos components cannot be differentiated elementwise and labeled qvel.

## Numeric teaching tests recommended for QA

- Single-axis torque: r=(0.04,0,0) m, F=(0,2,0) N, e=(0,0,1) gives +0.08 N·m. Required holding torque is −0.08 N·m when other terms are omitted. Reverse F or move r across the axis to reverse sign.
- Reserve scale: control=0.5 and optimal_force=0.1 N·m gives 0.05 N·m, not 0.5 N·m.
- IK: an exactly matching synthetic target gives zero geometric residual up to numeric tolerance. Changing marker weight may trade off errors; do not animate guaranteed improvement unless measured.
- A source reference exists for every step, dictionary entry and muscle-class card. Default summaries are under 100 Chinese characters. The content module imports successfully and no source ID is unresolved.

## Content module validation at handoff

- 6 OpenSim steps, 8 MyoHand steps, 3 muscle classes, 23 glossary entries, 20 source records (including the MarkerPlacer/ID source follow-up).
- JavaScript import and source-ID referential integrity: PASS.
- All default summaries: 41–58 characters; PASS (limit 100).
- Primary pages for Scale, IK, ID, SO, Moco, all three muscle classes, reserve API, MuJoCo modeling/computation/types, and MyoSuite were opened; implementation source/local headers checked as stated.
- Scientific browser rendering and actual controls require integration-level QA and are not claimed complete here.

## Follow-up: static marker placement and ID derivatives

The slide cross-check identified a missing optional stage between segment scaling and dynamic IK. Added concise expert details, not another mandatory top-level stage:

- Official [How Scaling Works, Marker Placement](https://opensimconfluence.atlassian.net/wiki/spaces/OpenSim/pages/53089158) describes averaging static marker observations, fitting a static pose with weighted marker/coordinate IK, then moving markers not designated fixed.
- Pinned [OpenSim 4.4.1 MarkerPlacer.cpp](https://github.com/opensim-org/opensim-core/blob/710e13be5/OpenSim/Tools/MarkerPlacer.cpp) corroborates `InverseKinematicsSolver::assemble`; `_moveModelMarkers` gates relocation. `moveModelMarkersToPose` skips fixed, absent, and invalid observed markers, converts units, transforms the ground observation into the marker's parent frame, and changes `location`.
- The copy therefore says this is optional and configuration-dependent. Subsequent ordinary dynamic IK keeps those model-local marker locations, changing world locations through joint motion; it is not re-fitting local marker attachment positions at every frame. This is a workflow distinction, not a claim that all OpenSim workflows run MarkerPlacer.
- Pinned [InverseDynamicsTool.cpp](https://github.com/opensim-org/opensim-core/blob/710e13be5/OpenSim/Tools/InverseDynamicsTool.cpp) conditionally performs `lowpassIIR` for nonnegative configured cutoff and creates `GCVSplineSet(5, ...)` coordinate functions. The expert note now connects sampling interval, filtering, differentiable trajectories, acceleration noise, and force synchronization. It does not imply the browser performs native ID or prescribe a universal filter cutoff.

Official pages and both pinned source pages were opened during this follow-up. Updated content imports and the full suite passes **124/124** (including six native-SO tests added by the native-fixture owner).
