"""Import only game-used sprites from the three user-supplied ZIP packs.
Usage: python scripts/import-game-packs.py /path/to/attachment-directory
Requires Pillow. Packs remain governed by their individual licenses.
"""
from pathlib import Path
from PIL import Image
import io,json,zipfile,sys
root=Path(__file__).resolve().parents[1];out=root/'assets/packs';out.mkdir(parents=True,exist_ok=True);meta={};sources={}
for pack in Path(sys.argv[1]).rglob('*.zip'):
 with zipfile.ZipFile(pack) as z:
  if 'effects.json' in z.namelist():
   (out/'pixel-burst-LICENSE.txt').write_bytes(z.read('LICENSE.txt'))
   for item in json.loads(z.read('effects.json'))['effects']:
    key=item['id'];(out/(key+'.png')).write_bytes(z.read(item['sheet']));meta[key]=dict(w=item['frame_width'],h=item['frame_height'],frames=item['frames'],fps=item['fps']);sources[key]=dict(pack=pack.name,path=item['sheet'])
  elif 'Gigapack' in pack.name:
   prefix='Super Pixel Effects Gigapack (Free Version)/';(out/'untied-LICENSE.txt').write_bytes(z.read(prefix+'license.txt'))
   chosen={'hit':'directional_impact_002_small_white','critical':'symmetrical_impact_001_small_yellow','explosion':'epic_explosion_001_small_orange','heal':'spell_heal_001_small_red','shield':'spell_defense_up_001_small_blue','buff':'spell_attack_up_001_small_red','music':'directional_music_burst_001_small_red','sparkle':'round_sparkle_burst_001_small_blue','lightning':'lightning_strike_001_small_violet','flame':'fire_looping_003A_small_orange'}
   for key,folder in chosen.items():
    frames=sorted(n for n in z.namelist() if '/PNG/' in n and '/'+folder+'/' in n and n.endswith('.png'))
    images=[Image.open(io.BytesIO(z.read(n))).convert('RGBA') for n in frames];assert images,folder
    w,h=images[0].size;sheet=Image.new('RGBA',(w*len(images),h))
    for i,im in enumerate(images): assert im.size==(w,h);sheet.paste(im,(i*w,0))
    sheet.save(out/(key+'.png'));meta[key]=dict(w=w,h=h,frames=len(images),fps=15);sources[key]=dict(pack=pack.name,path=frames[0].rsplit('/',1)[0])
  elif 'Interiors' in pack.name:
   prefix='Modern tiles_Free/';(out/'modern-interiors-LICENSE.txt').write_bytes(z.read(prefix+'LICENSE.txt'))
   im=Image.open(io.BytesIO(z.read(prefix+'Interiors_free/16x16/Interiors_free_16x16.png'))).convert('RGBA')
   props={'table':(112,208,160,240),'chair':(96,192,112,224),'bookcase':(160,1088,192,1120),'rug':(112,240,176,288),'plant':(160,704,192,752),'supplies':(80,960,128,1008),'cabinet':(160,768,192,816),'pots':(0,1056,48,1088)}
   atlas=Image.new('RGBA',(64*8,64))
   for i,(key,box) in enumerate(props.items()):
    crop=im.crop(box);atlas.paste(crop,(i*64+(64-crop.width)//2,64-crop.height));sources[key]=dict(pack=pack.name,path=prefix+'Interiors_free/16x16/Interiors_free_16x16.png',crop=box,index=i)
   atlas.save(out/'props.png')
   room=Image.open(io.BytesIO(z.read(prefix+'Interiors_free/16x16/Room_Builder_free_16x16.png')))
   floor=room.crop((176,208,192,224));floor.save(out/'wood-floor.png');sources['wood-floor']=dict(pack=pack.name,crop=[176,208,192,224])
(out/'sources.json').write_text(json.dumps(sources,indent=2)+'\n');(root/'js/pack-data.js').write_text('// Frame geometry from the supplied packs. See assets/packs/sources.json.\nconst PACK_EFFECTS = '+json.dumps(meta)+';\n')
print('Packed',len(meta),'animations and',8,'props;',sum(p.stat().st_size for p in out.iterdir()),'bytes')
