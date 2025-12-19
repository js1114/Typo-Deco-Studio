/* =====================================================
   Typo Deco Studio — App (v12.9: Mosaic Effect)
   - REPLACED: Bold effect with Mosaic.
   - ADDED: createMosaicTexture to generate tile grid.
   ===================================================== */

// ---------- DOM refs ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const canvas = document.getElementById('mainCanvas');
const stage = document.getElementById('stage');
const mainCtx = canvas.getContext('2d');

const inputText = document.getElementById('textInput');
const textCount = document.getElementById('textCount') || document.getElementById('len');
const fontGrid = document.getElementById('fontGrid');

const sizeRange = document.getElementById('sizeRange');
const rotateRange = document.getElementById('rotateRange');
const outlineRange = document.getElementById('outlineRange');

const shadowXRange = document.getElementById('shadowXRange');
const shadowYRange = document.getElementById('shadowYRange');
const shadowBlurRange = document.getElementById('shadowBlurRange');
const shadowToggle = document.getElementById('shadowToggle');

const colorPicker = document.getElementById('colorPicker');
const colorHistoryWrap = document.getElementById('colorHistory');
const colorTargetToggle = document.getElementById('colorTargetToggle');

const patternGrid = document.getElementById('patternGrid');
const patternTargetToggle = document.getElementById('patternTargetToggle');

// Effect Grid
const effectGrid = document.getElementById('effectGrid');

const bgTransparent = document.getElementById('bgTransparent');
const bgSolid = document.getElementById('bgSolid');
const bgImage = document.getElementById('bgImage');
const bgColorInput = document.getElementById('bgColor');
const bgFileInput = document.getElementById('bgFile');

// Preset DOM removed

const btnRandom = document.getElementById('btnRandom');
const btnClearSel = document.getElementById('btnClearSel');
const btnReset = document.getElementById('btnReset');
const btnDownload = document.getElementById('btnDownload');
const soundToggle = document.getElementById('soundToggle');

const stickerDock = document.getElementById('stickerDock');
const clickAudio = document.getElementById('clickAudio') || document.getElementById('clickSnd');
const processingIndicator = document.getElementById('processingIndicator');

// Modal Elements
const downloadModal = document.getElementById('downloadModal');
const closeModal = document.getElementById('closeModal');
const btnSavePng = document.getElementById('btnSavePng');
const btnSaveGif = document.getElementById('btnSaveGif');

// ---------- Global state ----------
let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

// 초기 기본값: AngelicWar, #b7a9a9, Stroke 0, Effect 'metal'
let base = {
  font: 'AngelicWar',
  size: 120,
  rot: 0,
  fill: '#b7a9a9',
  stroke: 0,
  strokeColor:'#000000',
  shadowX: 4,
  shadowY: 4,
  shadowBlur: 8,
  pattern: null,
  strokePattern: null,
  effect: 'metal'
};

let shadowEnabled = true;
let editTarget = 'fill';
let textString = 'Writing text';
let selection = new Set();
let textChars = [];
let stickers = [];
let activeSticker = -1;

let bgMode = 'transparent';
let bgColor = '#FFFFFF'; 
let bgImageObj = null;

const imageCache = new Map(); 
const animatedAssets = new Set(); 

const STK_TOOL = { padY: 12, btnW: 28, btnH: 22, gap: 8, icons: ['↔','⬆','⬇','❐','❌'] };
const STK_HANDLE_SIZE = 12;
const ROT_BOUNDARY = 20;

let stickerMode = 'none';
let dragOffset = {x:0, y:0};
let startW = 0, startH = 0, startRot = 0, startDist = 0, startAngle = 0;

const stickerPacks = [
    { base: 'sticker1.gif', count: 4, currentIndex: 0 },
    { base: 'sticker2.gif', count: 4, currentIndex: 0 },
    { base: 'sticker3.gif', count: 4, currentIndex: 0 },
    { base: 'sticker4.gif', count: 4, currentIndex: 0 },
    { base: 'sticker5.gif', count: 4, currentIndex: 0 },
    { base: 'sticker6.gif', count: 4, currentIndex: 0 },
    { base: 'sticker7.gif', count: 4, currentIndex: 0 },
    { base: 'sticker8.gif', count: 4, currentIndex: 0 },
    { base: 'sticker9.gif', count: 4, currentIndex: 0 },
    { base: 'sticker10.gif', count: 4, currentIndex: 0 }
];

const FONT_LIST = [
  'Darling','CAMPUS_PERSONAL_USE','mieszkanie9','White_On_Black','built_titling_el_it','AngelicWar','HawaiiLover',
  'Gothik_Steel','WordsTakenDemo','gomarice_bat_men'
];

// ---------- Core Functions ----------

function resizeCanvasForDPR(){
  const cssW = canvas.getAttribute('width');
  const cssH = canvas.getAttribute('height');
  const w = Number(cssW), h = Number(cssH);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  mainCtx.setTransform(dpr,0,0,dpr,0,0);
}

function fontString(size, family){
  return `${size}px '${family}', system-ui, sans-serif`;
}

function layoutText(){
  const prev = textChars || [];
  const next = [];

  for(let i=0; i<textString.length; i++){
    const ch = textString[i];
    const gPrev = prev[i];
    let style = { ...base };
    if (gPrev && gPrev.ch === ch) {
      style = {
        size: gPrev.size, rot: gPrev.rot, font: gPrev.font,
        fill: gPrev.fill, stroke: gPrev.stroke, strokeColor: gPrev.strokeColor,
        shadowX: gPrev.shadowX, shadowY: gPrev.shadowY, shadowBlur: gPrev.shadowBlur,
        pattern: gPrev.pattern, strokePattern: gPrev.strokePattern,
        effect: gPrev.effect
      };
    }
    next[i] = { ch, x: 0, y: 0, ...style };
  }

  const W = canvas.width/dpr, H = canvas.height/dpr;
  const V_SPACING = 1.2;
  const lines = textString.split('\n');
  const lineHeight = base.size * V_SPACING;
  const totalHeight = (lines.length * lineHeight) - (base.size * (V_SPACING - 1));
  let currentY = H/2 - totalHeight/2;
  let gIndex = 0;

  lines.forEach(line => {
    mainCtx.save();
    let lineWidth = 0;
    const widths = [];
    for(let i=0; i<line.length; i++){
      const g = next[gIndex + i];
      mainCtx.font = fontString(g.size, g.font);
      const w = mainCtx.measureText(g.ch).width;
      widths.push(w);
      lineWidth += w;
    }
    mainCtx.restore();

    let currentX = W/2 - lineWidth/2;
    const lineCenterY = currentY + (base.size / 2);

    for(let i=0; i<line.length; i++){
      const g = next[gIndex];
      g.x = currentX + widths[i]/2;
      g.y = lineCenterY;
      currentX += widths[i];
      gIndex++;
    }
    if(gIndex < next.length && next[gIndex].ch === '\n') {
       next[gIndex].x = 0; next[gIndex].y = 0; gIndex++;
    }
    currentY += lineHeight;
  });
  textChars = next;
}

