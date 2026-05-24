export const GRAV = 700;
export const BNCE = 0.42;
export const GFRIC = 0.80;
export const AFRIC = 0.998;
export const ESIZ = 64;
export const SECS_PER_GMIN = 1.0;

export const ANIM_DEFS = {
  idle:  {frames:4, fps:1.5},
  sleep: {frames:4, fps:0.7},
  eat:   {frames:4, fps:3},
  happy: {frames:4, fps:4},
  sad:   {frames:4, fps:1.2},
};

export const ITEM_DEFS = {
  ball:   {emoji:'🔵', size:22, mass:0.4, bounce:0.80, fs:20},
  hammer: {emoji:'🔨', size:24, mass:0.9, bounce:0.12, fs:22},
  rock:   {emoji:'🪨', size:30, mass:2.8, bounce:0.06, fs:26},
  bucket: {emoji:'🪣', size:24, mass:0.6, bounce:0.22, fs:22},
  soap:   {emoji:'🧼', size:18, mass:0.3, bounce:0.42, fs:16},
};
