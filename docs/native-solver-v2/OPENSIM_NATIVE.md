# Full-hand native OpenSim evidence

> Historical raw-input audit. The active release now uses the versioned native LEFT repair
> and freshly recomputed fixtures described in `OPENSIM_CANONICAL.md`. Counts below are
> retained as the original raw-input record, not the active release inventory.

## Engine and model

OpenSim `4.4.1-2023-07-13-710e13be5`, native Python bindings. Source model SHA-256:
`45c45732788afd4fcc78b89c97cf7a5da51de82dcb735d480459ee4e8770207b`.
The selected user-supplied ARMS derivative has 43 Millard2012EquilibriumMuscles, 30 bodies,
26 coordinates, 23 independent coordinates, and three coordinate couplers. It is not MyoHand.
The model is not a personally identified human model.

The public inspector exposes native coordinate ranges, 43 sets of muscle parameters,
37 native wrap objects, body connectivity, and 32 exact referenced body meshes. Original
XML stays local. Geometry redistribution retains the ARMS non-commercial notice and
citation in `THIRD_PARTY_NOTICES.md` and the asset metadata. The original mesh polygons
are fan-triangulated for display only; vertex coordinates are not replaced by cartoon bones.

## Actual executed routes

1. Native coordinate demonstration → official AnalyzeTool / StaticOptimization → native
   inverse-dynamics reconciliation. Scale and IK are explicitly bypassed in these runs.
2. Five original atlas *angle/time* trajectories → the same native SO route. These preserve
   2.4 s, 121 samples, cubic easing and requested amplitudes. This is provisional angular
   mapping, not a claim of equal landmark trajectories between different geometries.
3. Native `Model.scale` (known uniform factor 1.05) → 90 noiseless synthetic body-marker
   observations → native InverseKinematicsTool → native ID/SO. It is an over-observed
   synthetic roundtrip, not MANO-21 fitting, inferred anthropometry, MarkerPlacer, or human validation.

### Recorded cases

| Case | Exported frames | Reduced-force/torque QC |
|---|---:|---:|
| Native index demonstration, baseline | 51 | 51 |
| Same motion, global Fmax ×1.10 | 51 | 51 |
| Same motion, global lopt ×1.05 | 51 | 51 |
| Same motion, global lTS ×1.05 | 51 | 51 |
| Native wrist demonstration | 51 | 51 |
| Declared index 20 N external force | 51 | 39 |
| Original atlas wrist positive | 121 | 121 |
| Original atlas wrist negative | 121 | 107 |
| Original atlas middle MCP negative | 121 | 121 |
| Original atlas ring MCP negative | 121 | 121 |
| Original atlas pinky MCP negative | 121 | 121 |
| Native Scale/IK synthetic roundtrip | 31 | 31 |

Initial set: 12 runs, 942 recorded frames, 916 pass the narrowly defined reduced-force/torque
checks; 26 unsuccessful frames remain in the same assets. No amplitude, parameter, or
reserve threshold is changed to hide failure. Samples from these demos are not a research dataset.

### Additional native-coordinate coverage

Separately from the original atlas, all 23 independent native coordinates were assigned a
new two-direction demonstration recipe: default ±0.25 rad, 2 seconds, 51 samples. Of these
46 requests, 35 lie inside native ROM and were actually run: 32 fully pass the recorded
reduced checks, three retain some failed frames. Eleven requests are out of ROM for this
**amplitude**, not nonexistent coordinates; they remain recorded and were not shortened.
CMC4's full range is only 0–0.2032 rad, so a separately named 0.1016-rad midpoint example
was added without replacing either unsupported ±0.25-rad request. All 23 independent
coordinates therefore have at least one actual native demonstration.

Final recorded inventory: **48 runs, 2,778 frames, 2,741 narrow-QC passes, 37 retained failed
frames**. The coincidence of 48 runs and 48 original atlas actions does not mean one-to-one
coverage: only five runs are mapped original atlas actions. The remainder are explicitly
named native demonstrations, parameter cases, overload, or Scale/IK selfcheck.

## Meaning of torque and validity

All 43 activation/force channels and all 23 independent generalized torque coordinates are
exported. The signed contribution is measured from the native inverse dynamics difference
between zero actuator force and one muscle's actual native SO force. A native virtual-work
reduction accounts for coordinate couplers. `qfrcActuator_Nm` is the muscle sum only;
`reserveTorque_Nm` is separate. Required torque includes native gravity, inertia and the
explicit external force where present.

Reserve actuators use optimal force 0.01 Nm and controls in [−1000, 1000], corresponding to
[−10, 10] Nm. They are penalized by the native squared-control objective. **These are not
certified low-reserve physiological solutions, and no 5% reserve rule is claimed.**

`valid` checks official output availability, absence of explicit native optimizer failure,
control bounds, <1e−5 Nm reduced balance residual, and <1e−4 N active-force reconstruction.
The original six replay outputs used the generic [0,1] activation range; their observed
values also respect the native [0.01,1] limits. Subsequent runner versions check native
per-muscle limits and reserve bounds directly.

Official SO also prints an acceleration-constraint norm around 0.05 rad/s² in these examples.
It is retained in `qc.nativeReportedAccelerationConstraintViolation`; small reduced torque
residual must not be relabeled as zero native acceleration error. The website should label
the badge **力矩对账**, not unconditional physiological/native-constraint certification.

