import { C } from "./theme.js";

// ─── BIOME DEFINITIONS ──────────────────────────────────────
export const BIOMES = [
  { id: 0, name: "Tabacchitalia Nord", boss: "Il Broker", color: C.cyan, desc: "La periferia grigia dove tutto è iniziato — e dove molti hanno finito." },
  { id: 1, name: "Centro Slot(Unico)", boss: "Il Croupier Maledetto", color: C.magenta, desc: "Neon rotti, moquette anni '80 e debiti che non si azzerano mai." },
  { id: 2, name: "Grattanapoli", boss: "Il Re dei Grattini", color: C.gold, desc: "La capitale assoluta del gratta e vinci. Chi arriva qui non torna uguale." },
  { id: 3, name: "🇨🇳 Quartiere Cinese", boss: "Il Drago d'Oro", color: "#ff3333", desc: "你好! Lanterne rosse, incenso e grattini con ideogrammi. Qui le regole sono diverse." },
];

// ─── CEDOLE DEL BROKER — meta-progressione permanente ────────
// Ogni vittoria → scegli 1 di 3 cedole. Portate alla prossima run.
export const CEDOLE = [
  {
    id: "avanzocassa",
    name: "L'Avanzo di Cassa",
    icon: "💰",
    pro: "+€30 di partenza",
    contro: "prima unghia graffiata",
    apply: p => ({
      ...p, money: p.money + 30,
      nails: p.nails.map((n,i) => i===0 ? {...n, state:"graffiata"} : n),
    }),
  },
  {
    id: "polizzavita",
    name: "La Polizza Vita",
    icon: "💖",
    pro: "un'unghia parte KAWAII",
    contro: "-€10 iniziali",
    apply: p => ({
      ...p, money: Math.max(0, p.money - 10),
      nails: p.nails.map((n,i) => i===2 ? {...n, state:"kawaii"} : n),
    }),
  },
  {
    id: "prestito",
    name: "Il Prestito del Broker",
    icon: "🤝",
    pro: "+€60 subito",
    contro: "al boss del Bioma 1 perdi €40",
    apply: p => ({...p, money: p.money + 60, bossDebt: 40}),
  },
  {
    id: "tacchino",
    name: "Il Tacchino di Natale",
    icon: "🦃",
    pro: "grattino gratuito in partenza",
    contro: "l'ultima unghia è marcia",
    apply: p => ({
      ...p, bonusStartCard: "fortunaFlash",
      nails: p.nails.map((n,i) => i===4 ? {...n, state:"marcia"} : n),
    }),
  },
  {
    id: "scontofamiglia",
    name: "Lo Sconto da Parente",
    icon: "🏷️",
    pro: "prezzi tabaccaio -25%",
    contro: "inizi con soli €5",
    apply: p => ({...p, money: 5, shopDiscountMeta: 0.25}),
  },
  {
    id: "unghiadacciaio",
    name: "L'Unghia d'Acciaio",
    icon: "⚔️",
    pro: "nessun danno alle unghie in combattimento",
    contro: "unghia di riserva parte sanguinante",
    apply: p => ({
      ...p, noCombatDegradeMeta: true,
      nails: p.nails.map((n,i) => i===4 ? {...n, state:"sanguinante"} : n),
    }),
  },
  {
    id: "grattarapido",
    name: "Il Grattatore Rapido",
    icon: "⚡",
    pro: "parti con un Bullone gratis nell'inventario",
    contro: "le unghie degradano ogni 2 celle invece di 3",
    apply: p => ({
      ...p, fastNailDegradeMeta: true,
      items: [...p.items, "bullone"],
    }),
  },
  {
    id: "monopolio",
    name: "Il Monopolio",
    icon: "📈",
    pro: "vincite tier1 raddoppiate",
    contro: "carte tier3+ costano il doppio",
    apply: p => ({...p, tier1PrizeBoostMeta: 2.0, highCardCostMeta: 2.0}),
  },
];

// ─── BIOME PALETTE — sfondo nero, accenti colorati ──────────
export const BIOME_PALETTE = [
  { // Bioma 0: Tabacchitalia Nord — cyan/blu freddo
    border: "#55ffff", bg: "#000000",
    accent: "#55ffff", panelBg: "#050510", logBg: "#030308", hudBg: "#050510",
  },
  { // Bioma 1: Centro Slot — magenta/viola neon
    border: "#ff55ff", bg: "#000000",
    accent: "#ff55ff", panelBg: "#100510", logBg: "#080308", hudBg: "#100510",
  },
  { // Bioma 2: Grattanapoli — fuoco, rosso/oro
    border: "#ffcc00", bg: "#000000",
    accent: "#ffcc00", panelBg: "#100800", logBg: "#080400", hudBg: "#100800",
  },
  { // Bioma 3: Quartiere Cinese — rosso/oro lanterna
    border: "#ff3333", bg: "#000000",
    accent: "#ff3333", panelBg: "#150000", logBg: "#0a0000", hudBg: "#150000",
  },
];
