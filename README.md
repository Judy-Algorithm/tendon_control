# Interactive MyoHand tendon atlas

A self-contained browser visualization of the public MyoHand/MyoSuite model,
covering 23 articulated joint degrees of freedom and 39 muscle-tendon
actuators.

## Data and privacy

The page contains only static model assets exported from the open-source
MyoHand model: quantized bone geometry, joint anchors/axes/ranges, actuator
names, and muscle-tendon paths. It contains no company data, EMG recordings,
pose recordings, tendon pseudo-label arrays, model checkpoints, credentials,
server addresses, or runtime server dependency.

## Deploy on Vercel

1. Import this GitHub repository into Vercel.
2. Select Framework Preset `Other`.
3. Leave Build Command and Output Directory empty.
4. Deploy. Vercel serves the root `index.html` directly.

See `THIRD_PARTY_NOTICES.md` for MyoSuite and Three.js attribution.
