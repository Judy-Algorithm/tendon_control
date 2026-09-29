# V2 execution checkpoint

- Started 2026-09-29 18:28:12 UTC. Deadline 22:28:12 UTC. Previous explainer iteration was completed; no active V2 process or checkpoint was found. This deadline persists across resumptions.
- Base main: c4a5bba7b6ab8d079d9fdeeb99430143ca4be94d.
- Remote backup pushed: backup/main-before-native-v2-20260930-0228.
- Shared isolated development branch: feat/native-solver-v2-20260930.
- Original checkout's unrelated edits remain untouched.
- A/H/I/J and integration: leader. B/C native OpenSim: science_b_c_d. D/E native MyoHand: myohand_e. F/G scene and MANO: scene_g. K/L independent review assigned after first working slice; reviewers will not certify their own implementation.
- Three worker slots plus leader. No new paid infrastructure authorized. Native production execution and native replay are separate outcomes.
- Full specification lives in the user's research workspace; no private research corpus or PPT is to be committed.

## Interfaces

Run JSON: manifest (engine/modelId/modelHash/request/effective/status/qc/units), muscleNames[], coordinateNames[], frames[]. Frame: time_s, q[], activation[], force_N[], paths[muscle][point][xyz], torque_Nm[muscle][coordinate], qfrcActuator_Nm[]. Optional native controls, velocity, targetQ, requiredTorque_Nm, reserveTorque_Nm, body transforms. Model parameter inspectors and run indexes are separate.

Native scene: constructor({host,onSelect}), setRun(run), setFrame(index, muscleIndex, coordinateIndex), dispose(). MANO: mountMano(host) returns disposable lifecycle. Root owns navigation and existing main.js.
