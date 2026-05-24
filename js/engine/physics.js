import { gs, phys, clones, items, apples } from '../state.js';
import { ESIZ, ANIM_DEFS } from './constants.js';
import { drawEntityFrame, setAnim } from './renderer.js';
import {
  engine, mainBody, setMainBody,
  cloneBodyMap, itemBodyMap, appleBodyMap,
  createMainBody, createCloneBody, createItemBody, createAppleBody,
  removeBody, stepEngine, onCollision, initWorld,
} from './matter-world.js';
import { spawnIndividual, spawnSoul, setCloneAnim, killEntity, updateTrail } from '../entities/individual.js';
import { showBubble, showEntityBubble, spawnParticle, setLog } from '../ui/feedback.js';
import { lockAction, clampEmo } from '../behavior/actions.js';

const MBody = () => window.Matter.Body;

export function scn()  { return document.getElementById('scene'); }
export function gndY() { const s=scn(); return s.offsetHeight*0.55 - ESIZ; }
export function scnW() { return scn().offsetWidth; }
export function scnH() { return scn().offsetHeight; }

// Register Matter collision handler
onCollision((pair) => {
  const { bodyA, bodyB } = pair;
  const ITEMS = new Set(['ball','hammer','rock','bucket','soap']);
  const isItem   = b => ITEMS.has(b.label);
  const isEntity = b => b.label === 'main' || b.label === 'clone';

  let iBody = null, eBody = null;
  if (isItem(bodyA) && isEntity(bodyB))      { iBody = bodyA; eBody = bodyB; }
  else if (isItem(bodyB) && isEntity(bodyA)) { iBody = bodyB; eBody = bodyA; }
  if (!iBody) return;

  const dvx = iBody.velocity.x - eBody.velocity.x;
  const dvy = iBody.velocity.y - eBody.velocity.y;
  const relSpd = Math.hypot(dvx, dvy) * 60; // pixels/step → px/s

  const cr = eBody.label === 'clone' ? eBody.gameRef : null;
  const ex = cr ? cr.x : phys.x;
  const ey = cr ? cr.y : phys.y;

  if (iBody.label === 'rock' && relSpd > 60) {
    const isClone = cr !== null;
    if (isClone && cr && !cr.dead)         { killEntity(true,  cr, ex, ey); removeBody(cloneBodyMap.get(cr)); cloneBodyMap.delete(cr); }
    else if (!isClone && !gs.isDead)       { killEntity(false, null, ex, ey); }
  } else if (iBody.label === 'hammer' && relSpd > 80) {
    if (cr && !cr.dead) { setCloneAnim(cr, 'sad', 700); showEntityBubble(cr, '💥 BONK!'); spawnParticle('⚡', cr.x, cr.y); }
    else if (!gs.isDead) {
      gs.emo[5] = Math.min(100, gs.emo[5]+5);
      gs.emo[2] = Math.min(100, gs.emo[2]+3);
    }
    // Extra upward pop for drama
    MBody().applyForce(eBody, eBody.position, { x: 0, y: -0.05 });
    showBubble('💥 BONK!'); spawnParticle('⚡'); setLog("Claw'd 被锤子打飞了！哈哈哈"); clampEmo();
  } else if (iBody.label === 'ball' && relSpd > 30) {
    gs.emo[2] = Math.min(100, gs.emo[2]+0.8); clampEmo();
  }
});

