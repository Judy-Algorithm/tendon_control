# PPT-to-explainer coverage audit

Source: `Tendon_Learning.pptx`, 12 slides, all 12 full-slide images visually
reviewed. SHA256:
`e554ff4161fbcccfc7b56cc9e7a2eaf345eea4de4c6ec73c0da79d033b422d3f`.
The deck is explanatory illustration, not a source of native simulation values.
No deck edits were made. This audit describes the current implementation,
not a claim that every OpenSim feature is simulated in the browser.

| Slide | Question in the deck | Website coverage |
|---|---|---|
| 1 | Motion/contact → internal mechanics → activation | OpenSim overview and IO cards; ID and SO separate torque from recruitment. |
| 2 | Same pose, different load | ID/SO sliders change force at fixed geometry; actual small native SO replay supplements the simplified example. |
| 3 | Body, joint, coordinate, marker, frame, muscle, force | Glossary and clickable geometry cover the main distinctions. Not a full component-tree inspector. |
| 4 | Scale → IK → ID → SO | Dedicated navigable stages; Moco presented separately as a trajectory formulation. |
| 5 | Why personalize geometry? | Scale overlays original geometry and shows changing bone/path geometry. |
| 6 | Generic model parameters and assumptions | Parameter glossary, three muscle-class comparison, Fmax/lopt/lTS lab. Ligament and every muscle-class setting are not exhaustively interactive. |
| 7 | Per-body anisotropic scale factors | Single-finger scale interaction illustrates the principle. Independent sx/sy/sz for every body is not implemented. |
| 8 | What can 21 landmarks determine? | Text distinguishes 21 points/63 scalars and geometric fitting from unknown physiology. Inferred width/thickness is not a separate visualization. |
| 9 | Which attachments move with the body? | Scale details explain joint frames, COM, attachments, wrapping and mass rules; displayed route follows teaching geometry. |
| 10 | Origin/insertion, via points, wrapping | Layered hand and geometric-route explanation; no native OpenSim wrapping solver is embedded. |
| 11 | What is recomputed versus separately assigned? | Scale details and parameter lab distinguish Fmax from component-specific length/mass rules. Ligament resting-length recomputation lacks dedicated interaction. |
| 12 | Static Marker Placement before motion IK | Optional Scale/IK expert details now explain static-reference averaging → weighted static fit → valid nonfixed-marker relocation → model-local locations retained for dynamic IK. Official documentation and pinned 4.4.1 MarkerPlacer source are linked. The sequence is explained, not interactively simulated. |

## Highest-value follow-up

The concise optional Marker Placement explanation is implemented under Scale/IK
and verified against official documentation plus the selected 4.4.1 source.
A possible later extension is a static-reference visualization with model marker
offsets before/after relocation, fixed/movable status, and the subsequent retained
marker configuration. The present single-axis proxy-point fit does not perform
native MarkerPlacer or IKTool computation; marker relocation is not represented
as ordinary dynamic motion IK or a mandatory step for every workflow.

## Evidence and terminology boundaries

- Website hand meshes and paths are teaching/display geometry, not registration
  of the native one-joint SO model or full MyoHand state.
- Native SO is three actual OpenSim 4.4.1 cases with a prescribed external force;
  it is not contact simulation or a 43-muscle hand validation. UI wording should
  say **known external load**, not imply contact was solved.
- The deck's pressing illustration must distinguish force exerted by the hand
  from the opposite force received by the hand before using arrow signs in ID.
- Native replay validates the recorded calculation only. Browser simplified
  sliders, native replay and conceptual Moco diagrams remain distinct tiers.

## Native SO render contract

`showNativeSO` reads the three `cases` at indices 0/1/2 and renders `activation`,
`load_N`, `requiredTorque_Nm`, `reserveTorque_Nm`, and `balanceMaxAbs_Nm`.
Those keys, activation bounds, physics reconstruction, independent analytic
optimum, preserved output rows and hashes are checked in
`tests/native-so.test.mjs`. These tests do not substitute for browser or
production-deployment checks.