function getTextBounds() {
    if (textChars.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    mainCtx.save();
    textChars.forEach(g => {
        if (g.ch === '\n') return;
        mainCtx.font = fontString(g.size, g.font);
        const m = mainCtx.measureText(g.ch);
        const w = m.width + 8, h = g.size * 1.2;
        const halfW = w / 2, halfH = h / 2;
        const rad = (g.rot * Math.PI) / 180;
        const corners = [{x: -halfW, y: -halfH}, {x: halfW, y: -halfH}, {x: -halfW, y: halfH}, {x: halfW, y: halfH}];
        corners.forEach(p => {
            const rx = p.x * Math.cos(rad) - p.y * Math.sin(rad);
            const ry = p.x * Math.sin(rad) + p.y * Math.cos(rad);
            const finalX = rx + g.x, finalY = ry + g.y;
            if(finalX < minX) minX = finalX; if(finalX > maxX) maxX = finalX;
            if(finalY < minY) minY = finalY; if(finalY > maxY) maxY = finalY;
        });
    });
    mainCtx.restore();
    if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// ---------- Animation Loop ----------
let isLooping = false;
let rafId = null;

function startLoop() {
  if (isLooping) return;
  isLooping = true;
  loop();
}

function loop() {
  if (animatedAssets.size > 0) {
    render();
    rafId = requestAnimationFrame(loop);
  } else {
    isLooping = false;
    render();
  }
}

function getDrawable(assetKeyOrObj) {
  if (!assetKeyOrObj) return null;
  if (typeof assetKeyOrObj === 'string') {
    const asset = imageCache.get(assetKeyOrObj);
    if (!asset) return null;
    if (asset.isGif) return asset.get_canvas();
    return asset;
  }
  if (assetKeyOrObj.isGif) return assetKeyOrObj.get_canvas();
  return assetKeyOrObj;
}

// ---------- STRONG Procedural Textures ----------

function createGlitterTexture(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const idata = ctx.createImageData(w, h);
  const buffer32 = new Uint32Array(idata.data.buffer);
  const len = buffer32.length;
  for (let i = 0; i < len; i++) {
      const r = Math.random();
      let val;
      if (r > 0.8) val = 255; else if (r > 0.5) val = 180; else val = 40;
      const bVar = val + (Math.random() * 20); 
      buffer32[i] = (255 << 24) | (Math.min(255, bVar) << 16) | (val << 8) | val;
  }
  ctx.putImageData(idata, 0, 0);
  const sparkleCount = Math.floor((w * h) / 1500);
  ctx.fillStyle = '#FFFFFF';
  for(let i=0; i<sparkleCount; i++){
      const x = Math.random() * w; const y = Math.random() * h;
      const size = Math.random() * 3 + 2;
      ctx.globalAlpha = Math.random() * 0.5 + 0.5;
      ctx.fillRect(x - size, y - 0.5, size*2, 1);
      ctx.fillRect(x - 0.5, y - size, 1, size*2);
      ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI*2); ctx.fill();
  }
  return c;
}

function createMetalTexture(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.00, '#2a2a2a'); grad.addColorStop(0.20, '#555555');
  grad.addColorStop(0.40, '#888888'); grad.addColorStop(0.47, '#bbbbbb');
  grad.addColorStop(0.49, '#ffffff'); grad.addColorStop(0.495, '#ffffff');
  grad.addColorStop(0.50, '#000000'); grad.addColorStop(0.55, '#333333');
  grad.addColorStop(0.75, '#999999'); grad.addColorStop(1.00, '#eeeeee');
  ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation = 'overlay';
  const shine = ctx.createLinearGradient(0, 0, w, h);
  shine.addColorStop(0.3, 'rgba(255,255,255,0)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.4)');
  shine.addColorStop(0.7, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine; ctx.fillRect(0,0,w,h);
  return c;
}

// [New] Mosaic Texture
function createMosaicTexture(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const tileSize = 8; // Size of mosaic tiles

  for(let y=0; y<h; y+=tileSize) {
      for(let x=0; x<w; x+=tileSize) {
          // Generate a random gray value
          const gray = Math.floor(Math.random() * 255);
          ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
          ctx.fillRect(x, y, tileSize, tileSize);
          
          // Optional: Add faint border for tile separation
          ctx.strokeStyle = `rgba(0,0,0,0.1)`;
          ctx.strokeRect(x,y,tileSize,tileSize);
      }
  }
  return c;
}

// ---------- Render Logic ----------

function render(targetCtx = mainCtx){
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;

  if (!targetCtx || typeof targetCtx.clearRect !== 'function') {
      targetCtx = mainCtx;
  }

  targetCtx.clearRect(0, 0, W, H);

  if(bgMode === 'solid'){
    targetCtx.fillStyle = bgColor;
    targetCtx.fillRect(0, 0, W, H);
  } else if(bgMode === 'image' && bgImageObj){
    let iw = bgImageObj.naturalWidth, ih = bgImageObj.naturalHeight;
    const scale = Math.min(W/iw, H/ih);
    const dw = iw*scale, dh = ih*scale;
    const dx = (W-dw)/2, dy = (H-dh)/2;
    targetCtx.drawImage(bgImageObj, dx, dy, dw, dh);
  }

  stickers.forEach((s, i) => { if (s.layer === 'below') drawSticker(s, i === activeSticker, targetCtx); });
  drawAllText(targetCtx);
  stickers.forEach((s, i) => { if (s.layer === 'above') drawSticker(s, i === activeSticker, targetCtx); });
}

function drawAllText(ctx = mainCtx) {
  const cx = (canvas.width/dpr)/2, cy = (canvas.height/dpr)/2;
  const bounds = getTextBounds(); 
  const PATTERN_V_OFFSET = base.size * -0.05;

  ctx.save();

  if (shadowEnabled) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate((Math.PI/180) * base.rot); ctx.translate(-cx, -cy);
      textChars.forEach(g => drawGlyph(g, false, 'shadow', ctx));
      ctx.restore();
  }

  const strokeBatches = {};
  textChars.forEach((g, i) => {
      const key = g.strokePattern || 'null';
      if (!strokeBatches[key]) strokeBatches[key] = [];
      strokeBatches[key].push(i);
  });

  Object.entries(strokeBatches).forEach(([patKey, indices]) => {
      if (patKey === 'null') {
          ctx.save();
          ctx.translate(cx, cy); ctx.rotate((Math.PI/180) * base.rot); ctx.translate(-cx, -cy);
          indices.forEach(i => drawGlyph(textChars[i], selection.has(i), 'stroke-color', ctx));
          ctx.restore();
      } else {
          // UPDATE PATH TO HEAVEN
          const imgKey = `./assets/heaven/patterns/${patKey}`;
          const img = getDrawable(imgKey);
          if (img) {
              drawPatternBatch(ctx, indices, img, 'stroke', bounds, cx, cy, PATTERN_V_OFFSET);
          } else {
               ctx.save();
               ctx.translate(cx, cy); ctx.rotate((Math.PI/180) * base.rot); ctx.translate(-cx, -cy);
               indices.forEach(i => drawGlyph(textChars[i], selection.has(i), 'stroke-color', ctx));
               ctx.restore();
          }
      }
  });

  const fillBatches = {};
  textChars.forEach((g, i) => {
      const key = g.pattern || 'null';
      if (!fillBatches[key]) fillBatches[key] = [];
      fillBatches[key].push(i);
  });

  Object.entries(fillBatches).forEach(([patKey, indices]) => {
      if (patKey === 'null') {
          ctx.save();
          ctx.translate(cx, cy); ctx.rotate((Math.PI/180) * base.rot); ctx.translate(-cx, -cy);
          indices.forEach(i => drawGlyph(textChars[i], selection.has(i), 'fill-color', ctx));
          ctx.restore();
      } else {
          // UPDATE PATH TO HEAVEN
          const imgKey = `./assets/heaven/patterns/${patKey}`;
          const img = getDrawable(imgKey);
          if (img) {
               drawPatternBatch(ctx, indices, img, 'fill', bounds, cx, cy, PATTERN_V_OFFSET);
          } else {
               ctx.save();
               ctx.translate(cx, cy); ctx.rotate((Math.PI/180) * base.rot); ctx.translate(-cx, -cy);
               indices.forEach(i => drawGlyph(textChars[i], selection.has(i), 'fill-color', ctx));
               ctx.restore();
          }
      }
  });

  const effectBatches = {};
  textChars.forEach((g, i) => {
      const key = g.effect || 'none';
      if(key !== 'none') {
          if(!effectBatches[key]) effectBatches[key] = [];
          effectBatches[key].push(i);
      }
  });

  Object.entries(effectBatches).forEach(([effectType, indices]) => {
      drawEffectBatch(ctx, indices, effectType, bounds, cx, cy, PATTERN_V_OFFSET);
  });

  ctx.save();
  ctx.translate(cx, cy); ctx.rotate((Math.PI/180) * base.rot); ctx.translate(-cx, -cy);
  textChars.forEach((g, i) => { if (selection.has(i)) drawGlyph(g, true, 'selection', ctx); });
  ctx.restore();
  
  ctx.restore();
}

