// ─── SCRATCH CARD DEFINITIONS ────────────────────────────────
export const SYMBOLS = ["7","$","★","♦","♣","♠","#","!"];

// Regole meccanica per tooltip intro
export const MECH_RULES = {
  match:       c => `Trova ${c.matchNeeded} simboli uguali tra le celle.`,
  jolly:       c => `Trova ${c.matchNeeded} simboli uguali. Una cella nascosta è ✨ JOLLY — vale qualsiasi simbolo!`,
  trap:        c => `Trova ${c.matchNeeded} simboli uguali. 2 celle nascondono 🔥 trappole che danneggiano l'unghia!`,
  sum13:       () => `Gratta numeri — raggiungi ESATTAMENTE 13. Vai oltre → 💥 BUST + danno unghia.`,
  collect:     () => `Gratta celle con valori €. Premi INCASSA ORA quando vuoi. 5 celle nascondono 🛑 STOP — se la tocchi perdi tutto.`,
  setteemezzo: () => `Il Banco ha già le sue carte. Gratta le TUE e supera il Banco senza sballare (>7½ = bust). J/Q/K=½ · A=1 · 2-7=faccia.`,
  ruota:       () => `🎰 SLOT MACHINE! Gratta per fermare i 3 rulli uno alla volta. 3 uguali = JACKPOT! 2 uguali = premio piccolo.`,
  doppioOnulla: () => `🎲 DOPPIO O NULLA! Gratta l'unica cella. ✅ = raddoppi il tuo ultimo premio. ❌ = perdi tutto. 50/50.`,
};

// Valori carte per Sette e Mezzo
export const CARD_VAL_MAP = {A:1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,J:0.5,Q:0.5,K:0.5};
export const CARD_SUITS   = ["♠","♥","♦","♣"];
export const CARD_RANKS   = ["A","2","3","4","5","6","7","J","Q","K"];

export const CARD_SYMBOLS = {
  fortunaFlash:    ["★","☆","✦","✧","◎","⭑"],
  setteEMezzo:     ["A","2","3","4","5","6","7","J","Q","K"],
  portaFortuna:    ["🍀","🌙","⭐","🌈","🐞","💫"],
  fintoMilionario: ["$","€","£","¥","₿","¢"],
  puzzle:          ["▲","▼","◆","○","■","◇"],
  boccaDrago:      ["🐉","🔥","☄","⚡","💥","🌋"],
  miliardario:     ["🥂","🚢","✈","🏆","💎","🎩"],
  tredici:         ["1","2","3","4","5","6","7","8","9"],
  maledetto:       ["💀","☠","🔥","👁","🩸","⛧"],
  ruota:           ["🍒","🍋","🔔","💎","7️⃣","🍀"],
  doppioOnulla:    ["✅","❌"],
  mahjong:         ["🀄","🎴","🏮","🧧","🐲","🐉"],
};

