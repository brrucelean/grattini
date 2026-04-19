import { PLAYER_COMBAT_CELLS, ENEMY_COMBAT_POOLS } from "../data/combat.js";
import { roll, pick } from "./random.js";

// Sprint 5: Combat card visual variants
// Ogni carta ha 70% chance di essere "normale" (null), altrimenti un variant raro
// con effetto visivo + modificatore gameplay leggero.
export const CARD_VARIANTS = {
  FOIL:      { label: "FOIL",     chance: 0.10, valueMult: 1.0,  desc: "Foil iridescente — porta fortuna",        color: "#88ccff", glow: "0 0 14px #66aaff99, inset 0 0 20px #aaddff44" },
  STRAPPATO: { label: "STRAPPATO",chance: 0.06, valueMult: 0.8,  desc: "Carta rovinata — valore -20%",             color: "#886644", glow: "0 0 10px #66442266" },
  ORO:       { label: "D'ORO",    chance: 0.04, valueMult: 1.4,  desc: "Edizione d'oro — valore +40%",             color: "#ffd700", glow: "0 0 20px #ffd70099, inset 0 0 24px #ffaa0066" },
  BN:        { label: "B&N",      chance: 0.05, valueMult: 0.9,  desc: "Bianco e Nero — valore -10% ma +1 combo",  color: "#cccccc", glow: "0 0 10px #cccccc66" },
  MULTI:     { label: "MULTI",    chance: 0.05, valueMult: 1.0,  desc: "Multicategoria — combo triggera comunque", color: "#ff66cc", glow: "0 0 16px #ff66cc99, inset 0 0 22px #ff88dd44" },
};

function rollVariant() {
  const r = Math.random();
  let acc = 0;
  for (const [key, v] of Object.entries(CARD_VARIANTS)) {
    acc += v.chance;
    if (r < acc) return key;
  }
  return null; // normale
}

export function generateCombatCell() {
  const categories = ["COMBATTIMENTO", "DIFESA", "DENARO"];
  // Tradeoff compaiono meno spesso (30% delle carte della categoria)
  const cat = pick(categories);
  const pool = PLAYER_COMBAT_CELLS[cat];
  const base = pool.filter(c => !c.tradeoff);
  const tradeoffs = pool.filter(c => c.tradeoff);
  const useTradeoff = tradeoffs.length > 0 && roll(0.28);
  const effect = useTradeoff ? pick(tradeoffs) : pick(base);
  const variant = rollVariant();
  return { ...effect, category: cat, variant, scratched: false };
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