function drawPatternBatch(ctx, indices, img, passType, bounds, cx, cy, vOffset) {
    const mask = document.createElement('canvas');
    mask.width = canvas.width; mask.height = canvas.height;
    const mCtx = mask.getContext('2d');
    mCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    mCtx.translate(cx, cy); mCtx.rotate((Math.PI/180) * base.rot); mCtx.translate(-cx, -cy);
    mCtx.fillStyle = '#FFFFFF'; mCtx.strokeStyle = '#FFFFFF';
    indices.forEach(i => drawGlyphShape(textChars[i], passType, mCtx));

    const tempC = document.createElement('canvas');
    tempC.width = canvas.width; tempC.height = canvas.height;
    const tempCtx = tempC.getContext('2d');
    tempCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    tempCtx.save();
    tempCtx.translate(cx, cy); tempCtx.rotate((Math.PI/180) * base.rot); tempCtx.translate(-cx, -cy);

    const natW = img.width || img.naturalWidth || 100;
    const natH = img.height || img.naturalHeight || 100;
    const patternScale = Math.max(bounds.width / natW, bounds.height / natH);
    const drawW = natW * patternScale, drawH = natH * patternScale;
    const screenDx = bounds.minX + (bounds.width - drawW) / 2;
    const screenDy = bounds.minY + (bounds.height - drawH) / 2 + vOffset;

    const rotRad = (Math.PI/180) * base.rot;
    const c = Math.cos(-rotRad), s = Math.sin(-rotRad);
    const relX = screenDx - cx, relY = screenDy - cy;
    const drawDx = relX * c - relY * s + cx, drawDy = relX * s + relY * c + cy;
    
    tempCtx.drawImage(img, drawDx, drawDy, drawW, drawH);
    tempCtx.restore();

    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(mask, 0, 0, canvas.width/dpr, canvas.height/dpr);
    
    ctx.drawImage(tempC, 0, 0, canvas.width/dpr, canvas.height/dpr);
}

function drawEffectBatch(ctx, indices, effectType, bounds, cx, cy, vOffset) {
    const mask = document.createElement('canvas');
    mask.width = canvas.width; mask.height = canvas.height;
    const mCtx = mask.getContext('2d');
    mCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    mCtx.translate(cx, cy); mCtx.rotate((Math.PI/180) * base.rot); mCtx.translate(-cx, -cy);
    mCtx.fillStyle = '#FFFFFF'; mCtx.strokeStyle = '#FFFFFF';
    
    indices.forEach(i => {
        drawGlyphShape(textChars[i], 'fill', mCtx);
        drawGlyphShape(textChars[i], 'stroke', mCtx); 
    });

    const w = canvas.width/dpr, h = canvas.height/dpr;
    let texture = null;
    if(effectType === 'glitter') texture = createGlitterTexture(w, h);
    if(effectType === 'metal') texture = createMetalTexture(w, h);
    if(effectType === 'mosaic') texture = createMosaicTexture(w, h); // New Mosaic

    if(!texture) return;

    const comp = document.createElement('canvas');
    comp.width = canvas.width; comp.height = canvas.height;
    const cCtx = comp.getContext('2d');
    cCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Apply texture
    cCtx.drawImage(texture, 0, 0, w, h);
    
    // Mask texture to text shape
    cCtx.globalCompositeOperation = 'destination-in';
    cCtx.drawImage(mask, 0, 0, w, h);

    ctx.save();
    if(effectType === 'metal') {
        ctx.globalCompositeOperation = 'hard-light'; 
        ctx.globalAlpha = 1.0; 
    } else if (effectType === 'mosaic') {
        ctx.globalCompositeOperation = 'overlay'; // Mosaic Overlay
    } else if (effectType === 'glitter') {
        ctx.globalCompositeOperation = 'overlay';
        ctx.drawImage(comp, 0, 0, w, h);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.6;
    }
    ctx.drawImage(comp, 0, 0, w, h);
    ctx.restore();
}

