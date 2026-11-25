// Keyboard controls for the kitchen: number keys grab ingredients, C/K
// collect the stations, Space serves the least patient matching order,
// Backspace clears the plate, Enter starts, R restarts.
import { INGREDIENT_IDS } from './recipes.js';

export function keyAction(code) {
  if (code === 'Enter' || code === 'Space') return { type: 'start' };
  if (code === 'KeyR') return { type: 'restart' };
  if (code === 'Backspace' || code === 'Delete') return { type: 'trash' };
  if (code === 'KeyC') return { type: 'collectChop' };
  if (code === 'KeyK') return { type: 'collectStove' };
  if (code === 'KeyS') return { type: 'serveBest' };
  if (code.startsWith('Digit')) {
    const index = Number(code.slice(5)) - 1;
    if (index >= 0 && index < INGREDIENT_IDS.length) {
      return { type: 'ingredient', id: INGREDIENT_IDS[index] };
    }
  }
  return null;
}

/** Convert a mouse event on the canvas to game coordinates (1280x720). */
export function toGameCoords(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}
