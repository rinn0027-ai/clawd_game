import { gs, phys, clones, items, apples, trailPool, trailPos } from '../state.js';
import { ESIZ } from '../engine/constants.js';
import { setAnim, drawFrame } from '../engine/renderer.js';
import { setLog, scn } from './feedback.js';
import { updateUI } from './hud.js';
import { initTrail } from '../entities/individual.js';
import { updateProviderUI } from './chat.js';
import {
  initWorld, createMainBody, setMainBody, mainBody,
  cloneBodyMap, itemBodyMap, appleBodyMap, removeBody, world,
} from '../engine/matter-world.js';
import { applyStageVisuals } from '../engine/renderer.js';

export function saveGame() {
  localStorage.setItem('clawd_save', JSON.stringify({
    hunger:gs.hunger, energy:gs.energy, health:gs.health,
    day:gs.day, gameHour:gs.gameHour, gameMin:gs.gameMin, totalMins:gs.totalMins,
    emo:gs.emo, stage:gs.stage, isSleeping:gs.isSleeping,
    physX:phys.x, physY:phys.y, entityDirty:gs.entityDirty,
  }));
}

export function loadGame() {
  const raw = localStorage.getItem('clawd_save'); if (!raw) return;
  try {
    const d = JSON.parse(raw);
    gs.hunger   = d.hunger   ?? 80;
    gs.energy   = d.energy   ?? 85;
    gs.health   = d.health   ?? 100;
    gs.day      = d.day      ?? 1;
    gs.gameHour = d.gameHour ?? 8;
    gs.gameMin  = d.gameMin  ?? 0;
    gs.totalMins= d.totalMins?? 0;
    gs.emo      = d.emo      ?? [30,40,65,60,20,10];
    gs.stage    = d.stage    ?? 0;
    gs.isSleeping = d.isSleeping ?? false;
    gs.entityDirty = d.entityDirty ?? 0;
    if (gs.isSleeping) {
      setAnim('sleep');
      document.getElementById('btn-sleep').querySelector('.bi').textContent = '☀️';
    }
    if (d.physX != null) phys._sx = d.physX;
    if (d.physY != null) phys._sy = d.physY;
  } catch(e) {}
}

export function initPhys() {
  const w = scn().offsetWidth, h = scn().offsetHeight;
  if (w < 10 || h < 10) { setTimeout(initPhys, 50); return; }
  phys.x = phys._sx ?? w/2 - 32;
  phys.y = phys._sy ?? h*0.55 - ESIZ;
  document.getElementById('clawd-wrap').style.left = Math.round(phys.x)+'px';
  document.getElementById('clawd-wrap').style.top  = Math.round(phys.y)+'px';
  // Initialise Matter.js world and create main character body
  initWorld();
  const b = createMainBody(phys.x + 32, phys.y + 32);
  setMainBody(b);
  initTrail();
  applyStageVisuals(); // set scale/filter for current stage
}

export function buildScene() {
  const s = scn();
  for (let i=0; i<22; i++) {
    const el = document.createElement('div'); el.className = 'star';
    el.style.cssText = `width:${Math.random()<.3?2:1}px;height:${Math.random()<.3?2:1}px;top:${Math.random()*50}%;left:${Math.random()*100}%;animation-delay:${Math.random()*2}s;animation-duration:${1+Math.random()*2}s`;
    s.appendChild(el);
  }
  const g = document.getElementById('ground');
  for (let x=0; x<22; x++) {
    const t = document.createElement('div'); t.className = 'gt';
    t.style.left = x*16+'px'; t.style.background = x%2===0 ? '#3a5a30' : '#2d4825';
    g.appendChild(t);
  }
  for (let i=0; i<2; i++) {
    const c = document.createElement('div'); c.className = 'cloud';
    c.style.cssText = `width:${32+Math.random()*32}px;height:${8+Math.random()*8}px;top:${8+Math.random()*20}%;animation-duration:${22+Math.random()*12}s;animation-delay:${-Math.random()*22}s`;
    s.appendChild(c);
  }
}

export function restartGame() {
  gs.hunger=80; gs.energy=85; gs.health=100; gs.day=1; gs.stage=1;
  gs.gameHour=8; gs.gameMin=0; gs.totalMins=0;
  gs.emo=[30,40,65,60,20,10]; gs.entityDirty=0;
  clearTimeout(gs.rebirthTO); gs.rebirthTO=null;
  gs.isSleeping=false; gs.isDead=false; gs.allDead=false;
  gs.deathCause=''; gs.stage=0; gs.minutesSinceInteract=0; gs.chatHistory=[];

  // Remove all dynamic Matter bodies
  clones.forEach(c => { const b = cloneBodyMap.get(c); if (b) removeBody(b); cloneBodyMap.delete(c); c.el.remove(); });
  clones.length = 0;
  apples.forEach(a => { const b = appleBodyMap.get(a); if (b) removeBody(b); appleBodyMap.delete(a); a.el.remove(); });
  apples.length = 0;
  items.forEach(it => { const b = itemBodyMap.get(it); if (b) removeBody(b); itemBodyMap.delete(it); it.el.remove(); });
  items.length = 0;

  // Reset main entity position and recreate body
  const w = scn().offsetWidth;
  phys.x = w/2 - 32; phys.y = scn().offsetHeight*0.55 - ESIZ;
  phys.vx = 0; phys.vy = 0;
  const b = createMainBody(phys.x+32, phys.y+32);
  setMainBody(b);

  applyStageVisuals();
  trailPos.length = 0; trailPool.forEach(t => t.el.style.display='none');
  document.getElementById('death').style.display = 'none';
  const wrap = document.getElementById('clawd-wrap');
  wrap.style.display=''; wrap.style.transform=''; wrap.style.transition='';
  wrap.style.left = Math.round(phys.x)+'px'; wrap.style.top = Math.round(phys.y)+'px';
  document.getElementById('btn-sleep').querySelector('.bi').textContent = '💤';
  setAnim('idle'); setLog("Claw'd 重新出生了！好好照顾它吧 ♥"); updateUI();
}
