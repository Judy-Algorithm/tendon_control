# Independent root-component review (pre-fix snapshot)

Scope: `server.mjs`, `workbench.js`, `contracts.js`, `request-editor.js`, `charts.js`. No UI/server files changed by this reviewer. Line numbers refer to the reviewed snapshot and may shift after fixes.

## Findings

1. **High: imported request values can enter HTML attributes unescaped.** `contracts.js:7` checks request keys, not numeric value types. `request-editor.js:7` interpolates `value`, `min`, `max` directly into an `innerHTML` string. A local parameter JSON containing an attribute-breaking string in `request.pulseRaw` is accepted by `validatePreset`. Fix: escape all interpolated attributes and reject non-finite/non-numeric request fields, including nested per-muscle values, before rendering. Do not rely on a later native-engine rejection.

2. **High: model identity is not verified end-to-end.** `server.mjs:14,27` fingerprints OpenSim only and only checks a supplied hash when truthy. MyoHand capabilities do not advertise a native fingerprint. `server.mjs:38` accepts a completed result without comparing its model hash to the submitted expected hash. Fix: require an expected hash, obtain MyoHand's fingerprint from the configured native runtime, and verify the completed result before returning success. This also detects a source file changed after server startup.

3. **High: geometry/run compatibility is unchecked.** `workbench.js:78–79` merges model and geometry JSON, and `:64` accepts run data without comparing model/geometry/run hashes or namespace/channel identity. An index configuration error can display mismatched anatomy under a native-result label. Fix: validate each asset's hash/ID and ordered channel lists before display; do not allow geometry metadata to overwrite model identity silently.

4. **Medium: numerical run failure is not reflected in MyoHand chart validity.** `charts.js:4` checks only frame flags. MyoHand numeric QC is run-level; a hypothetical `manifest.qc.numericPassed=false` run still has visually valid frames. `workbench.js:70` reports tracking/limits, but not this numeric failure. Fix: propagate numerical failure into plotting validity or explicitly label the entire displayed result invalid, while retaining raw values in JSON/CSV.

5. **Low: chart legend conflates failure with absence.** OpenSim failed frames are retained and greyed correctly, but `charts.js:48` calls them simply “missing”. Use “missing / failed QC”; preserve existing CSV validity flags. No failure samples were observed being deleted.

6. **Low: static file serving follows symlinks.** `server.mjs:58–60` verifies the resolved lexical path, not `realpath`. No exploit was attempted. An externally pointing symlink added to an allowed asset directory could bypass the root containment intention. Fix: realpath containment or a narrow public-asset allowlist.

## Checks that passed

- Loopback binding and shell-free fixed executable/argument dispatch are present; requests cannot provide model paths or shell commands.
- Foreign Host is rejected (403, raw HTTP header test). Foreign Origin is rejected (403). Unknown engine and unknown request fields are rejected (400).
- `.git`, encoded hidden-file and `/scripts/` access are rejected (403).
- No valid jobs were submitted during the rejection tests; the queue was not cancelled or interrupted.
- Existing stale parameter edits keep the old run's numerical data, display a stale warning, and JSON exports include pending parameters separately (`workbench.js:40,55,96`).
- Baseline matching checks model hash and full action/input request, removing parameter edits from the match signature. Different actions clear the comparison baseline (`contracts.js:14–17`, `workbench.js:65`).
- OpenSim failed frames retain raw exported values and validity flags; response curves break at invalid frames rather than joining across them.
- MyoHand combined global/per-muscle product limits and invalid initial states are rejected by its native runner. The editor correctly states multiplicative semantics; OpenSim per-muscle absolute values correctly take precedence over global multipliers.

One initial Node fetch Host-header probe returned 200 because that client did not transmit the custom Host as intended; the raw HTTP test confirmed the server guard. The local service changed from the raw-left to canonical model during review; the later capabilities response correctly advertised canonical hash `edba3896…`. No claim is made that the above findings remain after the leader's fixes.
