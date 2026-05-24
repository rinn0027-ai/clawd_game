import { gs, phys, clones, trailPool, trailPos } from '../state.js';
import { ESIZ } from '../engine/constants.js';
import { drawEntityFrame } from '../engine/renderer.js';
import { showBubble, showEntityBubble, spawnParticle, setLog, scn } from '../ui/feedback.js';
import { createCloneBody, cloneBodyMap, removeBody, mainBody, setMainBody, createMainBody } from '../engine/matter-world.js';
import { applyStageVisuals } from '../engine/renderer.js';
import { beginDrag } from './drag.js';

export function setCloneAnim(c, name, ms=600) {
  c.anim = name; c.animLock = true; c.af = 0; c.at = 0;
  setTimeout(() => { c.animLock = false; }, ms);
}

export function spawnSoul(x, y, fX=gs.flipX) {
  const el = document.createElement('canvas');
  el.width = 16; el.height = 16;
  el.className = 'soul';
  el.style.left = x + 'px'; el.style.top = y + 'px';
  const sc = el.getContext('2d');
  sc.imageSmoothingEnabled = false;
  drawEntityFrame(sc, 'idle', 0, fX, 0);
  scn().appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

export function spawnBlood(cx, cy) {
  for (let i=0; i<12; i++) {
    const angle = Math.random()*Math.PI*2;
    const dist  = 18 + Math.random()*28;
    const el = document.createElement('div');
    el.className = 'blood';
    const w = 2 + Math.floor(Math.random()*3), h = 2 + Math.floor(Math.random()*3);
    el.style.cssText = `width:${w}px;height:${h}px;background:${Math.random()<0.5?'#cc0000':'#ff3333'};left:${cx}px;top:${cy}px;--bx:${(Math.cos(angle)*dist).toFixed(0)}px;--by:${(Math.sin(angle)*dist-8).toFixed(0)}px;animation-duration:${0.3+Math.random()*0.25}s;`;
    scn().appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

export function killEntity(isClone, cr, x, y) {
  spawnBlood(x+28, y+28);
  if (!isClone) {
    if (gs.isDead) return;
    gs.isDead = true; gs.deathCause = '被大石头压扁';
    // Remove main body from physics world immediately
    if (mainBody) { removeBody(mainBody); setMainBody(null); }
    const wrap = document.getElementById('clawd-wrap');
    wrap.style.transition = 'transform 0.12s';
    wrap.style.transform  = 'scaleY(0.1) scaleX(2.2)';
    setTimeout(() => spawnSoul(x, y-20), 150);
    setTimeout(() => {
      wrap.style.display = 'none';
      setLog("💀 Claw'd 被压成了肉饼...");
      import('../behavior/lifecycle.js').then(m => m.checkAllDead());
    }, 500);
  } else {
    if (!cr || cr.dead) return;
    cr.dead = true;
    // Matter body already removed by physics.js collision handler before calling us
    const el = cr.el;
    el.style.transition = 'transform 0.12s';
    el.style.transform  = 'scaleY(0.1) scaleX(2.2)';
    setTimeout(() => {
      el.remove();
      const idx = clones.indexOf(cr); if (idx !== -1) clones.splice(idx, 1);
    }, 180);
    gs.emo[4] = Math.min(100, gs.emo[4]+30);
    gs.emo[2] = Math.max(0,   gs.emo[2]-15);
    clampEmoLocal();
    showBubble('😱');
    setLog('一个个体被压扁了！');
    import('../behavior/lifecycle.js').then(m => m.checkAllDead());
  }
}

function clampEmoLocal() {
  for (let i=0; i<6; i++) gs.emo[i] = Math.max(0, Math.min(100, gs.emo[i]));
}

export function spawnIndividual() {
  const s = scn();
  const el  = document.createElement('div');
  el.style.cssText = 'position:absolute;cursor:grab;touch-action:none;user-select:none;';
  const bub = document.createElement('div'); bub.className = 'cbub';
  const cnv = document.createElement('canvas');
  cnv.width = 16; cnv.height = 16;
  cnv.style.cssText = 'display:block;width:64px;height:64px;image-rendering:pixelated;filter:drop-shadow(0 4px 0 rgba(0,0,0,.4));';
  const cCtx = cnv.getContext('2d'); cCtx.imageSmoothingEnabled = false;
  el.appendChild(bub); el.appendChild(cnv); s.appendChild(el);
  const startX = phys.x + (Math.random()-.5)*40;
  const startY = phys.y;
  const c = {
    el, bub, bubTO:null, ctx:cCtx,
    x: startX, y: startY,
    vx: (Math.random()-.5)*120, vy: -100 - Math.random()*80,
    af:0, at:0, age:0, anim:'idle', animLock:false, flipX:false,
    dirty: gs.entityDirty * 0.7, dragging:false, dead:false,
  };
  // Create Matter body (center of 64x64 element)
  const body = createCloneBody(startX+32, startY+32, c);
  window.Matter.Body.setVelocity(body, { x: c.vx/60, y: c.vy/60 });
  cloneBodyMap.set(c, body);

  el.addEventListener('pointerdown', e => beginDrag(e, 'clone', c));
  clones.push(c);
  applyStageVisuals(); // match current growth stage
  spawnParticle('✨');
  setLog('✨ 一个新个体诞生了！');
}

export function initTrail() {
  const s = scn();
  for (let i=0; i<5; i++) {
    const el = document.createElement('canvas');
    el.width = 16; el.height = 16;
    el.style.cssText = 'position:absolute;width:64px;height:64px;image-rendering:pixelated;pointer-events:none;display:none;';
    s.appendChild(el);
    const tc = el.getContext('2d'); tc.imageSmoothingEnabled = false;
    trailPool.push({el, ctx:tc});
  }
}

export function updateTrail(spd, activeDragKind) {
  if (spd > 180 && activeDragKind !== 'main') {
    trailPos.push({x:phys.x, y:phys.y, f:gs.animFrame, fl:gs.flipX});
    if (trailPos.length > 5) trailPos.shift();
  } else if (trailPos.length > 0) {
    trailPos.shift();
  }
  for (let i=0; i<5; i++) {
    const tp = trailPool[i]; if (!tp) continue;
    if (i < trailPos.length) {
      const p = trailPos[i];
      tp.el.style.display  = 'block';
      tp.el.style.left     = p.x + 'px';
      tp.el.style.top      = p.y + 'px';
      tp.el.style.opacity  = ((i+1)/(trailPos.length+1)*0.35).toFixed(2);
      drawEntityFrame(tp.ctx, gs.currentAnim, p.f, p.fl);
    } else {
      tp.el.style.display = 'none';
    }
  }
}
