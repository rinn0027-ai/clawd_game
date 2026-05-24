import { gs, clones, E, STAGE_NAMES } from '../state.js';

const BAR_IDS = ['lone','trust','happy','curio','attach','fear'];
const BAR_CLR  = ['#7799cc','#44dd88','#f5c842','#cc88ff','#ff6699','#ee4433'];

export function getPersonality() {
  const [lone,trust,happy,curio,attach,fear] = gs.emo;
  if (fear>70)  return '战战兢兢';
  if (lone>75)  return '形单影只';
  if (attach>80 && trust>70) return '小跟班 🐾';
  if (curio>80) return '十万个为什么';
  if (happy>80) return '开心果 ✨';
  if (trust>80) return '超级信任你';
  if (lone>50  && happy<40) return '有点忧郁...';
  if (happy>65) return '心情不错';
  return '平平无奇';
}

export function updateUI() {
  for (let i=0; i<6; i++) {
    const f = document.getElementById('b-'+BAR_IDS[i]);
    const v = document.getElementById('v-'+BAR_IDS[i]);
    const p = Math.round(gs.emo[i]);
    f.style.width      = p+'%';
    f.style.background = BAR_CLR[i];
    v.textContent      = p;
    f.style.opacity    = ((i===0||i===5) && gs.emo[i]>70)
      ? (0.6 + 0.4*Math.abs(Math.sin(Date.now()/300))).toFixed(2) : 1;
  }
  const dirty = gs.entityDirty>65 ? '💩臭臭' : gs.entityDirty>35 ? '🟫脏了' : '';
  document.getElementById('ptag').textContent = getPersonality() + (dirty?' '+dirty:'');
  document.getElementById('clock').textContent =
    String(gs.gameHour).padStart(2,'0') + ':' + String(gs.gameMin).padStart(2,'0');
  document.getElementById('day-lbl').textContent = 'DAY ' + gs.day;
  document.getElementById('stage').textContent   = STAGE_NAMES[gs.stage];
}
