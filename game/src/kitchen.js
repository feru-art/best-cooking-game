// The kitchen: the whole game state and every action the player (or the
// screenshot autopilot) can take. Time advances only through tick(), in fixed
// steps, so a shift played from the same seed always ends the same way.
import {
  BURN_AFTER_SECONDS, CHOP_SECONDS, COMBO_BONUS, COOK_SECONDS, FIRST_ORDER_AT,
  MAX_ORDERS, METER_COOK, ORDER_SPAWN_MIN_SECONDS, ORDER_SPAWN_RAMP_EVERY,
  ORDER_SPAWN_SECONDS, PATIENCE_SECONDS, RUSH_LAST_SECONDS, RUSH_WAVE,
  SCORE_DISH, SHIFT_SECONDS, STARS, TIP_MAX, VIP_ENABLED, VIP_MULTIPLIER,
} from './config.js';
import { INGREDIENTS, plateMatchesRecipe, recipeById } from './recipes.js';
import { bumpOrderId, resetOrderIds, spawnOrder } from './orders.js';
import { mulberry32 } from './random.js';

export const MAX_STRIKES = 3;

export function createKitchen(seed) {
  resetOrderIds();
  return {
    seed,
    rng: mulberry32(seed),
    time: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    lost: 0,
    strikes: 0,
    orders: [],
    nextOrderIn: FIRST_ORDER_AT,
    plate: [],
    chop: { item: null, progress: 0 },
    stove: { item: null, progress: 0, burnt: false, meter: 0, meterUp: true, stopped: false },
    message: 'Welcome to Dapur Kilat! Take an order, cook it, serve it.',
    messageUntil: 4,
    over: false,
    stars: 0,
    flash: 0,
    servedFlash: 0,
  };
}

function setMessage(state, text, seconds) {
  state.message = text;
  state.messageUntil = state.time + seconds;
}

/** What the plate still needs for an order: ingredient ids not yet on it. */
export function missingForOrder(state, order) {
  const recipe = recipeById(order.recipeId);
  const have = [...state.plate];
  const missing = [];
  for (const item of recipe.items) {
    const at = have.indexOf(item);
    if (at >= 0) have.splice(at, 1);
    else missing.push(item);
  }
  return missing;
}

function inProgress(state, item) {
  return state.chop.item === item || state.stove.item === item;
}

/** Take an ingredient from the counter: raw ones go straight on the plate,
 *  the rest go to their station (chop board or stove) when it is free. */
export function takeIngredient(state, id) {
  if (state.over) return false;
  const prep = INGREDIENTS[id].prep;
  if (prep === 'chop') {
    if (state.chop.item !== null) return false;
    state.chop.item = id;
    state.chop.progress = 0;
    setMessage(state, `Chopping ${INGREDIENTS[id].name}...`, 1.2);
    return true;
  }
  if (prep === 'cook') {
    if (state.stove.item !== null) return false;
    state.stove.item = id;
    state.stove.progress = 0;
    state.stove.burnt = false;
    state.stove.meter = 0;
    state.stove.meterUp = true;
    state.stove.stopped = false;
    setMessage(state, `Cooking ${INGREDIENTS[id].name} on the stove...`, 1.2);
    return true;
  }
  state.plate.push(id);
  return true;
}

/** Move a finished chopped item from the board onto the plate. */
export function collectChop(state) {
  if (state.chop.item === null || state.chop.progress < 1) return false;
  state.plate.push(state.chop.item);
  state.chop.item = null;
  state.chop.progress = 0;
  return true;
}

/** Move a finished cooked item from the stove onto the plate, or bin it
 *  when it burnt while waiting. */
export function collectStove(state) {
  if (state.stove.item === null) return false;
  if (state.stove.burnt) {
    state.stove.item = null;
    state.stove.progress = 0;
    setMessage(state, 'Burnt! That one goes in the bin.', 1.5);
    return true;
  }
  if (METER_COOK) {
    if (!state.stove.stopped) return false;
  } else if (state.stove.progress < 1) {
    return false;
  }
  state.plate.push(state.stove.item);
  state.stove.item = null;
  state.stove.progress = 0;
  return true;
}

/** Stop the timing needle (meter-cook variants): landing in the green zone
 *  cooks perfectly, outside it the item is under- or overdone. */
export function stopMeter(state) {
  if (!METER_COOK || state.stove.item === null || state.stove.stopped) return false;
  state.stove.stopped = true;
  const m = state.stove.meter;
  if (m >= 0.35 && m <= 0.65) {
    setMessage(state, 'Perfect! Cooked just right.', 1.5);
  } else if (m < 0.35) {
    setMessage(state, 'Undercooked... it still counts, barely.', 1.5);
  } else {
    setMessage(state, 'Overdone! A little charred, but edible.', 1.5);
  }
  return true;
}

