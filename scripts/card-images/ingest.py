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
        # Optimal size for a phone card: landscape scenes 720 wide, squares (dictionary) 480, portrait 600.
        w = 720 if im.width > im.height * 1.1 else 480 if abs(im.width - im.height) <= im.width * 0.1 else 600
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        dest = os.path.join(OUT, f'{b["conceptId"]}.webp')
        im.save(dest, "WEBP", quality=78, method=6)
        row = by[b["conceptId"]]
        row["status"] = "done"
        row["size"] = [im.width, im.height]
        if b.get("fromSketch"): row["fromSketch"] = True
        if b.get("canvaMediaId"): row["canvaMediaId"] = b["canvaMediaId"]
        print(b["conceptId"], os.path.getsize(dest) // 1024, "KB")
    json.dump(plan, open(PLAN, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    write_manifest(plan)

def norm(t):
    import re
    t = (t or "").lower().strip()
    t = re.sub(r"[\s\u200c]+", " ", t)
    return re.sub(r"[.!?؟,،;:«»\"'()\[\]¡¿…]+", "", t).strip()

def write_manifest(plan):
    """manifest.json: conceptId -> image. text/<lang>.json: card text in that language -> conceptId,
    so cards that come from other sources (hand-written cards, word bank) also find their image."""
    done = {p["conceptId"]: p for p in plan if p["status"] == "done"}
    manifest = {}
    for cid, p in done.items():
        m = {"file": p["file"], "character": p["character"]}
        if p.get("size"): m["w"], m["h"] = p["size"]
        manifest[cid] = m
    json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False)
    db = json.load(open(os.path.join(ROOT, "data/curatedDeckDatabase.json"), encoding="utf-8"))
    by_lang = {}
    for c in db:
        cid = c.get("conceptId")
        if cid not in done: continue
        for lang, tr in (c.get("translations") or {}).items():
            for t in str((tr or {}).get("text", "")).split(" / "):
                k = norm(t)
                if k: by_lang.setdefault(lang, {}).setdefault(k, cid)
    tdir = os.path.join(OUT, "text"); os.makedirs(tdir, exist_ok=True)
    for lang, m in by_lang.items():
        json.dump(m, open(os.path.join(tdir, f"{lang}.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(len(manifest), "images in manifest;", len(by_lang), "language text indexes")

if __name__ == "__main__":
    if sys.argv[1] == "--manifest-only":
        write_manifest(json.load(open(PLAN, encoding="utf-8")))
    else:
        main(sys.argv[1])
