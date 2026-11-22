"""Import a curated, reproducible CC0 sprite subset; requires pyarrow and Pillow.
Run: python scripts/import-heraldry.py /path/to/validation-000.parquet
The browser uses the bundled sheet and never downloads the full dataset.
"""
import sys,json,io
from pathlib import Path
import pyarrow.parquet as pq
from PIL import Image,ImageDraw
GROUPS={
'Animals':'arctic wolf|brown bear|fox|horse|panther|tiger|bald eagle|golden eagle|hawk|crow|barn owl|snowy owl',
'Mythical':'dragon|crystal dragon|feathered dragon|forest dragon|ice dragon|storm dragon|two-headed dragon|phoenix|hippogriff|nine-tailed fox|spirit deer|sea serpent',
'Weapons':'arming sword|bastard sword|greatsword|crossed swords icon|axe|bearded axe|war axe|spear|barbed spear|battle hammer|war hammer|shield',
'Nature':'oak tree|pine tree|aspen tree|cherry tree|baobab tree|juniper tree|rose|four leaf clover|silverleaf sprig|acorn charm|leaf brooch|eagle feather',
'Celestial':'sun icon|sun amulet|crescent moon|full moon|star|shooting star|star sparkle|fire swirl|flame wisp|fireball|spirit flame|ice crystal icon',
'Regalia':'crown|crown icon|antler crown|horned crown|king\'s crown|queen\'s crown|sunburst crown|tall crown|chalice|medallion|winged key|dungeon key',
'Keeps & craft':'castle|castle battlement|castle gate|castle tower|watchtower|wizard tower|anvil|hammer|book|spellbook|alchemy book|lucky horseshoe',
'Gems':'emerald|ruby|sapphire|gem|gem icon|crystal cluster|crystal shard|heart-cut gem|hexagonal gem|moonstone|star-cut gem|rose quartz',
}
rows=pq.read_table(sys.argv[1]).to_pylist(); by={}
for r in rows: by.setdefault(r['subject'],[]).append(r)
root=Path(__file__).resolve().parents[1];out=root/'assets/heraldry';out.mkdir(parents=True,exist_ok=True)
items=[];sheet=Image.new('RGBA',(16*12,16*8));contact=Image.new('RGB',(960,8*102),'#24232c');d=ImageDraw.Draw(contact)
for category,subjects in GROUPS.items():
 for subject in subjects.split('|'):
  if subject not in by: print('missing',subject);continue
  row=sorted(by[subject],key=lambda r:r['row_id'])[0];i=len(items)
  im=Image.open(io.BytesIO(row['image']['bytes'])).convert('RGBA');assert im.size==(16,16)
  sheet.paste(im,((i%12)*16,(i//12)*16))
  x=(i%12)*80;y=(i//12)*102
  contact.paste(im.resize((64,64),Image.Resampling.NEAREST),(x+8,y),im.resize((64,64),Image.Resampling.NEAREST));d.text((x+2,y+65),str(i)+' '+subject[:11],fill='white')
  items.append(dict(id=i,name=subject.title().replace(' Icon',''),category=category,row_id=row['row_id'],subject=subject,caption=row['caption']))
sheet.save(out/'sigils.png');contact.save('/tmp/heraldry-contact.png')
(out/'catalog.json').write_text(json.dumps(items,indent=2)+'\n')
(root/'js/heraldry-data.js').write_text('// Curated Pixel Art Atlas sprites. Provenance: assets/heraldry/catalog.json\nconst SIGILS = '+json.dumps([{k:v for k,v in i.items() if k in ('id','name','category')} for i in items])+';\n')
print('Imported',len(items),'sigils')
