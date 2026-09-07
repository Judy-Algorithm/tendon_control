# Third-party notices

The visual assets and rendering libraries are derived from the following
open-source projects. The added SHM joint-control table has separate provenance
documented in `docs/data-provenance.json`; it is not native MyoHand kinematics.

## MyoHand / MyoSuite

- Source: https://github.com/MyoHub/myo_sim
- Project: https://github.com/MyoHub/myosuite
- License: Apache License 2.0; see `LICENSE-MYOSUITE`.
- Use in this repository: unchanged, quantized public bone geometry, joint
  anchors and 39 exported actuator paths in `model-data.js`. The interface
  exposes the 37 channels referenced by the SHM table; PT and PQ remain hidden.

## Three.js

- Source: https://github.com/mrdoob/three.js
- Version embedded by the atlas: r128
- License: MIT; see `LICENSE-THREEJS`.
- Use in this repository: WebGL rendering and orbit controls, extracted without
  modification into `vendor/three.min.js` and `vendor/orbit-controls.js`.