Independent review by a different agent re-instantiated the native model and checked
`computeMomentArm × native SO force` for 43 × 23 × 3 entries: maximum disagreement with
the exported force-basis torque was 1.67e−9 Nm. A separate naïve path-length finite-difference
check did **not** agree (maximum 0.00510 Nm); its failed evidence is preserved. Independent
decomposition located the difference in the same-body capitate FPL P5→P6 segment: native
`GeometryPath.addInEquivalentForces` excludes same-body segments, while naïve path-length
differentiation counts the moving point's length change. The explained mismatch agrees to
3e−11 Nm. Thus naïve differentiation must not silently replace the native moment arm.
See `OPENSIM_INDEPENDENT_VIRTUAL_WORK_v3.json` and the review's source-line references.

## Geometry and path convention

World positions, native body transforms, wrap objects, and `PathWrapPoint.getWrapPath`
samples are from the same native state. Rendering uses these samples; a polyline is only an
approximation to the native curved path. Every frame reports both native path length and
the absolute polyline approximation error; typical maximum in these runs is below 0.1 mm.
Body meshes use the exact XML file reference and native scale factors. Scale/IK replay
loads its own scaled model/geometry assets, not the baseline geometry.

## Original-action coverage

The current atlas contains **48 actions in 17 groups**, not the older count of 46.
Five actions passed provisional axis/range audit and have native SO runs. Twenty-one are
unsupported under the unchanged native model (constructed/coupled display axes or native
ROM mismatch); 22 require additional axis registration. They remain visible as such.
No unsupported clip is replaced by a smaller demo while retaining its original label.

Axis audit compares native child-body angular response with the display axis in each
model's wrist/middle/index/pinky palm basis. Absolute cosine ≥0.9 is a declared screening
criterion, not a full landmark-registration proof. `opensim-coverage.json` includes this
diagnostic, original requested range, native range, status, reason and every run outcome.

## Scale/IK self-check

All-body uniform factor 1.05; native mass policy `preserveMassDist=True`; known scale supplied,
not recovered. Ninety noncollinear synthetic marker points and 31 frames. Native IK accuracy
1e−12. Measured marker RMS 5.2744e−7 m, maximum 2.7041e−6 m; largest independent-coordinate
error 3.0142e−4 rad. Gates were fixed at 1e−4 m marker maximum and 1e−3 rad coordinate maximum.

An initial implementation attempt failed and is retained privately. OpenSim's `inDegrees=yes`
IK file still leaves the model's two `Coupled`-motion wrist coordinates in native units;
universal degree conversion was incorrect. Final conversion calls the native
`SimbodyEngine.convertDegreesToRadians`, which converts only declared rotational coordinates.

## Supported native parameter edits

Global multipliers and per-muscle absolute edits for max_isometric_force, optimal_fiber_length,
and tendon_slack_length all update the native runtime model and trigger native recalculation.
Bounds are 0.8–1.2 times the local source model value, an engineering safety envelope **not**
a validated physiological population interval. Unknown fields, unknown muscles, dependent
coordinates, invalid timebases, and out-of-ROM requests are rejected. An actual request to
independently prescribe `CMC5_r1` was rejected and its failure manifest retained.

The local runner produces fresh native results. Public Vercel assets are reproducible native
replays; no browser curve interpolation is represented as a new native solve.

## Primary implementation references

- [ARMS source project](https://simtk.org/projects/arms_hand_model)
- [OpenSim StaticOptimization implementation, 4.4](https://github.com/opensim-org/opensim-core/blob/4.4/OpenSim/Analyses/StaticOptimization.cpp)
- [Native SO target, force capacity and acceleration constraints](https://github.com/opensim-org/opensim-core/blob/4.4/OpenSim/Analyses/StaticOptimizationTarget.cpp)
- [OpenSim inverse kinematics documentation](https://opensimconfluence.atlassian.net/wiki/spaces/OpenSim/pages/53090047/How+Inverse+Kinematics+Works)
- [Model scaling API](https://opensim-org.github.io/opensim-moco-site/docs/1.3.0/html_user/classOpenSim_1_1Model.html)

## Reproduction

Use a local OpenSim 4.4.1 Python environment and the licensed source model. Commands do not
overwrite existing nonempty run directories:

```sh
python scripts/native-v2/opensim_run.py --model MODEL.osim --request REQUEST.json --output NEW_RUN_DIR
python scripts/native-v2/opensim_prepare.py --model MODEL.osim --output NEW_BATCH_DIR --public-dir explainer/native-v2/data
python scripts/native-v2/opensim_coverage.py --model MODEL.osim --catalog explainer/native-v2/data/action-catalog.json --output explainer/native-v2/data/opensim-coverage.json --index explainer/native-v2/data/opensim-index.json
python scripts/native-v2/opensim_atlas.py --model MODEL.osim --output-root NEW_ATLAS_DIR --public-dir explainer/native-v2/data
python scripts/native-v2/opensim_scale_ik.py --model MODEL.osim --output NEW_SCALE_IK_DIR --public-dir explainer/native-v2/data
python scripts/native-v2/opensim_native_actions.py --model MODEL.osim --output-root NEW_NATIVE_ACTION_DIR --public-dir explainer/native-v2/data
python scripts/native-v2/opensim_meshes.py --model-json explainer/native-v2/data/opensim-model.json --geometry LICENSED_GEOMETRY_DIR --output explainer/native-v2/data/opensim-geometry.json
```

The Scale/IK geometry requires its own model inspector, `opensim-scale-ik-model.json`, as input
to the mesh exporter. Lossless `opensim_compact.py` changes only JSON whitespace, not values.
