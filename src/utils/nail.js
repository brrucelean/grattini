import { NAIL_ORDER } from "../data/nails.js";

export function nailStateIndex(state) { return NAIL_ORDER.indexOf(state); }

export function degradeNail(state, amount=1) {
  const idx = nailStateIndex(state);
  return NAIL_ORDER[Math.max(0, idx - amount)];
}

// Degrade a nail object — respects cremaHP, smalto protection and piede special case
export function degradeNailObj(nail, amount=1) {
  const newNail = {...nail};
  let dmg = amount;
  // CremaHP assorbe danni extra (cella bianca oltre kawaii)
  if (newNail.cremaHP && newNail.cremaHP > 0) {
    const absorbed = Math.min(newNail.cremaHP, dmg);
    newNail.cremaHP -= absorbed;
    dmg -= absorbed;
  }
  // Smalto assorbe danni prima dell'unghia
  if (newNail.smalto && newNail.smalto > 0) {
    const absorbed = Math.min(newNail.smalto, dmg);
    newNail.smalto -= absorbed;
    dmg -= absorbed;
  }
  if (dmg <= 0) {
    // Kawaii revert: se smalto è ora 0 e lo stato è kawaii, torna a sana
    if (newNail.state === "kawaii" && (!newNail.smalto || newNail.smalto <= 0)) {
      newNail.state = "sana";
    }
    return newNail;
  }
  // Piede: al primo danno diventa graffiata (perde x3 ma resta usabile)
  if (newNail.state === "piede") { newNail.state = "graffiata"; return newNail; }
  // Sprint 2: stati speciali fuori catena
  if (newNail.state === "polliceVerde") {
    // Buff si consuma al primo danno: torna Sana
    newNail.state = "sana";
    newNail.scratchCount = 0;
    dmg -= 1;
    if (dmg <= 0) return newNail;
  }
  if (newNail.state === "unghiaNera") {
    // Già marcia/nera: al primo colpo muore
    newNail.state = "morta";
    return newNail;
  }
  newNail.state = degradeNail(newNail.state, dmg);
  // Kawaii revert: se smalto è esaurito e stato è kawaii, torna a sana
  if (newNail.state === "kawaii" && (!newNail.smalto || newNail.smalto <= 0)) {
    newNail.state = "sana";
  }
  return newNail;
}

export function healNail(state, target) {
  const idx = nailStateIndex(state);
  const tIdx = nailStateIndex(target);
  return tIdx > idx ? target : state;
}

