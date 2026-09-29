"""Read the installed source fingerprint without loading a simulation."""
import hashlib
import importlib.metadata
import importlib.util
import json
from pathlib import Path

FILES = ["envs/myo/base_v0.py", "envs/myo/myobase/__init__.py",
 "envs/myo/myobase/pose_v0.py", "envs/myo/assets/hand/myohand_pose.xml",
 "simhive/myo_sim/hand/assets/myohand_assets.xml", "simhive/myo_sim/hand/assets/myohand_body.xml",
 "simhive/myo_sim/scene/myosuite_scene.xml"]
root = Path(importlib.util.find_spec("myosuite").origin).parent
sources = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in FILES}
fingerprint = hashlib.sha256(json.dumps(sources, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
assert importlib.metadata.version("myosuite") == "2.11.6"
assert importlib.metadata.version("mujoco") == "3.3.0"
print(json.dumps({"modelHash": fingerprint}))
