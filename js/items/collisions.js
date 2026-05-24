import { gs, phys, clones } from '../state.js';
import { showBubble, showEntityBubble, spawnParticle, setLog } from '../ui/feedback.js';
import { setCloneAnim, killEntity } from '../entities/individual.js';
import { clampEmo } from '../behavior/actions.js';

export function checkClean(item) {
  if (item.type !== 'bucket' && item.type !== 'soap') return;
  const pw = item.type === 'soap' ? 4 : 2;
  const cx = item.x + item.size/2, cy = item.y + item.size/2;
  if (Math.hypot(cx-(phys.x+32), cy-(phys.y+32)) < 48 && gs.entityDirty > 0) {
    gs.entityDirty = Math.max(0, gs.entityDirty - pw);
    if (gs.entityDirty === 0) {
      spawnParticle('💧'); showBubble('✨ 干净啦'); setLog("Claw'd 被洗干净了！");
      gs.emo[2] = Math.min(100, gs.emo[2]+0.5); // HAPPY
    }
  }
  clones.forEach(c => {
    if (Math.hypot(cx-(c.x+32), cy-(c.y+32)) < 48 && c.dirty > 0) {
      c.dirty = Math.max(0, c.dirty - pw);
      if (c.dirty === 0) { showEntityBubble(c, '✨ 干净啦'); spawnParticle('💧', c.x, c.y); }
    }
  });
}

export function checkItemEntityHit(item, vel) {
  if (vel < 120) return;
  const ic = {x: item.x+item.size/2, y: item.y+item.size/2};
  const check = (ex, ey, isClone, cr) => {
    if ((isClone && cr.dead) || Math.hypot(ic.x-(ex+32), ic.y-(ey+32)) > 54) return;
    if (item.type === 'hammer' && vel > 100) {
      if (!isClone) {
        phys.vy = -290;
        gs.emo[5] = Math.min(100, gs.emo[5]+5); // FEAR
        gs.emo[2] = Math.min(100, gs.emo[2]+3); // HAPPY
      } else {
        cr.vy = -290; setCloneAnim(cr, 'sad', 700);
        showEntityBubble(cr, '💥 BONK!'); spawnParticle('⚡', cr.x, cr.y);
      }
      item.vy *= -0.25;
      showBubble('💥 BONK!'); spawnParticle('⚡'); setLog("Claw'd 被锤子打飞了！哈哈哈"); clampEmo();
    } else if (item.type === 'rock') {
      killEntity(isClone, cr, ex, ey);
    }
  };
  if (!gs.isDead) check(phys.x, phys.y, false, null);
  clones.forEach(c => { if (!c.dead) check(c.x, c.y, true, c); });
}

export function checkBallCollision(ball) {
  const bcx = ball.x + ball.size/2, bcy = ball.y + ball.size/2;
  const check = ent => {
    const dx = bcx - (ent.x+32), dy = bcy - (ent.y+32);
    const dist = Math.hypot(dx, dy);
    if (dist > 42 || dist < 1) return;
    const nx = dx/dist, ny = dy/dist;
    const rel = (ball.vx-ent.vx)*nx + (ball.vy-ent.vy)*ny;
    if (rel >= 0) return;
    const j = rel * 1.7;
    ball.vx -= nx*j; ball.vy -= ny*j;
    ent.vx  += nx*j*0.28; ent.vy += ny*j*0.28;
    const pen = 42 - dist;
    ball.x += nx*pen*0.65; ball.y += ny*pen*0.65;
    if (Math.abs(rel) > 40) { gs.emo[2] = Math.min(100, gs.emo[2]+0.8); clampEmo(); }
  };
  check(phys);
  clones.forEach(c => check(c));
}
