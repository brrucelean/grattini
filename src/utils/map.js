import { BIOMES } from "../data/biomes.js";
import { NODE_POOL_WEIGHTS } from "../data/map.js";
import { roll, pick, shuffle, weightedPick } from "./random.js";

// Generate map for a biome — layered graph with branching paths
export function generateMap(biomeIdx = 0) {
  // ── LAYER LAYOUT: 11 righe, più percorsi e variazione ──────────
  const LAYER_XS = [
    [0.5],                                         // row 0: start
    [0.17, 0.5, 0.83],                            // row 1: 3-way split
    [0.08, 0.3, 0.54, 0.76],                     // row 2: 4 nodi (3→4 espande)
    [0.08, 0.27, 0.47, 0.67, 0.88],              // row 3: 5 nodi (4→5 espande, 3 scelte centro)
    [0.1,  0.3,  0.5,  0.7,  0.9],              // row 4: 5 nodi (5→5)
    [0.08, 0.27, 0.47, 0.67, 0.88],              // row 5: 5 nodi (5→5)
    [0.1,  0.3,  0.5,  0.7,  0.9],              // row 6: 5 nodi (5→5)
    [0.08, 0.3,  0.54, 0.76],                    // row 7: 4 nodi (5→4 inizia convergenza)
    [0.22, 0.5,  0.78],                           // row 8: 3 nodi (4→3)
    [0.35, 0.65],                                 // row 9: 2 nodi pre-boss
    [0.5],                                         // row 10: boss
  ];

  // Tipi per zona X: sinistra=pericolo, destra=sicuro, centro=bilanciato
  const LEFT_POOL  = [
    {type:"ladro",w:22},{type:"spacciatore",w:16},{type:"miniboss",w:16},
    {type:"evento",w:20},{type:"stregone",w:14},{type:"tabaccaio",w:12},
  ];
  const RIGHT_POOL = [
    {type:"locanda",w:30},{type:"tabaccaio",w:26},{type:"chirurgo",w:14},
    {type:"mendicante",w:18},{type:"sacerdote",w:12},
  ];
  const MID_POOL = NODE_POOL_WEIGHTS;

  const getTypeForX = (x) => {
    if (x < 0.25) return weightedPick(LEFT_POOL);
    if (x > 0.75) return weightedPick(RIGHT_POOL);
    return weightedPick(MID_POOL);
  };

  // ── Costruisce le righe ──────────────────────────────────────
  const rows = LAYER_XS.map((xs, rIdx) => {
    if (rIdx === 0) return xs.map((x, c) => ({ type:"start", id:`r${rIdx}c${c}`, x, row:rIdx }));
    if (rIdx === LAYER_XS.length - 1) return [{ type:"boss", id:"boss", bossName: BIOMES[biomeIdx]?.boss || "Il Broker", x:0.5, row:rIdx }];
    return xs.map((x, c) => ({ type: getTypeForX(x), id:`r${rIdx}c${c}`, x, row:rIdx }));
  });

  // ── NPC a comparsa tardiva ──────────────────────────────────
  rows.slice(3).flat().forEach(n => {
    if (n.type !== "boss" && n.type !== "start" && roll(0.07)) n.type = "poliziotto";
  });
  rows.slice(4).flat().forEach(n => {
    if (n.type !== "boss" && n.type !== "start" && n.type !== "poliziotto" && roll(0.05)) n.type = "anziana";
  });
  rows.slice(5).flat().forEach(n => {
    if (n.type !== "boss" && n.type !== "start" && n.type !== "poliziotto" && n.type !== "anziana" && roll(0.04)) n.type = "bambino";
  });
  rows.slice(6).flat().forEach(n => {
    if (n.type !== "boss" && n.type !== "start" && n.type !== "poliziotto" && n.type !== "anziana" && n.type !== "bambino" && roll(0.04)) n.type = "streamer";
  });
  if (biomeIdx >= 1) {
    rows.slice(3).flat().forEach(n => {
      if (n.type !== "boss" && n.type !== "start" && n.type !== "poliziotto" && n.type !== "anziana" && roll(0.05)) n.type = "macellaio";
    });
  }
  // Bioma 3 (Quartiere Cinese): inietta Maestro del Tè (15% dei nodi safe)
  if (biomeIdx === 3) {
    rows.slice(2).flat().forEach(n => {
      if (["locanda","mendicante","sacerdote"].includes(n.type) && roll(0.15)) n.type = "maestroTe";
    });
  }

  // ── DISTRIBUZIONE / SPACING ─────────────────────────────────
  // Fix: "?" eventi, stregoni e NPC rari si ammassavano.
  //  · UNIQUE_PER_ROW: al massimo 1 per riga per i tipi "speciali"
  //  · MIN_ROW_GAP: distanza minima tra occorrenze dello stesso tipo su righe vicine
  //  · NO_ADJACENT_SAME: nella stessa riga, due nodi vicini non possono avere lo stesso tipo
  const UNIQUE_PER_ROW = new Set([
    "evento","stregone","miniboss","chirurgo","spacciatore","ladro",
    "poliziotto","anziana","bambino","streamer","macellaio","maestroTe","sacerdote"
  ]);
  // Gap minimo tra occorrenze su righe vicine (verticale/diagonale).
  // spacciatore/ladro/poliziotto hanno gap 2 per evitare che si ammassino su 3+
  // righe consecutive anche se ogni riga ne ha al massimo 1.
  const MIN_ROW_GAP = {
    evento: 2, stregone: 3,
    miniboss: 2, chirurgo: 2, macellaio: 2,
    spacciatore: 2, ladro: 2, poliziotto: 2,
    anziana: 2, bambino: 2, streamer: 2, sacerdote: 2,
  };
  const lastSeenRow = {};

  const replacementFor = (x, forbidden) => {
    const pool = (x < 0.25 ? LEFT_POOL : x > 0.75 ? RIGHT_POOL : MID_POOL)
      .filter(e => !forbidden.has(e.type));
    if (pool.length === 0) return "tabaccaio";
    for (let tries = 0; tries < 6; tries++) {
      const t = weightedPick(pool);
      if (!forbidden.has(t)) return t;
    }
    return pool[0].type;
  };

  for (let rIdx = 1; rIdx < rows.length - 1; rIdx++) {
    const row = [...rows[rIdx]].sort((a, b) => a.x - b.x);
    const seenInRow = new Set();
    for (let i = 0; i < row.length; i++) {
      const n = row[i];
      const prevType = i > 0 ? row[i - 1].type : null;
      const buildForbidden = () => {
        const f = new Set();
        seenInRow.forEach(t => { if (UNIQUE_PER_ROW.has(t)) f.add(t); });
        if (prevType) f.add(prevType); // no-adjacent-same
        Object.entries(MIN_ROW_GAP).forEach(([t, gap]) => {
          if (lastSeenRow[t] != null && rIdx - lastSeenRow[t] < gap) f.add(t);
        });
        return f;
      };
      let tries = 0;
      while (tries < 5) {
        const forbidden = buildForbidden();
        if (!forbidden.has(n.type)) break;
        n.type = replacementFor(n.x, forbidden);
        tries++;
      }
      seenInRow.add(n.type);
      lastSeenRow[n.type] = rIdx;
    }
  }

  // ── GUANTAIO: 1 nodo per mappa nelle righe pre-boss (7-9) ──
  // Vende il Guanto da BOSS — protezione unica contro il combattimento finale.
  const guantaioCandidates = rows.slice(7, 10).flat().filter(n =>
    n.type !== "boss" && n.type !== "start" && n.type !== "poliziotto" && n.type !== "anziana" && n.type !== "bambino"
  );
  if (guantaioCandidates.length > 0) {
    const chosen = pick(guantaioCandidates);
    chosen.type = "guantaio";
  }

  // ── Garantisci almeno 2 tabaccai, 2 locande, 1 sacerdote ────
  const midRows = rows.slice(1, LAYER_XS.length - 1).flat();
  const ensureMin = (type, min, exclude=[]) => {
    const count = midRows.filter(n => n.type === type).length;
    if (count < min) {
      const cands = midRows.filter(n => !exclude.includes(n.type) && n.type !== type && n.type !== "boss" && n.type !== "start");
      for (let i = 0; i < min - count && i < cands.length; i++) cands[i].type = type;
    }
  };
  ensureMin("tabaccaio", 2, ["locanda"]);
  ensureMin("locanda", 2, ["tabaccaio"]);
  if (!midRows.some(n => n.type === "sacerdote")) {
    const cand = midRows.find(n => n.x > 0.6 && n.type !== "tabaccaio" && n.type !== "locanda");
    if (cand) cand.type = "sacerdote";
  }

  // ── Nodi SEGRETI: 2 per mappa, visibili solo con Fortuna ────
  const secretCandidates = rows.slice(2, 8).flat().filter(n =>
    n.type !== "boss" && n.type !== "start" && n.x < 0.15
  );
  shuffle(secretCandidates).slice(0, 2).forEach(n => { n.secret = true; n.type = "evento"; });

  // ── Nodi ELITE: 1-2 per mappa, rischio/premio raddoppiato ──
  const eliteCandidates = rows.slice(3, 9).flat().filter(n =>
    n.type === "miniboss" || n.type === "ladro" || n.type === "tabaccaio"
  );
  shuffle(eliteCandidates).slice(0, 2).forEach(n => { n.elite = true; });

  // ── Il Vecchio: 1 nodo evento per mappa diventa "Il Vecchio" ──
  const vecchioCandidates = rows.slice(2, 9).flat().filter(n => n.type === "evento" && !n.elite && !n.secret);
  if (vecchioCandidates.length > 0) {
    shuffle(vecchioCandidates)[0]._isVecchio = true;
  }

  // ── Connessioni: no incroci garantiti, 2-3 uscite per nodo ──
  // Algoritmo: indice primario = floor(i*(n-1)/(m-1)), monotono.
  // 2° connessione: destra se zona lo permette, sinistra altrimenti.
  // 3° connessione: 55% se zona larga ≥ 2 slot.
  // Fallback raggiungibilità: zone-based (mantiene non-crossing).
  const connections = {};

  for (let r = 0; r < rows.length - 1; r++) {
    const currSorted = [...rows[r]].sort((a, b) => a.x - b.x);
    const nextSorted = [...rows[r + 1]].sort((a, b) => a.x - b.x);
    const m = currSorted.length;
    const n = nextSorted.length;

    const pJ = m === 1
      ? currSorted.map(() => 0)
      : currSorted.map((_, i) => Math.min(n - 1, Math.floor(i * (n - 1) / (m - 1))));

    for (let i = 0; i < m; i++) {
      const node = currSorted[i];

      // Row 0 → tutti i nodi row 1 (3-way split visivo)
      if (r === 0) { connections[node.id] = nextSorted.map(nd => nd.id); continue; }

      const conns = new Set([pJ[i]]);
      const rBound = i + 1 < m ? pJ[i + 1] : n;   // limite destro: non supera primary del nodo successivo
      const lBound = i > 0 ? pJ[i - 1] : -1;       // limite sinistro: non scende sotto primary del precedente

      // 2° connessione: espandi a destra se c'è spazio, sinistra come fallback
      const rJ = pJ[i] + 1;
      if (rJ < n && rJ <= rBound) {
        conns.add(rJ);
      } else {
        const lJ = pJ[i] - 1;
        if (lJ >= 0 && lJ > lBound) conns.add(lJ);
      }

      // 3° connessione: 55% se zona abbastanza larga (gap ≥ 2)
      const rJ2 = pJ[i] + 2;
      if (rJ2 < n && rJ2 <= rBound && roll(0.55)) conns.add(rJ2);

      connections[node.id] = [...conns].map(j => nextSorted[j].id);
    }

    // Ogni nodo successivo deve essere raggiungibile — zone-based (no crossing)
    nextSorted.forEach((nextNode, jIdx) => {
      if (Object.values(connections).some(cs => cs.includes(nextNode.id))) return;
      // Owner: il nodo corrente la cui zona copre jIdx
      let ownerI = m - 1;
      for (let i = 0; i < m - 1; i++) {
        if (jIdx < pJ[i + 1]) { ownerI = i; break; }
      }
      if (!connections[currSorted[ownerI].id]) connections[currSorted[ownerI].id] = [];
      connections[currSorted[ownerI].id].push(nextNode.id);
    });
  }

  // ── SHORTCUT: 2 connessioni che saltano 1 riga ──────────────
  // Collega alcuni nodi 2 righe avanti (scorciatoia rischiosa)
  let shortcutCount = 0;
  for (let r = 1; r < rows.length - 3 && shortcutCount < 2; r++) {
    for (const node of rows[r]) {
      if (node.type !== "boss" && node.type !== "start" && node.x < 0.2 && roll(0.35) && shortcutCount < 2) {
        const skipRow = rows[r + 2];
        if (skipRow) {
          const target = skipRow.reduce((best, n) =>
            Math.abs(n.x - node.x) < Math.abs(best.x - node.x) ? n : best
          );
          if (!connections[node.id].includes(target.id)) {
            connections[node.id].push(target.id);
            node.hasShortcut = true;
            shortcutCount++;
          }
        }
      }
    }
  }

  return { rows, connections };
}

