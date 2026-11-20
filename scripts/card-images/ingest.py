"""Download exported Canva pages and save them as card images.
Usage: python3 scripts/card-images/ingest.py batch.json
batch.json = [{"conceptId": "...", "url": "...", "canvaMediaId": "..."}, ...]
Saves public/data/card-images/<conceptId>.webp (600px wide), marks the plan row done,
and rebuilds public/data/card-images/manifest.json (only finished images)."""
import json, sys, os, io, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public/data/card-images")
PLAN = os.path.join(ROOT, "data/card-images/plan.json")

def main(batch_path):
    batch = json.load(open(batch_path))
    plan = json.load(open(PLAN, encoding="utf-8"))
    by = {p["conceptId"]: p for p in plan}
    os.makedirs(OUT, exist_ok=True)
    for b in batch:
        data = urllib.request.urlopen(b["url"], timeout=60).read()
        im = Image.open(io.BytesIO(data)).convert("RGB")
        w = 600
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        dest = os.path.join(OUT, f'{b["conceptId"]}.webp')
        im.save(dest, "WEBP", quality=78, method=6)
        row = by[b["conceptId"]]
        row["status"] = "done"
        if b.get("canvaMediaId"): row["canvaMediaId"] = b["canvaMediaId"]
        print(b["conceptId"], os.path.getsize(dest) // 1024, "KB")
    json.dump(plan, open(PLAN, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    manifest = {p["conceptId"]: {"file": p["file"], "character": p["character"]}
                for p in plan if p["status"] == "done"}
    json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(len(manifest), "images in manifest")

if __name__ == "__main__":
    main(sys.argv[1])
