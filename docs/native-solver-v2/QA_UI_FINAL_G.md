# Final bounded UI review — G

Reviewed on the local integrated site at `http://127.0.0.1:4180` using headless installed Chrome and Playwright. This is software/UI verification, not an additional native scientific experiment.

## Fixes

- Sensitivity SVG refresh now runs through the same frame synchronization path as scrub and playback. CSV and JSON use the same `currentSensitivity()` snapshot.
- Coverage preserves statuses and failure evidence while translating `not_yet_verified` and `TIMEOUT` into Chinese.
- OpenSim angle sensitivity is explicitly a **prescribed input angle**, not a forward simulated motion response. The distinction appears in the selector, SVG heading/metric and exported sensitivity metadata.
- On the first OpenSim load without an explicitly requested muscle, the selected muscle is the largest peak absolute native torque contributor for the selected coordinate over valid frames. All 43 channels remain available. Subsequent user selection is preserved.
- Parameter preset JSON includes the native units metadata.

## Actual browser checks

- Myo baseline named `原参数 QA`; exact-record lookup for force multiplier 1.25 selected the real existing record.
- At playback frame 11 / 0.11 s, SVG time, CSV time, exported JSON selection and native frame time agreed.
- Baseline overlay toggle and native balance chart rendered without page errors.
- OpenSim baseline versus Fmax 1.10 sensitivity displayed `规定角度（输入）` and retained that meaning in metadata.
- Initial OpenSim selected FDPI from native torque data. Manually selecting ECRL and switching parameter record preserved ECRL.
- Exported parameter preset included q/rad, force/N, torque/N·m, paths/m and time/s units.
- Updated original extension route `#opensim/native?action=index_MCP_flex:negative` fetched `opensim-canonical-atlas-v2-index-mcp-flex-negative.json`, not an archived predecessor.
- Mobile width 390 had document width 390 at normal layout and CSS `zoom:2`. The latter is a layout stress proxy, not native browser zoom certification.
- Actual coverage displayed pending and timeout states in Chinese. No index total was hard-coded in these checks.

## Native external-load display

`nativeExternalLoad()` accepts only explicit OpenSim effective load fields and a finite body-to-Ground transform. It applies that transform once to the body-local application point. The force vector is already in Ground and is not rotated again. Missing fields and zero force produce no glyph; no contact plane is created.

The orange arrow begins at the actual application point; its direction is the native Ground force direction. Display length uses a fixed 4 mm/N scale, disclosed in the focusable tooltip; it is not physical displacement. Labels identify the input force magnitude and receiving body. Input loading remains defined even when a solver output fails; output acceptance masks are unchanged.

Numerical tests cover rotation/translation, sign, immutability, missing fields, zero force, real canonical frames 0/25/50, and absence on MyoHand. Native-scene tests: **14/14 passed**. Workbench/comparison tests: **13/13 passed**.

Actual 20 N overload screenshot shows the load at its native application point. Foreshortening follows the true current camera and vector; the force is not rotated cosmetically toward the viewer.

## Screenshots

- `screenshots/sensitivity-playback-synced.png`
- `screenshots/opensim-sensitivity-prescribed-angle.png`
- `screenshots/balance-latest-review.png`
- `screenshots/opensim-native-external-load.png`
- `screenshots/canonical-v2-extension-mobile.png`
- `screenshots/canonical-v2-extension-mobile-zoom2.png`

This bounded pass did not generate a new live solve to test named session history; previously completed live replay verification and the leader's current live-solve QA cover that separate path. This document does not claim new production deployment verification.
