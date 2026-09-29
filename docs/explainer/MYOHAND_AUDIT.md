# E: verified native MyoHand fixture

## Use in the website

Copy `myohand-native.json` into a public fixture directory. It is self-contained,
contains no private absolute paths, and is about 330 KB uncompressed. Do not copy
the native model/environment. `manifest.officialSources` can feed the source
drawer. The native model is **not** the website's OpenSim/display model.

- Engine: MyoSuite **2.11.6**, MuJoCo **3.3.0**.
- Environment: `myoHandPoseFixed-v0`; **23 hinge coordinates, 39 muscles and
  activation states**. 44 total MuJoCo tendons include five visual target-error
  paths; that total is not the muscle count.
- Native physics timestep: **2 ms**. Native environment control interval:
  **20 ms** (10 physics steps). Euler integration. No object/free joint.
- Selected native actuator: **FDS2**, index 11; shown joint
  **mcp2_flexion**, joint/dof index 7.
- Replay tier: `原生求解回放`. A hand animated using the website's different
  geometry remains `示意动画`; never label it the exact native trajectory.

### Pulse

`pulse` has 201 synchronized samples at 2 ms spacing from 0 to 400 ms.
All raw actions are -1 except FDS2, whose raw action is 0.5 from 40 through
138 ms. FDS2 `ctrl` is about 0.000553 before/after and 0.5 during the pulse.
These controls use the audited native action transformation, held constant for
20-ms intervals. No learned policy is used. Samples are synchronized by calling
native `mj_forward` on the current state before recording; then `mj_step` advances.

UI: stacked short traces of ctrl/activation (dimensionless) and tension (N),
shared time (ms), with a vertical scrubber. Do not draw force on the activation
axis or label signed negative force as negative muscle activation. At 40 ms the
control jumps while activation is still about 0.0006; at 50 ms activation is
about 0.3869; at 140 ms control drops while activation is about 0.5.
The native peak-force parameter is 162.5 N, not the actual force at every frame.

### Same pose, different activation

`internalStateIntervention` contains two 51-sample, 0–100-ms trajectories.
Both start from exactly identical q, zero v and identical next controls. Every
muscle starts at activation 0.02 except FDS2, which starts at 0.02 or 0.6.
Both have selected raw action 0.2 -> ctrl about 0.18243. This is a **manually
initialized simulation intervention**, not a pair of naturally reached human
states. The selected MCP angle differs by **10.291 degrees** at 100 ms.
Keep this distinction in the drawer and a brief visible `受控初态` badge.

## Scientific audit

1. `raw_action` is not `ctrl`: the native wrapper applies
   `sigmoid(5*(raw_action-0.5))`. Tested against real `env.step` with 39 distinct
   raw inputs; max discrepancy is exactly 0. Raw action 0 is not zero control.
2. All 39 compiled actuators use MuJoCo muscle dynamics. For FDS2 the nominal
   activation/deactivation constants are 0.01/0.04 s; effective constants vary
   with activation. Do not substitute a simple constant-time low-pass equation
   as an exact native calculation.
3. The selected force is `gain(length,velocity) * act + bias(length)`. Native
   `mju_muscleGain` and `mju_muscleBias` reconstruct the recorded scalar force
   with zero discrepancy. `actuator_force` is negative for tensile pulling;
   `tension_N = -actuator_force_N`. Active/passive tensile components are
   exported separately.
4. `actuator_length` is transmission path length (muscle + biological tendon
   length in this model), not elastic tendon extension. MuJoCo derives its
   resting muscle length and constant biological-tendon length from
   `lengthrange` and `range`. These are not independently measured OpenSim
   `optimal_fiber_length` / `tendon_slack_length` inputs.
5. `qfrc_actuator = moment.T @ actuator_force` passes at all 303 samples with
   max error **0 Nm**. MuJoCo 3.3.0 exposes sparse moment buffers; the exporter
   uses the engine's sparse-to-dense conversion, not a blind reshape.
6. With positive tension T, use **R = -moment.T**, hence tau = R T. A browser
   depiction of a shortened tendon with positive tension must not reuse the
   opposite sign convention for its torque arrow.
7. Native equation-of-motion check `M qacc = actuator + passive + applied +
   constraint - bias` has max error **6.66e-16 Nm**. All 23 DOFs are hinges;
   qvel is a scalar angular velocity here. This statement cannot be generalized
   to another environment with quaternion/free joints.
8. These examples contain **zero contacts** throughout. The contact step can
   explain the general native dependency, but must not call this a measured
   contact example or claim contact behavior was demonstrated.
9. The displayed dependency chain is not the literal ordering of engine calls.
   Activation and geometry are separate inputs to force. MyoHand does not run
   OpenSim IK/ID/SO automatically per frame.

## Provenance and implementation checks

The MyoSuite 2.11.6 tag resolves to
`05cb84678373f91271004f99602ebbf01e57d1a1`; its myo_sim gitlink resolves to
`33f3ded946f55adbdcf963c99999587aadaf975f`. The seven listed installed source/XML
files were downloaded read-only from those exact official commits and compared
byte-for-byte: **all seven match**. No historical source/model files were edited.
The model includes Apache-2.0 notices. Only derived numeric educational fixtures
are proposed for the website; native meshes/model binaries are not added.

`CHECKS.json` records tolerances/results; `MODEL_MANIFEST.json` contains names,
units, source hashes, version/parameter metadata, source links, and limitations.
`generate_myohand.py` is a new independent generator. It requires an installed
matching MyoSuite runtime. Its SHA256 is in the manifest.

One development run failed because MuJoCo 3.3.0's Python bindings have no
`mj_copyData`; the implementation was corrected to supported native MjData
deepcopy. The complete generation/check run then passed. No failed scientific
trajectory was omitted or replaced. No source file, physics option, muscle
parameter, contact condition or solver tolerance was tuned.