function drawGlyphShape(g, passType, targetCtx) {
  if (g.ch === '\n') return;
  const V_ADJ = -g.size * 0.05; 
  targetCtx.save();
  targetCtx.translate(g.x, g.y); targetCtx.rotate((Math.PI/180)*g.rot);
  targetCtx.font = fontString(g.size, g.font);
  targetCtx.textAlign = 'center'; targetCtx.textBaseline = 'middle'; targetCtx.lineJoin = 'round';
  if (passType === 'stroke' && g.stroke > 0) { targetCtx.lineWidth = g.stroke; targetCtx.strokeText(g.ch, 0, V_ADJ); } 
  else if (passType === 'fill') { targetCtx.fillText(g.ch, 0, V_ADJ); }
  targetCtx.restore();
}

function drawGlyph(g, selected, pass, ctx = mainCtx){
  if (g.ch === '\n') return;
  const V_ADJ = -g.size * 0.05; 
  ctx.save();
  ctx.translate(g.x, g.y); ctx.rotate((Math.PI/180)*g.rot);
  ctx.font = fontString(g.size, g.font);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';

  if (pass === 'shadow') {
    ctx.shadowOffsetX = g.shadowX; ctx.shadowOffsetY = g.shadowY; ctx.shadowBlur = g.shadowBlur;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'; ctx.fillStyle = 'black';
    ctx.fillText(g.ch, 0, V_ADJ); 
    if (g.stroke > 0) { ctx.lineWidth = g.stroke; ctx.strokeStyle = 'black'; ctx.strokeText(g.ch, 0, V_ADJ); }
  } else if (pass === 'stroke-color') {
    if (g.stroke > 0) { ctx.lineWidth = g.stroke; ctx.strokeStyle = g.strokeColor || '#000000'; ctx.strokeText(g.ch, 0, V_ADJ); }
  } else if (pass === 'fill-color') {
    ctx.fillStyle = g.fill; ctx.fillText(g.ch, 0, V_ADJ);
  } else if (pass === 'selection' && selected){
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.shadowBlur = 0;
    const m = ctx.measureText(g.ch);
    const w = m.width + 8; const h = g.size * 1.2;
    ctx.rotate(-(Math.PI/180)*g.rot);
    ctx.strokeStyle = '#FF1493'; ctx.lineWidth = 2; ctx.setLineDash([4, 2]); 
    ctx.strokeRect(-w/2, -h/2, w, h); ctx.setLineDash([]); 
  }
  ctx.restore();
}

function drawSticker(s, active, ctx = mainCtx){
  ctx.save();
  ctx.translate(s.x, s.y); ctx.rotate((Math.PI/180)*s.rot);
  const drawW = Math.abs(s.w), drawH = Math.abs(s.h);
  const halfW = drawW / 2, halfH = drawH / 2;

  ctx.save();
  ctx.scale(s.flipX ? -1 : 1, 1);
  const drawable = getDrawable(s.img);
  if (drawable) ctx.drawImage(drawable, -halfW, -halfH, drawW, drawH);
  ctx.restore();

  if(active){
    ctx.setLineDash([6,4]); ctx.strokeStyle = '#FF1493'; ctx.lineWidth = 2;
    ctx.strokeRect(-halfW, -halfH, drawW, drawH); ctx.setLineDash([]);
    const handleCoords = [{x: -halfW, y: -halfH}, {x: halfW, y: -halfH}, {x: -halfW, y: halfH}, {x: halfW, y: halfH}];
    handleCoords.forEach(c => drawHandle(c.x, c.y, '#fff', ctx));
    const y = -halfH - STK_TOOL.padY - STK_TOOL.btnH;
    let x = - (STK_TOOL.icons.length*STK_TOOL.btnW + (STK_TOOL.icons.length-1)*STK_TOOL.gap)/2;
    for(const ic of STK_TOOL.icons){
      drawToolButton(x, y, STK_TOOL.btnW, STK_TOOL.btnH, ic, ctx);
      x += STK_TOOL.btnW + STK_TOOL.gap;
    }
  }
  ctx.restore();
}

function drawHandle(x, y, color, ctx = mainCtx) {
  const size = STK_HANDLE_SIZE;
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  ctx.fillRect(x - size/2, y - size/2, size, size);
  ctx.strokeRect(x - size/2, y - size/2, size, size);
  ctx.restore();
}

function drawToolButton(x,y,w,h,label, ctx = mainCtx){
  ctx.save();
  ctx.fillStyle = '#16161c'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#ffffff'; ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w/2, y + h/2 + 1);
  ctx.restore();
}

// ---------- Asset Loading (Revised) ----------
function loadImage(src){
  if(imageCache.has(src)) return Promise.resolve(imageCache.get(src));
  
  return new Promise((res) => {
    const isGifExt = src.toLowerCase().endsWith('.gif');
    let hasResolved = false;
    
    // Safety Fallback Logic
    const loadStatic = (loadedImg = null) => {
        if (hasResolved) return;
        hasResolved = true; 

        if (loadedImg) {
            imageCache.set(src, loadedImg);
            res(loadedImg);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            imageCache.set(src, img);
            res(img);
        };
        img.onerror = () => {
            console.warn("Failed to load image (static fallback):", src);
            res(null);
        };
        img.src = src;
    };

    if (isGifExt && window.SuperGif) {
        // [New Logic]: Verify file header to handle PNGs renamed as .gif
        fetch(src)
            .then(resp => {
                if (!resp.ok) throw new Error("Network response was not ok");
                return resp.arrayBuffer();
            })
            .then(buffer => {
                const arr = new Uint8Array(buffer).subarray(0, 3);
                // Check for 'GIF' ascii (0x47, 0x49, 0x46)
                const isGif = (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46);
                
                if (!isGif) {
                    // Fallback for renamed PNGs/JPGs
                    console.warn("Detected non-GIF header for .gif file, falling back to static load:", src);
                    loadStatic();
                    return;
                }

                // Is a valid GIF, try SuperGif
                const img = document.createElement('img');
                img.crossOrigin = 'anonymous'; 
                img.onload = () => {
                    try {
                        const superGif = new SuperGif({ 
                            gif: img, 
                            auto_play: true, 
                            loop_mode: true, 
                            draw_while_loading: false 
                        });
                        superGif.load(() => {
                            if (hasResolved) return;
                            hasResolved = true;
                            const wrapper = {
                                isGif: true,
                                get_canvas: () => superGif.get_canvas(),
                                width: superGif.get_canvas().width,
                                height: superGif.get_canvas().height,
                                naturalWidth: superGif.get_canvas().width,
                                naturalHeight: superGif.get_canvas().height
                            };
                            imageCache.set(src, wrapper);
                            animatedAssets.add(src);
                            startLoop();
                            res(wrapper);
                        });
                    } catch(e) {
                        console.warn("SuperGif error:", e);
                        loadStatic(img);
                    }
                };
                img.onerror = () => loadStatic();
                img.src = src;
            })
            .catch(e => {
                console.warn("Fetch check failed:", e);
                loadStatic();
            });
    } else {
        loadStatic();
    }
  });
}

