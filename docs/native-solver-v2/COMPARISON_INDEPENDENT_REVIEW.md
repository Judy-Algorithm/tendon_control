# Independent comparison and balance-chart review

Scope: `comparison.js`, its `workbench.js` integration, `balance-chart.js`, and numerical CSV export. Source review plus Node tests; no browser or new native solves in this review.

## Verified

- Offline “read matching record” uses the full non-parameter input signature plus the complete parameter map, not merely the coarse global slider value. Changes in pulse strength, initial activation, selected muscle, coordinate, duration and per-muscle parameters fail matching in independent tests. Wrong model fingerprints cannot produce a comparison manifest.
- Saved baseline/current names and requested/effective parameter differences are retained in the JSON comparison manifest. Baselines clear when the action/input signature changes. A pending edit does not rewrite the numerical result; exports distinguish pending requests from the retained run.
- Two-point sensitivity uses the two actual recorded native outputs. It does not interpolate, fit an optimum, or imply a dense parameter sweep. Multiple parameter changes are rejected. Actual sampled time is retained per row, and unavailable/failed values are null rather than zero. The selected point uses the nearest recorded frame; this is not a continuous-time solver evaluation.
- Live history stores the native result together with its model object. Reload uses that stored model and repeats model/channel verification. The live solve locks controls; accepted results are verified before entering session history.
- MyoHand balance plots show native signed actuator, constraint, passive and bias terms. Bias is correctly labelled gravity plus Coriolis/centrifugal terms, not passive torque. The chart explicitly disclaims a complete inertia/external-force balance and does not fabricate a residual from those four terms.
- OpenSim plots separately display required torque, muscle torque, reserve torque and the exported balance residual. Reserve is not counted as a muscle. Failed and missing values create line breaks and remain in the source records.
- CSV exports were rechecked after the leader's concurrent fix: `balance_residual`, `passive_torque`, `gravity_coriolis_bias`, and `constraint_torque` all equal their actual native source values with correct N·m units and validity flags. The initial export-gap observation was superseded by this successful check.

## Tests and scope

The four comparison tests and three balance-chart tests all passed:

```sh
node --test tests/native-comparison.test.mjs tests/native-balance-chart.test.mjs
```

Thirteen additional independent checks passed: six exact-input/parameter mismatch rejections, one model-identity rejection, two sensitivity CSV x/y/time/unit comparisons, and four native balance-field CSV value comparisons. No new blocker was found in this bounded review. Native scientific validity and full visual usability remain separate acceptance tasks.
