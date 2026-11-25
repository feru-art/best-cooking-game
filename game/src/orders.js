// Order tickets: what each customer wants, how long they will wait, and how
// new orders arrive. A ticket's patience drains from full to empty; an order
// that runs out walks away and costs the kitchen a strike.
import { PATIENCE_SECONDS } from './config.js';
import { RECIPES } from './recipes.js';
import { pick } from './random.js';

let nextOrderId = 1;

export function resetOrderIds() {
  nextOrderId = 1;
}

export function spawnOrder(rng, vip) {
  const recipe = pick(rng, RECIPES);
  return {
    id: nextOrderId,
    recipeId: recipe.id,
    patience: PATIENCE_SECONDS,
    maxPatience: PATIENCE_SECONDS,
    vip: Boolean(vip),
  };
}

export function nextOrderIdValue() {
  return nextOrderId;
}

export function bumpOrderId() {
  nextOrderId += 1;
}

/** Fraction of patience left, 0 when the customer has walked away. */
export function patienceFraction(order) {
  return Math.max(0, order.patience / order.maxPatience);
}
