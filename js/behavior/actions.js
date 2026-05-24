import { gs, phys, clones, E } from '../state.js';
import { setAnim } from '../engine/renderer.js';
import { showBubble, showEntityBubble, spawnParticle, setLog } from '../ui/feedback.js';
import { setCloneAnim, spawnIndividual } from '../entities/individual.js';
import { updateUI } from '../ui/hud.js';

export function clampEmo() {
  for (let i=0; i<6; i++) gs.emo[i] = Math.max(0, Math.min(100, gs.emo[i]));
}

export function lockAction(ms) {
  gs.actionLocked = true;
  setTimeout(() => { gs.actionLocked = false; }, ms);
}

export function petEntity(ent) {
  if (gs.allDead) return;
  gs.minutesSinceInteract = 0;
  gs.emo[E.HAPPY]  = Math.min(100, gs.emo[E.HAPPY]+8);
  gs.emo[E.TRUST]  = Math.min(100, gs.emo[E.TRUST]+2);
  gs.emo[E.FEAR]   = Math.max(0,   gs.emo[E.FEAR]-10);
  gs.emo[E.ATTACH] = Math.min(100, gs.emo[E.ATTACH]+1);
  gs.emo[E.LONE]   = Math.max(0,   gs.emo[E.LONE]-12);
  clampEmo();
  const emoji = ['🥰','😊','💕','✨'][Math.floor(Math.random()*4)];
  if (ent) {
    setCloneAnim(ent, 'happy', 900);
    showEntityBubble(ent, emoji);
    spawnParticle('💗', ent.x, ent.y);
    setLog('个体蹭了蹭你的手...');
  } else {
    if (!gs.isSleeping && !gs.actionLocked) {
      setAnim('happy'); lockAction(800);
      setTimeout(() => { if (!gs.isSleeping) setAnim('idle'); }, 800);
    }
    showBubble(emoji);
    spawnParticle('💗');
    setLog("Claw'd 蹭了蹭你的手...");
  }
  updateUI();
}

export function autoWake() {
  gs.isSleeping = false;
  setAnim('idle');
  document.getElementById('btn-sleep').querySelector('.bi').textContent = '💤';
  showBubble('☀️');
  setLog("Claw'd 精神饱满地醒来了！");
}

export function doAction(type) {
  if (gs.isDead || gs.allDead || gs.actionLocked) return;
  gs.minutesSinceInteract = 0;
  gs.emo[E.LONE] = Math.max(0, gs.emo[E.LONE]-18);
  if (type === 'sleep') {
    if (gs.isSleeping) { autoWake(); return; }
    if (gs.energy >= 90) { showBubble('😤 不困！'); return; }
    gs.isSleeping = true; setAnim('sleep');
    document.getElementById('btn-sleep').querySelector('.bi').textContent = '☀️';
    showBubble('💤'); setLog("Claw'd 进入了甜蜜的梦乡...");
    gs.emo[E.FEAR] -= 5; clampEmo();
    clones.forEach((c, i) => {
      if (c.dead) return;
      setTimeout(() => showEntityBubble(c, '💤'), 120 + i * 80);
    });
    return;
  }
  if (gs.isSleeping) return;
  lockAction(1200);
  if (type === 'feed') {
    if (gs.hunger >= 95) { showBubble('饱了~'); return; }
    gs.hunger = Math.min(100, gs.hunger+22); gs.health = Math.min(100, gs.health+2);
    gs.emo[E.HAPPY] = Math.min(100, gs.emo[E.HAPPY]+12);
    gs.emo[E.TRUST] = Math.min(100, gs.emo[E.TRUST]+1.5);
    gs.emo[E.FEAR]  = Math.max(0,   gs.emo[E.FEAR]-8);
    setAnim('eat'); setTimeout(() => setAnim('idle'), 1600);
    showBubble('😋'); spawnParticle('🍎'); setLog("Claw'd 吃得美滋滋～");
    gs.entityDirty = Math.min(80, gs.entityDirty+3);
    clones.forEach((c, i) => {
      if (c.dead) return;
      setTimeout(() => {
        setCloneAnim(c, 'eat', 1400);
        showEntityBubble(c, '😋');
        spawnParticle('🍎', c.x, c.y);
        c.dirty = Math.min(80, c.dirty+3);
      }, 100 + i * 80);
    });
  } else if (type === 'play') {
    if (gs.energy < 15) { showBubble('😴 太累了'); return; }
    gs.emo[E.HAPPY]  = Math.min(100, gs.emo[E.HAPPY]+20);
    gs.emo[E.CURIO]  = Math.min(100, gs.emo[E.CURIO]+15);
    gs.emo[E.ATTACH] = Math.min(100, gs.emo[E.ATTACH]+0.5);
    gs.emo[E.LONE]   = Math.max(0,   gs.emo[E.LONE]-10);
    gs.energy  = Math.max(0, gs.energy-12);
    gs.hunger  = Math.max(0, gs.hunger-8);
    setAnim('happy'); setTimeout(() => setAnim('idle'), 2000);
    showBubble('🎉'); spawnParticle('⭐'); spawnParticle('💫');
    setLog("Claw'd 玩得超开心！");
    gs.entityDirty = Math.min(80, gs.entityDirty+5);
    clones.forEach((c, i) => {
      if (c.dead) return;
      setTimeout(() => {
        setCloneAnim(c, 'happy', 1800);
        showEntityBubble(c, '🎉');
        spawnParticle('⭐', c.x, c.y);
        c.dirty = Math.min(80, c.dirty+5);
      }, 100 + i * 80);
    });
    if (gs.emo[E.HAPPY] > 85 && clones.length < 5 && Math.random() < 0.3) spawnIndividual();
  }
  clampEmo(); updateUI();
}
