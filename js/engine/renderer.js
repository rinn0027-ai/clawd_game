import { ANIM_DEFS } from './constants.js';
import { gs } from '../state.js';

const SPRITE_DATA = {
"idle": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAABMklEQVR4nO2VPQrCQBCFX8RjWCqkUWJp8AQ5gOQAVikFK2srwTKVnY2ktMgJREtFm4ApRbxFLCQSs5PN6q6roF+Vv5m3byezA/z5bQzVCWO/n/De172Zck0ZfWYxMgZiv59c4jN3gZvohGG45+bQqV99NsHEaSU8A6kIRcescXN/Qr9KfPeygRRvviSfb8eeULxOfXIDZAz0FjtgYeN4WJd+W4RO/QqVoNG0hYLfQZF+o2nfzCmG2QBZAteSqn5R/PGwRuBayvWZFghcC+2RL5yAIv1Vs70s2r8q2I49bKLTXTN7nefhNM2fwpSBsjE2cVrcMVY2AnXrM4lkDKSsBk4CAN1paFD3PHTrMy0wDPeGjAEAZqZyJvBQSRNAxAvWrU+NQSkDAKJ8lUSq9kX6f36KK7018O3PFCa0AAAAAElFTkSuQmCC",
"sleep": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAABQklEQVR4nNWVMQ8BMRTHX8XHMJLUQBiJT3Axiw9g6ihMZhMx3mSziFHkPoEwEgYSN4r4FrVoUum7uruWS9/Wy/u9/2vfvz0Ax2K64Xy64fzfrJUCxg1IdWyxuSTwoE1IWmEbPICdzaceRJYOsOEcrJ4ykdDvaYWKbK6dogu82PygTT4tGfo9/gwfOh721zsMgxPahIt8PioJiwYtaIu7yKMHwBZrtMBhzGI14BKv/AU6yyOUKk0lsVRpQmd5/CruGq84YNWtQX3kK4m38w4OYxZpL5kHUE9bfI/Dm+on4dErkDaKbE4mXlX7Ckc9YFkFegBievJpxX2AhsGJbPsel3nBtmZBrM2b6CfllYYsTJBOvOrlnVt+15TXVx1sqm/Fgdu+x8UUsfWvw1Q/CY9dASpZhwJ8WInClwlaCFP9rPt3K155di/IHuLCwwAAAABJRU5ErkJggg==",
"eat": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAABw0lEQVR4nO1VMU/CQBh9GKO7cdSFSFIHCA4QRF2Mg2FyIkwNA1MHEk1YMHHDhaQmDkxOuFxcNA78AQ0QHSAweAlEF0IcXB1gqVPNld61V9rEAd927b3vve/1+h2wgPhuHxp/7eHPsdAhsM2HZl8OawXHZLa0GxsnSPjV98q3LIa1gvE5HDsabNER7i/CaKYeuEb8NCCrX2r0hNpe+cuiTTzsKhsAAD1PAUUxUpR6DjDdPjFE4cnqu8ELnxuAdvvILdCpaDh4n85tAAD0/JQbnqy+DLzwuQFEomkM+k3b8yzp4jS+7hqCyEB/79iRJ6sfJH+Jt2nQbyISTduK3uXiuOp+IUVpSPQFs6Rr45r8p/CK0PSEEGNz7QiJpCrU/9B1FNUyJoQI54yMfxaWJiaEGK8vdeyc17jFOxUNiaSK1VwusCEUpP48fMchZv7L7PBwa+C6fskVN1FUy9IBsrPE9CB7C7ToyMIR8W2FqpnY7/Eyjwv734jEWTyfZQy2AVN8X2+4cll9Htz0vfK5xcwGTMOzaxco1UzsDbAHWGr0tgFQtwI+9T3xebeAwhw9BbAcRUWiATqbcmnsPBcC1vfL/8dC4Qee8EiEFHNCRAAAAABJRU5ErkJggg==",
"happy": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAACGUlEQVR4nOVXPUjDQBT+KgWHbuKoThayVDrWDg7FqYhjyaJTpwyCgiDOVgShgkMnJ12CU5HSSZyk7dZiBwOtdLAUB3Hr4HQONeFyuZ9co6L4IOSn7333fe/dvesBf8zIQY3QdwAYt3JEHCG3GRHobzSWp3tPZO5iOjh0wmI80bGTDS1A2vqVojSJy9bF1NiAv0hReHoYLOjTUlUaIBPQrxTJS38kjW86Q+zXHyInQSRetwBxYJJJclAjT0tVqASc5leISkDTGXK/rxoLUuywJhOvyz9Og7rZiyrAurrhfm+XLGXsVywhHf5xjl8kAQCQTGXR6zYC3wt2B7vpeWHcNBXkWRj+41aOJDJ3sRmeYzKV5QIU7I6UnOvT6zYCGMlUFtdmGmedVyVG0xlyL57xtsAw/N2dIzADaAF0FV0BsiQszq3j2pxUkJ0BvW4D7ZKFQbmMWdMUYgB6M5DdAnX5+2bAREBaKAAABuWykPjz261HtLK1iXbJ8j0DwPnlsTCeJssz1Qychr8ve/QabDpDr2mwz7I1eJpfkTYxWWy/UiRrR3WvUq4YAN57we5gNBopd4Gw/ANAUQTQGKxfmOb1bttENUN2tg8xa5rfUgAAwP1eXggg+o1pRIbi4sUExqHHYt9VphMfaIKf3dYIuor3V6YROWFISv6/G+44bjWpcY0Q+Abj74sft3KPumcHpU1zGotygvsJvH9jHzoze3Ju161FAAAAAElFTkSuQmCC",
"sad": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAABK0lEQVR4nGNgGAWjYBSMghEMGNEF7kxL+Y9Pg0rWHAw91NA7UG5A4dyZlvL/xZ1neB13/MYThtJtl7AGHLl6B9INLLgUYQOWGjJ4DadU70C4AWsAZC3ehNWA861ZBC2nRO9AuIEJXSBsxQWsmlV1rQhaTInegXIDRgCsijDAqvj25WM4DUfXO/24PMl6kUHRrKcYbph+XJ4kN6ADXHoxAgCmGJfhhAAlegfCDVjLAFhegRUmpBRg51uzGBictlZOi/VrJ1UvEqg835rVjuwGxqyLcDGi3MBAnPsxqpJuLz289Si+aowSvYPKDUeKvP4fKfL6j4tPK70D4QZsWUADqR7VYGBAqVc1GBgYbuCxmxK9VHUDY9bFrQx9jBoMDAwMJ5y2bv0/Td8bm14AgLfzufVQWrYAAAAASUVORK5CYII="
};

