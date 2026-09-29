# Independent scientific QA — work package K

Reviewed: `explainer/main.js`, `math.js`, `content.js`, targeted scene code and native MyoHand JSON. Review date: 2026-09-30 (Asia/Shanghai).

## Checks actually run

- `node --test tests/explainer.test.mjs`: **17 / 17 PASS**.
- `npm test`: **124 / 124 PASS** at the follow-up checkpoint (101 existing + 17 scientific + 6 native-SO tests).
- Sources inspected include official OpenSim Scale/IK/ID/SO pages, pinned source for SO capacity and class-specific muscle behavior, Moco theory and APIs, MuJoCo 3.3.0 modeling/computation/API types, and MyoSuite.
- Default copy is short, every content source ID resolves, URLs are HTTPS on approved primary-source hosts, and explicit computation-tier language is present.

## Numeric results

1. SO educational allocation independently satisfies bound-constrained KKT conditions across **180 displayed slider combinations**. Its objective is no worse than an independently enumerated 101×101 feasible activation grid in six configurations.
2. Tests retain a substantial reserve under overload; they do not clip it to make the allocation look successful. Negative demand activates the antagonist; zero *total* demand gives zero allocation.
3. Zero *contact* load retains 0.020 N·m of prescribed gravity demand and nonzero allocation. The example converts millimetres to metres correctly.
4. Native MyoHand samples independently satisfy exported action sigmoid, active+passive force decomposition, force/tension sign convention, selected force×moment mapping, timestamps, and qpos-selected-joint consistency.
5. Twin interventions have identical exported initial positions and subsequent controls, distinct initial activations, and the reported 100-ms selected-joint separation is recomputed from the traces. Only the selected joint velocity is available in these JSON rows; full-qvel equality relies on the generator's separate check and is **not** independently inferred from this reduced export.
6. Display data remain 29 bone meshes and 37 enabled ROM paths; the search catalog has 43 OpenSim names; the native fixture has 39 muscle actuators and 23 coordinates. These counts are intentionally not pooled.
7. The optional three-parameter muscle lab conserves its prescribed 250-mm total length across 27 endpoint/midpoint combinations. Fiber length remains 70–150 mm; force is finite and bounded by activation × Fmax. Its independent Gaussian relation peaks at lF/lopt = 1, scales linearly with Fmax, and is explicitly not presented as an OpenSim constitutive formula or SO output.

## Findings requiring integration action

### K-01 — Native no-contact scene initially showed an external-force arrow

At first audit, `scene.js` classified MyoHand force/transmission/dynamics as `isForce`, then rendered `forceArrow` and `contactDot` using the generic `load=2` parameter and the external-force label. Native fixture contact count is zero. This could incorrectly teach that the replay includes that applied contact. Reported immediately to leader: restrict external contact arrows to OpenSim's simplified ID/SO example, or use a separately labeled, appropriately anchored actuator-force arrow for the MyoHand pathway.

Status at this document checkpoint: **source recheck PASS**. The scene owner restricts `showExternalForce` to the OpenSim ID/SO route, and only OpenSim produces the external-force annotation. This is a display semantics fix; the exported native arrays are not modified. Browser rendering remains separately checked by the integration owner.

### K-02 — Replay-angle display was replaced by a generic cosine while playing

At first audit, scene playback for `dynamics` and `integration` overwrote the selected native angle with an independent schematic cosine. Global schematic labels prevent a direct native-simulation claim, but this unnecessary divergence makes the visual relation harder to follow. Reported to leader: retain the supplied native selected-joint angle on MyoHand; reserve generic timeline animation for Moco.

Status at this document checkpoint: **source recheck PASS**. Generic cosine motion is now limited to OpenSim Moco; MyoHand retains the angle supplied by the parent/native trace. Its whole-hand visualization remains schematic, not a full registered native mesh replay.

### K-03 — ID scalar numbers use holding-demand convention

The scalar `load × lever + gravity` example is a prescribed *required holding torque* model. It should not be read as the signed sum of actual external moments, whose holding contribution has opposite sign. The expert view declares its quasi-static scalar assumptions and that it is not calculated from the displayed mesh. Recommended wording: external-load-induced **demand magnitude** instead of an unqualified signed external torque. Full vector sign verification is not claimed for this display.

Status: integration owner reports the holding-demand wording and signed scene-vector correction applied. Optional MarkerPlacer calibration and ID filtering/derivative details were additionally checked against official documentation and pinned 4.4.1 source; see `SCIENCE_AUDIT.md`. This follow-up changes expert content only, not native results or default numerical settings.

## Not certified by these tests

- Browser rendering, keyboard/touch interaction, live deployment, or screenshot appearance.
- End-to-end OpenSim Scale→IK→ID→SO on the displayed hand. Current browser math is deliberately a teaching reduction.
- Native Moco convergence or model interchangeability; class inspector changes explanatory content only.
- Personal physiological validity, natural-state prevalence, or measured-human generalization.
- An arbitrary cross-model mapping between visual paths and every native channel.

Scientific source/math review has no remaining critical blocker after the K-01/K-02 corrections. Scientific unit tests passing is necessary but not sufficient for publication; browser QA and deployed-commit verification remain the integration owner's responsibility.
