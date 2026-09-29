# Independent canonical-left review

## Pinned source and scope

- Immutable supplied LEFT source: `45c45732788afd4fcc78b89c97cf7a5da51de82dcb735d480459ee4e8770207b`.
- Native RIGHT development template: `9a88909ca27da9397abe22599e51ae9699162bdf274f65d2a83d7b02793b24cc`; both available reference copies agree.
- Previously reviewed `left_adapter.py`: `a4e3e4550ce61fb42fc0c56317fd836ca8536f0eb17cc6529195d34546519e38`.
- Canonical LEFT v1: `edba389625549eab1c55d3772bfd702334a433cc380b05c913d1c20521293463`.

The implemented repair matches the existing adapter's mesh reflection, two moving-point Y splines (APL-P6/FPL-P5), 19 wrap half-spaces and ground thorax asset convention. It does not fit parameters, change ROM or apply the separate historical FDPI wrap-domain adapter. The raw source and prior runs remain separate evidence.

## Independently verified

Fresh right, raw-left and canonical-left native models were loaded without importing either repair or export implementation. Three poses were checked: neutral, wrist flexion/deviation, and a flexed index/thumb configuration.

- Canonical versus raw-left body kinematics are unchanged exactly.
- Reflected-right body transforms, fixed/moving attachment positions and native mesh vertex positions agree to below 1.3e-16 in the sampled tests. Raw moving-point mirror errors reached 17.6 mm before repair.
- Native wrapping-object transforms agree below 1e-15; every canonical half-space agrees with reflected-right semantics. Uppercase/lowercase quadrant aliases are equivalent.
- All 43 muscles retain their original maximum isometric force, optimal fiber length, tendon slack length and pennation.
- Exported mesh registration independently checks all 59,522 vertices of 32 meshes against original VTP coordinates and native scale factors, at three saved baseline frames. Local vertices, scale matrices, body transforms and world vertices match exactly. No fitted alignment or cosmetic gap filling is involved.
- Canonical baseline and global-force×1.10 runs independently match `native computeMomentArm × SO force` against exported inverse-dynamics force-basis contributions for all 43×23 entries at three frames. Maximum difference is below 1.79e-9 Nm.

## Remaining failure retained

Neutral and wrist-pose path lengths mirror to machine precision. In the sampled flexed index pose, **FDPI differs by 28.93 mm** between canonical-left and right; all other muscle lengths agree. The mirror repair therefore passes its declared rules and registration checks, but does not establish unique or mirror-identical native wrapping across all poses. The separate FDPI domain correction has not been silently added. Its trajectory, geometry and solver outputs must not be described as a universally validated anatomical path.

The known total-length-derivative versus native-force distinction also remains: the FPL same-body moving segment contributes a derivative term that native force application excludes. Canonical baseline/force×1.10 discrepancies are 0.01165/0.01282 Nm, explained by that segment to approximately 1e-11 Nm. Direct native moment-arm agreement passes; naive derivative agreement remains explicitly failed.

Small torque residual also does not imply a small acceleration discrepancy. A fresh native forward acceleration check applies the recorded canonical SO muscle and reserve forces at three recorded states. Acceleration-difference norms are 0.0473, 1.8743 and 1.8586 rad/s², while corresponding reduced torque residuals are at most 3.00e-7 Nm. The reduced mass matrix has a minimum eigenvalue of about 7.54e-8 kg m². Projecting the torque residual through that matrix predicts the native acceleration discrepancy within 2.46e-8 rad/s². This establishes the conditioning explanation, not a new success criterion: the acceleration warning remains, and numerical-Nm acceptance must not be promoted to acceleration-consistency acceptance. The printed SO optimization norm and this reconstructed norm are separately reported, not assumed identical.

## Evidence

- `OPENSIM_MIRROR_INDEPENDENT_v2.json`: repair/registration PASS; sampled complete path mirror FAIL (overall PARTIAL). The first file retains an initial validator case-sensitivity error; v2 changes only that checker logic and adds separated statuses.
- `OPENSIM_CANONICAL_MESH_INDEPENDENT.json`: PASS, exact native vertex/transform registration.
- `OPENSIM_CANONICAL_BASELINE_INDEPENDENT.json` and `OPENSIM_CANONICAL_FMAX110_INDEPENDENT.json`: direct native moment-arm PASS, naive path-derivative FAIL with decomposition.
- `OPENSIM_CANONICAL_ACCELERATION_DIAGNOSIS.json`: fresh native force replay and mass-matrix explanation of acceleration versus torque residual.
- Reproduction scripts: `verify_opensim_mirror_independent.py`, `verify_opensim_mesh_independent.py`, `verify_opensim_independent.py` under `scripts/native-v2/`.

These checks concern native implementation consistency. They do not certify physiological model accuracy, clinical validity, SO optimality or reserve acceptability.

## Standalone native SO reproduction

The separate `verify_opensim_so_standalone.py` constructs a fresh full-43-muscle model, independently adds the declared 23 reserve actuators, generates the request's minimum-jerk coordinates, invokes native `AnalyzeTool`/`StaticOptimization`, and compares results only after solving. It imports no author exporter or repair module. Canonical baseline and global Fmax×1.10 each compare all 51 frames.

| Independent case | Maximum activation difference | Maximum reserve-torque difference (Nm) | Maximum muscle-force difference (N) | Maximum squared-control objective difference |
|---|---:|---:|---:|---:|
| Baseline | 3.30e-10 | 2.12e-14 | 4.04e-8 | 7.80e-13 |
| Fmax ×1.10 | 7.39e-12 | 1.17e-14 | 1.01e-9 | 7.78e-13 |

Both independently reproduce the native tool-return status and empty explicit-failure-time list. Both PASS thresholds declared by the standalone checker before execution. Objective comparison sums squared muscle activations and dimensionless reserve controls (native exponent two). Native motion, states, runtime models, logs, controls, activations and force outputs are retained privately with hashes in the public summaries `OPENSIM_STANDALONE_BASELINE.json` and `OPENSIM_STANDALONE_FMAX110.json`. The native acceleration warnings and physiological interpretation remain separate limitations; repeatability is not proof that those constraints vanished.
