// Ingredients and recipes: the food the kitchen serves. Each ingredient
// names the prep it needs (chop, cook, or none) and its plate colour; each
// recipe is the exact multiset of ingredients one order ticket asks for.
export const INGREDIENTS = {
  bun: { name: 'Bun', prep: 'none', color: '#e8b04b', key: '1' },
  patty: { name: 'Patty', prep: 'cook', color: '#8a5a33', key: '2' },
  lettuce: { name: 'Lettuce', prep: 'chop', color: '#5da24a', key: '3' },
  tomato: { name: 'Tomato', prep: 'chop', color: '#d64541', key: '4' },
  cheese: { name: 'Cheese', prep: 'none', color: '#f2c94c', key: '5' },
  egg: { name: 'Egg', prep: 'cook', color: '#f5f0dc', key: '6' },
};

export const INGREDIENT_IDS = Object.keys(INGREDIENTS);

export const RECIPES = [
  { id: 'burger', name: 'Burger', items: ['bun', 'patty', 'lettuce'], points: 100 },
  { id: 'salad', name: 'Garden Salad', items: ['lettuce', 'tomato', 'cheese'], points: 90 },
  { id: 'omelette', name: 'Omelette', items: ['egg', 'cheese', 'tomato'], points: 110 },
  { id: 'sandwich', name: 'Sandwich', items: ['bun', 'cheese', 'tomato'], points: 80 },
  { id: 'cheeseburger', name: 'Cheeseburger', items: ['bun', 'patty', 'cheese'], points: 120 },
  { id: 'chef-salad', name: 'Chef Salad', items: ['lettuce', 'tomato', 'egg'], points: 115 },
];

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}

/** True when the plate holds exactly the recipe's ingredients, in any order. */
export function plateMatchesRecipe(plate, recipe) {
  if (plate.length !== recipe.items.length) return false;
  const wanted = [...recipe.items].sort();
  const have = [...plate].sort();
  return wanted.every((item, index) => item === have[index]);
}
