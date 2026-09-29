# Native joint-torque component chart

API: `jointBalanceChart(run, baseline, coordinateIndex)` from `explainer/native-v2/balance-chart.js` returns an exportable SVG. `jointBalanceSeries` exposes the exact reviewed native values for tests. Root workbench owns chart selection, PNG/SVG export and comparison authorization.

## Meaning

- OpenSim panel1: `requiredTorque_Nm`, `qfrcActuator_Nm`, `reserveTorque_Nm`. Panel2: the exported `balanceResidual_Nm`, not a newly constructed residual.
- MyoHand panel1: `qfrcActuator_Nm`, `qfrcConstraint_Nm`. Panel2: `qfrcPassive_Nm`, `qfrcBias_Nm`. Bias is labelled gravity + Coriolis/centrifugal, not passive force. The chart explicitly says these are not a complete inertia/external-force balance and must not simply be added as a residual.
- Both axes keep native seconds and signed N·m. Each panel has its own labelled vertical range; current and baseline share that panel's range. Field colors are fixed, current is solid/filled markers, baseline dashed/open markers.
- No absent inertia, contact, applied-load or residual term is fabricated. Missing native fields are explicitly marked as unavailable. Failed frames and whole-run numerical failures use `validFrame(f,run)` and create line gaps, never zero values or a line bridging the failure.
- Baseline requires identical model ID/hash and channel order. Mismatches are explicitly rejected from the chart; the full input manifest remains available in exported run JSON.

## Verification

`node --test tests/native-balance-chart.test.mjs`: exact signed values across actual OpenSim and Myo records; no invented Myo residual; explicit field absence; failed sample breaks; whole-run failure masks; model mismatch rejection; immutable source arrays; baseline dashes.

Rendered both engines in a separate headless browser with actual native records, at900×740 SVG size, then exercised the integrated workbench's baseline selection and balance chart menu. No JavaScript errors or SVG text outside the viewport. Both SVG exports (`myohand-balance.svg`, `opensim-balance.svg`) succeeded. At390px mobile width, the document remains390px and the362px chart container scrolls the900px SVG horizontally instead of shrinking scientific labels. Implementation screenshots: `screenshots/native-balance-myohand-implementation.png` and `screenshots/native-balance-opensim-implementation.png`.

This chart displays native model quantities. It does not establish physiological feasibility, successful tracking, or independent confirmation of every engine force term. The visualization skill informed preservation of units, missing-value gaps, shared comparison scales and rendered-label checks; no dataset or native values were altered.

E's independent physical source review approved the signed-term meanings, bias distinction, separation of OpenSim residual, and failure gaps, and reran the3 tests successfully. E separately reported to the leader that the shared CSV exporter must include every newly plotted native field; export integration belongs to the leader, not this module.
