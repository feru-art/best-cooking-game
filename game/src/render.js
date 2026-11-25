// Every pixel of the kitchen: the order board, the stations, the plate, the
// ingredient counter, the timer, and the title and results screens. Food is
// drawn with plain canvas shapes (no images, no web fonts, no network), so a
// frame looks the same in every browser. Zones are exported for click input.
import { SHIFT_SECONDS, VIEW } from './config.js';
import { INGREDIENTS, INGREDIENT_IDS, recipeById } from './recipes.js';
import { patienceFraction } from './orders.js';
import { MAX_STRIKES } from './kitchen.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const INK = '#3a2a1e';
const CREAM = '#f7e8d0';
const WOOD = '#a4713e';
const WOOD_DARK = '#7d5230';
const TERRA = '#c65d3b';
const GREEN = '#4e9a51';
const RED = '#d64541';
const GOLD = '#e9a13b';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, fill, stroke) {
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** Draw one ingredient as a small stylised dish of shapes. */
export function drawIngredient(ctx, id, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (id === 'bun') {
    ctx.fillStyle = '#e8b04b';
    ctx.beginPath();
    ctx.arc(0, 2, s * 0.9, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c98f2e';
    ctx.fillRect(-s * 0.9, 2, s * 1.8, s * 0.45);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.35, s * 0.12, 0, Math.PI * 2);
    ctx.arc(s * 0.25, -s * 0.5, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'patty') {
    ctx.fillStyle = '#8a5a33';
    roundRect(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.4);
    ctx.fill();
    ctx.fillStyle = '#6d4423';
    ctx.beginPath();
    ctx.arc(-s * 0.4, 0, s * 0.14, 0, Math.PI * 2);
    ctx.arc(s * 0.3, -s * 0.15, s * 0.12, 0, Math.PI * 2);
    ctx.arc(s * 0.05, s * 0.2, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#5da24a';
    for (const [dx, dy, r] of [[-0.35, 0.1, 0.55], [0.3, -0.05, 0.6], [0, 0.35, 0.5]]) {
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#7cc46a';
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.1, s * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'tomato') {
    ctx.fillStyle = '#d64541';
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4e9a51';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.8);
    ctx.lineTo(-s * 0.45, -s * 0.35);
    ctx.lineTo(s * 0.45, -s * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.15, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'cheese') {
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, s * 0.6);
    ctx.lineTo(s * 0.9, s * 0.6);
    ctx.lineTo(s * 0.9, -s * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d9a92e';
    ctx.beginPath();
    ctx.arc(s * 0.35, s * 0.25, s * 0.14, 0, Math.PI * 2);
    ctx.arc(-s * 0.3, s * 0.35, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'egg') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.95, s * 0.7, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2a93b';
    ctx.beginPath();
    ctx.arc(s * 0.1, 0, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStar(ctx, x, y, r, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? GOLD : '#d8c9ae';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#a8762a';
  ctx.stroke();
  ctx.restore();
}

function text(ctx, value, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight || '700'} ${size}px Verdana, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function progressBar(ctx, x, y, w, h, fraction, color) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = '#e5d5b8';
  ctx.fill();
  if (fraction > 0) {
    roundRect(ctx, x, y, Math.max(h, w * fraction), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#8a6a45';
  ctx.stroke();
}

const TICKET_W = 300;
const TICKET_H = 112;

function ticketRect(index) {
  return { x: 24 + index * (TICKET_W + 16), y: 78, w: TICKET_W, h: TICKET_H };
}

function drawOrderBoard(ctx, state, readyIds) {
  panel(ctx, 12, 70, 1256, 132, '#fff8ea', WOOD);
  text(ctx, 'ORDER BOARD', 1252, 96, 15, TERRA, 'right', '800');
  state.orders.forEach((order, index) => {
    const r = ticketRect(index);
    const recipe = recipeById(order.recipeId);
    const ready = readyIds.has(order.id);
    const frac = patienceFraction(order);
    panel(ctx, r.x, r.y + 14, r.w, r.h - 14, order.vip ? '#fff3c4' : '#ffffff', ready ? GREEN : order.vip ? GOLD : '#c9b48f');
    if (ready) {
      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = GREEN;
      roundRect(ctx, r.x - 2, r.y + 12, r.w + 4, r.h - 10, 14);
      ctx.stroke();
      ctx.restore();
    }
    text(ctx, `${order.vip ? '★ VIP ' : ''}${recipe.name}`, r.x + 14, r.y + 36, 19, INK);
    text(ctx, ready ? 'READY — CLICK TO SERVE!' : 'wants:', r.x + 14, r.y + 62, 12, ready ? GREEN : '#8a6a45', 'left', '700');
    recipe.items.forEach((item, i) => {
      drawIngredient(ctx, item, r.x + 24 + i * 34, r.y + 84, 26);
    });
    const barColor = frac > 0.5 ? GREEN : frac > 0.25 ? GOLD : RED;
    progressBar(ctx, r.x + 150, r.y + 76, r.w - 166, 14, frac, barColor);
    text(ctx, `${Math.ceil(order.patience)}s`, r.x + r.w - 12, r.y + 36, 14, barColor, 'right');
  });
  if (state.orders.length === 0) {
    const line = state.served > 0
      ? 'All caught up — the next customer is on the way...'
      : 'No orders yet — the first customer is on the way...';
    text(ctx, line, 640, 140, 17, '#8a6a45', 'center');
  }
}

function drawChopStation(ctx, state) {
  const x = 60;
  const y = 240;
  panel(ctx, x, y, 300, 250, '#c89a63', WOOD_DARK);
  text(ctx, 'CHOPPING BOARD', x + 150, y + 28, 17, '#fff8ea', 'center', '800');
  ctx.fillStyle = '#e8d3a8';
  roundRect(ctx, x + 40, y + 52, 220, 110, 10);
  ctx.fill();
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 3;
  ctx.stroke();
  if (state.chop.item) {
    drawIngredient(ctx, state.chop.item, x + 150, y + 107, 74);
    if (state.chop.progress < 1) {
      progressBar(ctx, x + 40, y + 180, 220, 16, state.chop.progress, GREEN);
      text(ctx, 'Chopping...', x + 150, y + 212, 15, '#fff8ea', 'center');
    } else {
      text(ctx, 'DONE — click to plate it!', x + 150, y + 200, 15, GREEN, 'center');
    }
  } else {
    text(ctx, 'Click a lettuce or tomato', x + 150, y + 100, 14, '#7d5230', 'center');
    text(ctx, 'to chop it here', x + 150, y + 122, 14, '#7d5230', 'center');
  }
  text(ctx, 'press C to collect', x + 150, y + 232, 12, '#fff8ea', 'center');
}

function drawStoveStation(ctx, state, meterCook) {
  const x = 920;
  const y = 240;
  panel(ctx, x, y, 300, 250, '#4a4a52', '#2e2e33');
  text(ctx, 'STOVE', x + 150, y + 28, 17, '#fff8ea', 'center', '800');
  ctx.fillStyle = '#33333a';
  ctx.beginPath();
  ctx.arc(x + 150, y + 110, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d1d22';
  ctx.lineWidth = 4;
  ctx.stroke();
  if (state.stove.item) {
    if (state.stove.burnt) {
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(x + 150, y + 110, 30, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'BURNT! Click to bin it.', x + 150, y + 200, 15, RED, 'center');
    } else {
      drawIngredient(ctx, state.stove.item, x + 150, y + 110, 64);
      if (meterCook) {
        const mx = x + 40;
        const mw = 220;
        const my = y + 180;
        roundRect(ctx, mx, my, mw, 18, 9);
        ctx.fillStyle = '#e5d5b8';
        ctx.fill();
        ctx.fillStyle = GREEN;
        ctx.fillRect(mx + mw * 0.35, my, mw * 0.3, 18);
        const nx = mx + mw * state.stove.meter;
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(nx, my - 6);
        ctx.lineTo(nx - 7, my - 16);
        ctx.lineTo(nx + 7, my - 16);
        ctx.closePath();
        ctx.fill();
        text(ctx, state.stove.stopped ? 'STOPPED — click to plate!' : 'Click the stove to stop the needle in the green!', x + 150, y + 216, 12, '#fff8ea', 'center');
      } else if (state.stove.progress < 1) {
        progressBar(ctx, x + 40, y + 180, 220, 16, state.stove.progress, TERRA);
        text(ctx, 'Cooking...', x + 150, y + 212, 15, '#fff8ea', 'center');
      } else {
        text(ctx, 'DONE — click to plate it!', x + 150, y + 200, 15, GREEN, 'center');
        text(ctx, 'Hurry, it will burn!', x + 150, y + 222, 12, RED, 'center');
      }
    }
  } else {
    text(ctx, 'Click a patty or egg', x + 150, y + 100, 14, '#cfcfd6', 'center');
    text(ctx, 'to cook it here', x + 150, y + 122, 14, '#cfcfd6', 'center');
  }
  text(ctx, 'press K to collect', x + 150, y + 232, 12, '#fff8ea', 'center');
}

function drawPlate(ctx, state) {
  const cx = 640;
  const cy = 365;
  panel(ctx, 400, 240, 480, 250, '#fff8ea', WOOD);
  text(ctx, 'YOUR PLATE', cx, 268, 17, TERRA, 'center', '800');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#c9b48f';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 70, 0, Math.PI * 2);
  ctx.strokeStyle = '#e5d5b8';
  ctx.lineWidth = 2;
  ctx.stroke();
  const n = state.plate.length;
  state.plate.forEach((item, i) => {
    const angle = (Math.PI * 2 * i) / Math.max(1, n) - Math.PI / 2;
    const r = n <= 1 ? 0 : 34;
    drawIngredient(ctx, item, cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 56);
  });
  if (n === 0) {
    text(ctx, 'empty — add ingredients', cx, cy, 14, '#a88a63', 'center');
  }
  text(ctx, n === 0 ? 'Click ingredients below to build a dish' : `${n} item${n > 1 ? 's' : ''} on the plate`, cx, 466, 13, '#8a6a45', 'center');
}

function drawCounter(ctx, state) {
  panel(ctx, 12, 512, 1256, 140, WOOD, WOOD_DARK);
  text(ctx, 'INGREDIENTS — click to take', 28, 534, 15, '#fff8ea', 'left', '800');
  INGREDIENT_IDS.forEach((id, i) => {
    const x = 40 + i * 200;
    const y = 548;
    const busy = (INGREDIENTS[id].prep === 'chop' && state.chop.item !== null)
      || (INGREDIENTS[id].prep === 'cook' && state.stove.item !== null);
    panel(ctx, x, y, 176, 88, busy ? '#d8c9ae' : '#fff8ea', WOOD_DARK);
    drawIngredient(ctx, id, x + 40, y + 44, 52);
    text(ctx, INGREDIENTS[id].name, x + 76, y + 30, 17, INK);
    const prep = INGREDIENTS[id].prep === 'none' ? 'ready to plate' : `needs ${INGREDIENTS[id].prep}`;
    text(ctx, prep, x + 76, y + 54, 12, '#8a6a45');
    text(ctx, `[${INGREDIENTS[id].key}]`, x + 162, y + 18, 12, '#a88a63', 'right');
    if (busy) text(ctx, 'station busy', x + 76, y + 74, 11, RED);
  });
}

function drawTopBar(ctx, state) {
  panel(ctx, 0, 0, VIEW.width, 64, '#3a2a1e', null);
  text(ctx, 'DAPUR KILAT', 24, 33, 26, '#ffd98a', 'left', '800');
  text(ctx, 'Lightning Kitchen', 230, 36, 13, '#c9b48f');
  const left = Math.max(0, SHIFT_SECONDS - state.time);
  const frac = left / SHIFT_SECONDS;
  const barColor = frac > 0.33 ? GREEN : frac > 0.15 ? GOLD : RED;
  progressBar(ctx, 470, 20, 340, 24, frac, barColor);
  text(ctx, `${Math.ceil(left)}s`, 640, 32, 18, '#ffffff', 'center', '800');
  text(ctx, 'SHIFT', 470, 54, 10, '#c9b48f', 'left', '700');
  text(ctx, `SCORE ${state.score}`, 1010, 26, 22, '#ffffff', 'left', '800');
  text(ctx, state.combo >= 2 ? `COMBO x${state.combo}` : `served ${state.served}  •  lost ${state.lost}`, 1010, 50, 13, state.combo >= 2 ? GOLD : '#c9b48f', 'left', '700');
  for (let i = 0; i < MAX_STRIKES; i += 1) {
    ctx.fillStyle = i < state.strikes ? RED : '#5a4636';
    ctx.beginPath();
    ctx.arc(900 + i * 26, 32, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, 'strikes', 888, 54, 10, '#c9b48f', 'left', '700');
}

function drawBottomBar(ctx, state) {
  panel(ctx, 12, 660, 1256, 48, '#3a2a1e', null);
  const msg = state.time < state.messageUntil ? state.message : 'Click ingredients, chop & cook, then click a matching order ticket to serve.';
  text(ctx, msg, 28, 684, 15, '#ffd98a');
  text(ctx, '1-6 ingredients  •  C chop  •  K stove  •  S serve', 700, 684, 12, '#c9b48f', 'center');
  panel(ctx, 1140, 664, 116, 40, '#8a3b2e', '#5d2418');
  text(ctx, 'CLEAR PLATE', 1198, 684, 12, '#ffffff', 'center', '800');
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(43, 29, 22, 0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 240, 90, 800, 540, '#fff8ea', WOOD);
  text(ctx, 'DAPUR KILAT', 640, 160, 54, TERRA, 'center', '800');
  text(ctx, 'Lightning Kitchen — a 90-second cooking rush', 640, 210, 20, INK, 'center');
  const lines = [
    '1. Read the order tickets at the top.',
    '2. Click ingredients: lettuce & tomato go to the chopping board,',
    '    patty & egg go to the stove, the rest go straight on the plate.',
    '3. Collect finished items onto your plate, then click the',
    '    matching order ticket to serve it before patience runs out.',
    '4. Fast serves earn tips, streaks build combos, VIPs pay double.',
    '   Three walk-aways end the shift early. Earn 3 stars!',
  ];
  lines.forEach((line, i) => text(ctx, line, 640, 262 + i * 32, 17, INK, 'center'));
  panel(ctx, 490, 520, 300, 64, GREEN, '#2f6b32');
  text(ctx, '▶  START SHIFT', 640, 552, 24, '#ffffff', 'center', '800');
  text(ctx, 'or press Enter  •  mouse + keyboard', 640, 606, 13, '#8a6a45', 'center');
  void state;
}

function drawResults(ctx, state) {
  ctx.fillStyle = 'rgba(43, 29, 22, 0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, 290, 80, 700, 560, '#fff8ea', WOOD);
  text(ctx, state.strikes >= MAX_STRIKES ? 'SHIFT ENDED EARLY!' : 'SHIFT COMPLETE!', 640, 140, 40, TERRA, 'center', '800');
  for (let i = 0; i < 3; i += 1) {
    drawStar(ctx, 540 + i * 100, 210, 40, i < state.stars);
  }
  text(ctx, `SCORE  ${state.score}`, 640, 300, 44, INK, 'center', '800');
  text(ctx, `Dishes served: ${state.served}    •    Customers lost: ${state.lost}`, 640, 356, 20, INK, 'center');
  text(ctx, `Best combo: x${Math.max(1, state.bestCombo)}`, 640, 392, 20, INK, 'center');
  const verdict = state.stars === 3 ? 'Master Chef! The kitchen is yours.'
    : state.stars === 2 ? 'Great service! One more star is within reach.'
    : state.stars === 1 ? 'A solid shift. Faster serves earn bigger tips.'
    : 'Rough shift — watch the patience bars and serve early!';
  text(ctx, verdict, 640, 440, 18, TERRA, 'center');
  panel(ctx, 490, 500, 300, 60, GREEN, '#2f6b32');
  text(ctx, '↻  PLAY AGAIN', 640, 530, 22, '#ffffff', 'center', '800');
  text(ctx, 'or press R', 640, 590, 13, '#8a6a45', 'center');
}

/** Clickable zones for the current screen, in game coordinates. */
export function zones(state, screen) {
  const list = [];
  if (screen === SCREEN_TITLE) {
    list.push({ x: 490, y: 520, w: 300, h: 64, action: { type: 'start' } });
    return list;
  }
  if (screen === SCREEN_OVER) {
    list.push({ x: 490, y: 500, w: 300, h: 60, action: { type: 'restart' } });
    return list;
  }
  state.orders.forEach((order, index) => {
    const r = ticketRect(index);
    list.push({ x: r.x, y: r.y + 14, w: r.w, h: r.h - 14, action: { type: 'serve', orderId: order.id } });
  });
  list.push({ x: 60, y: 240, w: 300, h: 250, action: { type: 'collectChop' } });
  list.push({ x: 920, y: 240, w: 300, h: 250, action: { type: 'collectStove' } });
  INGREDIENT_IDS.forEach((id, i) => {
    list.push({ x: 40 + i * 200, y: 548, w: 176, h: 88, action: { type: 'ingredient', id } });
  });
  list.push({ x: 1140, y: 660, w: 128, h: 48, action: { type: 'trash' } });
  return list;
}

export function drawScene(ctx, state, screen, readyIds, meterCook) {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#efe0c2';
  for (let x = 0; x < VIEW.width; x += 64) {
    ctx.fillRect(x, 210, 2, 300);
  }
  drawTopBar(ctx, state);
  drawOrderBoard(ctx, state, readyIds);
  drawChopStation(ctx, state);
  drawPlate(ctx, state);
  drawStoveStation(ctx, state, meterCook);
  drawCounter(ctx, state);
  drawBottomBar(ctx, state);
  if (state.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, state.flash);
    ctx.fillStyle = '#7ed491';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.restore();
  }
  if (screen === SCREEN_TITLE) drawTitle(ctx, state);
  if (screen === SCREEN_OVER) drawResults(ctx, state);
}
