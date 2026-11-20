"""Pair exported Canva page URLs (in page order) with concept IDs and media IDs, then call ingest.
Usage: python3 scripts/card-images/ingest_sheet.py ids.txt urls.txt
ids.txt lines: conceptId mediaId   (same order as the design pages)"""
import sys, json, subprocess, os
ids = [l.split() for l in open(sys.argv[1]) if l.strip()]
urls = [l.strip() for l in open(sys.argv[2]) if l.strip()]
assert len(ids) == len(urls), (len(ids), len(urls))
batch = [{"conceptId": i[0], "canvaMediaId": i[1], "url": u} for i, u in zip(ids, urls)]
json.dump(batch, open("/tmp/_batch.json", "w"))
here = os.path.dirname(os.path.abspath(__file__))
subprocess.run([sys.executable, os.path.join(here, "ingest.py"), "/tmp/_batch.json"], check=True)
