# Independent pre-publication review — final inventory v002

This version adds the completed OpenSim opposite-hand mapping inventory and the new external-force glyph. `RELEASE_REVIEW_v001.md` is preserved as an earlier snapshot. **No new scientific/data-integrity blocker was found in this review. Actual production deployment and live-site acceptance remain the leader's separate responsibility.**

## Independently counted active records

| Engine | Active run files | Exported frames | Narrow numeric/frame checks pass | Failed exported frames | Channels per frame |
|---|---:|---:|---:|---:|---|
| MyoHand | 65 | 2,585 | 2,585 | 0 | 39 muscles; 23 coordinates |
| OpenSim | 56 | 3,746 | 3,657 | 89 | 43 muscles; 23 independent coordinates |

Every active file was loaded independently. Ordered model/run channels and model fingerprints matched; every frame retained complete activation, signed force, paths, muscle-by-coordinate torque and coordinate vectors. No duplicate active run filenames were found. **These checks do not mean all MyoHand target motions tracked successfully, or that all OpenSim frames have low reserves or physiological validity.**

The earlier archive is a full index snapshot, not merely the five superseded atlas entries. The reviewer initially applied an overly broad disjointness assertion to the whole snapshot, corrected it to the five `atlas` records, and verified that **none of those five old mappings remains active**. Unchanged non-atlas native demonstrations legitimately remain in both snapshots.

## Original-action coverage is separate from new native demonstrations

- MyoHand: 48 unique original-atlas action IDs, 12 mapped/executed and 36 unsupported. The 46 native coordinate-direction entries remain separate; their 34 available-direction demonstrations do not increase original-atlas coverage. Earlier and tuned tracking results remain distinct and include failed tracking cases.
- OpenSim: 48 unique original-atlas IDs, **14 mapped, 26 unsupported, 8 unresolved**. The active index and the versioned coverage file agree entry by entry. Mapping is an angular-correspondence check, not identical anatomy or fingertip trajectories.
- Of the 14 mapped OpenSim attempts, **10 have all 121 frames passing the declared narrow frame checks, 3 retain partial acceptance, and 1 timed out**. The three partial runs are ring PIP 120/121, index DIP 114/121, and middle DIP 67/121. No failing frames were removed.
- Ring DIP reached the 900-second limit at 900.416 seconds from its original attempt start. Its sanitized attempt manifest is retained, it has no active run file, and **no partial replay is presented as a complete trajectory**. Its 121 planned samples are not counted among the 3,746 produced frames. This timeout remains a failed/missing completion, not a success.
- The five superseded mappings are preserved in `opensim-canonical-index-before-atlas-v2.json`; they were not silently reassigned new action names or signs.

## External-load glyph: new independent check

The earlier “no force arrow” limitation is now superseded for records with declared OpenSim external-load metadata. `nativeExternalLoad` transforms the actual body-local application point through the saved body-to-Ground transform exactly once; the declared Ground force vector is **not** rotated again.

A fresh native OpenSim model was initialized read-only, without running static optimization or occupying a simulation worker. For frames 0, 25 and 50 of the canonical 20-N load case, native `findStationLocationInGround` exactly matched the exported-transform application point: maximum difference **0 m** at available precision. The force remains `[0, 0, 20] N` in Ground on `2distph`. Fourteen native-scene tests passed, including signed-vector, missing-field, zero-force, native-position and engine-exclusion tests.

The arrow uses a disclosed graphical scale of 4 mm/N, not physical displacement. Its origin is the actual application point. It is labelled **input external force**, not solved muscle force or inferred contact. No contact surface is invented. The glyph is omitted when metadata is missing, force is zero, or the engine is MyoHand. A failed muscle solve may still show its declared force input; that does not convert its failed activation output into a valid result.

## Comparison, exports and failure semantics

The earlier independent comparison review remains applicable: complete input/parameter matching, unchanged native numbers, two real sensitivity points only, preserved names/differences, and raw CSV values with units and validity flags. Bias is not relabelled passive force, partial torque components are not summed into a fake MyoHand balance, and OpenSim residuals use their own scale. Model-specific session history is rebound and checked on reload.

The server timeout is 900 seconds; timeout and cancellation cannot return a completed result. The separate batch timeout is now supported by the actual ring-DIP attempt record. This reviewer did not trigger a further live-server timeout or cancel another worker.

## Publication/privacy/license check

The text scan was repeated over current V2 assets, documents, scripts and tests. No actual private absolute path or common credential pattern was found. The only path-pattern match was the literal scan-pattern list in the preserved v001 review, not a private location. This does not certify screenshot pixels or unreported asset provenance.

Public data is approximately 461 MiB including preserved historical assets; no single file exceeds approximately 5.93 MB. Host deployment and first-load performance still require actual production checks. Model source XML and private full native logs are not redistributed in the V2 asset tree. Apache/MIT notices remain present, and the ARMS non-commercial condition and full disclaimer remain retained. The third-party notice now explicitly distinguishes the original 37-channel atlas from the full 39-channel native MyoHand workbench.

Known scientific limits remain visible: repaired OpenSim wrapping is not perfectly mirror-equivalent in all poses; exact moment arms must use native force transmission rather than blindly differentiating moving-point path length; low numerical torque residual alone does not certify acceleration accuracy, tracking, low reserves or physiology. Synthetic Scale/IK markers are not real-person validation.