// ─── LABIRINTO GENERATOR ────────────────────────────────────
export function generateLabirintoGrid() {
  // 4x4 grid, start [0,0], end [3,3]
  // Genera percorso valido e riempi le altre celle con direzioni random o 💀
  const DIRS = ["→", "↓", "←", "↑"];
  const DELTA = { "→":[0,1], "↓":[1,0], "←":[0,-1], "↑":[-1,0] };
  const grid = Array.from({length:4}, () => Array(4).fill(null));

  // Genera percorso casuale da [0,0] a [3,3]
  const path = [[0,0]];
  const pathSet = new Set(["0,0"]);
  let cur = [0,0];
  let attempts = 0;
  while ((cur[0] !== 3 || cur[1] !== 3) && attempts < 200) {
    attempts++;
    const possible = DIRS.filter(d => {
      const [dr,dc] = DELTA[d];
      const nr = cur[0]+dr, nc = cur[1]+dc;
      return nr>=0 && nr<4 && nc>=0 && nc<4 && !pathSet.has(`${nr},${nc}`);
    });
    if (possible.length === 0) break;
    const dir = pick(possible);
    const [dr,dc] = DELTA[dir];
    grid[cur[0]][cur[1]] = dir;
    cur = [cur[0]+dr, cur[1]+dc];
    path.push([...cur]);
    pathSet.add(`${cur[0]},${cur[1]}`);
  }
  // Mark last path cell direction to exit (se siamo arrivati a [3,3])
  if (cur[0]===3 && cur[1]===3) grid[3][3] = "🏆";

  // Riempi le celle non del percorso con direzioni random
  for (let r=0; r<4; r++) for (let c=0; c<4; c++) {
    if (grid[r][c] === null) grid[r][c] = pick(DIRS);
  }

  // Sostituisci 3 celle non-percorso con 💀
  const nonPath = [];
  for (let r=0; r<4; r++) for (let c=0; c<4; c++) {
    if (!pathSet.has(`${r},${c}`) && !(r===3&&c===3)) nonPath.push([r,c]);
  }
  shuffle(nonPath).slice(0,3).forEach(([r,c]) => { grid[r][c] = "💀"; });

  return grid;
}

// ─── GRATTA & COMBINA GENERATOR ─────────────────────────────
export function generateCombinaState() {
  const SYMS = ["⭐","🔔","💎","🍋","🎯"];
  const makeGrid = () => Array.from({length:6}, () => roll(0.15) ? null : pick(SYMS));
  return {
    gridA: makeGrid(), gridB: makeGrid(),
    revealedA: Array(6).fill(false), revealedB: Array(6).fill(false),
    lastRevealedA: null, lastRevealedB: null,
    combos: 0, prize: 0, done: false,
  };
}

// ─── MAPPA DEL TESORO GENERATOR ─────────────────────────────
export function generateTesoroState() {
  const positions = shuffle([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
  const treasures = new Set([positions[0], positions[1]]);
  const bombs = new Set([positions[2], positions[3]]);
  return {
    treasures, bombs,
    revealed: Array(16).fill(false),
    foundTreasures: 0, prize: 0, done: false,
  };
}
