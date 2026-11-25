// The game loop: title, play and results screens, fixed-step simulation,
// mouse and keyboard input, and the ?shot= scenes the screenshots are taken
// from (a staged frame rendered once, deterministically).
import { METER_COOK, SHIFT_SECONDS, STEP, VIEW } from './config.js';
import {
  collectChop, collectStove, createKitchen, missingForOrder, nextOrder,
  serveOrder, stopMeter, takeIngredient, tick, trashPlate,
} from './kitchen.js';
import { drawScene, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, zones } from './render.js';
import { keyAction, toGameCoords } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1);

let state = createKitchen(seed);
let screen = SCREEN_TITLE;
let lastTime = 0;
let accumulator = 0;

function readyOrderIds() {
  const ready = new Set();
  for (const order of state.orders) {
    if (missingForOrder(state, order).length === 0) ready.add(order.id);
  }
  return ready;
}

function render() {
  drawScene(ctx, state, screen, readyOrderIds(), METER_COOK);
  if (status) {
    status.textContent = `Score ${state.score}. ${state.orders.length} orders waiting. ${Math.max(0, Math.ceil(SHIFT_SECONDS - state.time))} seconds left in the shift.`;
  }
}

function startShift() {
  state = createKitchen(seed);
  screen = SCREEN_PLAY;
  accumulator = 0;
  lastTime = 0;
  render();
  requestAnimationFrame(frame);
}

function dispatch(action) {
  if (action.type === 'start') {
    if (screen === SCREEN_TITLE) startShift();
    return;
  }
  if (action.type === 'restart') {
    startShift();
    return;
  }
  if (screen !== SCREEN_PLAY) return;
  switch (action.type) {
    case 'ingredient':
      takeIngredient(state, action.id);
      break;
    case 'collectChop':
      collectChop(state);
      break;
    case 'collectStove':
      if (METER_COOK && state.stove.item !== null && !state.stove.stopped) stopMeter(state);
      else collectStove(state);
      break;
    case 'serve':
      serveOrder(state, action.orderId);
      break;
    case 'serveBest': {
      const order = nextOrder(state);
      if (order !== null) serveOrder(state, order.id);
      break;
    }
    case 'trash':
      trashPlate(state);
      break;
    default:
      break;
  }
  render();
}

canvas.addEventListener('click', (event) => {
  const point = toGameCoords(canvas, event);
  const list = zones(state, screen);
  for (const zone of list) {
    if (point.x >= zone.x && point.x <= zone.x + zone.w && point.y >= zone.y && point.y <= zone.y + zone.h) {
      dispatch(zone.action);
      return;
    }
  }
});

window.addEventListener('keydown', (event) => {
  const action = keyAction(event.code);
  if (action === null) return;
  if (action.type === 'start' && screen === SCREEN_PLAY) {
    const order = nextOrder(state);
    if (order !== null) serveOrder(state, order.id);
    render();
    return;
  }
  event.preventDefault();
  dispatch(action);
});

function frame(now) {
  if (screen !== SCREEN_PLAY) return;
  if (lastTime === 0) lastTime = now;
  const elapsed = Math.min(0.25, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += elapsed;
  let steps = 0;
  while (accumulator >= STEP && steps < 10) {
    tick(state, STEP);
    accumulator -= STEP;
    steps += 1;
    if (state.over) {
      screen = SCREEN_OVER;
      break;
    }
  }
  render();
  if (screen === SCREEN_PLAY) requestAnimationFrame(frame);
}

if (shotName) {
  const staged = stageShot(shotName, seed);
  state = staged.state;
  screen = staged.screen;
  render();
  window.__shotDone = true;
} else {
  render();
}

void VIEW;
