# Independent root-component post-fix review

The pre-fix findings remain in `ROOT_COMPONENT_REVIEW.md`. This follow-up reviews the patched implementation, not the final deployed site. No shared UI/server code was changed by this reviewer.

## Findings rechecked

| Original finding | Post-fix evidence | Disposition |
|---|---|---|
| Imported values entering unescaped HTML attributes | `request-editor.js:7` escapes field names, values, bounds and units. `contracts.js:10–27` checks numeric types, nested maps, vectors, channel names and allowed fields. Malicious attribute-string, non-finite number, invalid vector, HTML muscle-name and string-valued scale tests all reject before import. The same malicious numeric field receives HTTP 400. | Addressed; no browser injection attempt was needed. |
| Missing end-to-end model fingerprint | Myo fingerprint is read from the configured runtime with pinned engine versions; its source-file list matches the runner. Both engines reject absent and incorrect expected hashes with HTTP 400. The server stores the expected hash and withholds completed results whose reported fingerprint differs. | Addressed; completion-time mismatch guard was source-reviewed, not exercised by modifying a running native engine. |
| Unchecked geometry/run compatibility | Model/geometry identity is checked before merging; `acceptRun` calls `verifyNativeBinding`. Independent tests reject model hash, geometry hash and ordered muscle-channel mismatches. | Addressed at the reviewed loading paths. This is identity consistency, not independent anatomical correctness. |
| Run-level numeric failure shown as valid | Chart validity, scene validity and live readout receive the run-level `numericPassed` flag. A failed copy of a genuine record produces all-grey heatmap cells, no response data curves, invalid torque labels, and CSV rows that retain raw values with invalid flags. | Addressed. Scene/readout wiring was source-reviewed; this follow-up did not run a browser. |
| Legend conflates missing and failed | Heatmap legend now says “missing or did not pass checks”; torque missing labels likewise include failed checks. | Main legend addressed. Minor remaining wording: a grey heatmap cell's tooltip still says only “missing”; this does not alter raw export or legend semantics. |
| Static symlink root escape | `server.mjs:63` obtains realpath and checks containment before reading the resolved file. Hidden-file and script-directory HTTP requests continue to return 403. | Guard implemented and source-reviewed. No external symlink was created and no filesystem race test was attempted. |

## Executed checks

`scripts/native-v2/review_root_post_fix.mjs` executes 26 bounded checks: 16 pure contract/chart checks and 10 rejection-only HTTP checks against the loopback service. All passed. No accepted job was submitted, no queue cancellation was performed, and no heavy native solve was started by this review.

The machine-readable result contains source hashes and exact HTTP responses in `ROOT_COMPONENT_POST_FIX_CHECKS.json`. Reproduce from the repository root with:

```sh
node scripts/native-v2/review_root_post_fix.mjs docs/native-solver-v2/ROOT_COMPONENT_POST_FIX_CHECKS.json
```

The service advertised the canonical OpenSim fingerprint `edba389625549eab1c55d3772bfd702334a433cc380b05c913d1c20521293463` and MyoHand fingerprint `edfb415e6cc9efdd5be8ab98eb8d61779a01156d730a6d3a03cb39fa31c724dd`.

## Remaining boundaries

This is a bounded code/rejection review, not a penetration test or production-site certification. Native solver acceptance, parameter physiology, repaired-model wrap asymmetry, anatomical registration and scientific validity remain separate checks. The fingerprint establishes the declared source identity, not an assertion that every model or geometry quantity is physiologically correct. No new blocker was found in the six reviewed fixes.
