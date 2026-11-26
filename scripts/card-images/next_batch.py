"""Pick the next N rows to make, draw their code sketches, and print what Canva needs.
Usage: python3 scripts/card-images/next_batch.py N [--redo-svg]
Prints one JSON line per row: {conceptId, sketch (png path or null), aspectRatio, page: [w, h], prompt}
- With a sketch: upload the png (create-upload-url + POST), then generate-image with imageReferences = that media,
  the given aspectRatio and prompt.
- Without a sketch: generate-image with the prompt only.
Export page sizes keep the image ratio: scenes 1200x800, squares 900x900."""
import json, os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(os.path.dirname(here))
sys.path.insert(0, here)
from build_plan import sketch_prompt

n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
plan = json.load(open(os.path.join(root, "data/card-images/plan.json"), encoding="utf-8"))
rows = [r for r in plan if r["status"] == "todo"][:n]
out = "/tmp/dour-sketches"
res = subprocess.run(["npx", "tsx", os.path.join(here, "renderSketch.tsx"), out] + [r["conceptId"] for r in rows],
                     cwd=root, capture_output=True, text=True, check=True)
sk = {}
for line in res.stdout.splitlines():
    if line.startswith("{"):
        d = json.loads(line); sk[d["key"]] = d
for r in rows:
    d = sk.get(r["conceptId"], {})
    shape = d.get("shape", "scene")
    print(json.dumps({
        "conceptId": r["conceptId"], "en": r["en"],
        "sketch": d.get("file"),
        "aspectRatio": "SQUARE_1_1" if shape == "square" else "LANDSCAPE_3_2",
        "page": [900, 900] if shape == "square" else [1200, 800],
        "prompt": sketch_prompt(r, shape) if d.get("file") else r["prompt"],
    }, ensure_ascii=False))
