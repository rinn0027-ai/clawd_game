import { gs, phys, clones } from '../state.js';
import { showBubble, showEntityBubble, spawnParticle, setLog } from '../ui/feedback.js';

// Item-entity and ball-entity collisions are handled via Matter.js collision events in physics.js.
// Only proximity-based interactions remain here.

export function checkClean(item) {
  if (item.type !== 'bucket' && item.type !== 'soap') return;
  const pw = item.type === 'soap' ? 4 : 2;
  const cx = item.x + item.size/2, cy = item.y + item.size/2;
  if (Math.hypot(cx-(phys.x+32), cy-(phys.y+32)) < 48 && gs.entityDirty > 0) {
    gs.entityDirty = Math.max(0, gs.entityDirty - pw);
    if (gs.entityDirty === 0) {
      spawnParticle('💧'); showBubble('✨ 干净啦'); setLog("Claw'd 被洗干净了！");
      gs.emo[2] = Math.min(100, gs.emo[2]+0.5);
    }
  }
  clones.forEach(c => {
    if (Math.hypot(cx-(c.x+32), cy-(c.y+32)) < 48 && c.dirty > 0) {
      c.dirty = Math.max(0, c.dirty - pw);
      if (c.dirty === 0) { showEntityBubble(c, '✨ 干净啦'); spawnParticle('💧', c.x, c.y); }
    }
  });
}
