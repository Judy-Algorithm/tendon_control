# Native OpenSim SO teaching replay

`explainer/fixtures/opensim-so-native.json` is an actual OpenSim 4.4.1
StaticOptimization export, **not the website hand**. Its tiny purpose-built
model, prescribed motion, logs, activation/force storage files are preserved in
`native-so-evidence/`. Source generation is
`scripts/explainer/generate_opensim_teaching.py` with `--output`.

## Visible scope and controls

Label this `1关节 · 2肌肉教学模型 / 原生 SO 回放`. It is a 0.3-m horizontal
lever with mass 1 kg and COM 0.15 m from the hinge. Two straight-path opposing
Millard2012EquilibriumMuscle actuators have Fmax 100/80 N, optimal fiber length
0.1 m, tendon slack length sqrt(0.02)-0.1 m, zero pennation. A reserve actuator
has optimal force 0.01 Nm, control bounds [-20,20], hence torque bounds ±0.2 Nm.
No subject physiology, hand morphology, or personalized scaling is claimed.

Three selectable **recorded** loads: 0, 2, 4 N downward at 0.3 m. Angle,
velocity, acceleration are zero. Gravity is downward 9.81 m/s². Required net
torque is **1.4715 + 0.3 × load_N Nm**. In particular, zero applied load does
not mean zero required muscle force. The two muscle moment arms at this pose
are ±0.0707106781 m.

Do not interpolate case activations and call them a native solve; a separate
simplified continuous calculation must carry its own computation-tier label.
The website's visual hand may accompany the explanation but does not become
this lever's geometry. A small lever diagram is preferable beside these numbers.

## Actual native outcomes

| Load N | Required torque Nm | Flexor activation | Extensor activation | Reserve torque Nm |
|---|---|---|---|---|
| 0 | 1.4715 | 0.2161011 | 0.01 | 3.0561e-6 |
| 2 | 2.0715 | 0.3009537 | 0.01 | 4.2561e-6 |
| 4 | 2.6715 | 0.3858064 | 0.01 | 5.4561e-6 |

All three actual `AnalyzeTool.run()` calls returned true. Each contains 21
identical static frames at 10-ms spacing; they are repeated equilibrium rows,
not 63 independent examples. The native optimization uses exponent 2,
`use_muscle_physiology=true`, convergence criterion 1e-8 and maximum 1000
iterations. Bounds reported by the tool are muscle activation [0.01,1] and
reserve control [-20,20]. It minimizes squared actuator controls subject to
the tool's acceleration-matching constraints. No optimizer progress was fabricated.

The independent reconstructed **torque** residual across all frames/cases is
below 4.85e-8 Nm; native force-output reconstruction error is below 3.56e-15 N.
The check uses fresh copies of the saved model, native moment arms and
`calcInextensibleTendonActiveFiberForce(state,1)` capacities. This checks the
SO force law, not a compliant forward-muscle replay. Native logs print
`Constraint violation` around 1.3–1.5e-6 in the tool's acceleration formulation;
do not label those numbers as Nm or substitute them for our physical torque test.

The log message `No external loads will be applied (external loads file not
specified)` refers to the separate ExternalLoads **file** interface. The
known applied force here is a real `PrescribedForce` in the model's ForceSet;
it is visible in the saved model and verified by the force-times-lever-arm
balance check. This is not a contact simulation.

## Official interpretation

- [OpenSim Static Optimization](https://opensimconfluence.atlassian.net/wiki/spaces/OpenSim/pages/53089619/How+Static+Optimization+Works): recruitment objective and force constraints.
- [OpenSim 4.4 StaticOptimization implementation](https://github.com/opensim-org/opensim-core/blob/4.4/OpenSim/Analyses/StaticOptimization.cpp): `use_muscle_physiology`, force capacities and bounds.
- [Millard2012EquilibriumMuscle](https://opensim-org.github.io/opensim-moco-site/docs/1.3.0/html_user/classOpenSim_1_1Millard2012EquilibriumMuscle.html): constitutive muscle class; separate from the choice of SO optimization.

Model/source hashes and actual solve elapsed times are recorded for
reproducibility. Those elapsed times are not browser latency or an end-to-end
Scale/IK/ID/SO benchmark. No historical models, data, physiology parameters or
QC thresholds were modified to produce these fixtures.