export const CARD_TYPES = [
  { id:"fortunaFlash",    name:"Il Poveraccio",       cost:0.5, rows:2, cols:3, matchNeeded:2, maxPrize:3,
    malus:null, desc:"Cosa pensi di vincere con €0,50? Trova 2 simboli uguali.", tier:1, mechanic:"match",
    theme:{ border:"#44bb44", bg:"#0a130a" } },
  { id:"setteEMezzo",     name:"Sette e Mezzo",        cost:1,   rows:2, cols:4, matchNeeded:3, maxPrize:5,
    malus:null, desc:"Batti il Banco senza sballare — figure valgono ½", tier:1, mechanic:"setteemezzo",
    theme:{ border:"#ccaa00", bg:"#131000" } },
  { id:"portaFortuna",    name:"Porta Sfortuna",        cost:2,   rows:3, cols:3, matchNeeded:3, maxPrize:11,
    malus:null, desc:"Trova 3 simboli — c'è un JOLLY ✨ nascosto (se ti va bene, che raramente va)", tier:2, mechanic:"jolly",
    theme:{ border:"#00bb55", bg:"#0a1510" } },
  { id:"fintoMilionario", name:"Il Finto Milionario",   cost:5,   rows:3, cols:3, matchNeeded:3, maxPrize:35,
    malus:{ type:"payExtra", amount:5, desc:"Se perdi, paghi altri €5!" }, desc:"Trova 3 simboli uguali", tier:2, mechanic:"match",
    theme:{ border:"#00cccc", bg:"#001515" } },
  { id:"puzzle",          name:"Puzzle",                cost:10,  rows:4, cols:3, matchNeeded:3, maxPrize:55,
    malus:{ type:"nailDamage", amount:2, desc:"Danneggia l'unghia di 2 stati!" }, desc:"Trova 3 simboli uguali", tier:3, mechanic:"match",
    theme:{ border:"#9966ff", bg:"#0d0a1a" } },
  { id:"boccaDrago",      name:"Bocca del Drago",       cost:20,  rows:4, cols:3, matchNeeded:4, maxPrize:150,
    malus:{ type:"nailDamage", amount:1, desc:"Sanguini se non vinci!" }, desc:"Trova 4 — attento alle 🔥 trappole!", tier:3, mechanic:"trap",
    theme:{ border:"#ff8800", bg:"#1a0800" } },
  { id:"miliardario",     name:"Il Miliardario",        cost:30,  rows:4, cols:4, matchNeeded:4, maxPrize:350,
    malus:{ type:"payExtra", amount:10, desc:"Se perdi, paghi altri €10!" }, desc:"Gratta €, incassa prima dello 🛑 STOP. 5 mine — fidati del tuo istinto.", tier:3, mechanic:"collect",
    theme:{ border:"#ffdd00", bg:"#141100" } },
  { id:"tredici",         name:"Tredici",               cost:50,  rows:4, cols:4, matchNeeded:4, maxPrize:800,
    malus:{ type:"nailDamage", amount:2, desc:"Costa cara la sfortuna!" }, desc:"Raggiungi ESATTAMENTE 13 — bust se vai oltre!", tier:4, mechanic:"sum13",
    theme:{ border:"#ff2222", bg:"#1a0000" } },
  { id:"maledetto",       name:"Il Maledetto",          cost:100, rows:4, cols:4, matchNeeded:3, maxPrize:2000,
    malus:{ type:"nailBleed", desc:"La cedola del diavolo — apre la maledizione!" }, desc:"La cedola del diavolo — rischio totale", tier:4, mechanic:"match",
    theme:{ border:"#990000", bg:"#0a0000" } },
  { id:"ruota",           name:"La Ruota",              cost:15,  rows:1, cols:3, matchNeeded:3, maxPrize:60,
    malus:null, desc:"🎰 Ferma i 3 rulli! 3 uguali = JACKPOT!", tier:2, mechanic:"ruota",
    theme:{ border:"#ff00ff", bg:"#1a001a" } },
  { id:"labirinto", name:"Il Labirinto", cost:15, rows:4, cols:4, matchNeeded:0, maxPrize:100,
    desc:"Segui le direzioni, trova l'uscita. Fermati quando vuoi.", mechanic:"labirinto",
    malus:null, tier:2, theme:{ border:"#00aa55", bg:"#001a0a" } },
  { id:"grattaCombina", name:"Gratta & Combina", cost:25, rows:2, cols:3, matchNeeded:3, maxPrize:140,
    desc:"Trova coppie sulle due griglie. 3 combo = MEGA COMBO!", mechanic:"combina",
    malus:null, tier:3, theme:{ border:"#aa00ff", bg:"#0d001a" } },
  { id:"mappaTesor0", name:"La Mappa del Tesoro", cost:35, rows:4, cols:4, matchNeeded:0, maxPrize:260,
    desc:"Trova le X senza toccare le bombe. Minesweeper style.", mechanic:"tesoro",
    malus:null, tier:3, theme:{ border:"#cc8800", bg:"#1a0e00" } },
  { id:"doppioOnulla", name:"Doppio o Nulla", cost:20, rows:1, cols:1, matchNeeded:1, maxPrize:60,
    malus:null, desc:"🎲 Gratta 1 cella: vinci = x2-x3, perdi = €0!", tier:2, mechanic:"doppioOnulla",
    theme:{ border:"#cc00cc", bg:"#1a0018" } },
  { id:"mahjong", name:"Il Mahjong", cost:25, rows:3, cols:3, matchNeeded:3, maxPrize:140,
    malus:null, desc:"🀄 Trova 3 tessere uguali — esclusiva Quartiere Cinese!", tier:3, mechanic:"match",
    theme:{ border:"#ff3333", bg:"#1a0000" }, biome:3 },
  { id:"jackpotMix", name:"Jackpot Mix", cost:20, rows:3, cols:3, matchNeeded:3, maxPrize:180,
    malus:{ type:"nailDamage", amount:2, desc:"Senza grattatore le unghie si spezzano!" },
    desc:"🔧 RICHIEDE GRATTATORE. Cartone premium: solo chi ha un attrezzo professionale può grattarlo.",
    tier:3, mechanic:"match", requiresGrattatore:true,
    theme:{ border:"#ffaa00", bg:"#1a1100" } },
  { id:"turistaPerSempre", name:"Turista Per Sempre", cost:40, rows:4, cols:4, matchNeeded:4, maxPrize:320,
    malus:null,
    desc:"✈️ VIP Quartiere Cinese. Souvenir d'oriente — alti premi, basse chance.",
    tier:3, mechanic:"jolly", biome:3,
    theme:{ border:"#ff66cc", bg:"#1a0015" } },
];

