# Production verification — 2026-09-30

## Release identity

- Application commit: `a5b971049666be93840d0cfc1391f1a0f0680d22`.
- GitHub main verified at that commit after a normal fast-forward push.
- Production URL: https://tendon-control.vercel.app
- GitHub Production deployment ID: `6740664343`.
- Vercel status: **success**, “Deployment has completed”, reported at
  `2026-09-29T17:01:57Z`.
- Immutable deployment URL:
  https://tendon-control-rniiq70i0-judys-projects-81086b4a.vercel.app
- Backup: `backup/main-before-explainer-20260930-0016` at
  `4adeee33ba52f18db119f263396e3f079aa2c891`.
- Feature branch: `feat/opensim-myohand-explainer-20260930`.

## Actual production browser checks

The canonical production domain was opened in Safari, using the computer's
existing network configuration. No proxy/system setting was changed.

- OpenSim deep link opened with all local 3D assets and navigation.
- IK: displayed actual proxy-point RMS changed from 15.26 mm to 0.00 mm;
  fitted angle changed from 10° to 25°.
- ID: changing load to 6 N recomputed Fd=0.210 Nm and total requirement
  0.230 Nm (35 mm lever plus 0.020 Nm gravity).
- SO: native selector changed 0 N to 4 N; flexor activation changed from
  0.2161 to 0.3858, torque requirement 1.4715 to 2.6715 Nm;
  4 N balance residual displayed 4.85e-8 Nm.
- MyoHand: native pulse playback advanced from 80 ms to 154 ms with changing
  ctrl/activation readouts. Internal-state comparison opened and reported
  10.29° difference at 100 ms with its controlled-intervention explanation.
- Existing control: FDS3 search highlighted its FDSM mapping; selecting index
  MCP cleared search and restored the correct ROM/path controls. Returning
  from the new routes retained this original scene. Continuous ROM playback
  was already verified locally; the foreground/background Safari automation
  pauses it rapidly, so this report does not claim a full production cycle.

Direct, unedited production screenshots:

- `screenshots/production-ik.png`
- `screenshots/production-id.png`
- `screenshots/production-native-so.png`
- `screenshots/production-myohand.png`
- `screenshots/production-internal-state.png`
- `screenshots/production-control.png`

## Served-asset verification

Canonical `/` matches local index.html SHA256
`e84adbed55b02cfe328a31ea3be35bef1832a47f0b917ad926fbd9aadc412672`.
The `/index.html` URL redirects to `/` via the existing Vercel clean-URL rule;
its redirect body is not the HTML file and must not be hash-compared as one.

Eleven additional served files matched their committed local SHA256 exactly:
app.js; explainer main.js, scene.js, content.js, math.js, explainer.css,
muscle-lab.js, muscle-lab.css; both native fixture JSONs; model-manifests.json.

main.js SHA256:
`74accda72ab7ca0f46ffc870388cb333ecf112aae63148db41047da863792ec7`.

## Access limitation encountered and resolved for acceptance

The in-app test browser timed out on the public Vercel domains, although local
testing worked. Direct command-line requests also timed out; requests through
the already configured local proxy returned the correct production assets.
Safari loaded and operated the actual HTTPS production site successfully.
This is not a local mirrored copy. No certificate bypass, DNS change, new
hosting service, credential change or force push was used.

This document and production screenshots are a documentation-only follow-up
to the tested application commit. See GitHub main for the final documentation
revision; it leaves the verified application assets unchanged.