function updateStickerSlot(slotElement, slotIndex) {
  const thumb = slotElement.querySelector('.thumb');
  if (!thumb) return;
  const pack = stickerPacks[slotIndex];
  const extension = pack.base.match(/\.(png|jpg|jpeg|gif|webp)$/i)?.[0] || '.png';
  const baseName = pack.base.replace(extension, '');
  const currentFilename = pack.currentIndex === 0 ? pack.base : `${baseName}.${pack.currentIndex}${extension}`;
  thumb.dataset.sticker = currentFilename;
  // UPDATE PATH TO HEAVEN
  thumb.style.backgroundImage = `url(./assets/heaven/stickers/${currentFilename})`;
}

function addSticker(file){
  // UPDATE PATH TO HEAVEN
  const key = `./assets/heaven/stickers/${file}`;
  loadImage(key).then(asset=>{
    if(!asset) {
        console.error("Image asset failed to load completely");
        return; 
    }
    const maxDim = 240;
    const wRaw = asset.width || asset.naturalWidth || 200;
    const hRaw = asset.height || asset.naturalHeight || 200;
    const ratio = wRaw / hRaw;
    let w = maxDim, h = maxDim;
    if (ratio > 1) h = maxDim / ratio; else w = maxDim * ratio;
    const s = {
      img: asset,
      x: canvas.width/dpr/2, y: canvas.height/dpr/2,
      w: w, h: h, rot: 0, flipX: false, layer: 'above'
    };
    stickers.push(s);
    activeSticker = stickers.length-1;
    render();
  });
}

// ---------- Interaction & Math ----------
function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = (canvas.width / dpr) / rect.width;
  const scaleY = (canvas.height / dpr) / rect.height;
  return { 
      x: (e.clientX - rect.left) * scaleX, 
      y: (e.clientY - rect.top) * scaleY 
  };
}

function getDistance(x1, y1, x2, y2) { return Math.sqrt((x2 - x1)**2 + (y2 - y1)**2); }
function getAngle(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI; }
function rotatePoint(x,y,rad){ return { x: x*Math.cos(rad) - y*Math.sin(rad), y: x*Math.sin(rad) + y*Math.cos(rad) }; }
function rotateAround(x,y,cx,cy,rad){ const p = rotatePoint(x-cx, y-cy, rad); return { x: p.x + cx, y: p.y + cy }; };

function checkRotZone(s, mx, my) {
    const l = rotatePoint(mx - s.x, my - s.y, -s.rot * Math.PI/180);
    const hw = Math.abs(s.w)/2, hh = Math.abs(s.h)/2;
    return (Math.abs(l.x) < hw + ROT_BOUNDARY) && (l.y < -hh) && (l.y > -hh - 40);
}

function hitStickerHandle(s, mx, my) {
  const l = rotatePoint(mx - s.x, my - s.y, -s.rot * Math.PI/180);
  const sz = STK_HANDLE_SIZE + 10;
  const hsz = sz/2, hw = Math.abs(s.w)/2, hh = Math.abs(s.h)/2;
  const hs = [{n:'tl',x:-hw,y:-hh}, {n:'tr',x:hw,y:-hh}, {n:'bl',x:-hw,y:hh}, {n:'br',x:hw,y:hh}];
  for(const h of hs) { if(l.x >= h.x-hsz && l.x <= h.x+hsz && l.y >= h.y-hsz && l.y <= h.y+hsz) return h.n; }
  return null;
}

function hitSticker(mx,my){
  for(let i=stickers.length-1;i>=0;i--){
    const s = stickers[i];
    const p = rotatePoint(mx - s.x, my - s.y, -s.rot * Math.PI/180);
    if(Math.abs(p.x) <= Math.abs(s.w)/2 && Math.abs(p.y) <= Math.abs(s.h)/2) return i;
  }
  return -1;
}

function hitStickerToolbar(s, mx, my){
  const l = rotatePoint(mx - s.x, my - s.y, -s.rot * Math.PI/180);
  const hh = Math.abs(s.h)/2;
  const y = -hh - STK_TOOL.padY - STK_TOOL.btnH;
  let x = - (STK_TOOL.icons.length*STK_TOOL.btnW + (STK_TOOL.icons.length-1)*STK_TOOL.gap)/2;
  for(let i=0;i<STK_TOOL.icons.length;i++){
    if(l.x>=x && l.x<=x+STK_TOOL.btnW && l.y>=y && l.y<=y+STK_TOOL.btnH) return i;
    x += STK_TOOL.btnW + STK_TOOL.gap;
  }
  return -1;
}

function handleToolbarAction(idx, s){
  if(idx===0) s.flipX = !s.flipX;
  if(idx===1) s.layer = 'above';
  if(idx===2) s.layer = 'below';
  if(idx===3) { const c = { ...s }; c.x += 20; c.y += 20; stickers.push(c); activeSticker = stickers.length - 1; }
  if(idx===4) { stickers.splice(stickers.indexOf(s),1); activeSticker = -1; }
}

function hitGlyph(mx,my){
  const cx = canvas.width/dpr/2, cy = canvas.height/dpr/2;
  const p = rotateAround(mx,my, cx,cy, -base.rot * Math.PI/180);
  for(let i=textChars.length-1;i>=0;i--){
    const g = textChars[i];
    if (g.ch === '\n') continue;
    const r = rotatePoint(p.x - g.x, p.y - g.y, -g.rot*Math.PI/180);
    mainCtx.save(); mainCtx.font = fontString(g.size, g.font);
    const m = mainCtx.measureText(g.ch); mainCtx.restore();
    if(Math.abs(r.x) <= (m.width+8)/2 && Math.abs(r.y) <= (g.size*1.2)/2) return i;
  }
  return -1;
}

