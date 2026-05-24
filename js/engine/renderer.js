import { ANIM_DEFS } from './constants.js';
import { gs, clones } from '../state.js';

const canvas = document.getElementById('clawd-canvas');
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ─── Visual config per stage ────────────────────────────────────────────────
// [CSS scale (relative to 64px slot), extra filter prefix]
const STAGE_VIS = [
  [0.42, ''],                                                     // 0: 蛋
  [0.50, ''],                                                     // 1: 婴儿
  [0.65, ''],                                                     // 2: 幼儿
  [0.80, ''],                                                     // 3: 少年
  [1.00, ''],                                                     // 4: 成年
  [1.00, 'sepia(22%) brightness(0.82) contrast(0.9) '],           // 5: 老年
];

// ─── Animation helpers ───────────────────────────────────────────────────────
function _yOff(anim, frame) {
  const f = frame % 4;
  if (anim === 'idle')  return  [ 0,  1,  0, -1][f];
  if (anim === 'happy') return  [ 0, -2, -3, -1][f];
  if (anim === 'sad')   return  [ 0,  1,  1,  0][f];
  if (anim === 'sleep') return  [ 0,  0,  1,  0][f];
  return 0;
}

function _eyes(ctx, x1, x2, ey, ew, eh, sleep, sad) {
  ctx.fillStyle = '#111';
  if (sleep) {
    // closed — thin horizontal line
    ctx.fillRect(x1, ey + Math.floor(eh/2), ew, 1);
    ctx.fillRect(x2, ey + Math.floor(eh/2), ew, 1);
  } else if (sad) {
    // downcast — shift down 1
    ctx.fillRect(x1, ey + 1, ew, eh);
    ctx.fillRect(x2, ey + 1, ew, eh);
  } else {
    ctx.fillRect(x1, ey, ew, eh);
    ctx.fillRect(x2, ey, ew, eh);
  }
}

// ─── Stage draw functions (all in 16×16 pixel space) ────────────────────────

// Stage 0: egg — programmatic oval with wobble
function _drawEgg(ctx, anim, frame) {
  const wobble = [0, 0.06, 0, -0.06][frame % 4];
  ctx.clearRect(0, 0, 16, 16);
  ctx.save();
  ctx.translate(8, 15);
  ctx.rotate(wobble);
  ctx.translate(-8, -15);
  // border
  ctx.fillStyle = '#b89a50';
  ctx.beginPath(); ctx.ellipse(8, 9, 5.5, 7, 0, 0, Math.PI*2); ctx.fill();
  // shell
  ctx.fillStyle = '#f2e4b4';
  ctx.beginPath(); ctx.ellipse(7.8, 8.8, 4.6, 6.2, 0, 0, Math.PI*2); ctx.fill();
  // shadow
  ctx.fillStyle = 'rgba(160,110,30,0.22)';
  ctx.beginPath(); ctx.ellipse(9.5, 11, 3, 3.5, 0.3, 0, Math.PI*2); ctx.fill();
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.60)';
  ctx.beginPath(); ctx.ellipse(5.8, 6.2, 1.8, 2.6, -0.3, 0, Math.PI*2); ctx.fill();
  // crack (visible in final third of egg stage)
  if (gs.day === 0 && gs.gameHour >= 20) {
    ctx.strokeStyle = '#7a5020'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(8, 4.5); ctx.lineTo(9.5, 7); ctx.lineTo(7.5, 9); ctx.lineTo(9, 11); ctx.stroke();
  }
  ctx.restore();
}

// Stage 1: 婴儿 — huge head, tiny arm stubs, stubby legs
function _drawBaby(ctx, anim, frame) {
  const C = '#e08858', y = _yOff(anim, frame);
  const sl = anim === 'sleep', sd = anim === 'sad';
  ctx.fillStyle = C;
  ctx.fillRect(1, 0+y, 14, 6);    // oversized head (14×6)
  ctx.fillRect(0, 5+y, 1, 2);     // L arm stub
  ctx.fillRect(15, 5+y, 1, 2);    // R arm stub
  ctx.fillRect(5, 6+y, 6, 2);     // body
  ctx.fillRect(4, 8+y, 3, 4);     // left leg
  ctx.fillRect(9, 8+y, 3, 4);     // right leg
  _eyes(ctx, 4, 10, 2+y, 2, 2, sl, sd);
  if (anim === 'eat' && frame % 4 >= 1) {
    ctx.fillStyle = '#111'; ctx.fillRect(6, 5+y, 4, 1); // mouth
  }
}

// Stage 2: 幼儿 — large head, short arm reach, medium legs
function _drawToddler(ctx, anim, frame) {
  const C = '#d47050', y = _yOff(anim, frame);
  const sl = anim === 'sleep', sd = anim === 'sad';
  ctx.fillStyle = C;
  ctx.fillRect(2, 0+y, 12, 5);    // head (12×5)
  ctx.fillRect(0, 4+y, 3, 2);     // L short arm
  ctx.fillRect(13, 4+y, 3, 2);    // R short arm
  ctx.fillRect(5, 6+y, 6, 2);     // body
  ctx.fillRect(3, 8+y, 3, 4);     // left leg
  ctx.fillRect(10, 8+y, 3, 4);    // right leg
  _eyes(ctx, 5, 9, 1+y, 2, 2, sl, sd);
  if (anim === 'eat' && frame % 4 >= 1) {
    ctx.fillStyle = '#111'; ctx.fillRect(6, 4+y, 4, 1);
  }
}

