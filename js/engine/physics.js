import { gs, phys, clones, items, apples } from '../state.js';
import { GRAV, BNCE, GFRIC, AFRIC, ESIZ, ANIM_DEFS } from './constants.js';
import { drawEntityFrame, setAnim } from './renderer.js';
import { spawnIndividual, spawnSoul, setCloneAnim, updateTrail } from '../entities/individual.js';
import { checkItemEntityHit, checkBallCollision } from '../items/collisions.js';
import { showBubble, showEntityBubble, spawnParticle, setLog } from '../ui/feedback.js';
import { lockAction } from '../behavior/actions.js';

export function scn()  { return document.getElementById('scene'); }
export function gndY() { const s=scn(); return s.offsetHeight*0.55 - ESIZ; }
export function scnW() { return scn().offsetWidth; }
export function scnH() { return scn().offsetHeight; }

export function physStep(dt) {
  if (gs.allDead) return;
  const gY = gndY(), sW = scnW(), s = scn();

  // ── MAIN ──
  if (!gs.isDead) {
    const sh = scnH();
    if (sh > 50 && (phys.x<-30||phys.x>sW+30||phys.y<-30||phys.y>sh+30)) {
      phys.x = Math.max(0, Math.min(sW-ESIZ, phys.x));
      phys.y = Math.max(0, Math.min(gY, phys.y));
      phys.vx = 0; phys.vy = 0;
    }
    if (!(gs.activeDrag && gs.activeDrag.kind === 'main')) {
      phys.vy += GRAV*dt; phys.x += phys.vx*dt; phys.y += phys.vy*dt;
      phys.vx *= Math.pow(AFRIC, dt*60);
      if (phys.y >= gY) {
        phys.y = gY;
        const bnc = Math.abs(phys.vy); phys.vy *= -BNCE;
        if (bnc >= 15) phys.vx *= GFRIC;
        if (Math.abs(phys.vy) < 15) phys.vy = 0;
      }
      if (phys.x < 0)      { phys.x = 0;      phys.vx =  Math.abs(phys.vx)*0.4; }
      if (phys.x > sW-ESIZ){ phys.x = sW-ESIZ; phys.vx = -Math.abs(phys.vx)*0.4; }
      if (!gs.isSleeping && phys.y >= gY-2 && Math.abs(phys.vy) < 5 && Math.abs(phys.vx) < 15) {
        gs.wanderTimer -= dt;
        if (gs.wanderTimer <= 0) { gs.wanderTimer = 3+Math.random()*5; phys.vx = (Math.random()-.5)*110; }
      }
      if (Math.abs(phys.vx) > 15) gs.flipX = phys.vx < 0;
    }
    const spd = Math.hypot(phys.vx, phys.vy);
    document.getElementById('clawd-wrap').style.left = Math.round(phys.x)+'px';
    document.getElementById('clawd-wrap').style.top  = Math.round(phys.y)+'px';
    const dragKind = gs.activeDrag ? gs.activeDrag.kind : null;
    updateTrail(spd, dragKind);
  }

  // ── CLONES ──
  for (let i=clones.length-1; i>=0; i--) {
    const c = clones[i];
    if (c.dead) continue;
    if (!c.dragging) {
      c.vy += GRAV*dt;
      if (c.y >= gY-2 && Math.abs(c.vy)<5 && Math.abs(c.vx)<15 &&
          Math.floor(c.age) > Math.floor(c.age-dt) && Math.random() < 0.5) {
        c.vx = (Math.random()-.5)*110;
      }
      c.vx *= Math.pow(0.995, dt*60);
      c.x += c.vx*dt; c.y += c.vy*dt;
      if (c.y >= gY) {
        c.y = gY;
        const bnc = Math.abs(c.vy); c.vy *= -BNCE;
        if (bnc >= 15) c.vx *= GFRIC;
        if (Math.abs(c.vy) < 15) c.vy = 0;
      }
      if (c.x < 0)      { c.x = 0;      c.vx *= -0.4; }
      if (c.x > sW-ESIZ){ c.x = sW-ESIZ; c.vx *= -0.4; }
      if (Math.abs(c.vx) > 15) c.flipX = c.vx < 0;
    }
    c.el.style.left = Math.round(c.x)+'px';
    c.el.style.top  = Math.round(c.y)+'px';
    c.age += dt;
    if (c.age >= 600 && !c.dead) {
      c.dead = true;
      setCloneAnim(c, 'sad', 500);
      setTimeout(() => { spawnSoul(c.x, c.y, c.flipX); }, 300);
      setTimeout(() => {
        c.el.remove();
        const idx = clones.indexOf(c); if (idx !== -1) clones.splice(idx, 1);
        setTimeout(() => { if (clones.length < 5) spawnIndividual(); }, 500);
        setLog('💫 一个个体寿终正寝，新的生命即将诞生...');
      }, 1800);
    }
    if (!c.animLock) c.anim = gs.currentAnim === 'eat' ? 'idle' : gs.currentAnim;
    const cDef = ANIM_DEFS[c.anim];
    c.at += dt; if (c.at >= 1/cDef.fps) { c.at = 0; c.af = (c.af+1)%cDef.frames; }
    drawEntityFrame(c.ctx, c.anim, c.af, c.flipX, c.dirty);
  }

  // ── ITEMS ──
  const igY = scnH()*0.55;
  for (let i=items.length-1; i>=0; i--) {
    const it = items[i];
    if (gs.activeDrag && gs.activeDrag.ref === it) continue;
    it.vy += GRAV*it.mass*dt; it.x += it.vx*dt; it.y += it.vy*dt;
    it.vx *= Math.pow(AFRIC, dt*60);
    const iFloor = igY - it.size;
    if (it.y >= iFloor) {
      const vel = it.vy;
      it.y = iFloor; it.vy *= -(it.bounce||0.3); it.vx *= GFRIC;
      if (Math.abs(it.vy) < 10) it.vy = 0;
      if (vel > 80) checkItemEntityHit(it, vel);
    }
    if (it.x < 0)       { it.x = 0;       it.vx *= -0.4; }
    if (it.x > sW-it.size) { it.x = sW-it.size; it.vx *= -0.4; }
    it.el.style.left = Math.round(it.x)+'px';
    it.el.style.top  = Math.round(it.y)+'px';
    if (it.type === 'ball') checkBallCollision(it);
  }

  // ── APPLES ──
  const agY = scnH()*0.55 - 10;
  for (let i=apples.length-1; i>=0; i--) {
    const a = apples[i];
    a.vy += GRAV*dt; a.x += a.vx*dt; a.y += a.vy*dt;
    if (a.y >= agY) { a.y = agY; a.vy *= -0.3; a.vx *= 0.8; if (Math.abs(a.vy)<8) a.vy=0; }
    if (a.x < 0)    { a.x = 0;    a.vx *= -0.5; }
    if (a.x > sW-10){ a.x = sW-10; a.vx *= -0.5; }
    a.el.style.left = Math.round(a.x)+'px';
    a.el.style.top  = Math.round(a.y)+'px';
    let ateApple = false;
    if (Math.hypot(phys.x+32-(a.x+5), phys.y+32-(a.y+5)) < 46 && !gs.isDead && !gs.isSleeping && !gs.actionLocked) {
      a.el.remove(); apples.splice(i,1); ateApple = true;
      gs.hunger = Math.min(100, gs.hunger+22); gs.health = Math.min(100, gs.health+2);
      gs.emo[2] = Math.min(100, gs.emo[2]+15); gs.emo[1] = Math.min(100, gs.emo[1]+2);
      setAnim('eat'); lockAction(1600); setTimeout(() => { if (!gs.isSleeping) setAnim('idle'); }, 1600);
      showBubble('😋🍎'); spawnParticle('🍎'); setLog("Claw'd 捡到苹果吃掉了！");
    }
    if (!ateApple) {
      for (let ci=clones.length-1; ci>=0; ci--) {
        const cl = clones[ci]; if (cl.dead) continue;
        if (Math.hypot(cl.x+32-(a.x+5), cl.y+32-(a.y+5)) < 46) {
          a.el.remove(); apples.splice(i,1);
          gs.emo[2] = Math.min(100, gs.emo[2]+10); gs.emo[1] = Math.min(100, gs.emo[1]+1);
          setCloneAnim(cl, 'eat', 1600);
          showEntityBubble(cl, '😋🍎'); spawnParticle('🍎', cl.x, cl.y);
          setLog('个体捡到苹果吃掉了！'); break;
        }
      }
    }
  }
}
