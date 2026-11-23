"""Import game-used UI chrome from Kasaya's Frames.
Usage: python scripts/import-ui-frames.py /path/to/Kasaya_s_Frames.zip
Requires Pillow. The pack may not be redistributed; only listed sprites are shipped.
"""
from pathlib import Path
from PIL import Image
import json, sys, zipfile

root = Path(__file__).resolve().parents[1]
out = root / 'assets' / 'ui'
out.mkdir(parents=True, exist_ok=True)
zip_path = Path(sys.argv[1])
copies = {
  'slot-helm.png': 'Inventory & chests/2/helm.png',
  'slot-armour.png': 'Inventory & chests/2/armour.png',
  'slot-boot.png': 'Inventory & chests/2/boot.png',
  'slot-bracelet.png': 'Inventory & chests/2/bracelet.png',
  'slot-neck.png': 'Inventory & chests/2/neck.png',
  'slot-ring.png': 'Inventory & chests/2/ring.png',
  'slot-legs.png': 'Inventory & chests/2/legs.png',
  'slot-brown.png': 'Inventory & chests/2/brown slot.png',
  'slot-empty.png': 'Inventory & chests/1/slot1.png',
  'slot-empty-alt.png': 'Inventory & chests/1/slot2.png',
  'slots-grid.png': 'Inventory & chests/1/slots 8x5.png',
  'inventory-panel.png': 'Inventory & chests/1/inventory1.png',
  'inventory-panel-alt.png': 'Inventory & chests/1/inventory2.png',
  'item-describe.png': 'Inventory & chests/1/Item describe1.png',
  'inventory-icons.png': 'Inventory & chests/1/inventory icons.png',
  'select.png': 'Slot select/slot select.png',
  'x.png': 'Inventory & chests/2/x.png',
  'confirm.png': 'Inventory & chests/2/confirm.png',
  'shop-weapons.png': 'Inventory & chests/2/shop/weapons.png',
  'shop-armors.png': 'Inventory & chests/2/shop/armors.png',
  'hotbar.png': 'Inventory & chests/2/hotbar frame.png',
}
sources = {}
with zipfile.ZipFile(zip_path) as z:
  for dest, rel in copies.items():
    data = z.read(rel)
    (out / dest).write_bytes(data)
    im = Image.open(out / dest).convert('RGBA')
    im.save(out / dest)
    sources[dest] = {'pack': zip_path.name, 'path': rel, 'size': list(im.size)}

# Slot atlas
atlas_keys = [('helm', 'slot-helm.png'), ('neck', 'slot-neck.png'), ('armour', 'slot-armour.png'),
              ('boot', 'slot-boot.png'), ('ring', 'slot-ring.png'), ('bracelet', 'slot-bracelet.png'),
              ('legs', 'slot-legs.png'), ('brown', 'slot-brown.png')]
cell = 80
atlas = Image.new('RGBA', (cell * len(atlas_keys), cell), (0, 0, 0, 0))
for i, (key, fname) in enumerate(atlas_keys):
  im = Image.open(out / fname).convert('RGBA')
  canvas = Image.new('RGBA', (cell, cell), (0, 0, 0, 0))
  canvas.paste(im, ((cell - im.width) // 2, (cell - im.height) // 2), im)
  atlas.paste(canvas, (i * cell, 0), canvas)
atlas.save(out / 'slot-atlas.png')
sources['slot-atlas.png'] = {'pack': zip_path.name, 'atlas': [k for k, _ in atlas_keys], 'cell': cell}

# Item icon atlas from white set
icons = Image.open(out / 'inventory-icons.png').convert('RGBA')
cells = {
  'sword': (17, 1, 30, 14), 'helm': (50, 1, 61, 14), 'necklace': (66, 1, 78, 14), 'gem': (83, 1, 92, 14),
  'bow': (17, 17, 30, 30), 'armor': (49, 17, 62, 30), 'glove': (67, 17, 77, 30), 'boots': (82, 17, 93, 30),
  'staff': (17, 33, 30, 46), 'legs': (51, 33, 59, 46), 'ring': (66, 33, 78, 46),
}
order = ['sword', 'bow', 'staff', 'helm', 'armor', 'legs', 'necklace', 'glove', 'ring', 'gem', 'boots']
icon_atlas = Image.new('RGBA', (32 * len(order), 32), (0, 0, 0, 0))
for i, key in enumerate(order):
  x0, y0, x1, y1 = cells[key]
  crop = icons.crop((x0, y0, x1 + 1, y1 + 1))
  canvas = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
  canvas.paste(crop, ((32 - crop.width) // 2, (32 - crop.height) // 2), crop)
  icon_atlas.paste(canvas, (i * 32, 0), canvas)
icon_atlas.save(out / 'item-icons.png')
sources['item-icons.png'] = {'pack': zip_path.name, 'path': copies['inventory-icons.png'], 'order': order}

(out / 'sources.json').write_text(json.dumps(sources, indent=2) + '\n')
(out / 'LICENSE.txt').write_text(
  "Kasaya's Frames — free pixel UI pack by Kasaya\n"
  "Source: https://kasayaa.itch.io/kasayas-inventory-and-frames\n\n"
  "You CAN use this pack in personal and commercial projects.\n"
  "You CAN modify the asset files.\n"
  "You CAN NOT resell or redistribute this asset pack (or any part of it), even if modified.\n"
  "Crediting is optional but appreciated.\n\n"
  "Only the sprites listed in sources.json are bundled for use inside Generations RPG.\n"
)
print('Wrote', len(list(out.iterdir())), 'files to', out)