export function trashPlate(state) {
  if (state.plate.length === 0) return false;
  state.plate = [];
  state.combo = 0;
  setMessage(state, 'Plate cleared.', 1);
  return true;
}

/** Serve the plate to an order ticket: only an exact match is accepted. */
export function serveOrder(state, orderId) {
  if (state.over) return false;
  const index = state.orders.findIndex((order) => order.id === orderId);
  if (index < 0) return false;
  const order = state.orders[index];
  const recipe = recipeById(order.recipeId);
  if (!plateMatchesRecipe(state.plate, recipe)) {
    setMessage(state, `That is not a ${recipe.name} — check the ticket!`, 1.5);
    return false;
  }
  const tip = Math.round(TIP_MAX * (order.patience / order.maxPatience));
  const comboBonus = state.combo >= 2 ? COMBO_BONUS * (state.combo - 1) : 0;
  let gained = recipe.points + tip + comboBonus;
  if (order.vip) gained *= VIP_MULTIPLIER;
  state.score += gained;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.served += 1;
  state.orders.splice(index, 1);
  state.plate = [];
  state.flash = 0.6;
  state.servedFlash = 1.2;
  setMessage(
    state,
    `Served ${recipe.name}! +${gained} points${order.vip ? ' (VIP x2)' : ''}${state.combo >= 2 ? ` — combo x${state.combo}` : ''}`,
    2,
  );
  return true;
}

function spawnTick(state, dt) {
  if (state.orders.length >= MAX_ORDERS) return;
  state.nextOrderIn -= dt;
  if (state.nextOrderIn > 0) return;
  const rush = RUSH_WAVE && state.time > SHIFT_SECONDS - RUSH_LAST_SECONDS;
  const ramp = Math.floor(state.time / ORDER_SPAWN_RAMP_EVERY);
  const interval = Math.max(ORDER_SPAWN_MIN_SECONDS, ORDER_SPAWN_SECONDS - ramp);
  state.nextOrderIn = rush ? interval / 2 : interval;
  const vip = VIP_ENABLED && state.rng() < 0.25;
  state.orders.push(spawnOrder(state.rng, vip));
  bumpOrderId();
}

function patienceTick(state, dt) {
  for (let index = state.orders.length - 1; index >= 0; index -= 1) {
    const order = state.orders[index];
    order.patience -= dt;
    if (order.patience > 0) continue;
    state.orders.splice(index, 1);
    state.lost += 1;
    state.strikes += 1;
    state.combo = 0;
    setMessage(state, `A customer walked away! Strikes: ${state.strikes}/${MAX_STRIKES}`, 2);
  }
}

function stationsTick(state, dt) {
  if (state.chop.item !== null && state.chop.progress < 1) {
    state.chop.progress = Math.min(1, state.chop.progress + dt / CHOP_SECONDS);
  }
  if (state.stove.item === null) return;
  if (METER_COOK) {
    if (!state.stove.stopped) {
      const speed = 1.4;
      state.stove.meter += (state.stove.meterUp ? speed : -speed) * dt;
      if (state.stove.meter >= 1) { state.stove.meter = 1; state.stove.meterUp = false; }
      if (state.stove.meter <= 0) { state.stove.meter = 0; state.stove.meterUp = true; }
    }
    return;
  }
  if (state.stove.progress < 1) {
    state.stove.progress = Math.min(1, state.stove.progress + dt / COOK_SECONDS);
    state.stove.burnt = false;
    return;
  }
  state.stove.progress += dt / BURN_AFTER_SECONDS;
  if (state.stove.progress >= 2) state.stove.burnt = true;
}

export function starsForScore(score) {
  if (score >= STARS[2]) return 3;
  if (score >= STARS[1]) return 2;
  if (score >= STARS[0]) return 1;
  return 0;
}

/** Advance the shift by dt seconds. Returns true when the shift just ended. */
export function tick(state, dt) {
  if (state.over) return true;
  state.time += dt;
  if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);
  if (state.servedFlash > 0) state.servedFlash = Math.max(0, state.servedFlash - dt);
  spawnTick(state, dt);
  patienceTick(state, dt);
  stationsTick(state, dt);
  if (state.time >= SHIFT_SECONDS || state.strikes >= MAX_STRIKES) {
    state.over = true;
    state.stars = starsForScore(state.score);
    return true;
  }
  return false;
}

/** The order the autopilot should work on next: the least patient one. */
export function nextOrder(state) {
  let best = null;
  for (const order of state.orders) {
    if (best === null || order.patience < best.patience) best = order;
  }
  return best;
}

/** True when an item is still missing from the plate for the order the
 *  kitchen is working on next. Used for collecting finished station items;
 *  taking new ingredients is guarded separately by the station being free. */
export function isNeeded(state, item) {
  const order = nextOrder(state);
  if (order === null) return false;
  return missingForOrder(state, order).includes(item);
}

export function patienceSeconds() {
  return PATIENCE_SECONDS;
}
