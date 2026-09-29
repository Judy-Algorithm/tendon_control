# Independent pre-publication review — snapshot v001

Status: **reviewed with an outstanding final OpenSim index refresh**. This document is not production-deployment acceptance. The new opposite-handedness action reruns are still being completed; their final counts must be checked in a subsequent version rather than inferred from candidate mappings.

## Scientific boundaries

- Native MyoHand has 39 muscle-actuator channels and 23 generalized coordinates; native OpenSim has 43 muscles and 23 independent coordinates. Complete channels were checked in every currently indexed frame, not only the selected highlighted muscle.
- Snapshot: 65 indexed MyoHand records / 2,585 displayed frames and 48 indexed OpenSim records / 2,778 displayed frames; no missing activation, force, path, torque-contribution or coordinate-vector channels were found. Counts are record/frame inventory, not independent subjects or successful physiological tests.
- Both engines retain a 48-entry original-atlas action ledger. MyoHand additionally lists 46 native coordinate directions separately; the 34 newly generated available-direction demos are not credited as original-atlas reproduction. MyoHand's 12 mapped original actions include unsuccessful tracking cases and their earlier versions.
- The OpenSim index still contains the previous five provisional mappings in this snapshot. The independently reviewed opposite-hand axial-vector correction permits 14 candidate angular mappings, but only actual completed reruns may be promoted. Previous runs must be archived as superseded, not relabelled.
- Baseline comparisons require the same declared model and full non-parameter input signature. Sensitivity plots contain two actual native computations, not interpolation or an optimum search. Multiple changed parameters cannot produce a one-factor plot. The point-selection operation uses a saved frame, not a new native evaluation at an arbitrary continuous time.
- MyoHand torque charts label bias, passive, actuator and constraint terms separately and explicitly do not claim complete dynamic balance. OpenSim reserve is auxiliary torque, not muscle activation. All failed or missing samples retain validity metadata and raw numerical exports.
- The live compute service is local-only. The Vercel frontend can replay real existing computations; it cannot execute arbitrary native simulations without a configured backend. Parameter changes alone do not constitute a fresh solve.

## Remaining teaching/geometry limitations

- Native 3D currently does **not** draw the external contact application point or force arrow. OpenSim's fixed distal-phalanx local point `(0, −0.012, 0) m` and world `+Z` force direction are specified in the request editor and numerical request, not visualized as a verified arrow.
- Original display geometry and native OpenSim anatomy are distinct, opposite-handed models. Angular mapping is not full spatial landmark equality. Known repaired-model wrapping asymmetry remains disclosed; no display-side reshaping conceals it.
- Numerical torque balance, native optimizer status, tracking accuracy, soft joint limits, low reserves and physiological validity are different checks. They must not be collapsed into a single success claim.
- Scale/IK uses synthetic markers and known scale; it is not evidence of real individual recovery. The 3D overlay uses unchanged native world coordinates and does not enlarge differences.

## Publication data and licenses

- The V2 asset/document/script/test text scan found no actual `/Users/`, `/home/`, `file://`, private-key marker, GitHub-token pattern or API-key pattern. This is pattern-based text review, not a claim to certify every image pixel or identify all possible secrets.
- No `.osim`, `.sto`, `.mot`, binary subject-array or raw mesh source files occur in the public V2 asset/document trees. Public JSON contains sanitized native output and source hashes; large private native logs and runtime models are not part of these public trees.
- Generated data occupies approximately 455 MiB at this snapshot. Largest individual asset is approximately 5.93 MB. A final host build/deployment must still be tested; this review does not imply a hosting-size guarantee.
- `LICENSE-MYOSUITE` and `LICENSE-THREEJS` remain present. ARMS attribution and its explicit non-commercial condition/disclaimer remain in `THIRD_PARTY_NOTICES.md`. Only the inaccurate scope of its 37-channel sentence was edited: it now explicitly applies to the original atlas, while the separate native workbench displays all 39 channels including PT/PQ.
- No company-private asset source is declared in the inspected new files; existing public upstream model provenance remains visible. This audit cannot substitute for undisclosed provenance evidence.

## Timeout/cancellation handling

The local server now allows up to 900 seconds per native job. The timeout records an explicit error, kills the native process, and results in failed status; completed-result export is withheld. A cancelled running or queued job retains cancelled status and cannot be returned as complete. Native logs are retained for started jobs; a queued cancellation has no solver log because no process started. These are source-reviewed branches; this reviewer did not deliberately consume 900 seconds or interrupt another worker to test them.

## Acceptance still pending

1. Final corrected OpenSim original-action ledger and its complete/partial/timed-out counts.
2. Final cross-file/source-hash check after the last code/record update.
3. Leader's production commit/deployment confirmation and actual live-site tests.

Earlier independent reviews remain unmodified: `ROOT_COMPONENT_REVIEW.md`, `ROOT_COMPONENT_POST_FIX_REVIEW.md`, `COMPARISON_INDEPENDENT_REVIEW.md`, and `OPENSIM_HANDEDNESS_INDEPENDENT.json`.
