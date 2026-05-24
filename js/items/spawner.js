import { gs, phys, items, apples } from '../state.js';
import { ITEM_DEFS, ESIZ } from '../engine/constants.js';
import { setLog, scn } from '../ui/feedback.js';
import { beginDrag } from '../entities/drag.js';

export function spawnItem(type) {
  if (items.length >= 10) return;
  const def = ITEM_DEFS[type];
  const el  = document.createElement('div');
  el.style.cssText = `position:absolute;font-size:${def.fs}px;line-height:1;cursor:grab;touch-action:none;user-select:none;z-index:8;`;
  el.textContent = def.emoji;
  const s = scn();
  const x = s.offsetWidth*(0.2+Math.random()*0.6), y = 20+Math.random()*20;
  el.style.left = x+'px'; el.style.top = y+'px';
  s.appendChild(el);
  const item = {type, el, x, y, vx:(Math.random()-.5)*50, vy:0, size:def.size, mass:def.mass, bounce:def.bounce};
  el.addEventListener('pointerdown', e => beginDrag(e, 'item', item));
  items.push(item);
}

export function clearItems() {
  items.forEach(it => it.el.remove());
  items.length = 0;
}

export function checkTreeHit(speed, ex=phys.x, ey=phys.y) {
  if (speed < 80) return;
  const s = scn();
  const tL = s.offsetWidth - 72, tT = s.offsetHeight*0.55 - 52;
  if (ex+ESIZ > tL && ex < tL+36 && ey < tT+52 && apples.length < 3) {
    shakeTree(); spawnApple(tL+6+Math.random()*22, tT-8);
  }
}

export function shakeTree() {
  const t = document.getElementById('tree');
  [6,-4,3,-2,0].forEach((d,i) => setTimeout(() => {
    t.style.transition = 'transform 0.08s';
    t.style.transform  = `rotate(${d}deg)`;
  }, i*80));
}

export function spawnApple(x, y) {
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;width:10px;height:10px;background:#c82020;box-shadow:inset -2px -2px 0 #801010;z-index:5;';
  el.style.left = x+'px'; el.style.top = y+'px';
  scn().appendChild(el);
  apples.push({el, x, y, vx:(Math.random()-.5)*80, vy:-70});
  setLog('苹果掉下来了！快去捡！');
}
