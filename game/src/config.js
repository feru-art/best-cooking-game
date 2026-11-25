// Tuning for one Dapur Kilat variant: shift length, order pressure, station
// speeds and scoring. Variants differ by editing this file (and recipes.js).
// V5 "Deluxe": VIP tickets, a 6-recipe menu, faster spawns, and a final
// 20-second rush wave where orders arrive twice as fast.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 30;

export const SHIFT_SECONDS = 90;
export const MAX_ORDERS = 3;
export const FIRST_ORDER_AT = 1.5;
export const ORDER_SPAWN_SECONDS = 8;
export const ORDER_SPAWN_MIN_SECONDS = 5;
export const ORDER_SPAWN_RAMP_EVERY = 20;
export const PATIENCE_SECONDS = 45;

export const CHOP_SECONDS = 1.2;
export const COOK_SECONDS = 6;
export const BURN_AFTER_SECONDS = 5;

export const SCORE_DISH = 100;
export const TIP_MAX = 50;
export const COMBO_BONUS = 35;
export const VIP_MULTIPLIER = 2;
export const VIP_ENABLED = true;
export const METER_COOK = false;
export const RUSH_WAVE = true;
export const RUSH_LAST_SECONDS = 20;

export const STARS = [120, 250, 400];
