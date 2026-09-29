# Independent MyoHand native and workbench review

Reviewer: G, reviewing E's native runner and leader-owned workbench/charts/server. This is not self-certification of G's native-scene adapter or MANO page. Those still require another reviewer.

## Fresh native replay

`scripts/native-v2/verify_myohand_independent.py` does not import either native runner. It creates a fresh `myoHandPoseFixed-v0` with seed 11 in MyoSuite 2.11.6 / MuJoCo 3.3.0, applies the declared native gain/bias and activation/deactivation parameter changes, restores declared initial state, and replays the archived control sequence. It also independently checks raw-action logistic conversion, all effective parameter arrays, native channel/coordinate order and installed source hashes.

Compared at every exported frame: 23 positions, 23 velocities, 39 activations, 39 signed actuator forces and 23 generalized actuator forces. Tolerance is `1e-8` absolute in each declared unit, accounting for the export's ten-decimal rounding. Observed errors are at most `5.0e-11` in the cases below.

| Native record | Force multiplier | Response-time multiplier | Frames | Verdict |
|---|---:|---:|---:|---|
| Pulse baseline | 1.00 | 1.00 | 41 | PASS |
| Pulse strength edit | 1.25 | 1.00 | 41 | PASS |
| Non-catalog independent edit | 1.13 | 1.30 | 41 | PASS |
| Archived wrist-tracking controls | 1.00 | 1.00 | 101 | PASS |
| Browser-created live edit | 1.15 | 1.30 | 41 | PASS |

Evidence: `MYO_INDEPENDENT_REPLAY.json` (first four), `MYO_BROWSER_LIVE_REPLAY.json` (last case), and downloaded run `INDEPENDENT_BROWSER_LIVE115.json`. Input file hashes are retained in the verification records.

This verifies native **forward replay of the given controls**. It does not independently validate controller optimization, target tracking success, personalized physiology or biological muscle recruitment. The controller's success/failure metrics must remain separately visible.

Reproduce using the audited Python runtime:

```sh
python scripts/native-v2/verify_myohand_independent.py \
  explainer/native-v2/data/myohand-run-pulse.json \
  explainer/native-v2/data/myohand-run-pulse-force125.json \
  explainer/native-v2/data/myohand-run-independent113.json \
  explainer/native-v2/data/myohand-run-track-wrist.json \
  --output docs/native-solver-v2/MYO_INDEPENDENT_REPLAY.json

python scripts/native-v2/verify_myohand_independent.py \
  docs/native-solver-v2/INDEPENDENT_BROWSER_LIVE115.json \
  --output docs/native-solver-v2/MYO_BROWSER_LIVE_REPLAY.json
```

## Independent browser / local API checks

Used a separate headless installed Chrome via Playwright, not the leader's browser or viewport. Static frontend `127.0.0.1:4180`; a reviewer-owned server on loopback port 4182 had only the audited MyoHand runtime enabled. No public endpoint or tunnel was created.

- Myo native route loads 39 muscles / 23 coordinates without JavaScript errors.
- Baseline → force1.25 record selection updates parameter controls correctly.
- Editing force to1.13 marks the previous result stale without changing its numeric data. Reset returns to the actual saved value1.25.
- SVG download succeeds.
- OpenSim native route loads 43 muscles / 23 coordinates; return to original atlas succeeds without JavaScript errors.
- Actual live interaction: enter force1.15 and response1.3, submit, await native result, read updated controls, download JSON, then independently replay that downloaded result. PASS.
- Server rejects an untrusted Origin with403 and unsupported nested Myo request fields with400. Cancelling a newly submitted job returns200/cancelled.

The initial screenshots `screenshots/review-myohand-desktop.png` and `review-myohand-mobile.png` document the then-current UI, including the mobile overflow before its fix. They are diagnostic, not final publication screenshots.

## Findings communicated to leader