// ---------- Events ----------
function bindEvents(){
  inputText.addEventListener('input', e=>{ textString = inputText.value; updateCount(); layoutText(); selection.clear(); render(); });
  sizeRange.addEventListener('input', ()=>{ const v=Number(sizeRange.value); if(selection.size) selection.forEach(i=>textChars[i].size=v); else { base.size=v; textChars.forEach(g=>g.size=v); } layoutText(); render(); });
  rotateRange.addEventListener('input', ()=>{ const v=Number(rotateRange.value); if(selection.size) selection.forEach(i=>textChars[i].rot=v); else base.rot=v; layoutText(); render(); });
  outlineRange.addEventListener('input', ()=>{ const v=Number(outlineRange.value); if(selection.size) selection.forEach(i=>textChars[i].stroke=v); else { base.stroke=v; textChars.forEach(g=>g.stroke=v); } render(); });
  
  [shadowXRange, shadowYRange, shadowBlurRange].forEach(r => r && r.addEventListener('input', ()=>{
    const prop = r.id.replace('Range',''); const val = Number(r.value);
    if(selection.size) selection.forEach(i=>textChars[i][prop]=val); else { base[prop]=val; textChars.forEach(g=>g[prop]=val); } render();
  }));

  if(shadowToggle) shadowToggle.addEventListener('click', ()=>{ shadowEnabled = !shadowEnabled; shadowToggle.setAttribute('aria-pressed', String(shadowEnabled)); shadowToggle.textContent = shadowEnabled ? 'ON' : 'OFF'; render(); });

  fontGrid.addEventListener('click', e=>{
    const btn = e.target.closest('.fontBtn'); if(!btn) return; playClick();
    const font = btn.dataset.font;
    if(selection.size) selection.forEach(i=>textChars[i].font=font); else { base.font=font; textChars.forEach(g=>g.font=font); }
    layoutText(); render(); document.fonts.load(`16px '${font}'`).then(()=>{ layoutText(); render(); });
  });

  colorPicker.addEventListener('input', ()=>{ applyColor(colorPicker.value); });
  colorPicker.addEventListener('change', ()=>{ pushColorHistory(colorPicker.value); });
  colorHistoryWrap.addEventListener('click', e=>{ const b=e.target.closest('button'); if(b&&b.dataset.color){ colorPicker.value=b.dataset.color; applyColor(b.dataset.color); }});
  
  patternGrid.addEventListener('click', e=>{ const btn=e.target.closest('button'); if(btn) setPattern(btn.dataset.pattern==='none'?null:btn.dataset.pattern); });
  
  if(colorTargetToggle) colorTargetToggle.addEventListener('click', ()=>{ editTarget=editTarget==='fill'?'stroke':'fill'; updateTargetToggles(); });
  if(patternTargetToggle) patternTargetToggle.addEventListener('click', ()=>{ editTarget=editTarget==='fill'?'stroke':'fill'; updateTargetToggles(); });

  // Effect Events
  if(effectGrid) effectGrid.addEventListener('click', e => {
      const btn = e.target.closest('.effectBtn');
      if(!btn) return;
      playClick();
      const eff = btn.dataset.effect;
      if(selection.size) selection.forEach(i=>textChars[i].effect=eff); else { base.effect=eff; textChars.forEach(g=>g.effect=eff); }
      render();
  });

  [bgTransparent, bgSolid, bgImage].forEach(r=>{
      r.addEventListener('change', ()=>{
          if(bgTransparent.checked){ bgMode='transparent'; bgColorInput.disabled=true; bgFileInput.disabled=true; }
          if(bgSolid.checked){ bgMode='solid'; bgColorInput.disabled=false; bgFileInput.disabled=true; }
          if(bgImage.checked){ bgMode='image'; bgColorInput.disabled=true; bgFileInput.disabled=false; }
          render();
      });
  });
  bgColorInput.addEventListener('input', ()=>{ bgColor=bgColorInput.value; render(); });
  bgFileInput.addEventListener('change', ()=>{
      const f = bgFileInput.files[0]; if(!f) return; const url = URL.createObjectURL(f);
      const img = new Image(); img.onload=()=>{ bgImageObj=img; URL.revokeObjectURL(url); render(); }; img.src=url;
  });
  
  btnRandom.addEventListener('click', ()=>{ playClick(); applyRandom(); });
  if(btnClearSel) btnClearSel.addEventListener('click', ()=>{ playClick(); resetAll(); });
  if(btnReset) btnReset.addEventListener('click', ()=>{ stickers.length=0; activeSticker=-1; selection.clear(); render(); });
  
  btnDownload.addEventListener('click', ()=>{
    if (downloadModal) downloadModal.style.display = 'flex';
  });

  if (closeModal) closeModal.addEventListener('click', () => { downloadModal.style.display = 'none'; });
  if (btnSavePng) btnSavePng.addEventListener('click', () => { playClick(); downloadPNG(); downloadModal.style.display = 'none'; });
  if (btnSaveGif) btnSaveGif.addEventListener('click', async () => { playClick(); downloadModal.style.display = 'none'; await saveAsGif(); });
  
  if (downloadModal) {
    downloadModal.addEventListener('click', (e) => {
      if(e.target === downloadModal) downloadModal.style.display = 'none';
    });
  }

  let soundOn = true;
  soundToggle.addEventListener('click', ()=>{ soundOn = !soundOn; soundToggle.setAttribute('aria-pressed', String(soundOn)); soundToggle.textContent = soundOn ? 'Sound On' : 'Sound Off'; });
  function playClick(){ if(soundOn && clickAudio) clickAudio.play().catch(()=>{}); }

  stickerDock.addEventListener('click', e=>{
      const thumb = e.target.closest('.thumb');
      const arrowUp = e.target.closest('.sticker-arrow.up');
      const arrowDown = e.target.closest('.sticker-arrow.down');
      const slot = e.target.closest('.sticker-slot');
      
      if(!slot) return;
      
      const allSlots = $$('#stickerDock li .sticker-slot');
      const idx = allSlots.indexOf(slot);
      if(idx === -1) return;
      
      const pack = stickerPacks[idx];
      
      if(arrowUp) { 
          playClick(); 
          pack.currentIndex = (pack.currentIndex - 1 + pack.count) % pack.count; 
          updateStickerSlot(slot, idx); 
      }
      else if(arrowDown) { 
          playClick(); 
          pack.currentIndex = (pack.currentIndex + 1) % pack.count; 
          updateStickerSlot(slot, idx); 
      }
      else if(thumb) { 
          playClick(); 
          if(thumb.dataset.sticker) addSticker(thumb.dataset.sticker); 
      }
  });

  canvas.addEventListener('mousedown', e => {
      const pos = canvasPos(e);
      stickerMode = 'none';

      if(activeSticker !== -1) {
          const s = stickers[activeSticker];
          const tb = hitStickerToolbar(s, pos.x, pos.y);
          if(tb !== -1) { handleToolbarAction(tb, s); render(); if(activeSticker === -1) stickerMode = 'none'; return; }
          const h = hitStickerHandle(s, pos.x, pos.y);
          if(h) { stickerMode = 'scale'; startW = Math.abs(s.w); startH = Math.abs(s.h); startDist = getDistance(s.x, s.y, pos.x, pos.y); selection.clear(); render(); return; }
          if(checkRotZone(s, pos.x, pos.y)) { stickerMode = 'rotate'; startRot = s.rot; startAngle = getAngle(s.x, s.y, pos.x, pos.y); selection.clear(); render(); return; }
      }

      const idx = hitSticker(pos.x, pos.y);
      if(idx !== -1) { activeSticker = idx; const s = stickers[idx]; stickerMode = 'drag'; dragOffset.x = pos.x - s.x; dragOffset.y = pos.y - s.y; selection.clear(); render(); return; }

      activeSticker = -1;
      const gi = hitGlyph(pos.x, pos.y);
      if(gi !== -1) {
          if(e.shiftKey) { if(selection.has(gi)) selection.delete(gi); else selection.add(gi); }
          else { selection.clear(); selection.add(gi); }
          render(); return;
      }
      selection.clear(); activeSticker = -1; render();
  });

  window.addEventListener('mousemove', e => {
      if(activeSticker === -1 || stickerMode === 'none') return;
      const pos = canvasPos(e);
      const s = stickers[activeSticker];
      if(stickerMode === 'drag') { s.x = pos.x - dragOffset.x; s.y = pos.y - dragOffset.y; }
      else if(stickerMode === 'scale') {
          const dist = getDistance(s.x, s.y, pos.x, pos.y);
          if(startDist < 5) return;
          const factor = dist / startDist;
          let nw = startW * factor, nh = startH * factor;
          if(nw < 20) nw=20; if(nh < 20) nh=20;
          s.w = nw; s.h = nh;
      } else if(stickerMode === 'rotate') {
          const ang = getAngle(s.x, s.y, pos.x, pos.y);
          s.rot = (startRot + (ang - startAngle) + 360) % 360;
      }
      render();
      updateCursor(s, pos);
  });

  window.addEventListener('mouseup', () => { stickerMode = 'none'; canvas.style.cursor = 'default'; });
  
  canvas.addEventListener('mousemove', e => {
      if(stickerMode !== 'none') return;
      const pos = canvasPos(e);
      if(activeSticker !== -1) { updateCursor(stickers[activeSticker], pos); return; }
      if(hitSticker(pos.x, pos.y) !== -1) { canvas.style.cursor = 'move'; return; }
      if(hitGlyph(pos.x, pos.y) !== -1) { canvas.style.cursor = 'pointer'; return; }
      canvas.style.cursor = 'default';
  });

  window.addEventListener('keydown', e => {
      if((e.key==='Delete' || e.key==='Backspace') && activeSticker !== -1) { stickers.splice(activeSticker, 1); activeSticker = -1; render(); }
      if(e.key === 'Escape') { selection.clear(); activeSticker = -1; render(); }
  });
}