export function physStep(dt) {
  if (gs.allDead) return;

  // Step the Matter.js engine
  stepEngine(dt);

  const mb = mainBody;

  // ── MAIN ──
  if (!gs.isDead && mb) {
    if (gs.activeDrag && gs.activeDrag.kind === 'main') {
      // Kinematic: override Matter with pointer position
      MBody().setPosition(mb, { x: phys.x+32, y: phys.y+32 });
      MBody().setVelocity(mb, { x: 0, y: 0 });
    } else {
      // Sync from Matter → phys
      phys.x = mb.position.x - 32;
      phys.y = mb.position.y - 32;
      phys.vx = mb.velocity.x * 60;
      phys.vy = mb.velocity.y * 60;

      // Wander when resting on ground
      const gY = gndY();
      if (!gs.isSleeping && phys.y >= gY - 6 && Math.abs(phys.vy) < 30 && Math.abs(phys.vx) < 25) {
        gs.wanderTimer -= dt;
        if (gs.wanderTimer <= 0) {
          gs.wanderTimer = 3 + Math.random()*5;
          MBody().setVelocity(mb, { x: (Math.random()-.5) * 1.8, y: mb.velocity.y });
        }
      }
      if (Math.abs(phys.vx) > 10) gs.flipX = phys.vx < 0;
    }
    const spd = Math.hypot(phys.vx, phys.vy);
    document.getElementById('clawd-wrap').style.left = Math.round(phys.x)+'px';
    document.getElementById('clawd-wrap').style.top  = Math.round(phys.y)+'px';
    updateTrail(spd, gs.activeDrag?.kind);
  }

  // ── CLONES ──
  const gY = gndY();
  for (let i=clones.length-1; i>=0; i--) {
    const c = clones[i];
    if (c.dead) continue;
    const cb = cloneBodyMap.get(c);
    if (cb) {
      if (c.dragging) {
        MBody().setPosition(cb, { x: c.x+32, y: c.y+32 });
        MBody().setVelocity(cb, { x: 0, y: 0 });
      } else {
        c.x = cb.position.x - 32;
        c.y = cb.position.y - 32;
        c.vx = cb.velocity.x * 60;
        c.vy = cb.velocity.y * 60;
        // Wander
        if (c.y >= gY - 6 && Math.abs(c.vy) < 30 && Math.abs(c.vx) < 25 &&
            Math.floor(c.age) > Math.floor(c.age - dt) && Math.random() < 0.5) {
          MBody().setVelocity(cb, { x: (Math.random()-.5)*1.8, y: cb.velocity.y });
        }
        if (Math.abs(c.vx) > 10) c.flipX = c.vx < 0;
      }
    }
    c.el.style.left = Math.round(c.x)+'px';
    c.el.style.top  = Math.round(c.y)+'px';
    c.age += dt;

    // Natural death at age 600s
    if (c.age >= 600 && !c.dead) {
      c.dead = true;
      setCloneAnim(c, 'sad', 500);
      setTimeout(() => { spawnSoul(c.x, c.y, c.flipX); }, 300);
      setTimeout(() => {
        c.el.remove();
        const body = cloneBodyMap.get(c); if (body) removeBody(body); cloneBodyMap.delete(c);
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
  for (let i=items.length-1; i>=0; i--) {
    const it = items[i];
    const ib = itemBodyMap.get(it);
    if (!ib) continue;
    if (gs.activeDrag && gs.activeDrag.ref === it) {
      // Kinematic drag — keep Matter body in sync with pointer
      const nx = it.x + it.size/2, ny = it.y + it.size/2;
      MBody().setPosition(ib, { x: nx, y: ny });
      MBody().setVelocity(ib, { x: 0, y: 0 });
    } else {
      it.x = ib.position.x - it.size/2;
      it.y = ib.position.y - it.size/2;
      it.vx = ib.velocity.x * 60;
      it.vy = ib.velocity.y * 60;
    }
    it.el.style.left = Math.round(it.x)+'px';
    it.el.style.top  = Math.round(it.y)+'px';
  }

  // ── APPLES ──
  for (let i=apples.length-1; i>=0; i--) {
    const a = apples[i];
    const ab = appleBodyMap.get(a);
    if (ab) {
      a.x = ab.position.x - 5;
      a.y = ab.position.y - 5;
    }
    a.el.style.left = Math.round(a.x)+'px';
    a.el.style.top  = Math.round(a.y)+'px';

    let ateApple = false;
    if (!gs.isDead && !gs.isSleeping && !gs.actionLocked &&
        Math.hypot(phys.x+32-(a.x+5), phys.y+32-(a.y+5)) < 46) {
      a.el.remove();
      if (ab) { removeBody(ab); appleBodyMap.delete(a); }
      apples.splice(i, 1); ateApple = true;
      gs.hunger = Math.min(100, gs.hunger+22); gs.health = Math.min(100, gs.health+2);
      gs.emo[2] = Math.min(100, gs.emo[2]+15); gs.emo[1] = Math.min(100, gs.emo[1]+2);
      setAnim('eat'); lockAction(1600); setTimeout(() => { if (!gs.isSleeping) setAnim('idle'); }, 1600);
      showBubble('😋🍎'); spawnParticle('🍎'); setLog("Claw'd 捡到苹果吃掉了！");
    }
    if (!ateApple) {
      for (let ci=clones.length-1; ci>=0; ci--) {
        const cl = clones[ci]; if (cl.dead) continue;
        if (Math.hypot(cl.x+32-(a.x+5), cl.y+32-(a.y+5)) < 46) {
          a.el.remove();
          if (ab) { removeBody(ab); appleBodyMap.delete(a); }
          apples.splice(i, 1);
          gs.emo[2] = Math.min(100, gs.emo[2]+10); gs.emo[1] = Math.min(100, gs.emo[1]+1);
          setCloneAnim(cl, 'eat', 1600);
          showEntityBubble(cl, '😋🍎'); spawnParticle('🍎', cl.x, cl.y);
          setLog('个体捡到苹果吃掉了！'); break;
        }
      }
    }
  }
}
