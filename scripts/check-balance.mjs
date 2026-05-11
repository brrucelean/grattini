// Sanity check EV approssimato dopo il nerf/buff fortuna (Beta 5)
// Non rimpiazza una sim Monte Carlo completa con le meccaniche speciali,
// ma valida che gli evTarget documentati siano nel range giusto.
//
// Esegui: node scripts/check-balance.mjs

const BALANCE = {
  fortunaFlash:    { winChance: 0.32, evTarget:  0.00, prizeMin: 1,   prizeMax: 3,    cost: 0.5  },
  setteEMezzo:     { winChance: 0.34, evTarget:  0.00, prizeMin: 2,   prizeMax: 4,    cost: 1    },
  portaFortuna:    { winChance: 0.30, evTarget: -0.03, prizeMin: 4,   prizeMax: 9,    cost: 2    },
  fintoMilionario: { winChance: 0.26, evTarget: -0.05, prizeMin: 10,  prizeMax: 28,   cost: 5    },
  puzzle:          { winChance: 0.28, evTarget: -0.08, prizeMin: 18,  prizeMax: 48,   cost: 10   },
  boccaDrago:      { winChance: 0.22, evTarget: -0.08, prizeMin: 40,  prizeMax: 130,  cost: 20   },
  miliardario:     { winChance: 0.17, evTarget: -0.10, prizeMin: 60,  prizeMax: 260,  cost: 30   },
  tredici:         { winChance: 0.14, evTarget:  0.00, prizeMin: 200, prizeMax: 520,  cost: 50   },
  maledetto:       { winChance: 0.11, evTarget:  0.00, prizeMin: 450, prizeMax: 1400, cost: 100  },
  ruota:           { winChance: 0.22, evTarget: -0.02, prizeMin: 25,  prizeMax: 65,   cost: 15   },
  labirinto:       { winChance: 0.26, evTarget: -0.09, prizeMin: 30,  prizeMax: 75,   cost: 15   },
  grattaCombina:   { winChance: 0.28, evTarget: -0.10, prizeMin: 45,  prizeMax: 115,  cost: 25   },
  mappaTesor0:     { winChance: 0.22, evTarget: -0.10, prizeMin: 75,  prizeMax: 210,  cost: 35   },
  doppioOnulla:    { winChance: 0.48, evTarget: -0.09, prizeMin: 28,  prizeMax: 48,   cost: 20   },
  mahjong:         { winChance: 0.28, evTarget: -0.10, prizeMin: 45,  prizeMax: 115,  cost: 25   },
  jackpotMix:      { winChance: 0.24, evTarget:  0.00, prizeMin: 45,  prizeMax: 120,  cost: 20   },
  turistaPerSempre:{ winChance: 0.20, evTarget: -0.14, prizeMin: 85,  prizeMax: 260,  cost: 40   },
};

const fortuneBonus = (f) => Math.min(Math.max(f, 0), 5) * 0.06;

function evAtFortune(b, fortune) {
  const winP = Math.min(b.winChance + fortuneBonus(fortune), 0.95);
  const avgPrize = (b.prizeMin + b.prizeMax) / 2;
  const ev = winP * avgPrize - b.cost;
  const evPct = ev / b.cost;
  return { winP, ev, evPct };
}

console.log("\n══════════════════════════════════════════════════════════════════════");
console.log("  GRATTINI · EV CHECK (post-rebalance Fortuna Beta 5)");
console.log("══════════════════════════════════════════════════════════════════════\n");
console.log("Card                 │  F0   │  F2   │  F5   │  Target   │ Status");
console.log("─────────────────────┼───────┼───────┼───────┼───────────┼────────");

const issues = [];
for (const [id, b] of Object.entries(BALANCE)) {
  const f0 = evAtFortune(b, 0);
  const f2 = evAtFortune(b, 2);
  const f5 = evAtFortune(b, 5);
  const target = b.evTarget;
  const drift = f0.evPct - target;
  const status = Math.abs(drift) < 0.05 ? "✓"
    : drift > 0.05 ? `▲ +${(drift*100).toFixed(1)}%`
    : `▼ ${(drift*100).toFixed(1)}%`;
  if (Math.abs(drift) >= 0.05) issues.push({ id, target, actual: f0.evPct, drift });
  const fmt = (n) => (n >= 0 ? "+" : "") + (n*100).toFixed(0).padStart(3) + "%";
  console.log(`${id.padEnd(20)} │ ${fmt(f0.evPct)} │ ${fmt(f2.evPct)} │ ${fmt(f5.evPct)} │ ${fmt(target).padEnd(9)} │ ${status}`);
}

console.log("\n──────────────────────────────────────────────────────────────────────");
console.log(`Range EV con F5 max: ${Object.values(BALANCE).map(b => evAtFortune(b, 5).evPct).reduce((a,b) => Math.max(a,b), -Infinity).toFixed(2)*100 | 0}% massimo`);
console.log(`Carte ora EV+ con F5: ${Object.entries(BALANCE).filter(([,b]) => evAtFortune(b, 5).evPct > 0).length} / ${Object.keys(BALANCE).length}`);

if (issues.length > 0) {
  console.log("\n⚠ DRIFT TARGET (>5%) — possibili da rivedere:");
  for (const { id, target, actual, drift } of issues) {
    console.log(`   ${id.padEnd(20)} target=${(target*100).toFixed(0)}% actual=${(actual*100).toFixed(1)}% drift=${(drift*100).toFixed(1)}%`);
  }
} else {
  console.log("\n✓ Tutti gli EV F0 entro ±5% dal target.");
}
console.log();