// ─── NAIL CURSOR — pixel art hand con sangue progressivo ─────
// Genera cursore a mano pixel-art; l'unghia si riempie di sangue
// in base allo stato: sana=pulita, graffiata=scratch, sanguinante=gocce,
// marcia=sangue pesante, morta=dito interamente insanguinato
export function makeNailCursor(nailState = "sana") {
  const S = "#f5c5a3"; // incarnato
  const B = "#111111"; // bordo nero
  const P = 2;         // pixel size (SVG units)
  const GW = 14, GH = 14;

  // Costruisci griglia GW×GH come array 2D di colori (null = trasparente)
  const G = Array.from({length: GH}, () => Array(GW).fill(null));

  // — Bordo outline —
  for (let x = 4; x <= 7; x++) G[0][x] = B;             // cap dito
  for (let y = 1; y <= 5; y++) { G[y][3] = B; G[y][8] = B; } // lati dito
  [2,3,4,9,10,11,12].forEach(x => G[6][x] = B);          // nocca
  for (let y = 7; y <= 10; y++) { G[y][0] = B; G[y][13] = B; } // mano
  for (let y = 11; y <= 12; y++) { G[y][1] = B; G[y][12] = B; }
  for (let x = 2; x <= 11; x++) G[13][x] = B;            // fondo

  // — Incarnato fill —
  for (let y = 1; y <= 5; y++)
    for (let x = 4; x <= 7; x++) G[y][x] = S;
  for (let x = 5; x <= 8; x++) G[6][x] = S;
  for (let y = 7; y <= 10; y++)
    for (let x = 1; x <= 12; x++) G[y][x] = S;
  for (let y = 11; y <= 12; y++)
    for (let x = 2; x <= 11; x++) G[y][x] = S;

  // — Unghia + sangue per stato —
  // Posizioni unghia: rows 1-2, cols 5-6
  const nail = [[1,5],[1,6],[2,5],[2,6]];
  const rC = "#e8c9a8"; // unghia naturale — nessuno smalto, tono nude
  const r1 = "#ff6666"; // sangue fresco
  const r2 = "#cc1122"; // sangue medio
  const r3 = "#881122"; // sangue scuro
  const r4 = "#440a0a"; // sangue secco/morta
  const rH = "#ff99cc"; // kawaii highlight

  if (nailState === "kawaii") {
    nail.forEach(([r,c]) => G[r][c] = "#ff69b4");
    G[1][5] = rH;
  } else if (nailState === "sana") {
    nail.forEach(([r,c]) => G[r][c] = rC);
  } else if (nailState === "graffiata") {
    nail.forEach(([r,c]) => G[r][c] = rC);
    G[1][6] = r1;                         // singolo pixel graffiato
  } else if (nailState === "sanguinante") {
    nail.forEach(([r,c]) => G[r][c] = r1);
    G[2][6] = r2;                         // bordo unghia insanguinato
    G[3][6] = r1;                         // prima goccia
    G[4][6] = r2;                         // goccia più scura
  } else if (nailState === "marcia") {
    nail.forEach(([r,c]) => G[r][c] = r2);
    G[2][5] = r3; G[2][6] = r3;
    G[3][5] = r2; G[3][6] = r2;
    G[4][5] = r1; G[4][6] = r3;
    G[5][5] = r2; G[5][6] = r2;
    G[6][5] = r3;                         // sangue sulla nocca
  } else if (nailState === "morta") {
    for (let y = 1; y <= 5; y++)
      for (let x = 4; x <= 7; x++) G[y][x] = r3; // intero dito insanguinato
    nail.forEach(([r,c]) => G[r][c] = r4);         // unghia secca
    G[6][5] = r3; G[6][6] = r3;                    // sangue sulla nocca
    G[7][4] = r3; G[7][5] = r3;                    // cola sulla mano
    G[8][5] = r2;
  } else { // scheletro — game over: punta d'osso, niente pelle, canale midollare vuoto
    const BN = "#d4c4a0"; // osso chiaro
    const BO = "#1a1208"; // vuoto midollare
    // Falange superiore: pareti d'osso + canale cavo
    for (let y = 1; y <= 5; y++) {
      G[y][4] = BN; G[y][7] = BN;   // pareti laterali
      G[y][5] = BO; G[y][6] = BO;   // canale midollare vuoto
    }
    // Nocca: piatto osseo senza pelle
    G[6][5] = BN; G[6][6] = BN; G[6][7] = BN;
    // Mano / metacarpo: tutto osso pallido (le ossa della mano non sono cave alla stessa scala)
    for (let y = 7; y <= 10; y++)
      for (let x = 1; x <= 12; x++) G[y][x] = BN;
    for (let y = 11; y <= 12; y++)
      for (let x = 2; x <= 11; x++) G[y][x] = BN;
    // Unghia: cariata/assente, slot scuro
    nail.forEach(([r,c]) => G[r][c] = BO);
    G[1][5] = "#2a2010"; G[1][6] = "#2a2010"; // stub unghia secca
    // Sangue secco residuo sulla nocca
    G[6][5] = r4; G[9][5] = r4;
  }

  let rects = "";
  G.forEach((row, y) =>
    row.forEach((fill, x) => {
      if (fill) rects += `<rect x='${x*P}' y='${y*P}' width='${P}' height='${P}' fill='${fill}'/>`;
    })
  );
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${GW*P}' height='${GH*P}' viewBox='0 0 ${GW*P} ${GH*P}' shape-rendering='crispEdges'>${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 10 0, pointer`;
}

export const NAIL_CURSOR = makeNailCursor("sana");
