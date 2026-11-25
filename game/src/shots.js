// Screenshot scenes: each one plays the real rules forward from a fresh
// kitchen for a fixed number of steps, steered by a greedy autopilot, so the
// frame is what a real shift looks like and the same seed always gives the
// same frame. The cover scene stops the moment a plate is ready to serve.
import { METER_COOK, STEP } from './config.js';
import { createKitchen, collectChop, collectStove, isNeeded, missingForOrder, nextOrder, serveOrder, stopMeter, takeIngredient, tick, trashPlate } from './kitchen.js';
import { INGREDIENTS, recipeById } from './recipes.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 25;
const RUSH_SECONDS = 45;
const SERVE_LIMIT_SECONDS = 40;
const END_LIMIT_SECONDS = 600;

/** True when the plate could still become some current order (its items are
 *  a sub-multiset of at least one ticket's recipe). */
function plateStillUseful(state) {
  if (state.plate.length === 0) return true;
  return state.orders.some((order) => {
    const remaining = [...recipeById(order.recipeId).items];
    for (const item of state.plate) {
      const at = remaining.indexOf(item);
      if (at < 0) return false;
      remaining.splice(at, 1);
    }
    return true;
  });
}

function plateMatchesAnyOrder(state) {
  return state.orders.some((order) => missingForOrder(state, order).length === 0);
}

function serveBest(state) {
  const matching = state.orders.filter((order) => missingForOrder(state, order).length === 0);
  if (matching.length === 0) return false;
  matching.sort((a, b) => a.patience - b.patience);
  return serveOrder(state, matching[0].id);
}

/** One autopilot decision: serve, collect, stop the needle, or take the next
 *  ingredient the least patient order still needs. */
function autopilot(state, serve) {
  if (!plateStillUseful(state)) {
    trashPlate(state);
    return;
  }
  if (serve && serveBest(state)) return;
  const stove = state.stove;
  if (stove.item !== null) {
    if (stove.burnt) { collectStove(state); return; }
    const stoveReady = METER_COOK ? stove.stopped : stove.progress >= 1;
    if (stoveReady && isNeeded(state, stove.item)) { collectStove(state); return; }
    if (METER_COOK && !stove.stopped && stove.meter >= 0.35 && stove.meter <= 0.65) {
      stopMeter(state);
      return;
    }
  }
  const chop = state.chop;
  if (chop.item !== null && chop.progress >= 1 && isNeeded(state, chop.item)) {
    collectChop(state);
    return;
  }
  const order = nextOrder(state);
  if (order === null) return;
  for (const item of missingForOrder(state, order)) {
    if (takeIngredient(state, item)) return;
    const prep = INGREDIENTS[item].prep;
    if (prep === 'chop' && state.chop.item !== null) continue;
    if (prep === 'cook' && state.stove.item !== null) continue;
  }
}

/** Run the kitchen forward for `seconds` of autopilot play. */
function playForward(state, seconds, serve) {
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    autopilot(state, serve);
    if (tick(state, STEP)) break;
  }
}

/**
 * Stage the named scene (start, play, rush, serve, end) on a fresh kitchen
 * and return the screen to draw over it.
 */
export function stageShot(name, seed) {
  const state = createKitchen(seed);
  if (name === 'play') {
    playForward(state, PLAY_SECONDS, true);
    return { state, screen: SCREEN_PLAY };
  }
  if (name === 'rush') {
    playForward(state, RUSH_SECONDS, true);
    return { state, screen: SCREEN_PLAY };
  }
  if (name === 'serve') {
    // Serve the first dish (so the cover shows a real score), then stop at
    // the next ready plate with two tickets on the board.
    playForward(state, 12, true);
    for (let index = 0; index < SERVE_LIMIT_SECONDS / STEP; index += 1) {
      autopilot(state, false);
      if (plateMatchesAnyOrder(state) && state.orders.length >= 2) break;
      if (tick(state, STEP)) break;
    }
    return { state, screen: SCREEN_PLAY };
  }
  if (name === 'end') {
    playForward(state, END_LIMIT_SECONDS, true);
    return { state, screen: state.over ? SCREEN_OVER : SCREEN_PLAY };
  }
  playForward(state, START_SECONDS, true);
  return { state, screen: SCREEN_TITLE };
}
