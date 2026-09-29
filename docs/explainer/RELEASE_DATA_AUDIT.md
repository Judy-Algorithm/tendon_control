# Release data audit

Scope: new `explainer/`, `docs/explainer/` and `scripts/explainer/` files.
This is a filesystem/provenance/render-contract audit, not a production or
browser certification. No native physics or application JavaScript was changed.

## Outcome

No blocking issue found in the audited data scope.

| Check | Result |
|---|---|
| Local home/temporary paths in text and binary files | No matching paths found. |
| Common credential markers and private-key headers | No matches found; pattern scan is not a comprehensive security audit. |
| Public MyoHand fixture, standalone manifest and checks | Manifest/check copies match their embedded fixture objects exactly. |
| MyoHand generator hash | Matches the recorded SHA256. |
| OpenSim SO provenance | Generator, all three model hashes and activation-output hashes match; preserved numerical rows match the displayed fixture. |
| Native SO tests | 6/6 passed in this audit, including independent analytic allocation and mechanical reconstruction. |
| Native MyoHand rendering fields | All fields used by the readout exist and are finite for 201 pulse samples. |
| Sizes | Snapshot before adding this report: 52 files, 1,595,093 bytes across the three audited directories; largest file is `myohand-native.json`, 334,192 bytes. |

## Renderer mapping reviewed

- The 0–400 ms slider selects the nearest recorded 2 ms sample; the plotted
  cursor uses that sample's own `time_s`.
- `raw_action`, transformed `ctrl`, and internal `activation` are distinct.
- Geometry converts meters to millimeters; velocity converts m/s to mm/s.
- Force uses positive tension, `-actuator_force`, with active/passive components.
- Selected joint torque uses the signed native force times native moment.
  The displayed positive-tension moment arm is `-selected_moment_m`.
  The selected muscle contribution is not confused with total actuator torque.
- Joint angles convert radians to degrees; angular velocity/acceleration retain
  rad/s and rad/s². Recorded contact count is zero.
- The twin-state panel uses two saved 100-ms traces and their recorded 10.291°
  endpoint difference, rather than manufacturing a response curve.
- Native SO is now explicitly labelled a prescribed external-load example, not
  a contact-collision simulation. Its three selector cases map to 0/2/4 N.

## Sources, assets and remaining boundaries

Seven native MyoHand official-source entries retain HTTPS URLs and named
sections. Pinned source identity was checked during generation; this release
audit rechecks local manifests and generator hashes, not a new network download.
Other official references are registered in `explainer/content.js`.

Existing MyoHand visual-asset and Three.js notices remain present in
`THIRD_PARTY_NOTICES.md`, `LICENSE-MYOSUITE` (Apache 2.0) and
`LICENSE-THREEJS` (MIT). The new public content uses those existing display
assets, code-native diagrams, native numerical exports and an authored tiny
teaching model. Native engines and full installed MyoHand assets are not copied
into the new fixture directory. No new broad licensing grant or legal clearance
for the pre-existing SHM table is asserted.

The native SO model is not a hand; MyoHand trajectories are not registered to
the display skeleton; Moco remains conceptual. Browser visual checks,
production HTTP behavior and deployed-commit verification belong to the release
lead's separate QA. Screenshot files are browser captures supplied by that QA;
this audit only scanned their binary metadata for private-path patterns.
