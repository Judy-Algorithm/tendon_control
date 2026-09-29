# Independent OpenSim muscle-torque check

An independently authored checker loads the exact native runtime model and never imports the exporter. It tests all 43 muscles × 23 independent coordinates at frames 0, 25 and 50 of the baseline finger run.

- **Direct native moment arm × native SO force: PASS.** Maximum disagreement with the exporter's inverse-dynamics force-basis torque is 1.67e-9 Nm, below the declared 1e-6 Nm threshold.
- Exported muscle sums agree exactly; the separate required − muscles − reserves balance identity agrees within 1e-15 Nm.
- Fresh native path lengths agree within 1.72e-10 m.
- **Naive total-path-length finite-difference torque: FAIL.** The largest stable difference is 0.0050957 Nm for FPL/wrist flexion, at both 1e-5 and 1e-6 rad perturbations. This failed check is retained, not relabelled as a pass.

The discrepancy has a specific explanation: FPL-P5 is a MovingPathPoint and P6 lies on the same capitate body. Their segment length changes with wrist flexion. The native OpenSim force routine excludes same-mobilized-body segments, while a derivative of the total path length includes this changing segment. Its derivative term accounts for the entire worst discrepancy to about 3e-11 Nm. This supports the native-force export, but warns against substituting `-d(total length)/dq` for the native moment arm for this template. See [OpenSim 4.4 GeometryPath::addInEquivalentForces](https://github.com/opensim-org/opensim-core/blob/4.4/OpenSim/Simulation/Model/GeometryPath.cpp#L358-L465) and [MomentArmSolver](https://github.com/opensim-org/opensim-core/blob/4.4/OpenSim/Simulation/MomentArmSolver.cpp).

Evidence is retained sequentially in `OPENSIM_INDEPENDENT_VIRTUAL_WORK.json`, `_v2.json` and `_v3.json`. The last contains the segment decomposition and both statuses. The reproducible checker is `scripts/native-v2/verify_opensim_independent.py`.

Scope: this verifies muscle generalized-force export and diagnoses a geometric derivative mismatch. It does not independently re-solve SO, prove optimality, certify the reported acceleration-constraint norm, or establish physiological reserve acceptance. Missing display-mesh warnings in the checker do not affect the native path/force model; geometry rendering is verified separately.