function updateCursor(s, pos) {
  if (hitStickerHandle(s, pos.x, pos.y)) canvas.style.cursor = 'nwse-resize';
  else if (hitStickerToolbar(s, pos.x, pos.y) !== -1) canvas.style.cursor = 'pointer';
  else if (checkRotZone(s, pos.x, pos.y)) canvas.style.cursor = 'crosshair';
  else if (hitSticker(pos.x, pos.y) === activeSticker) canvas.style.cursor = 'move';
  else canvas.style.cursor = 'default';
}

// ---------- Logic Helpers ----------
function updateTargetToggles(){
  const isStroke = (editTarget==='stroke');
  const txt = isStroke ? 'Outline' : 'Fill';
  if(colorTargetToggle) { colorTargetToggle.setAttribute('aria-pressed', String(isStroke)); colorTargetToggle.textContent = txt; }
  if(patternTargetToggle) { patternTargetToggle.setAttribute('aria-pressed', String(isStroke)); patternTargetToggle.textContent = txt; }
}
function updateCount(){ textCount.textContent = `${inputText.value.length} / 30`; }
function applyColor(val){
  if(editTarget==='stroke') { if(selection.size) selection.forEach(i=>{if(textChars[i]){textChars[i].strokeColor=val; textChars[i].strokePattern=null;}}); else { base.strokeColor=val; base.strokePattern=null; textChars.forEach(g=>{g.strokeColor=val; g.strokePattern=null;}); } } 
  else { if(selection.size) selection.forEach(i=>{if(textChars[i]){textChars[i].fill=val; textChars[i].pattern=null;}}); else { base.fill=val; base.pattern=null; textChars.forEach(g=>{g.fill=val; g.pattern=null;}); } }
  render();
}
function setPattern(file){
  const v = file && file !== 'none' ? file : null;
  if(editTarget==='stroke') { if(selection.size) selection.forEach(i=>{if(textChars[i])textChars[i].strokePattern=v;}); else { base.strokePattern=v; textChars.forEach(g=>g.strokePattern=v); } } 
  else { if(selection.size) selection.forEach(i=>{if(textChars[i])textChars[i].pattern=v;}); else { base.pattern=v; textChars.forEach(g=>g.pattern=v); } }
  
  render();

  if(v) {
      // UPDATE PATH TO HEAVEN
      loadImage(`./assets/heaven/patterns/${v}`).then(() => render());
  }
}

// applyPreset Removed

