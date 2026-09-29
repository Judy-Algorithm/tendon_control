# F/G native scene and MANO principles

## Scope and interfaces

`explainer/native-v2/native-scene.js` exports `NativeScene` (also default).

```js
const scene = new NativeScene({host, onSelect});
scene.setModel(model); // Optional licensed model mesh asset, no legacy atlas.
scene.setRun(run);
scene.setFrame(frameIndex, muscleIndex, coordinateIndex);
scene.setWrappingVisible(true); // Actual active native wraps only.
scene.setMarkersVisible(true); // Exported observed/fitted pairs, if present.
scene.setOverlayRun(baseline); // Optional native baseline paths in this camera.
scene.setView('hand'); // 'all' fits every exported path, including forearm.
scene.onCameraChangeSubscribe(camera => otherScene.setCameraState(camera));
scene.getDiagnostics();
scene.dispose();
```

The scene never solves physics. It displays the exact selected saved frame, not interpolated activation or a generated pose. Every channel in `run.muscleNames` has a corresponding line; invalid/missing paths remain explicitly missing. Path selection returns `{kind:'muscle', index, name}`. It does not import old `MODEL`, `ATLAS`, `FITTED_ROUTES`, kinematic rigs, or display aliases.

Native model schema: `meshes[{id, vertices, faces}]`, `geoms[{id, bodyId, meshId, localPos, localQuat}]`, `bodies[{id,name}]`. Coordinates are metres. MuJoCo quaternions are wxyz. A displayed vertex is transformed by `T_world_body * T_body_geom * vertex_mesh`; OpenSim can instead provide row-major `frame.bodyTransforms[bodyId]` and `geom.localMatrix`, plus explicit `scaleFactors`. Compiled mesh vertices are not rescaled a second time.

Native frames: `paths[muscle][point][xyz]`, `bodyPos[body][xyz]`, `bodyQuat[body][wxyz]`, activation/force/time arrays. Positive Myo `tension_N` is labelled 张力; signed actuator force is not silently relabelled as positive tension. Wrapping surfaces only use actual model geoms and selected-frame active wrap IDs. No fake sphere or fabricated arc is introduced. The previous detached illustrative sphere in `explainer/scene.js` was removed.

All local buffers, Three resources, controls, observers and DOM elements are disposed on unmount. Updates do not create independent animation loops. Camera synchronization suppresses feedback callbacks. Full paths remain present when the optional hand-focused camera crops upstream anatomy. `setView('all')` restores full extent.

### Activation and wrapping display update

All native paths use the same fixed 0–1 activation color mapping, including comparison panes. Selected paths are drawn thicker but retain their true activation color; thickness is a selection cue, not anatomical diameter. Failed frames, missing activations and activations outside [0,1] are grey. Failed-frame captions explicitly say there is no valid activation result. The legend is shared and never automatically normalized to make a weak result look stronger.

OpenSim `WrapEllipsoid` and `WrapCylinder` surfaces are now derived directly from exported dimensions and body-local transforms and gated by the frame's `activeWrapNames`. Cylinder local Z orientation and full length are verified in [official WrapCylinder.cpp](https://github.com/opensim-org/opensim-core/blob/main/OpenSim/Simulation/Wrap/WrapCylinder.cpp#L87-L101); ellipsoid dimensions are radii, as declared in [WrapEllipsoid.h](https://github.com/opensim-org/opensim-core/blob/main/OpenSim/Simulation/Wrap/WrapEllipsoid.h#L46-L47). The current OpenSim exporter does not provide torus radii, so these surfaces are not invented: the caption reports shown/active surface counts and unsupported remainder. Paths still contain the actual native wrapping samples independently of optional surface display.

OpenSim hand framing uses actual named bodyTransforms (proximal_row, 2proxph, 5proxph and 3midph), not a fixed assumed global orientation. The hand camera excludes the forearm from its fit but does not modify or delete any native path.

### Optional baseline path overlay

Call `setRun(current)` first, then `setOverlayRun(baseline)` to display baseline paths as teal dashed lines in the same native world frame. The current native surface and activation colors remain unchanged. This is a path overlay, not a second anatomical mesh or a baseline activation heatmap. It does not align, translate, mirror, stretch or amplify either trajectory. Existing synchronized two-pane comparison remains the default workbench route.

Every later `setFrame` chooses the nearest **recorded** baseline time; no pose interpolation occurs. Outside the baseline time span, the ghost is hidden and the caption explicitly reports that no baseline record is available. An optional `setOverlayRun(baseline,{frame:12})` locks a specific saved frame and labels its timestamp as a specified frame. `setOverlayRun(null)` removes all overlay paths and legend; `setRun(...)` always clears the old overlay to prevent stale comparisons.

The adapter requires matching model ID/hash plus identical muscle and coordinate ordering. Workbench still owns the stricter controlled-experiment comparison check. Failed baseline frames, including whole-run `qc.numericPassed=false`, use grey dashed paths. Missing paths are retained as missing counts. Only actual exported world coordinates are uploaded to geometry buffers; shared 0–1 current-activation scaling is preserved. The overlay is not selectable independently; clicking still selects the current run's muscle path.