1. **P1, repaired:** UI initially nested Myo parameters under `request.parameters`, rejected by native runner. Leader changed Myo request construction to top-level validated fields. Actual browser live solve and independent replay passed after the repair.
2. **P1, repaired and independently smoke-tested:** Charts initially colored finite values from failed OpenSim frames. Leader added `validFrame` masking and CSV validity/failure flags. A fabricated software-test fixture (not research data) verified grey failed cells, missing torque bars and CSV failure flags. Failed rows remain present, not relabelled zero or success.
3. **P2, repaired and independently smoke-tested:** Saving one motion and changing to a different action could look like a controlled parameter comparison. Leader added `matchingExperiment` and resets baseline when action/input conditions differ. A software fixture verified that a force-only change remains comparable but a pulse→tracking change does not.
4. **P2, repaired and independently browser-tested:** 390px viewport initially expanded to446.3125px from intrinsic navigation width. After leader's fix, viewport/document/body widths all equal390px, with no JavaScript errors. `screenshots/review-myohand-mobile-fixed.png` records the first viewport; the navigation and chart retain intentional internal horizontal scrolling.
5. **P2, repaired, read-audited:** Full-parameter inspector now includes the current run's requested/effective values and model/engine provenance, not only baseline model fields.
6. **P2, repaired, unit-test checked:** Myo response plots now use positive `tension_N` labelled 拉力. CSV retains separately labelled signed actuator force and tension.
7. **P2, repaired, read-audited:** A 3D path click now calls `draw()` after changing the selected channel, updating response charts.
8. **P1, repaired and independently browser-tested:** OpenSim target angle0.25rad was invalid under native min−0.785398163397 and step0.01, preventing Solve. Continuous fields now use `step="any"`, retaining native bounds. Fresh browser audit finds zero invalid default request inputs.
9. **P2, repaired and independently checked:** Old pulse fixtures omit `controllerMetric`; current native results add its default `torque`. This irrelevant pulse-only difference cleared a valid baseline comparison. Comparator now normalizes defaults and omits unused pulse-controller fields. Baseline versus the actual downloaded live1.15/1.3 pulse is comparable after repair; tracking controller differences remain relevant.
10. **P2, repaired and independently browser-tested:** Failed stage numeric readouts now show the explicit failure message. The browser test used an intercepted synthetic failure flag solely as a software fixture, not research data. Pending-request JSON now includes request-editor fields: editing pulseRaw to0.65 exports pendingRequest0.65 while retaining the saved run's0.5.
11. **P3, repaired and independently browser-tested:** Both `#opensim/native` and `#/opensim/native` load the native route after optional-slash normalization.
12. **P2, repaired and independently browser-tested:** At390px with CSS zoom2 (a layout approximation of200% magnification, not browser-native zoom), initial view tools overlapped the live readout. Leader changed mobile to normal-flow tools→readout→scene→scrub. At normal and200% magnification, document width remains390px and these boxes no longer overlap. At200%, tools end at192px, readout occupies216–373px, scene373–1173px, scrub starts1197px; vertical scrolling reaches all controls. Final visual checks: `review-myohand-mobile-normal-final.png` and `review-myohand-mobile-200percent-final.png`. Earlier similarly named screenshots preserve diagnostic failure evidence.
13. **P2, repaired and independently test-checked:** Six canonical OpenSim records included audit-only `mappingAudit` or `purpose` in their archived request, conflicting with strict operational-request validation. `effectiveRequest` now removes only these known audit fields from solver inputs; original manifest/export provenance is unchanged. All8 workbench tests now pass, including every active record's matching model/geometry hashes, channel order and operational request. Scene/MANO/legacy-scene tests remain19/19, yielding27/27 combined.

The leader's marker-toggle integration was exercised on the initial Scale→IK record: frame15 at0.750s reports90 matched points and RMS0.54µm. The scene implementation itself remains G-authored and requires another reviewer's independent native-coordinate check. The initial LEFT model registration is being repaired as a separate versioned native model; `review-scale-ik-markers-before-canonical.png` is explicitly a pre-repair diagnostic, not final anatomical acceptance.

## Versioned canonical OpenSim display review

Read-only browser interception selected `opensim-canonical-finger-baseline.json` with `opensim-canonical-model.json` and `opensim-canonical-geometry.json`, while the public index was still being assembled. The model ID is `opensim-arms-left-repaired-v1-full43`, hash `edba389625549eab1c55d3772bfd702334a433cc380b05c913d1c20521293463`. The native model repair and regenerated solver records are B's work; E separately reviews the physical mirror consistency.

At frame25 /1.000s, the browser retains all43 paths and displays FDSI activation0.022 and force3.065N without JavaScript errors. The hand surface joints visibly register more closely than the original incomplete LEFT derivative. The scene consumes the canonical native mesh's recorded Y−1 localMatrix once; no additional scene-only mirroring or bone relocation was introduced. Screenshots: `review-opensim-canonical-baseline.png` and `review-opensim-canonical-wraps.png`.

Optional native wrapping reports11 rendered surfaces out of19 active names; unsupported native torus surfaces are explicitly omitted, not replaced by fabricated shapes. This is a visual/integration check, not an independent physiological claim or a substitute for B/E's native model audits.

After the canonical index became active, the Scale→IK row fetched exactly `opensim-canonical-scale-ik-roundtrip.json`, `opensim-canonical-scale-ik-model.json`, and `opensim-canonical-scale-ik-geometry.json`. All three model hashes agree: `720c6258a82e838545ce1bffbef5582a40069da441762fa8e681e8c503aa1883`. Mesh local scale is the native(1.05,−1.05,1.05), not the unscaled baseline. The record contains31 frames with90 observed/fitted pairs each. Frame15 displays0.750s and RMS0.54µm; playback updates markers and all43 paths without JavaScript errors. Desktop and mobile screenshots were visually inspected: `review-opensim-canonical-scale-ik-markers.png` and `review-opensim-canonical-scale-ik-mobile.png`. No extra scene reflection or apparent detached-joint registration defect was observed. The native physical mirror audit remains separately owned by E.

## Original atlas browser regression

`TEST_URL=http://127.0.0.1:4180 node tests/browser.mjs` passes17 joints, all48 actions, all68 atlas/OpenSim endpoint IDs, exact visible/rendered/label sets, individual path toggles, camera rotation, desktop1440px and mobile390px, with no browser errors. Screenshots are saved under `test-output/`.

The test previously raced animated SVG replacement: `locator.evaluateAll` could receive rect nodes detached between locator resolution and callback execution. The repair queries the current tree and snapshot atomically, after waiting for exact expected sets. Every expected label must still have an attached SVG owner and remain within bounds; missing labels are not silently filtered out.

## Remaining review boundaries

- This review did not certify OpenSim native solver numerical reproduction or the mesh-adapter implementation.
- Actual production deployment, deployed commit, final mobile layout, all chart exports and full route regression still belong to final release QA.
- Forward replay agreement must not be promoted to successful tracking: archived tracking cases can fail tracking thresholds despite numerically correct native dynamics.
