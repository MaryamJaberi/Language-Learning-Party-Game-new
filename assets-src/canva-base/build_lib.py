"""Cut the Canva base sheets into the art library the app composes scenes from.
Output: <out>/char/<who>_<n>.webp, jobs/<job>.webp, props/<id>.webp, animals/<id>.webp, places/<id>.webp, art.json"""
import json, os, sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd
OUT = sys.argv[1]
POSES = ['neutral', 'wave', 'worried', 'sick', 'point', 'phone', 'sad', 'laugh']
JOBS = [['doctor', 'nurse', 'teacher', 'police', 'chef', 'waiter'], ['driver', 'firefighter', 'farmer', 'builder', 'pilot', 'mechanic'], ['cashier', 'student', 'postman', 'engineer', 'lawyer', 'baby']]
PROPS = json.load(open('prop_groups.json'))
ANIMALS = [['cat', 'dog', 'parrot', 'bird', 'fish', 'horse', 'cow', 'sheep', 'chicken', 'rabbit', 'mouse', 'lion'], ['elephant', 'bear', 'monkey', 'duck', 'butterfly', 'turtle', 'frog', 'cat-sit']]

def cells(path, cols, rows, tol=14):
    im = np.asarray(Image.open(path).convert('RGB')).astype(int)
    H, W, _ = im.shape
    for r in range(rows):
        for c in range(cols):
            y0, y1, x0, x1 = r*H//rows, (r+1)*H//rows, c*W//cols, (c+1)*W//cols
            cell = im[y0:y1, x0:x1]
            bg = np.median(np.concatenate([cell[0], cell[-1], cell[:, 0], cell[:, -1]]), axis=0)
            near = np.abs(cell - bg).max(axis=2) <= tol
            lab, n = nd.label(near)
            border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
            fg = ~np.isin(lab, list(border))
            fg = nd.binary_opening(fg, iterations=1)
            lab2, n2 = nd.label(nd.binary_dilation(fg, iterations=8))
            if n2 == 0: yield None; continue
            sizes = nd.sum(np.ones_like(lab2), lab2, range(1, n2+1))
            fg = fg & (lab2 == (np.argmax(sizes)+1))
            ys, xs = np.where(fg)
            a, b, l, rr = ys.min(), ys.max()+1, xs.min(), xs.max()+1
            alpha = Image.fromarray((fg*255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.7))
            rgba = Image.fromarray(cell.astype('uint8')).convert('RGBA'); rgba.putalpha(alpha)
            fig = rgba.crop((l, a, rr, b))
            # which side sticks out (a reaching / pointing arm): compare mass centre with box centre
            m = fg[a:b, l:rr]; cx = (m.sum(0) * np.arange(m.shape[1])).sum() / max(m.sum(), 1)
            reach = 'left' if cx > m.shape[1] * 0.56 else 'right' if cx < m.shape[1] * 0.44 else None
            yield fig, reach

def save(fig, path, max_h=None, max_w=None):
    s = 1.0
    if max_h and fig.height > max_h: s = min(s, max_h / fig.height)
    if max_w and fig.width > max_w: s = min(s, max_w / fig.width)
    if s < 1: fig = fig.resize((round(fig.width*s), round(fig.height*s)), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fig.save(path, 'WEBP', quality=82, method=6)
    return fig.size

art = {'char': {}, 'jobs': {}, 'props': {}, 'animals': {}, 'places': {}}
for f in sorted(os.listdir('sheets')):
    name = f[:-4]; p = 'sheets/' + f
    if name.startswith('char_'):
        who = name[5:]
        for i, res in enumerate(cells(p, 4, 2)):
            if not res: continue
            fig, reach = res
            w, h = save(fig, f'{OUT}/char/{who}_{POSES[i]}.webp', max_h=420)
            art['char'].setdefault(who, {})[POSES[i]] = {'w': w, 'h': h, **({'reach': reach} if reach else {})}
    elif name.startswith('jobs_'):
        for i, res in enumerate(cells(p, 6, 1)):
            if res: w, h = save(res[0], f'{OUT}/jobs/{JOBS[int(name[5:])-1][i]}.webp', max_h=420); art['jobs'][JOBS[int(name[5:])-1][i]] = {'w': w, 'h': h}
    elif name.startswith('props_'):
        g = PROPS[int(name[6:])-1]; cols, rows = (4, 3) if len(g) == 12 else (3, 2)
        for i, res in enumerate(cells(p, cols, rows)):
            if res: w, h = save(res[0], f'{OUT}/props/{g[i]}.webp', max_h=300, max_w=300); art['props'][g[i]] = {'w': w, 'h': h}
    elif name.startswith('animals_'):
        g = ANIMALS[int(name[8:])-1]; cols, rows = (4, 3) if len(g) == 12 else (4, 2)
        for i, res in enumerate(cells(p, cols, rows)):
            if res: w, h = save(res[0], f'{OUT}/animals/{g[i]}.webp', max_h=300, max_w=300); art['animals'][g[i]] = {'w': w, 'h': h}
    elif name.startswith('place_'):
        im = Image.open(p).convert('RGB').resize((960, 640), Image.LANCZOS)
        os.makedirs(f'{OUT}/places', exist_ok=True); im.save(f'{OUT}/places/{name[6:]}.webp', 'WEBP', quality=72, method=6)
        art['places'][name[6:]] = {'w': 960, 'h': 640}
json.dump(art, open(f'{OUT}/art.json', 'w'), separators=(',', ':'))
print({k: len(v) for k, v in art.items()})
