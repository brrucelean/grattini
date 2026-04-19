import { PLAYER_COMBAT_CELLS, ENEMY_COMBAT_POOLS } from "../data/combat.js";
import { roll, pick } from "./random.js";

export function generateCombatCell() {
  const categories = ["COMBATTIMENTO", "DIFESA", "DENARO"];
  // Tradeoff compaiono meno spesso (30% delle carte della categoria)
  const cat = pick(categories);
  const pool = PLAYER_COMBAT_CELLS[cat];
  const base = pool.filter(c => !c.tradeoff);
  const tradeoffs = pool.filter(c => c.tradeoff);
  const useTradeoff = tradeoffs.length > 0 && roll(0.28);
  const effect = useTradeoff ? pick(tradeoffs) : pick(base);
  return { ...effect, category: cat, scratched: false };
}

// Genera una mano di N carte (per selezione 5-scegli-3)
export function generateCombatHand(count = 5) {
  return Array.from({ length: count }, generateCombatCell);
}

// Carte nemico — variano per tipo
export function generateEnemyCombatCell(enemyName) {
  const pool = ENEMY_COMBAT_POOLS[enemyName] || ENEMY_COMBAT_POOLS["Sfidante"];
  const categories = Object.keys(pool);
  const cat = pick(categories);
  const effect = pick(pool[cat]);
  return { ...effect, category: cat, scratched: false };
}

export function generateCombatCard(isSpecial = false, enemyName = null) {
  if (enemyName) {
    // Il Napoletano ha 4 carte invece di 3 — "'na mano napoletana"
    const isNapoletano = enemyName === "Il Napoletano";
    const poolKey = enemyName;
    if (isNapoletano) {
      const cells = [
        generateEnemyCombatCell(poolKey),
        generateEnemyCombatCell(poolKey),
        generateEnemyCombatCell(poolKey),
        generateEnemyCombatCell(poolKey),
      ];
      return { category: cells[0].category, cells, isSpecial: true };
    }
    const cells = [
      generateEnemyCombatCell(poolKey),
      generateEnemyCombatCell(poolKey),
      generateEnemyCombatCell(poolKey),
    ];
    return { category: cells[0].category, cells, isSpecial };
  }
  const cells = [generateCombatCell(), generateCombatCell(), generateCombatCell()];
  return { category: cells[0].category, cells, isSpecial };
}
