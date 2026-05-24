import { gs, phys, clones, E } from '../state.js';
import { setAnim } from '../engine/renderer.js';
import { showBubble, spawnParticle, setLog, scn } from '../ui/feedback.js';
import { tickEmotions, checkStage } from './emotions.js';
import { clampEmo, autoWake } from './actions.js';
import { updateUI } from '../ui/hud.js';
import { spawnSoul } from '../entities/individual.js';
import { createMainBody, setMainBody, mainBody, removeBody } from '../engine/matter-world.js';

export function advanceTime() {
  gs.gameMin++;
  if (gs.gameMin >= 60) { gs.gameMin = 0; gs.gameHour = (gs.gameHour+1)%24; gs.day++; }
}

export function checkCritical() {
  if (gs.day >= 10 && !gs.isDead) { die('寿终正寝'); return; }
  if (gs.health <= 0) { die('饥饿'); return; }
  if (gs.hunger < 10 || gs.health < 20) gs.emo[E.FEAR] = Math.min(100, gs.emo[E.FEAR]+0.3);
}

export function gameTick() {
  if (gs.allDead) return;
  gs.totalMins++; gs.minutesSinceInteract++;
  advanceTime();
  if (gs.isSleeping) {
    gs.energy = Math.min(100, gs.energy+0.8);
    gs.hunger = Math.max(0, gs.hunger-0.07);
    if (gs.energy >= 100) autoWake();
  } else {
    gs.hunger = Math.max(0, gs.hunger-0.25);
    gs.energy = Math.max(0, gs.energy-0.10);
    if (gs.hunger < 10) gs.health = Math.max(0, gs.health-0.5);
  }
  if (!gs.isSleeping && Math.random() < 0.25) {
    gs.entityDirty = Math.min(80, gs.entityDirty+1);
    clones.forEach(c => { c.dirty = Math.min(80, c.dirty+1); });
    if (gs.entityDirty > 45) gs.emo[E.HAPPY] = Math.max(0, gs.emo[E.HAPPY]-0.1);
  }
  tickEmotions(); checkStage(); checkCritical(); updateUI();
}

export function die(cause) {
  if (gs.isDead) return;
  gs.isDead = true; gs.deathCause = cause;
  setAnim('sad');
  const natural = cause === '寿终正寝';
  setLog(natural ? '💫 寿终正寝，新的生命即将诞生...' : `💀 Claw'd 即将离开...（${cause}）`);
  // Remove main body from physics world so it doesn't keep simulating
  if (mainBody) { removeBody(mainBody); setMainBody(null); }
  setTimeout(() => spawnSoul(phys.x, phys.y), 300);
  setTimeout(() => {
    document.getElementById('clawd-wrap').style.display = 'none';
    if (natural) { gs.rebirthTO = setTimeout(rebirthMain, 1000); }
    else { checkAllDead(); }
  }, 1800);
}

export function rebirthMain() {
  gs.rebirthTO = null;
  gs.isDead = false; gs.allDead = false;
  gs.hunger = 80; gs.energy = 85; gs.health = 100;
  gs.day = 0; gs.gameHour = 8; gs.gameMin = 0; gs.minutesSinceInteract = 0;
  gs.emo = [30,40,65,60,20,10]; gs.entityDirty = 0; clampEmo();
  phys.x = scn().offsetWidth/2 - 32 + (Math.random()-.5)*80; phys.y = 0;
  phys.vx = 0; phys.vy = 0;
  // Recreate Matter body at new position with upward pop
  const b = createMainBody(phys.x+32, phys.y+32);
  window.Matter.Body.setVelocity(b, { x: (Math.random()-.5)*1.3, y: -2.5 });
  setMainBody(b);
  const wrap = document.getElementById('clawd-wrap');
  wrap.style.display = ''; wrap.style.transform = ''; wrap.style.transition = '';
  document.getElementById('death').style.display = 'none';
  setAnim('idle'); setLog('✨ 新的生命诞生了！');
  spawnParticle('✨'); spawnParticle('🌟');
}

export function checkAllDead() {
  if (!gs.isDead || gs.allDead) return;
  if (clones.some(c => !c.dead)) return;
  clearTimeout(gs.rebirthTO); gs.rebirthTO = null;
  gs.allDead = true;
  const msg = clones.length > 0
    ? `群体存活了 ${gs.day} 轮（${1+clones.length} 个个体）`
    : `它活了 ${gs.day} 轮`;
  document.getElementById('death-msg').textContent = msg;
  document.getElementById('death').style.display = 'flex';
  setLog(`💀 全员离开了...（${gs.deathCause}）`);
}