// ─── CARD BALANCE — unica fonte di verità per winChance e EV ─
// prizeMin/prizeMax calibrati in modo che l'EV reale (winChance × avgPrize − cost)
// rispetti evTarget. Target roguelike sano: t1 ≈ −10%, t2 ≈ −20%, t3 ≈ −30%, t4 ≈ 0 (alta varianza).
export const CARD_BALANCE = {
  fortunaFlash:    { winChance: 0.25, evTarget: -0.10, prizeMin: 1,   prizeMax: 3,    tier: 1 },
  setteEMezzo:     { winChance: 0.28, evTarget: -0.10, prizeMin: 2,   prizeMax: 5,    tier: 1 },
  portaFortuna:    { winChance: 0.22, evTarget: -0.20, prizeMin: 4,   prizeMax: 11,   tier: 2 },
  fintoMilionario: { winChance: 0.18, evTarget: -0.20, prizeMin: 10,  prizeMax: 35,   tier: 2 },
  puzzle:          { winChance: 0.20, evTarget: -0.30, prizeMin: 15,  prizeMax: 55,   tier: 3 },
  boccaDrago:      { winChance: 0.15, evTarget: -0.30, prizeMin: 40,  prizeMax: 150,  tier: 3 },
  miliardario:     { winChance: 0.12, evTarget: -0.30, prizeMin: 60,  prizeMax: 350,  tier: 3 }, // collect: prize calcolato da cell values, questi sono riferimento
  tredici:         { winChance: 0.10, evTarget:  0.00, prizeMin: 200, prizeMax: 800,  tier: 4 },
  maledetto:       { winChance: 0.08, evTarget:  0.00, prizeMin: 500, prizeMax: 2000, tier: 4 },
  ruota:           { winChance: 0.15, evTarget: -0.20, prizeMin: 25,  prizeMax: 60,   tier: 2 }, // + near-win 1.5x su 35% perse
  labirinto:       { winChance: 0.18, evTarget: -0.20, prizeMin: 30,  prizeMax: 100,  tier: 2 },
  grattaCombina:   { winChance: 0.20, evTarget: -0.30, prizeMin: 40,  prizeMax: 140,  tier: 3 },
  mappaTesor0:     { winChance: 0.15, evTarget: -0.30, prizeMin: 70,  prizeMax: 260,  tier: 3 },
  doppioOnulla:    { winChance: 0.45, evTarget: -0.05, prizeMin: 30,  prizeMax: 60,   tier: 2 },
  mahjong:         { winChance: 0.20, evTarget: -0.30, prizeMin: 40,  prizeMax: 140,  tier: 3 },
  jackpotMix:      { winChance: 0.22, evTarget: -0.20, prizeMin: 50,  prizeMax: 180,  tier: 3 },
  turistaPerSempre:{ winChance: 0.14, evTarget: -0.25, prizeMin: 80,  prizeMax: 320,  tier: 3 },
};