Two additional tests cover frame alignment/no endpoint clamping, identity rejection, exact baseline buffer coordinates, immutable source records, current-color preservation, failure masks, and resource removal. Browser implementation smoke uses real Myo pulse baseline versus force×1.25 at0.300s; screenshot `screenshots/native-overlay-myohand-implementation.png`. It found no JavaScript errors and verified removing the overlay empties its group and hides its legend. This self-check is not independent scientific certification; E is assigned the separate review.

E subsequently reviewed the overlay source independently and approved its scientific display semantics: identity/channel checks, identity world-coordinate group, no transforms or amplification, declared nearest-time selection, explicit out-of-range/failed records, and immutable raw arrays. That review did not claim independent browser inspection; the implementation/browser checks above remain separately attributed.

### Native markers and coordinate axes

When enabled, paired `observedMarkers_m` and `fittedMarkers_m` are rendered at their actual world positions: observed blue wire dots and fitted gold dots. Residual segments join the exact pair without magnification. The caption reports the number of valid pairs and RMS Euclidean error in micrometres; missing pairs are explicitly counted. The Scale→IK roundtrip currently exports 90 pairs per frame. Dot size is a visibility annotation, not marker measurement uncertainty or anatomical size.

The selected Myo coordinate axis uses its native `jointPos` and `jointAxis`, with a fixed-length display segment. No OpenSim joint axis is inferred when the export lacks it. These overlays do not modify native geometry, trajectories, or solver results.

## Native geometry checks

Runnable checks: `node --test tests/native-scene-mano.test.mjs tests/explainer-scene.test.mjs`.

- All 39 Myo muscle paths, across every pulse frame, are compared to native tendon length. Existing exported arcs use dense native geometry samples; polyline error is below 2 micrometres in this test.
- All 43 OpenSim channels are retained. Initial straight tangent-chord export had a 1.186 mm maximum mismatch (FDSI). This was reported to the native exporter, which added actual `PathWrapPoint.getWrapPath` samples. Native OpenSim samples remain finite chords of a curve, so the test reconciles each measured discrepancy to the explicitly exported `pathPolylineApproximationError_m`. It does not assert an exact curved length for a coarse polyline. Native actor physics is unchanged.
- Wxyz body + geom transforms are tested with a known 90-degree rotation and translation.
- All 29 native Myo mesh geoms must have actual source meshes and valid first/last frame body transforms.
- Unknown or invalid paths are reported as missing, never zero activation or zero length.
- Old teaching-view immutable/reset/IK/force-vector regressions remain tested.

These are implementation checks. Independent native review and actual browser visual acceptance remain the leader/reviewer’s responsibility, not self-certified here.

## MANO principles (independent page)

`mountMano(host)` returns `{dispose, setStep}`. It lazy-loads scoped `mano.css`. Steps are shape / pose / deform / keypoints. β and θ are distinct branches that combine before the surface output; the UI does not imply a serial muscle inference chain. Every illustration says it is a procedural explanatory drawing, not native MANO output.

No MANO `.pkl`, mesh, blend-shape array, learned joint regressor or skinning weight is embedded or distributed. The illustrative 21-point hand is original procedural geometry; shape and pose inputs are explanatory controls, not real beta coefficients or a personal parameter fit. Pose preserves segment lengths. Shape changes correlated dimensions; the page explicitly explains that learned β components are not isolated bone-length sliders.

Verified sources (2026-09-30):

- [MANO official project](https://mano.is.tue.mpg.de/), Romero, Tzionas and Black (2017): hand shape, articulated pose and non-rigid pose-dependent surface effects.
- [Official license](https://mano.is.tue.mpg.de/license.html), License Grant / No Distribution: third-party redistribution requires permission. Therefore no native model assets are published by this page.
- [Official-team implementation, MANO class](https://github.com/vchoutas/smplx/blob/main/smplx/body_models.py#L1393): 15 local hand joints, separately parameterized global orientation; PCA is optional/configurable. Do not call all interfaces “21-dimensional MANO”.
- [LBS implementation](https://github.com/vchoutas/smplx/blob/main/smplx/lbs.py#L191-L231): shape blend → shape-dependent joints → pose corrections → joint transforms → weighted skinning.

The common 21-point application convention adds five fingertips to 16 joint positions, then may reorder them. It is not a universal native MANO output contract; users must check their wrapper, point order, frame and units. The page uses “21 × 3”, not “21 coordinates”. MANO itself does not solve muscle activation.

## Remaining limitations

- Native surface availability depends on permitted engine mesh exports. No substitute anatomy is used if assets are missing.
- OpenSim native arc sampling has a disclosed chord approximation; exact numerical path length remains the engine field.
- Browser Three coordinates use Float32 rendering buffers; source data and diagnostics remain JavaScript double precision.
- MANO is an interactive principles diagram, not a MANO runtime or trained shape/pose estimator.
- No screenshot is a substitute for native engine numerical reproduction; independent review is required.