// Stage 3: 少年 — normal head, ¾-width arms, longer legs
function _drawTeen(ctx, anim, frame) {
  const C = '#cc6840', y = _yOff(anim, frame);
  const sl = anim === 'sleep', sd = anim === 'sad';
  ctx.fillStyle = C;
  ctx.fillRect(4, 1+y, 8, 4);     // head (8×4)
  ctx.fillRect(0, 5+y, 5, 2);     // L arm (partial)
  ctx.fillRect(11, 5+y, 5, 2);    // R arm (partial)
  ctx.fillRect(4, 5+y, 8, 2);     // arm middle connecting head to arms
  ctx.fillRect(5, 7+y, 6, 2);     // body
  ctx.fillRect(3, 9+y, 3, 5);     // left leg (longer)
  ctx.fillRect(10, 9+y, 3, 5);    // right leg (longer)
  _eyes(ctx, 5, 9, 2+y, 2, 2, sl, sd);
  if (anim === 'eat' && frame % 4 >= 1) {
    ctx.fillStyle = '#111'; ctx.fillRect(6, 4+y, 4, 1);
  }
}

// Stage 4: 成年 — full adult form (matching the screenshot)
function _drawAdult(ctx, anim, frame) {
  const C = '#cc6644', y = _yOff(anim, frame);
  const sl = anim === 'sleep', sd = anim === 'sad';
  ctx.fillStyle = C;
  ctx.fillRect(4, 1+y, 8, 4);     // head (8×4)
  ctx.fillRect(0, 5+y, 16, 2);    // full-width arms
  ctx.fillRect(5, 7+y, 6, 2);     // body
  ctx.fillRect(3, 9+y, 3, 3);     // left leg
  ctx.fillRect(10, 9+y, 3, 3);    // right leg
  _eyes(ctx, 5, 9, 2+y, 2, 2, sl, sd);
  if (anim === 'eat' && frame % 4 >= 1) {
    ctx.fillStyle = '#111'; ctx.fillRect(6, 4+y, 4, 1);
  }
  if (anim === 'happy' && frame % 4 === 2) {
    // arms slightly raised at peak jump
    ctx.fillStyle = C;
    ctx.fillRect(0, 4+y, 16, 1);
  }
}

// Stage 5: 老年 — hunched (head+arms shifted down 1), squinting eyes
function _drawElder(ctx, anim, frame) {
  const C = '#aa5535', y = _yOff(anim, frame);
  const sl = anim === 'sleep', sd = anim === 'sad';
  ctx.fillStyle = C;
  ctx.fillRect(4, 2+y, 8, 4);     // head shifted down (hunched)
  ctx.fillRect(0, 6+y, 16, 2);    // arms shifted down
  ctx.fillRect(5, 8+y, 6, 2);     // body
  ctx.fillRect(4, 10+y, 3, 3);    // left leg
  ctx.fillRect(9, 10+y, 3, 3);    // right leg
  // Squinting eyes (height 1 instead of 2)
  _eyes(ctx, 5, 9, 3+y, 2, sl ? 1 : 1, sl, sd);
  // Wrinkle dots
  ctx.fillStyle = '#7a3a1e';
  ctx.fillRect(7, 5+y, 1, 1);     // forehead dot
}

// ─── Main draw entry point ───────────────────────────────────────────────────
export function drawEntityFrame(ectx, anim, frame, flip, dirty=0) {
  ectx.clearRect(0, 0, 16, 16);
  if (gs.stage === 0) { _drawEgg(ectx, anim, frame); return; }
  ectx.save();
  if (flip) { ectx.translate(16, 0); ectx.scale(-1, 1); }
  const drawFn = [null, _drawBaby, _drawToddler, _drawTeen, _drawAdult, _drawElder][gs.stage];
  if (drawFn) drawFn(ectx, anim, frame);
  if (dirty > 5) {
    const spots = [[2,8],[5,12],[9,6],[12,10],[7,14],[3,4],[11,3],[8,11],[14,7],[4,14],[6,5],[10,13]];
    const cnt = Math.min(spots.length, Math.ceil(dirty/8));
    ectx.globalAlpha = Math.min(0.8, dirty/100*0.9);
    ectx.fillStyle = '#6b3a1a';
    for (let i=0; i<cnt; i++) ectx.fillRect(spots[i][0], spots[i][1], 1, 1);
    ectx.globalAlpha = 1;
  }
  ectx.restore();
}

export function drawFrame() {
  drawEntityFrame(ctx, gs.currentAnim, gs.animFrame, gs.flipX, gs.entityDirty);
}

export function tickAnim(dt) {
  const def = ANIM_DEFS[gs.currentAnim];
  gs.animTimer += dt;
  if (gs.animTimer >= 1/def.fps) {
    gs.animTimer = 0;
    gs.animFrame = (gs.animFrame + 1) % def.frames;
    drawFrame();
  }
}

export function setAnim(name, reset=true) {
  if (gs.currentAnim === name && !reset) return;
  gs.currentAnim = name;
  if (reset) { gs.animFrame = 0; gs.animTimer = 0; }
  drawFrame();
}

// Apply scale + filter CSS to a canvas element for the current stage
function _styleCanvas(cnv, stageIdx) {
  const [scale, extra] = STAGE_VIS[stageIdx] || STAGE_VIS[4];
  cnv.style.transformOrigin = 'bottom center';
  cnv.style.transform       = scale < 1 ? `scale(${scale})` : '';
  cnv.style.transition      = 'transform 0.7s ease-out';
  cnv.style.filter          = `${extra}drop-shadow(0 4px 0 rgba(0,0,0,.4))`;
}

export function applyStageVisuals() {
  _styleCanvas(document.getElementById('clawd-canvas'), gs.stage);
  clones.forEach(c => _styleCanvas(c.ctx.canvas, gs.stage));
}
