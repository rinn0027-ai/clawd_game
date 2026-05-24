import { gs, E, DRIFT, STAGE_DAYS } from '../state.js';
import { setAnim } from '../engine/renderer.js';
import { clampEmo } from './actions.js';

export function tickEmotions() {
  for (let i=0; i<6; i++) gs.emo[i] += DRIFT[i];
  if (gs.minutesSinceInteract > 30) {
    gs.emo[E.LONE] += 0.04*(gs.minutesSinceInteract-30);
    if (gs.emo[E.LONE] > 80) gs.emo[E.TRUST] -= 0.05;
  }
  if (gs.gameHour >= 22 || gs.gameHour < 4) {
    gs.emo[E.CURIO] += 0.08; gs.emo[E.FEAR] += 0.03;
  } else if (gs.gameHour >= 5 && gs.gameHour < 8) {
    gs.emo[E.HAPPY] += 0.05; gs.emo[E.FEAR] -= 0.05;
  } else if (gs.gameHour >= 13 && gs.gameHour < 17) {
    gs.emo[E.LONE] += 0.05;
  }
  if (gs.emo[E.LONE] > 70) {
    gs.emo[E.HAPPY] -= 0.15*(gs.emo[E.LONE]/100);
    gs.emo[E.CURIO] -= 0.10*(gs.emo[E.LONE]/100);
  }
  if (gs.emo[E.FEAR] > 50) {
    gs.emo[E.CURIO] -= 0.12*(gs.emo[E.FEAR]/100);
    gs.emo[E.HAPPY] -= 0.10*(gs.emo[E.FEAR]/100);
  }
  if (gs.emo[E.TRUST] > 70)  gs.emo[E.HAPPY] += 0.05*((gs.emo[E.TRUST]-70)/30);
  if (gs.emo[E.ATTACH] > 60) gs.emo[E.LONE]  -= 0.10*((gs.emo[E.ATTACH]-60)/40);
  if (gs.emo[E.HAPPY] > 75)  gs.emo[E.ATTACH] += 0.01;
  if (gs.emo[E.TRUST] < 15)  gs.emo[E.FEAR]   += 0.20;
  clampEmo();
  if (!gs.isSleeping && !gs.actionLocked) {
    if (gs.health < 20 || gs.emo[E.FEAR] > 70) setAnim('sad', false);
    else if (gs.emo[E.LONE] > 75 || gs.emo[E.HAPPY] < 25) setAnim('sad', false);
    else if (gs.emo[E.HAPPY] > 75 && Math.random() < 0.02) {
      setAnim('happy'); setTimeout(() => setAnim('idle'), 2000);
    } else {
      setAnim('idle', false);
    }
  }
}

export function checkStage() {
  for (let i=STAGE_DAYS.length-1; i>=0; i--) {
    if (gs.day >= STAGE_DAYS[i]) { gs.stage = i; break; }
  }
}