export const spriteImgs = {};
for (const [k, src] of Object.entries(SPRITE_DATA)) {
  const img = new Image(); img.src = src; spriteImgs[k] = img;
}

const canvas = document.getElementById('clawd-canvas');
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

export function drawEntityFrame(ectx, anim, frame, flip, dirty=0) {
  const img = spriteImgs[anim];
  if (!img || !img.complete) return;
  ectx.clearRect(0,0,16,16);
  ectx.save();
  if (flip) { ectx.translate(16,0); ectx.scale(-1,1); }
  ectx.drawImage(img, frame*16, 0, 16, 16, 0, 0, 16, 16);
  if (dirty > 5) {
    const spots = [[2,8],[5,12],[9,6],[12,10],[7,14],[3,4],[11,3],[8,11],[14,7],[4,14],[6,5],[10,13]];
    const cnt = Math.min(spots.length, Math.ceil(dirty/8));
    ectx.globalAlpha = Math.min(0.8, dirty/100*0.9);
    ectx.fillStyle = '#6b3a1a';
    for (let i=0; i<cnt; i++) ectx.fillRect(spots[i][0], spots[i][1], 1, 1);
    ectx.globalAlpha = 1;
  }
  ectx.restore();
}

export function drawFrame() {
  drawEntityFrame(ctx, gs.currentAnim, gs.animFrame, gs.flipX, gs.entityDirty);
}

export function tickAnim(dt) {
  const def = ANIM_DEFS[gs.currentAnim];
  gs.animTimer += dt;
  if (gs.animTimer >= 1/def.fps) {
    gs.animTimer = 0;
    gs.animFrame = (gs.animFrame + 1) % def.frames;
    drawFrame();
  }
}

export function setAnim(name, reset=true) {
  if (gs.currentAnim === name && !reset) return;
  gs.currentAnim = name;
  if (reset) { gs.animFrame = 0; gs.animTimer = 0; }
  drawFrame();
}
