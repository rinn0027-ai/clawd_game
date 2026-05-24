import { gs } from './state.js';
import { tickAnim, drawFrame } from './engine/renderer.js';
import { physStep } from './engine/physics.js';
import { tickZzz } from './ui/feedback.js';
import { gameTick } from './behavior/lifecycle.js';
import { updateUI } from './ui/hud.js';
import { buildScene, loadGame, initPhys, saveGame, restartGame } from './ui/persistence.js';
import { updateProviderUI, toggleChat, toggleProvider, saveKey, saveProxy, sendChat } from './ui/chat.js';
import { initDragListeners } from './entities/drag.js';
import { spawnItem, clearItems } from './items/spawner.js';
import { doAction } from './behavior/actions.js';

const SECS_PER_GMIN = 1.0;

function loop(ts) {
  if (!gs.lastTs) gs.lastTs = ts;
  const dt = Math.min((ts - gs.lastTs) / 1000, 0.05);
  gs.lastTs = ts;
  try { tickAnim(dt); physStep(dt); } catch(err) { console.error('loop err', err); }
  if (gs.isSleeping) tickZzz(dt);
  gs.accumSec += dt;
  while (gs.accumSec >= SECS_PER_GMIN) { gs.accumSec -= SECS_PER_GMIN; gameTick(); }
  requestAnimationFrame(loop);
}

function wireButtons() {
  // items row
  document.getElementById('btn-ball').addEventListener('click',   () => spawnItem('ball'));
  document.getElementById('btn-hammer').addEventListener('click', () => spawnItem('hammer'));
  document.getElementById('btn-rock').addEventListener('click',   () => spawnItem('rock'));
  document.getElementById('btn-bucket').addEventListener('click', () => spawnItem('bucket'));
  document.getElementById('btn-soap').addEventListener('click',   () => spawnItem('soap'));
  document.getElementById('btn-clear').addEventListener('click',  () => clearItems());
  // actions
  document.getElementById('btn-feed').addEventListener('click',   () => doAction('feed'));
  document.getElementById('btn-play').addEventListener('click',   () => doAction('play'));
  document.getElementById('btn-sleep').addEventListener('click',  () => doAction('sleep'));
  document.getElementById('btn-chat').addEventListener('click',   () => toggleChat());
  // chat panel
  document.getElementById('chat-close').addEventListener('click',   () => toggleChat());
  document.getElementById('provider-btn').addEventListener('click', () => toggleProvider());
  document.getElementById('api-save').addEventListener('click',     () => saveKey());
  document.getElementById('proxy-save').addEventListener('click',   () => saveProxy());
  document.getElementById('send-btn').addEventListener('click',     () => sendChat());
  document.getElementById('chat-input').addEventListener('keydown', e => { if (e.key==='Enter') sendChat(); });
  // death screen
  document.getElementById('restart').addEventListener('click', () => restartGame());
}

// ── INIT ──
buildScene();
loadGame();
updateUI();
updateProviderUI();
drawFrame();
initPhys();
initDragListeners();
wireButtons();
setInterval(saveGame, 30000);
setInterval(updateUI, 500);
requestAnimationFrame(loop);
