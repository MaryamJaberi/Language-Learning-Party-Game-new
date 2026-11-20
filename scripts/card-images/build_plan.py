"""Builds data/card-images/plan.json: which image each card concept gets, who is in it, and the prompt.
Run: python3 scripts/card-images/build_plan.py
Images are keyed by conceptId, so one image serves every language of that card."""
import json, hashlib, re, os

STYLE = ("Simple flat vector illustration for a language-learning party game card, clean rounded shapes, "
         "soft friendly faces, limited palette of lapis blue, saffron yellow and turquoise on a warm cream "
         "background, minimal background. No text, no letters, no numbers written anywhere, no signs with "
         "writing, no speech bubbles.")

# The multinational family (see the persona doc «فامیل بزرگ دور»)
CHAR = {
 "rosa":  "a 72-year-old Brazilian grandmother with silver hair in a bun, round glasses, floral scarf and knitted cardigan",
 "yusuf": "a 75-year-old Iranian grandfather with a short white beard, flat cap and tweed vest",
 "marta": "a 68-year-old adventurous Brazilian woman with a short grey bob, sun hat and colorful long scarf",
 "zara":  "a 52-year-old Iranian-Brazilian cafe owner with curly dark hair tied up and a saffron apron",
 "omid":  "a 55-year-old cheerful Afghan man with a thick mustache and a blue polo shirt",
 "sam":   "a 48-year-old Iranian-Brazilian engineer with dark hair greying at the temples, rectangular glasses, shirt with rolled sleeves",
 "leila": "a 45-year-old Moroccan woman with dark hair in a ponytail, kind eyes, turquoise top",
 "dani":  "a 42-year-old Iranian-Brazilian chef with messy dark hair and a white chef jacket",
 "eva":   "a 40-year-old tall Dutch woman with straight blonde hair and a rain jacket",
 "nora":  "a 38-year-old Iranian-Brazilian woman lawyer with sleek black shoulder-length hair and a lapis blue blazer",
 "adam":  "a 27-year-old Afghan-Iranian young man with a short beard, tired happy eyes and a grey hoodie",
 "sara":  "a 28-year-old Nigerian-Dutch woman with a short pixie haircut and a camera around her neck",
 "ryan":  "a 14-year-old Afghan-Iranian boy with messy hair and a gaming headset around his neck",
 "rona":  "a 14-year-old Afghan-Iranian girl with a high ponytail and a football jersey",
 "nika":  "a 19-year-old mixed Iranian-Moroccan student girl with wavy hair and a colorful oversized sweater",
 "timo":  "an 8-year-old mixed Iranian-Moroccan boy with messy hair and a green dinosaur t-shirt",
 "luca":  "a 23-year-old Dutch-Iranian young man in a neat shirt slightly too big for him",
 "sofia": "a 26-year-old Ukrainian woman architect with wavy brown hair",
 "mia":   "a 5-year-old Dutch-Iranian girl with two pigtails and a yellow dress",
 "tony":  "a 35-year-old Brazilian man with a full beard and headphones around his neck",
 "kim":   "a 60-year-old polite Korean man with neat grey hair and a beige cardigan",
 "pepper":"a grumpy orange tabby cat with half-closed judging eyes",
 "biscuit":"a happy fluffy golden dog with a turquoise collar",
 "coco":  "a cheeky green parrot with a red tail",
}