function applyRandom(){
    const f = FONT_LIST[Math.floor(Math.random()*FONT_LIST.length)];
    const c = '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
    const pid = Math.floor(Math.random()*11);
    const p = pid===0?null:`pattern${pid}.png`;
    
    // Inline logic of old applyPreset
    shadowEnabled = true; 
    editTarget = 'fill'; 
    updateTargetToggles();
    
    const apply = (o) => { 
        o.font=f; 
        o.fill=c; 
        o.stroke=base.stroke; 
        o.pattern=p || null; 
        o.strokePattern=null; 
        o.shadowX=4; 
        o.shadowY=4; 
        o.shadowBlur=8; 
        o.effect='none'; 
    };

    if(selection.size) selection.forEach(i=>{ if(textChars[i]) apply(textChars[i]); }); 
    else { apply(base); textChars.forEach(g=>apply(g)); }
    
    applyBaseToControls();
    
    if(base.fill!==c) pushColorHistory(c);
    
    // UPDATE PATH TO HEAVEN
    const key = base.pattern ? `./assets/heaven/patterns/${base.pattern}` : null;
    if(key) loadImage(key).then(()=>{ layoutText(); render(); }); else { layoutText(); render(); }
}

function resetAll(){
    // [수정됨] 리셋 시에도 기본값 업데이트 반영 (#b7a9a9, Effect: metal)
    base = {font:'AngelicWar', size:120, rot:0, fill:'#b7a9a9', stroke:0, strokeColor:'#000000', shadowX:4, shadowY:4, shadowBlur:8, pattern:null, strokePattern:null, effect:'metal'};
    shadowEnabled=true; editTarget='fill'; textString='Writing text'; inputText.value=textString; updateCount();
    selection.clear(); activeSticker=-1; stickers=[]; 
    stickerPacks.forEach(p=>p.currentIndex=0);
    $$('#stickerDock li .sticker-slot').forEach((s,i)=>updateStickerSlot(s,i));
    bgMode='transparent'; bgImageObj=null; bgColor='#FFFFFF';
    if(bgTransparent) bgTransparent.checked=true;
    if(bgColorInput) bgColorInput.disabled=true; if(bgFileInput) bgFileInput.disabled=true;
    applyBaseToControls(); layoutText(); render();
}
function applyBaseToControls(){
    sizeRange.value=base.size; rotateRange.value=base.rot; outlineRange.value=base.stroke;
    shadowXRange.value=base.shadowX; shadowYRange.value=base.shadowY; shadowBlurRange.value=base.shadowBlur;
    colorPicker.value=base.fill;
    if(shadowToggle) { shadowToggle.setAttribute('aria-pressed', String(shadowEnabled)); shadowToggle.textContent=shadowEnabled?'ON':'OFF'; }
    updateTargetToggles();
}
function pushColorHistory(col){
  if (!col) return;
  let list = JSON.parse(localStorage.getItem('typo_color_history_v1') || '[]').filter(c => c.toUpperCase() !== col.toUpperCase());
  list.unshift(col.toUpperCase());
  localStorage.setItem('typo_color_history_v1', JSON.stringify(list.slice(0, 11)));
  rebuildColorHistory();
}
function rebuildColorHistory(){
  const list = JSON.parse(localStorage.getItem('typo_color_history_v1') || '[]');
  colorHistoryWrap.innerHTML = '';
  list.forEach(c=>{ const b = document.createElement('button'); b.type='button'; b.dataset.color=c; b.style.background=c; colorHistoryWrap.appendChild(b); });
}

// ---------- Saving ----------
function downloadPNG(){
  const link = document.createElement('a'); link.download = 'typo.png'; link.href = canvas.toDataURL('image/png'); link.click();
}
async function saveAsGif() {
    if (processingIndicator) processingIndicator.style.display = 'flex';
    try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
        const workerBlob = await response.blob();
        const workerUrl = URL.createObjectURL(workerBlob);
        
        const TRANSPARENT_KEY = 0x1F1F1F; 
        const TRANSPARENT_HEX = '#1F1F1F';
        
        const gifOpts = { workers: 4, quality: 5, width: canvas.width, height: canvas.height, workerScript: workerUrl };
        
        if (bgMode === 'transparent') {
            gifOpts.transparent = TRANSPARENT_KEY;
        }

        const gif = new GIF(gifOpts);
        const FPS = 20; const DURATION = 3; const totalFrames = FPS * DURATION; const delay = 1000 / FPS;
        let count = 0;
        
        const W = canvas.width / dpr;
        const H = canvas.height / dpr;

        const interval = setInterval(() => {
            render(tempCtx);
            
            if (bgMode === 'transparent') {
                tempCtx.globalCompositeOperation = 'destination-over';
                tempCtx.fillStyle = TRANSPARENT_HEX;
                tempCtx.fillRect(0, 0, W, H);
                tempCtx.globalCompositeOperation = 'source-over'; 
            }

            gif.addFrame(tempCtx, {copy: true, delay: delay});
            count++;
            if (count >= totalFrames) {
                clearInterval(interval);
                gif.render();
            }
        }, delay);
        
        gif.on('finished', (blob) => {
            if (processingIndicator) processingIndicator.style.display = 'none';
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a'); link.download = 'typo_animation.gif'; link.href = url; link.click();
            URL.revokeObjectURL(workerUrl);
        });
    } catch (e) { console.error("GIF failed", e); if (processingIndicator) processingIndicator.style.display = 'none'; downloadPNG(); }
}

// ---------- Init ----------
(async function init(){
    resizeCanvasForDPR();
    rebuildColorHistory();
    const list = document.getElementById('stickerDock'); list.innerHTML = '';
    stickerPacks.forEach((p, i) => {
        const li = document.createElement('li');
        const d = document.createElement('div'); d.className='sticker-slot';
        const b = document.createElement('button'); b.className='thumb'; b.type='button';
        d.appendChild(b);
        if(p.count>1) {
            const u = document.createElement('button'); u.className='sticker-arrow up'; u.innerHTML='&#9650;'; u.type='button';
            const v = document.createElement('button'); v.className='sticker-arrow down'; v.innerHTML='&#9660;'; v.type='button';
            d.appendChild(u); d.appendChild(v);
        }
        li.appendChild(d); list.appendChild(li);
        updateStickerSlot(d, i);
    });
    // UPDATE PATH TO HEAVEN
    $$('#patternGrid .patBtn').forEach(btn=>{ let f = btn.dataset.pattern; if(f) btn.style.backgroundImage = `url(./assets/heaven/patterns/${f})`; });
    inputText.value = textString; updateCount(); applyBaseToControls(); 
    
    const fontToLoad = `1em '${base.font}'`;
    try {
        await document.fonts.load(fontToLoad);
    } catch(e) {
        console.warn("Font loading failed or timed out", e);
    }

    layoutText(); render(); bindEvents();
})();