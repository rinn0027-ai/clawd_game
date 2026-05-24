import { gs, phys } from '../state.js';

export function scn() { return document.getElementById('scene'); }

export function setLog(msg) {
  document.getElementById('log').textContent = msg;
}

let bubbleTO = null;
export function showBubble(text, dur=1800) { showEntityBubble(null, text, dur); }
export function showEntityBubble(ent, text, dur=1800) {
  if (!ent) {
    const b = document.getElementById('bubble');
    b.textContent = text; b.classList.add('show');
    clearTimeout(bubbleTO);
    bubbleTO = setTimeout(() => b.classList.remove('show'), dur);
  } else {
    ent.bub.textContent = text; ent.bub.classList.add('show');
    clearTimeout(ent.bubTO);
    ent.bubTO = setTimeout(() => ent.bub.classList.remove('show'), dur);
  }
}

export function spawnParticle(emoji, x=phys.x, y=phys.y) {
  const el = document.createElement('div');
  el.className = 'particle'; el.textContent = emoji;
  el.style.left = (x + 10 + Math.random()*30) + 'px';
  el.style.top  = (y - 10) + 'px';
  scn().appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

export function spawnZzz() {
  const el = document.createElement('div');
  el.className = 'zzz-p'; el.textContent = 'z';
  el.style.left = (phys.x + 30 + Math.random()*10) + 'px';
  el.style.top  = (phys.y - 5) + 'px';
  scn().appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

export function tickZzz(dt) {
  gs.zzzTimer -= dt;
  if (gs.zzzTimer <= 0) { gs.zzzTimer = 1.8 + Math.random()*.8; spawnZzz(); }
}
