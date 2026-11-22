// Persistent House flags with locally bundled, curated Pixel Art Atlas sigils.
'use strict';
const Heraldry = {
  patterns: ['Solid', 'Halves', 'Quartered', 'Diagonal', 'Cross', 'Saltire', 'Chevron', 'Border', 'Stripes', 'Pale', 'Diamond', 'Canton'],
  shapes: ['Rectangle', 'Square', 'Swallowtail', 'Pennant', 'Shield', 'Rounded'],
  sheet: new Image(), cache: new Map(),
  random() {
    const hue = R.int(0,359);
    return { shape: R.int(0,this.shapes.length-1), pattern: R.int(0,this.patterns.length-1), sigil: R.int(0,SIGILS.length-1),
      primary: [hue,65,26], secondary: [(hue+R.pick([60,120,180,240]))%360,65,68], ink: [R.int(30,60),85,85], original: false };
  },
  color(a) { return `hsl(${a[0]} ${a[1]}% ${a[2]}%)`; },
  ensureAll() {
    if (!G || !G.house) return;
    G.heraldry = G.heraldry || {};
    for (const name of new Set([G.house.name, ...Object.values(G.chars).map(c=>c.house).filter(Boolean)])) {
      if (!G.heraldry[name]) G.heraldry[name] = this.random();
    }
    G.house.heraldry = G.house.heraldry || G.heraldry[G.house.name];
    G.heraldry[G.house.name] = G.house.heraldry;
    G.house.color = this.color(G.house.heraldry.primary);
  },
  sprite(ctx, id, x, y, size, ink) {
    if (!this.sheet.complete || !this.sheet.naturalWidth) return;
    ctx.imageSmoothingEnabled = false;
    if (!ink) return ctx.drawImage(this.sheet,(id%12)*16,Math.floor(id/12)*16,16,16,x,y,size,size);
    const key = `${id}:${ink}`;
    if (!this.cache.has(key)) {
      const cv = document.createElement('canvas');cv.width=cv.height=16;
      const c=cv.getContext('2d');c.drawImage(this.sheet,(id%12)*16,Math.floor(id/12)*16,16,16,0,0,16,16);
      const source=c.getImageData(0,0,16,16);
      c.fillStyle=ink;c.fillRect(0,0,16,16);const tint=c.getImageData(0,0,1,1).data;
      for(let i=0;i<source.data.length;i+=4) {
        const light=(source.data[i]*.2126+source.data[i+1]*.7152+source.data[i+2]*.0722)/255;
        for(let channel=0;channel<3;channel++) source.data[i+channel]=Math.round(tint[channel]*(.18+.82*light));
      }
      c.putImageData(source,0,0);this.cache.set(key,cv);
    }
    ctx.drawImage(this.cache.get(key),x,y,size,size);
  },
  paint(ctx, flag, x, y, w, ht) {
    if (!flag) return;
    ctx.save();ctx.translate(x,y);ctx.scale(w/96,ht/64);
    ctx.beginPath();
    switch(flag.shape) {
      case 1: ctx.rect(16,0,64,64);break;
      case 2: ctx.moveTo(0,0);ctx.lineTo(96,0);ctx.lineTo(78,32);ctx.lineTo(96,64);ctx.lineTo(0,64);break;
      case 3: ctx.moveTo(0,0);ctx.lineTo(96,32);ctx.lineTo(0,64);break;
      case 4: ctx.moveTo(12,0);ctx.lineTo(84,0);ctx.lineTo(84,38);ctx.lineTo(48,64);ctx.lineTo(12,38);break;
      case 5: ctx.roundRect(0,0,96,64,8);break;
      default:ctx.rect(0,0,96,64);
    }
    ctx.closePath();ctx.clip();ctx.fillStyle=this.color(flag.primary);ctx.fillRect(0,0,96,64);
    ctx.fillStyle=this.color(flag.secondary);
    const poly=(points)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
    switch(flag.pattern) {
      case 1:ctx.fillRect(48,0,48,64);break;
      case 2:ctx.fillRect(48,0,48,32);ctx.fillRect(0,32,48,32);break;
      case 3:poly([[0,0],[96,64],[0,64]]);break;
      case 4:ctx.fillRect(40,0,16,64);ctx.fillRect(0,24,96,16);break;
      case 5:poly([[0,0],[12,0],[96,56],[96,64],[84,64],[0,8]]);poly([[84,0],[96,0],[96,8],[12,64],[0,64],[0,56]]);break;
      case 6:poly([[0,48],[48,12],[96,48],[96,64],[48,28],[0,64]]);break;
      case 7:ctx.fillRect(0,0,96,7);ctx.fillRect(0,57,96,7);ctx.fillRect(0,0,7,64);ctx.fillRect(89,0,7,64);break;
      case 8:for(let i=0;i<6;i+=2)ctx.fillRect(0,i*64/6,96,64/6);break;
      case 9:ctx.fillRect(32,0,32,64);break;
      case 10:poly([[48,0],[80,32],[48,64],[16,32]]);break;
      case 11:ctx.fillRect(0,0,44,30);break;
    }
    this.sprite(ctx,flag.sigil,flag.shape===3?14:28,12,40,flag.original?null:this.color(flag.ink));ctx.restore();
  },
  canvas(flag, width=192) {
    const cv=h('canvas',{width,height:Math.round(width*2/3),class:'house-flag',role:'img','aria-label':`House flag: ${this.patterns[flag.pattern]}, ${SIGILS[flag.sigil].name}`});
    this.paint(cv.getContext('2d'),flag,0,0,cv.width,cv.height);return cv;
  },
  editor(initial, onChange) {
    let flag=structuredClone(initial),category=SIGILS[flag.sigil].category;
    const preview=h('div',{class:'heraldry-preview'}), controls=h('div'), grid=h('div',{class:'sigil-grid'});
    const emit=()=>{preview.replaceChildren(this.canvas(flag,288));onChange(structuredClone(flag));};
    const select=(label,values,key)=>h('label',{},label,h('select',{'aria-label':label,onchange:e=>{flag[key]=+e.target.value;emit();}},values.map((v,i)=>h('option',{value:i,selected:flag[key]===i},v))));
    const drawGrid=()=>grid.replaceChildren(...SIGILS.filter(s=>s.category===category).map(s=>{
      const cv=h('canvas',{width:48,height:48,'aria-hidden':'true'});this.sprite(cv.getContext('2d'),s.id,0,0,48,null);
      return h('button',{type:'button',class:flag.sigil===s.id?'selected':'','aria-pressed':flag.sigil===s.id,onclick:()=>{flag.sigil=s.id;emit();drawGrid();}},cv,h('span',{},s.name));
    }));
    const drawControls=()=>{
      controls.replaceChildren(h('div',{class:'row'},select('Flag shape',this.shapes,'shape'),select('Flag pattern',this.patterns,'pattern')),
        h('label',{},h('input',{type:'checkbox',checked:flag.original,onchange:e=>{flag.original=e.target.checked;emit();}}),' Keep original sprite colors'),
        ...[['primary','Field'],['secondary','Pattern'],['ink','Sigil']].map(([key,label])=>h('fieldset',{},h('legend',{},`${label} color`),
          ...['Hue','Saturation','Lightness'].map((name,i)=>{
            const value=h('output',{},flag[key][i]);
            return h('label',{},`${label} ${name}`,h('input',{type:'range','aria-label':`${label} ${name}`,min:0,max:i===0?359:100,value:flag[key][i],oninput:e=>{flag[key][i]=+e.target.value;value.textContent=e.target.value;emit();}}),value);
          }))));
    };
    const categories=[...new Set(SIGILS.map(s=>s.category))];
    const root=h('div',{class:'heraldry-editor'},preview,
      act('Randomize flag & sigil',()=>{flag=this.random();category=SIGILS[flag.sigil].category;categorySelect.value=category;drawControls();drawGrid();emit();}),
      h('p',{class:'dim small'},`${SIGILS.length} pixel sigils · choose a category to browse`));
    const categorySelect=h('select',{'aria-label':'Sigil category',onchange:e=>{category=e.target.value;drawGrid();}},categories.map(c=>h('option',{value:c,selected:c===category},c)));
    root.append(h('label',{},'Sigil category',categorySelect),grid,controls);drawControls();drawGrid();emit();return root;
  },
};
Heraldry.sheet.onload=()=>{Heraldry.cache.clear();if(typeof G!=='undefined'&&G?.mcId) UI.refresh();};
Heraldry.sheet.src='assets/heraldry/sigils.png';
