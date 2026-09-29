# Active canonical OpenSim release

> Correspondence v2 is active. The first five original-atlas mappings are archived as
> superseded. Their native numeric calculations are retained, but they are not valid
> correspondences to the displayed actions. Corrected runs were independently reviewed
> and recomputed; one additional valid mapping reached the declared solver timeout.

## Native model and repair

The active `opensim-index.json` references only newly computed canonical LEFT fixtures.
Original raw-input fixtures remain available through `legacy-raw-index.json`; neither the
source model nor those historical outputs were overwritten.

Engine: OpenSim `4.4.1-2023-07-13-710e13be5`. Canonical source SHA-256:
`edba389625549eab1c55d3772bfd702334a433cc380b05c913d1c20521293463`.
The model retains 43 Millard muscle actuators, 26 coordinates, 23 independent coordinates,
three native coordinate couplers, 30 bodies, and 37 wrap objects.

The original user-provided LEFT derivative mirrored body/joint anatomy but retained
unreflected RIGHT mesh vertices. An exact native mesh-transform audit found no export
error. The versioned repair, authorized before rerunning, applies the previously reviewed
LEFT adapter rules to the pinned source: 32 native body mesh scale reflections, the ground
thorax reflection, two moving-point Y splines, and 19 wrap quadrant values. No muscle
strength, coordinate range, reserve limit, or acceptance threshold was adjusted.
`OPENSIM_CANONICAL_REPAIR.json` records every change and source hashes.

Rendering uses the repaired model's own Mesh scale factors and body transforms. There is
no scene-only anatomical correction. Independent browser review checked the native meshes,
43 paths, and the separate scaled marker roundtrip assets.

## Executed inventory

- **56 complete native recordings, 3,746 frames, 3,657 narrow force/torque reconciliation
  passes and 89 retained failed frames.** 50 runs pass on every frame; six retain partial
  failures. A separate timed-out attempt has no complete recording and is not included
  in these frame totals.
- All 23 independent native coordinates have at least one actual native demonstration.
  The default recipe is a new, explicitly named two-second, 51-sample ±0.25-rad movement.
  Eleven out-of-range direction requests remain unsupported at that amplitude. A separate
  CMC4 midpoint example does not replace or relabel either out-of-range request.
- **14 of 48 original atlas actions** have independently reviewed angular mappings:
  ten complete recordings pass every narrow check, three retain failed frames, and ring
  DIP extension times out after 900.416 seconds. Twenty-six actions are unsupported at
  their original amplitude/coordinate definition, and eight still require registration.
  These disjoint counts distinguish mapping validity from native solver completion.
- Three same-motion native parameter contrasts change global Fmax ×1.10, optimal fiber
  length ×1.05, or tendon slack length ×1.05. Maximum activation differences from the
  baseline are 0.043936, 0.055547, and 0.076764 respectively. These are demonstrations,
  not estimated human population effects.

All 43 muscle channels and 23 independent torque components are exported at every recorded
frame. Failed native outputs are retained and visibly flagged, rather than removed from playback.
`OPENSIM_EXPORT_CHECKS.json` provides per-run frame counts and failed-frame indices.
The 43 non-atlas recordings are unchanged. The 13 completed corrected-atlas recordings
add 1,573 recorded frames, including 62 failed frames. The timed-out ring DIP attempt
retains its original logs and partial native files locally but exports no invented activation
sequence. The 900-second cap is measured from each original attempt's actual start evidence.

## Actual Scale → IK → ID/SO roundtrip

`opensim-canonical-scale-ik-roundtrip.json` has its own model and geometry overrides.
Native uniform `Model.scale` factor 1.05 is supplied, not estimated. Ninety noiseless body
marker observations over 31 frames are fitted by native InverseKinematicsTool, followed by
native ID/SO. Marker RMS is 5.2744e−7 m; maximum marker error is 2.7041e−6 m; maximum
independent-coordinate error is 3.0142e−4 rad. The unchanged gates are 1e−4 m and 1e−3 rad.
All 31 frames pass the narrowly defined force/torque reconciliation checks.

Observed and fitted marker coordinates are both exported. The scaled model SHA-256 is
`720c6258a82e838545ce1bffbef5582a40069da441762fa8e681e8c503aa1883`.
This is an over-observed synthetic self-check: it is not MANO-21 reconstruction, inferred
personal scaling, MarkerPlacer calibration, measured human tracking, or independent anatomy
validation. The artifact filename is a canonical alias; its executed request and cache key
remain unchanged from the actual native run.

