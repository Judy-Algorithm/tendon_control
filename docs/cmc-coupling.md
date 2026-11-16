# CMC4 / CMC5 model coupling

The ROM panel follows `WSY_left_radioulnar_ECU_EDM_fixed_REVIEW.osim`.

- `CMC4` owns the independent coordinate `4cmc_flexion`, range `0–0.2032 rad` (`0–11.642°`).
- `CMC5` owns the dependent coordinate `CMC5_r1`.
- `CMC5_r1_con` enforces `CMC5_r1 = SimmSpline(4cmc_flexion)` with points `(0, 0)` and `(0.2032, 0.5528)` radians. The displayed endpoint is therefore `31.673°` at the fifth metacarpal.
- The web animation uses those two endpoint ratios on the existing visual mesh. It is prescribed display kinematics, not a dynamic OpenSim solve.

The former illustrative `1:2` and `0–20°` coupling is no longer used.
