import json
import random
import os

BASE = os.path.join(os.path.dirname(__file__), '..')
LAYOUT_PATH = os.path.abspath(os.path.join(BASE, 'layout.json'))

# Canvas / bounds (adjust if your layout uses different units)
CANVAS_W = 100
CANVAS_H = 100

MIN_W, MAX_W = 6, 18
MIN_H, MAX_H = 8, 18
PADDING = 2  # minimal gap between doors (zwischen Türen)
EDGE_PADDING = 2  # Abstand zum äußeren Rand (Türen dürfen den Rand nicht berühren)

random.seed()

def rects_overlap(a, b, pad=PADDING):
    ax1, ay1, aw, ah = a
    bx1, by1, bw, bh = b
    ax2 = ax1 + aw
    ay2 = ay1 + ah
    bx2 = bx1 + bw
    by2 = by1 + bh
    return not (ax2 + pad <= bx1 or bx2 + pad <= ax1 or ay2 + pad <= by1 or by2 + pad <= ay1)

with open(LAYOUT_PATH, 'r', encoding='utf-8') as f:
    layout = json.load(f)

if 'door' not in layout:
    raise SystemExit('Keine Türen im layout.json gefunden')

door_keys = list(layout['door'].keys())
placed = []
new_doors = {}

# Platziere zuerst Tür 24, dann 6, dann die restlichen (so stellen wir sicher, dass ihre Größen vorrangig eingehalten werden)
door_keys_sorted = sorted(door_keys, key=lambda k: (0 if k == '24' else 1 if k == '6' else 2, int(k)))

# Für andere Türen reduzieren wir das Maximum leicht, damit 24 und 6 klar größer werden
MAX_W_OTHERS = max(MIN_W, MAX_W - 2)
MAX_H_OTHERS = max(MIN_H, MAX_H - 2)

for key in door_keys_sorted:
    placed_ok = False
    for attempt in range(10000):
        # feste Regeln für Tür 24 und 6
        if key == '24':
            w = MAX_W
            h = MAX_H
        elif key == '6':
            # zweitgrößte: etwas kleiner als 24
            w = max(MIN_W, MAX_W - 1)
            h = max(MIN_H, MAX_H - 1)
        else:
            w = random.randint(MIN_W, min(MAX_W_OTHERS, CANVAS_W - EDGE_PADDING * 2))
            h = random.randint(MIN_H, min(MAX_H_OTHERS, CANVAS_H - EDGE_PADDING * 2))

        # Position so wählen, dass die Tür den Rand nicht berührt
        max_left = CANVAS_W - w - EDGE_PADDING
        max_top = CANVAS_H - h - EDGE_PADDING
        if max_left < EDGE_PADDING or max_top < EDGE_PADDING:
            continue
        left = random.randint(EDGE_PADDING, max_left)
        top = random.randint(EDGE_PADDING, max_top)

        candidate = (left, top, w, h)
        if all(not rects_overlap(candidate, p) for p in placed):
            placed.append(candidate)
            new_doors[key] = {'top': top, 'left': left, 'width': w, 'height': h}
            placed_ok = True
            break
    if not placed_ok:
        raise SystemExit(f'Konnte Tür {key} nicht platzieren (Versuche überschritten)')

layout['door'] = new_doors

# Backup original
import shutil
shutil.copy(LAYOUT_PATH, LAYOUT_PATH + '.bak')

with open(LAYOUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(layout, f, indent=2, ensure_ascii=False)

print('layout.json aktualisiert. Backup erstellt: layout.json.bak')
