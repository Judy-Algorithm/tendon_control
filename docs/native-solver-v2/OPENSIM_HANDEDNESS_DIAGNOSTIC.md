# Read-only original-atlas handedness audit

**Finding: the earlier cross-model sign audit contains a handedness error. No active
mapping or replay has been changed by this diagnostic.**

The displayed source geometry is native MyoHand RIGHT (`docs/data-provenance.json`), while
the native ARMS derivative is LEFT. The old audit constructs a right-handed palm basis on
each side and compares rotation axes directly. This silently selects a proper rotation
between geometrically opposite hands. It is not a valid chirality transformation.

Let D and N be the display and native palm bases, with their first two axes defined by
radial/longitudinal landmark directions. The corresponding polar-vector map is
`P = N diag(1,1,-1) Dᵀ`, whose determinant is −1. Angular velocity is an axial vector,
so its correct map is `ω_native = det(P) P ω_display`. This satisfies
`P(ω × r) = (det(P) P ω) × (P r)` to 3.33e−16 in the numerical check. Native rotation
axes are measured from central finite differences of child-body rotations, not guessed
from coordinate names.

As an independent positional consistency diagnostic, a similarity fit over 16 corresponding
joint anchors has RMS 6.46 mm with an improper registration versus 21.75 mm with a proper
registration. These different anatomical models do not coincide exactly; this is not
proof of full landmark or trajectory equivalence.

Keeping the old |axis cosine| ≥0.9 screening threshold and the original amplitudes:

| Corrected provisional outcome | Original atlas actions |
|---|---:|
| Candidate angular correspondence, native amplitude in range | 14 |
| Axis registration still unresolved | 8 |
| Original amplitude outside native ROM | 22 |
| Constructed/coupled display axis without direct independent match | 4 |

The 14 candidates are thumb MCP/IP extension, four finger MCP extensions, four PIP
extensions, and four DIP extensions. PIP/DIP extension is a prepositioned positive-native
flexion angle returning to zero, not an unsupported negative-native flexion.

True range discrepancies remain: original finger MCP flexion reaches 1.6 rad versus
native 1.5708; PIP reaches 1.8 versus 1.7453; DIP reaches 1.6 versus 1.3963. These original
actions must not be silently shortened. MCP abduction ranges also exceed native bounds.

The two previously mapped wrist actions now fall below the unchanged axis threshold
(|cosine| ≈0.888). The three previously mapped finger MCP extension actions require the
opposite native sign. Therefore this is **not** simply nine additional recordings; the
existing five must be retired or reclassified if an independent reviewer accepts the fix.

Before promotion: independently verify source handedness, the polar/axial transforms and
finite native axes; generate versioned corrected trajectories; rerun actual SO; retain
all original 48-action statuses and all failed frames. Archive the old correspondence
evidence explicitly as superseded. Do not reuse old SO numbers under new action labels.

Measured rows and transform matrices: `OPENSIM_HANDEDNESS_DIAGNOSTIC.json`.