# topic keyword -> characters who naturally appear in that situation
RULES = [
 (r"food|restaurant|drink|ordering", ["dani","zara","rosa","nika","mia"]),
 (r"shop|money|bank", ["rosa","luca","eva","sam"]),
 (r"health|emergenc|body", ["leila","yusuf","rosa","ryan"]),
 (r"work|job|occupation|negotiation|decision|plans", ["sam","luca","nora","adam","zara"]),
 (r"travel|transport|vehicle|direction|city|places", ["marta","omid","sofia","tony","eva"]),
 (r"educat|school|language|library", ["nika","timo","eva","ryan","rona"]),
 (r"hous|home|services|appointment", ["kim","sam","leila","sofia"]),
 (r"legal|bureaucra|admin|register", ["nora","sam"]),
 (r"techno|media|news", ["adam","yusuf","tony","nika"]),
 (r"family|relationship|people|introduction|personal|self|personality|celebrat|invitation", ["rosa","zara","sofia","nora","luca","yusuf"]),
 (r"sport|hobb|entertain", ["rona","omid","ryan","sara"]),
 (r"weather|nature|environment", ["marta","sara","eva","biscuit"]),
 (r"animal", ["pepper","biscuit","coco","timo"]),
 (r"feeling|emotion|complain|reassur|encourag", ["pepper","nika","leila","adam","mia"]),
 (r"idiom|wish|opinion|discourse|culture|society|speculat|doubt|reflection", ["yusuf","rosa","pepper","sofia","nora"]),
 (r"slang|informal|small ?talk|social|greeting|closing|politeness|agreement|disagree", ["nika","omid","kim","coco","tony"]),
 (r"color|number|month|day|time|basic|adjective|verb|object|everyday|clothes", ["timo","mia","eva","rosa","dani"]),
]
DEFAULT = ["sam","leila","nika","yusuf","zara","adam","eva"]
ANIMALS = {"pepper","biscuit","coco"}

def pick(topic, cid):
    t = (topic or "").lower()
    pool = DEFAULT
    for pat, chars in RULES:
        if re.search(pat, t):
            pool = chars; break
    h = int(hashlib.md5(cid.encode()).hexdigest(), 16)
    return pool[h % len(pool)]

def prompt_for(c, en, char):
    kind = c.get("type") or "phrase"
    who = CHAR[char]
    if kind == "vocabulary" and len(en.split()) <= 3:
        t = (c.get("topic") or "").lower()
        if re.search(r"job|occupation", t):
            scene = f"{who}, dressed as and working as a {en}, with the typical tools of that job"
        else:
            scene = f"a large, clear, centered {en} as the main subject, with {who} beside it reacting to it"
        return f'Card illustration for the word "{en}": {scene}. The meaning must be obvious at a glance. {STYLE}'
    extra = " Leave empty space above its head for a thought bubble that the game adds." if char in ANIMALS else ""
    return (f'Card illustration for the {kind} "{en}": {who}, in an everyday situation where someone would say '
            f'this, with a facial expression and body language that make the meaning clear.{extra} {STYLE}')

LEVEL_ORDER = {"easy":0,"medium":1,"hard":2,"A1":3,"A2":4,"B1":5,"B2":6,"C1":7,"C2":8}

def main():
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db = [x for x in json.load(open(os.path.join(root, "data/curatedDeckDatabase.json"), encoding="utf-8")) if not x.get("excluded")]
    db.sort(key=lambda x: (LEVEL_ORDER.get(x.get("level"), 9), x["id"]))
    old = {}
    plan_path = os.path.join(root, "data/card-images/plan.json")
    if os.path.exists(plan_path):
        old = {p["conceptId"]: p for p in json.load(open(plan_path, encoding="utf-8"))}
    seen, plan = {}, []
    for c in db:
        cid = c["conceptId"]
        if cid in seen:
            seen[cid]["cardIds"].append(c["id"]); continue
        en = (c["translations"].get("en") or c["translations"].get("en-US") or {}).get("text", "").strip()
        if not en: continue
        prev = old.get(cid, {})
        char = prev.get("character") or pick(c.get("topic"), cid)
        row = {
            "order": len(plan) + 1,
            "conceptId": cid,
            "cardIds": [c["id"]],
            "level": c.get("level"),
            "topic": c.get("topic"),
            "type": c.get("type"),
            "en": en,
            "character": char,
            "file": f"{cid}.webp",
            "prompt": prev.get("prompt") or prompt_for(c, en, char),
            "status": prev.get("status", "todo"),
            "canvaMediaId": prev.get("canvaMediaId"),
        }
        seen[cid] = row; plan.append(row)
    os.makedirs(os.path.dirname(plan_path), exist_ok=True)
    json.dump(plan, open(plan_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(plan), "concepts planned")

if __name__ == "__main__":
    main()
