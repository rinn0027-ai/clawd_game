import { gs, phys, clones, E } from '../state.js';
import { ESIZ } from '../engine/constants.js';
import { mainBody, cloneBodyMap } from '../engine/matter-world.js';
import { spawnIndividual } from './individual.js';
import { petEntity, clampEmo } from '../behavior/actions.js';
import { checkClean } from '../items/collisions.js';
import { checkTreeHit } from '../items/spawner.js';

function scnRect() { return document.getElementById('scene').getBoundingClientRect(); }
function scnW()    { return document.getElementById('scene').offsetWidth; }
function scnH()    { return document.getElementById('scene').offsetHeight; }

export function beginDrag(e, kind, ref=null) {
  if (gs.allDead) return;
  if (kind === 'main' && gs.isDead) return;
  e.preventDefault(); e.stopPropagation();
  const r  = scnRect();
  const cx = e.clientX - r.left, cy = e.clientY - r.top;
  const px = kind === 'main' ? phys.x : ref.x;
  const py = kind === 'main' ? phys.y : ref.y;
  gs.activeDrag = {kind, ref, offX:cx-px, offY:cy-py, prevX:cx, prevY:cy, prevT:e.timeStamp, moved:false};
  const capEl = kind === 'main' ? document.getElementById('clawd-wrap') : ref.el;
  try { capEl.setPointerCapture(e.pointerId); } catch(err) {}
  // Zero out velocities so entity doesn't fly away at grab
  if (kind === 'main')  {
    phys.vx = 0; phys.vy = 0;
    if (mainBody) window.Matter.Body.setVelocity(mainBody, {x:0, y:0});
    document.getElementById('clawd-wrap').style.cursor = 'grabbing';
  } else if (kind === 'clone') {
    ref.vx = 0; ref.vy = 0; ref.dragging = true;
    const cb = cloneBodyMap.get(ref);
    if (cb) window.Matter.Body.setVelocity(cb, {x:0, y:0});
    ref.el.style.cursor = 'grabbing';
  } else {
    ref.vx = 0; ref.vy = 0;
  }
  if (kind !== 'item') gs.minutesSinceInteract = 0;
}

function onPointerMove(e) {
  if (!gs.activeDrag) return;
  e.preventDefault();
  const r  = scnRect();
  const cx = e.clientX - r.left, cy = e.clientY - r.top;
  if (Math.abs(cx - gs.activeDrag.prevX) + Math.abs(cy - gs.activeDrag.prevY) > 5) gs.activeDrag.moved = true;
  const nx = Math.max(-8, Math.min(scnW()-ESIZ+8, cx - gs.activeDrag.offX));
  const ny = Math.max(-8, Math.min(scnH()-ESIZ+8, cy - gs.activeDrag.offY));
  if (gs.activeDrag.kind === 'main')       { phys.x = nx; phys.y = ny; }
  else if (gs.activeDrag.kind === 'clone') { gs.activeDrag.ref.x = nx; gs.activeDrag.ref.y = ny; }
  if (gs.activeDrag.kind === 'item') {
    gs.activeDrag.ref.el.style.left = Math.round(nx) + 'px';
    gs.activeDrag.ref.el.style.top  = Math.round(ny) + 'px';
    gs.activeDrag.ref.x = nx;
    gs.activeDrag.ref.y = ny;
    checkClean(gs.activeDrag.ref);
  }
  gs.activeDrag.prevX = cx; gs.activeDrag.prevY = cy; gs.activeDrag.prevT = e.timeStamp;
}

function releaseDrag(e) {
  if (!gs.activeDrag) return;
  const r  = scnRect();
  const cx = e.clientX - r.left, cy = e.clientY - r.top;
  const dt = Math.max(0.016, (e.timeStamp - gs.activeDrag.prevT) / 1000);
  let vx = (cx - gs.activeDrag.prevX) / dt * 0.85;
  let vy = (cy - gs.activeDrag.prevY) / dt * 0.85;
  const spd = Math.hypot(vx, vy);
  if (spd > 900) { vx = vx/spd*900; vy = vy/spd*900; }
  const {kind, ref, moved} = gs.activeDrag;
  gs.activeDrag = null;

  if (kind === 'main') {
    document.getElementById('clawd-wrap').style.cursor = 'grab';
    if (!moved) { petEntity(null); }
    else {
      // Apply throw velocity to Matter body (convert px/s → px/step at 60fps)
      if (mainBody) window.Matter.Body.setVelocity(mainBody, { x: vx/60, y: vy/60 });
      phys.vx = vx; phys.vy = vy; // keep in sync for immediate read
      gs.emo[E.HAPPY] = Math.min(100, gs.emo[E.HAPPY]+3); clampEmo();
      if (spd > 320 && clones.length < 5 && !gs.isDead && Math.random() < 0.55) spawnIndividual();
      checkTreeHit(spd);
    }
  } else if (kind === 'clone') {
    ref.dragging = false; ref.el.style.cursor = 'grab';
    if (!moved) { petEntity(ref); }
    else {
      const cb = cloneBodyMap.get(ref);
      if (cb) window.Matter.Body.setVelocity(cb, { x: vx/60, y: vy/60 });
      ref.vx = vx; ref.vy = vy;
      gs.emo[E.HAPPY] = Math.min(100, gs.emo[E.HAPPY]+3); clampEmo();
      if (spd > 320 && clones.length < 5 && Math.random() < 0.55) spawnIndividual();
      checkTreeHit(spd, ref.x, ref.y);
    }
  } else if (kind === 'item') {
    // Item throw: set Matter body velocity
    const ib = ref.matterBody;
    if (ib) window.Matter.Body.setVelocity(ib, { x: vx/60, y: vy/60 });
    ref.vx = vx; ref.vy = vy;
    checkClean(ref);
  }
}

export function initDragListeners() {
  window.addEventListener('pointermove', onPointerMove, {passive:false});
  window.addEventListener('pointerup', releaseDrag);
  window.addEventListener('pointercancel', () => {
    if (!gs.activeDrag) return;
    const {kind, ref} = gs.activeDrag;
    gs.activeDrag = null;
    if (kind === 'main') document.getElementById('clawd-wrap').style.cursor = 'grab';
    else if (kind === 'clone') { ref.dragging = false; ref.el.style.cursor = 'grab'; }
  });
  document.getElementById('clawd-wrap').addEventListener('pointerdown', e => beginDrag(e, 'main'), {passive:false});
}
