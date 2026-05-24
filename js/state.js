// Shared mutable game state — imported by all modules
export const E = {LONE:0, TRUST:1, HAPPY:2, CURIO:3, ATTACH:4, FEAR:5};
export const STAGE_NAMES = ['蛋','婴儿','幼儿','少年','成年','老年'];
export const STAGE_DAYS = [0,1,2,4,6,8];
export const DRIFT = [.40,-.02,-.20,-.15,-.005,-.30];

// Physics objects (arrays mutated in place — no reassignment needed)
export const phys = {x:100, y:100, vx:0, vy:0};
export const clones = [];
export const items = [];
export const apples = [];
export const trailPool = [];
export const trailPos = [];

// All scalar/object state lives on gs so any module can mutate it
export const gs = {
  // emotions & vitals
  emo: [30,40,65,60,20,10],
  hunger: 80,
  energy: 85,
  health: 100,
  // time
  day: 1,
  gameHour: 8,
  gameMin: 0,
  totalMins: 0,
  // flags
  isSleeping: false,
  isDead: false,
  allDead: false,
  deathCause: '',
  stage: 0,
  minutesSinceInteract: 0,
  actionLocked: false,
  entityDirty: 0,
  wanderTimer: 0,
  // api
  apiKey: localStorage.getItem('clawd_apikey') || '',
  geminiKey: localStorage.getItem('clawd_geminikey') || '',
  geminiProxy: localStorage.getItem('clawd_geminiproxy') || '',
  apiProvider: localStorage.getItem('clawd_provider') || 'anthropic',
  chatHistory: [],
  // renderer
  currentAnim: 'idle',
  animFrame: 0,
  animTimer: 0,
  flipX: false,
  // ui
  bubbleTO: null,
  zzzTimer: 0,
  // loop
  lastTs: 0,
  accumSec: 0,
  // drag
  activeDrag: null,
  // lifecycle
  rebirthTO: null,
};
