// Matter.js physics world — CDN global accessed via window.Matter
const { Engine, Bodies, Body, World, Events } = window.Matter;

export const engine = Engine.create({
  positionIterations: 6,
  velocityIterations: 4,
  constraintIterations: 2,
});
// Default gravity: y=1, scale=0.001 feels good for this game size

export const world = engine.world;

// Shared body references
export let mainBody = null;
export function setMainBody(b) { mainBody = b; }

// Body maps linking game objects → Matter bodies
export const cloneBodyMap = new Map();
export const itemBodyMap  = new Map();
export const appleBodyMap = new Map();

// Registered collision handlers (set from physics.js)
const _handlers = [];
export function onCollision(fn) { _handlers.push(fn); }

export function initWorld() {
  const s = document.getElementById('scene');
  _rebuildBounds(s.offsetWidth, s.offsetHeight);
  Events.on(engine, 'collisionStart', e => {
    for (const pair of e.pairs)
      for (const fn of _handlers) fn(pair);
  });
}

function _rebuildBounds(w, h) {
  // Remove old static bounds
  const statics = world.bodies.filter(b => b.isStatic && ['ground','wallL','wallR'].includes(b.label));
  statics.forEach(b => World.remove(world, b));

  const gY = h * 0.55;
  const ground = Bodies.rectangle(w/2, gY+25, w+200, 50, { isStatic:true, restitution:0.3, friction:0.8, label:'ground' });
  const wallL  = Bodies.rectangle(-25, h/2,   50, h*3,   { isStatic:true, restitution:0.1, friction:0.4, label:'wallL' });
  const wallR  = Bodies.rectangle(w+25, h/2,  50, h*3,   { isStatic:true, restitution:0.1, friction:0.4, label:'wallR' });
  World.add(world, [ground, wallL, wallR]);
}

export function createMainBody(cx, cy) {
  if (mainBody) World.remove(world, mainBody);
  mainBody = Bodies.rectangle(cx, cy, 40, 56, {
    label:'main', restitution:0.42, friction:0.3, frictionAir:0.002, density:0.002,
    inertia:Infinity, inverseInertia:0,
  });
  mainBody.gameType = 'main';
  World.add(world, mainBody);
  return mainBody;
}

export function createCloneBody(cx, cy, gameRef) {
  const b = Bodies.rectangle(cx, cy, 36, 52, {
    label:'clone', restitution:0.42, friction:0.3, frictionAir:0.002, density:0.002,
    inertia:Infinity, inverseInertia:0,
  });
  b.gameType = 'clone'; b.gameRef = gameRef;
  World.add(world, b);
  return b;
}

export function createItemBody(type, cx, cy, radius, gameRef) {
  const restitution = { ball:0.80, hammer:0.12, rock:0.06, bucket:0.22, soap:0.42 }[type] ?? 0.3;
  const density     = { ball:0.001, hammer:0.008, rock:0.030, bucket:0.005, soap:0.001 }[type] ?? 0.005;
  const b = Bodies.circle(cx, cy, radius, {
    label:type, restitution, friction:0.3, frictionAir:0.005, density,
    inertia:Infinity, inverseInertia:0,
  });
  b.gameType = 'item'; b.gameRef = gameRef;
  World.add(world, b);
  return b;
}

export function createAppleBody(cx, cy, gameRef) {
  const b = Bodies.circle(cx, cy, 5, {
    label:'apple', restitution:0.25, friction:0.5, frictionAir:0.003, density:0.001,
    inertia:Infinity, inverseInertia:0,
  });
  b.gameType = 'apple'; b.gameRef = gameRef;
  World.add(world, b);
  return b;
}

export function removeBody(b) {
  if (b) World.remove(world, b);
}

export function stepEngine(dt) {
  Engine.update(engine, dt * 1000);
}