## Scope of the checks and remaining limitations

### Original-atlas handedness correction

The displayed MyoHand reference is RIGHT and the native OpenSim template is LEFT. A polar
registration P between opposite hands has determinant −1; rotational axes are axial
vectors and transform as `det(P) P ω`, not as ordinary position vectors. The previous
proper-palm-rotation audit missed this distinction. A separate reviewer reproduced native
finite axes to 6.48e−12 and the finite-rotation reflection identity to 3.33e−16, and verified
all corrected trajectory times and amplitudes against the originals.

The corrected exclusive ledger contains **14 angular correspondences, 26 unsupported
actions (including four constructed/coupled axes), and eight unresolved registrations**.
The angular similarity threshold remains |cosine| ≥0.9, and no original ROM or timing is
changed. `OPENSIM_HANDEDNESS_INDEPENDENT.json` records the independent review. Existing
five correspondence recordings are archived rather than relabeled with new signs.
The archive index is `opensim-canonical-index-before-atlas-v2.json`; active coverage is
`opensim-canonical-coverage-v2.json`. All new original clips preserve 2.4 seconds, 121
requested time points, and the complete original angle trajectory. The slowest completed
clip, middle DIP extension, took 588.609 seconds. This variable native runtime motivated
the declared 900-second local-service cap; it did not change SO iterations or tolerances.

Official StaticOptimization jointly allocates all muscles with native muscle physiology,
activation exponent two, and 23 explicit reserve actuators. Reserve optimal force is
0.01 Nm with controls bounded at ±1000 (±10 Nm). No low-reserve or 5% physiological claim
is made. Per-frame validity checks native output availability, native optimizer status,
activation/reserve bounds, reduced torque residual <1e−5 Nm, and native active-force
reconstruction error <1e−4 N. The UI therefore labels this **力矩对账**, not complete
physical or physiological validity.

Independent native reconstruction found acceleration mismatch despite small torque error:
the reduced system has a mass eigenvalue near 7.54e−8 kg m². At three inspected baseline
frames, reconstructed acceleration mismatch norms were approximately 0.047, 1.874 and
1.859 rad/s². The small reduced torque residual predicts these discrepancies through the
inverse reduced mass matrix. See `OPENSIM_CANONICAL_ACCELERATION_DIAGNOSIS.json`.
Static-optimization replay is not an excitation-driven forward-motion validation.

Some flexed poses retain FDPI wrapping/path asymmetry relative to the mirrored RIGHT
template. A separate FDPI segment-range diagnostic did not remove the discrepancy and
did not show the suspected unintended domain crossing. That diagnostic version was **not
promoted**. Native v1 paths are preserved; no anatomical mirror-equivalence is claimed.
See `OPENSIM_FDPI_DIAGNOSTIC_SUMMARY.json`.

Native `computeMomentArm × force` independently agrees with the exported force-basis
torques. A naïve path-length derivative need not agree for this model's moving points and
same-body path segments; its failed and explained diagnostic remains preserved.

Public Vercel content is native precomputed replay. The separately configured local native
service can recompute edited parameters; the browser does not claim to execute OpenSim.
ARMS mesh notices and citations remain in `THIRD_PARTY_NOTICES.md` and asset metadata.

## Reproducible checks

Run `node --test tests/native-opensim.test.mjs` and, in the native Python environment,
`python scripts/native-v2/opensim_check.py`. The latter checks all request/cache identities,
channel dimensions, finite values, muscle torque sums, reconciliation identities, accepted
bounds, and native parameter contrasts. These are author-side export checks, distinct from
the separately recorded independent engine checks.

### Request fingerprints

Archived/native replay keys remain unchanged: absence of `cacheKeyVersion` means legacy
version 1, which binds source model, exact request, and engine version. Future native calls
use version 2 and additionally bind the adapter file SHA-256 captured at import, explicit
numerical protocol, and NumPy version. The protocol declares reserve settings, native SO
settings, initialization/coupler policy, spline differentiation and force-basis reduction.
`opensim_cache_check.py` verifies metadata sensitivity without executing a new experiment.
This change does not retroactively claim that historical cache keys included the adapter.

`OPENSIM_ASSET_HASHES.json` hashes 65 active index/model/geometry/replay/attempt assets;
old raw and superseded correspondence assets are retained separately.
