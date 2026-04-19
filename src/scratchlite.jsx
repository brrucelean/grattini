import { useState, useCallback, useEffect } from "react";
import { C, FONT, MAX_ITEMS } from "./data/theme.js";
import { NAIL_INFO } from "./data/nails.js";
import { ACHIEVEMENTS } from "./data/achievements.js";
import { useLog } from "./hooks/useLog.js";
import { useMeta } from "./hooks/useMeta.js";
import { useAudioTheme } from "./hooks/useAudioTheme.js";
import { useVictoryCanvas } from "./hooks/useVictoryCanvas.js";
import { useNailEffects } from "./hooks/useNailEffects.js";
import { useNailHandlers } from "./hooks/useNailHandlers.js";
import { useItemHandlers } from "./hooks/useItemHandlers.js";
import { useShopHandlers } from "./hooks/useShopHandlers.js";
import { useScratchHandlers } from "./hooks/useScratchHandlers.js";
import { useNodeHandlers } from "./hooks/useNodeHandlers.js";
import { useEventHandlers } from "./hooks/useEventHandlers.js";
import { useSpacebarShortcut } from "./hooks/useSpacebarShortcut.js";
import { NODE_ICONS } from "./data/map.js";
import { ITEM_DEFS, RELIC_DEFS, GRATTATORE_DEFS } from "./data/items.js";
import { BIOMES, CEDOLE, BIOME_PALETTE } from "./data/biomes.js";
import { MECH_RULES, CARD_TYPES } from "./data/cards.js";
import { ASCII_TITLE } from "./data/art.js";
import { AudioEngine } from "./audio.js";
import { clamp } from "./utils/random.js";
import { degradeNailObj, makeNailCursor } from "./utils/nail.js";
import { generateCard } from "./utils/card.js";
import { generateMap } from "./utils/map.js";

import { S } from "./utils/styles.js";
import { getUiZoom, setUiZoom } from "./utils/uiZoom.js";
import { SkeletonFinger } from "./components/SkeletonFinger.jsx";
import { Tooltip } from "./components/Tooltip.jsx";
import { Btn } from "./components/Btn.jsx";
import { NailDisplay } from "./components/NailDisplay.jsx";
import { DialogueBox, msgPlainText, MsgRender, CarmeloLogBox, CarmeloLogMini } from "./components/DialogueBox.jsx";
import { NewsTicker, NpcCommentStrip } from "./components/NewsTicker.jsx";
import { HUD } from "./components/HUD.jsx";
import { LogPanel, LogSidebar } from "./components/LogPanel.jsx";
import { NailSidebar } from "./components/NailSidebar.jsx";
import { InventorySidebar } from "./components/InventorySidebar.jsx";
import { ScratchCell } from "./components/ScratchCell.jsx";
import { DoppioONullaView } from "./components/DoppioONullaView.jsx";
import { ScratchCardView } from "./components/ScratchCardView.jsx";
import { CombatCardScratch, CombatView, DEBUG_MODE, DEBUG_COMBAT, DEBUG_BIOME, DEBUG_ROW } from "./components/CombatView.jsx";
import { MapView } from "./components/MapView.jsx";
import { ShopView } from "./components/ShopView.jsx";
import { LocandaView } from "./components/LocandaView.jsx";
import { EventView } from "./components/EventView.jsx";
// ═══════════════════════════════════════════════════════════════
//  G R A T T I N I  —  Beta 2
//  A roguelike scratch card game with ASCII aesthetics
// ═══════════════════════════════════════════════════════════════


// ─── UTILITY FUNCTIONS ───────────────────────────────────────
const hasRelic = (player, effectId) => player?.relics?.some(r => r.effect === effectId);



// Consiglio unghia sanguinante — mostrato solo la prima volta
let _nailAdviceShown = false;

// ═══════════════════════════════════════════════════════════════
//  MAIN GAME COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Grattini() {
  // ─── GAME STATE ─────────────────────────────────────────────
  const [screen, setScreen] = useState("title");
  const [player, setPlayer] = useState(null);
  const [map, setMap] = useState(null);
  const [currentRow, setCurrentRow] = useState(0);
  const [visitedNodes, setVisitedNodes] = useState([]);
  const [currentNode, setCurrentNode] = useState(null);
  // ─── HOOK: useLog ───
  const { log, setLog, carmeloLog, setCarmeloLog, addLog, triggerNpcComment } = useLog();
  const [preScratchCount, setPreScratchCount] = useState(0);
  const [scratchingCard, setScratchingCard] = useState(null);
  const [combatEnemy, setCombatEnemy] = useState(null);
  const [introCardsLeft, setIntroCardsLeft] = useState(3);
  const [introPrizes, setIntroPrizes] = useState([]); // prizes from both intro cards, not yet pocketed
  const [cardSelectMode, setCardSelectMode] = useState(false);
  const [selectedCardIdx, setSelectedCardIdx] = useState(null);
  const [returnScreen, setReturnScreen] = useState(null); // where to go back after scratch
  const [currentBiome, setCurrentBiome] = useState(0);
  const [gameStats, setGameStats] = useState({ nodesVisited:0, moneyEarned:0, cardsScratched:0, scratchWins:0, scratchLosses:0 });
  const [firstScratchShown, setFirstScratchShown] = useState(false);
  const [hoveredIntroIdx, setHoveredIntroIdx] = useState(-1);
  const [nailSanguinanteModal, setNailSanguinanteModal] = useState(false);
  const [cellaProgress, setCellaProgress] = useState(0); // graffi al muro in cella (0-8 = evaso)
  // ─── HOOK: useMeta ───
  const {
    achievements, setAchievements,
    activeCedola, setActiveCedola,
    pendingCedoleOffer, setPendingCedoleOffer,
    achievementToast, setAchievementToast,
    showTrophies, setShowTrophies,
    showReliquie, setShowReliquie,
    discoveredRelics, setDiscoveredRelics,
    enabledRelics, setEnabledRelics,
    showAllTimeStats, setShowAllTimeStats,
    unlockAchievement,
    updateAllTimeStats,
  } = useMeta();
  // ─── SPECIAL MINIGAME STATES ─────────────────────────────────
  const [labirintoState, setLabirintoState] = useState(null); // {pos, revealed, prize, grid, done}
  const [combinaState, setCombinaState] = useState(null); // gratta & combina
  const [tesoroState, setTesoroState] = useState(null); // mappa del tesoro
  const [specialCardRef, setSpecialCardRef] = useState(null); // card that triggered the minigame
  // nessuno zoom — il contenuto riempie il frame 16:9 naturalmente

  // ─── HOOK: useAudioTheme ───
  useAudioTheme({ screen, currentNode, combatEnemy, currentBiome });


  // Commenti reattivi al cambio schermata
  useEffect(() => {
    if (!player) return;
    if (screen === "shop") triggerNpcComment("shop");
    else if (screen === "combat") triggerNpcComment("combat");
    else if (screen === "map") triggerNpcComment("map");
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePlayer = useCallback((updates) => {
    setPlayer(p => {
      const next = typeof updates === "function" ? updates(p) : {...p, ...updates};
      // Ka-ching! quando il money aumenta
      if (next.money > p.money) AudioEngine.cash();
      return next;
    });
  }, []);

  // ─── DEBUG MODE — flags definiti a livello modulo sopra CombatView ────────

  // ─── GAME INITIALIZATION ───────────────────────────────────
  const startGame = () => {
    AudioEngine.init(); // sblocca AudioContext durante gesto utente
    const newPlayer = {
      money: (DEBUG_COMBAT || DEBUG_BIOME != null) ? 100 : 0,
      nails: DEBUG_COMBAT || DEBUG_MODE
        ? [
          { state:"sana",        scratchCount:0, implant:null, implantUses:0, stats:{fortuna:0, potenza:0, resilienza:0}, heldItem:null, cremaHP:0 },
          { state:"graffiata",   scratchCount:1, implant:null, implantUses:0, stats:{fortuna:0, potenza:0, resilienza:0}, heldItem:null, cremaHP:0 },
          { state:"sanguinante", scratchCount:0, implant:null, implantUses:0, stats:{fortuna:0, potenza:0, resilienza:0}, heldItem:null, cremaHP:0 },
          { state:"sana",        scratchCount:0, implant:null, implantUses:0, stats:{fortuna:0, potenza:0, resilienza:0}, heldItem:null, cremaHP:1 },
          { state:"sana",        scratchCount:0, implant:null, implantUses:0, stats:{fortuna:0, potenza:0, resilienza:0}, heldItem:null, cremaHP:0 },
        ]
        : Array(5).fill(null).map(() => ({ state: "sana", scratchCount: 0, implant: null, implantUses: 0, stats: { fortuna: 0, potenza: 0, resilienza: 0 }, heldItem: null, cremaHP: 0 })),
      activeNail: 0,
      items: (DEBUG_MODE || DEBUG_COMBAT) ? Object.keys(ITEM_DEFS) : [],
      grattatori: (DEBUG_MODE || DEBUG_COMBAT)
        ? Object.entries(GRATTATORE_DEFS).map(([id, g]) => ({ id, ...g, usesLeft: g.maxUses||1 }))
        : [], // { id, name, emoji, effect, usesLeft }
      equippedGrattatore: null, // currently equipped grattatore object or null
      scratchCards: (DEBUG_MODE || DEBUG_COMBAT)
        ? CARD_TYPES.map(ct => ({...generateCard(ct.id), owned: true}))
        : [
          {...generateCard("fortunaFlash"), owned: false},
          {...generateCard("setteEMezzo"), owned: false},
          {...generateCard("portaFortuna"), owned: false},
        ],
      fortune: 0,
      fortuneTurns: 0,
      smokesTotal: 0,
      tumore: false,
      // Sprint 2: tick counters per risk/reward sigarette
      sigarettaTicks: 0, // -> unghiaNera quando raggiunge 0
      erbaTicks: 0,      // -> polliceVerde quando raggiunge 0
      consecutiveWins: 0,
      grattaMania: false,
      grattaManiaTurns: 0,
      skills: [],
      anzianaVisits: 0,
      vecchioVisits: 0,
      monetaCineseActive: false,
      clipViraleActive: false,
      cappelloSbirroWorn: false, // true = indossato e attivo
      grattedCards: [], // storico carte grattate: [{typeId, tier, isWinner, prize, name}]
      lastWonPrize: 0, // ultimo premio vinto (per Doppio o Nulla x2)
      extraTiles: [], // tile extra nel grattino corrente (es. monetaCinese)
      relics: enabledRelics.map(id => RELIC_DEFS[id] ? {id, ...RELIC_DEFS[id]} : null).filter(Boolean), // reliquie abilitate dalla meta
    };
    // Applica cedola attiva se presente
    let finalPlayer = newPlayer;
    const cedolaId = activeCedola;
    if (cedolaId) {
      const cedolaDef = CEDOLE.find(c => c.id === cedolaId);
      if (cedolaDef) {
        finalPlayer = cedolaDef.apply(newPlayer);
        // bonusStartCard: aggiungi carta gratis al mazzo di partenza
        if (finalPlayer.bonusStartCard) {
          const bonusCard = {...generateCard(finalPlayer.bonusStartCard), owned: true};
          finalPlayer = {...finalPlayer, scratchCards: [...finalPlayer.scratchCards, bonusCard], bonusStartCard: null};
        }
        addLog(`🃏 Cedola attiva: ${cedolaDef.icon} ${cedolaDef.name}`, C.gold);
      }
    }
    setPlayer(finalPlayer);
    const startBiome = (DEBUG_BIOME != null) ? DEBUG_BIOME : 0;
    setCurrentBiome(startBiome);
    setMap(generateMap(startBiome));
    setCurrentRow(0);
    setVisitedNodes([]);
    setLog([]);
    setCarmeloLog([`Eh figliolo... settant'anni di tabaccheria e adesso non ci vedo più niente.\nHo questi tre grattini qui, me li gratti tu?\nTieniti quello che vuoi, tanto non ci vedo, e il buio è uguale vincere o perdere.`]);
    setPreScratchCount(0);
    setIntroCardsLeft(3);
    setIntroPrizes([]);
    setGameStats({ nodesVisited:0, moneyEarned:0, cardsScratched:0, scratchWins:0, scratchLosses:0, moneySpent:0, combatsWon:0, combatsLost:0, nailsLost:0, dreamsHad:0, slotPlays:0, bestPrize:0, combosFired:0, _chirurgoUses:0, _broke:false });
    setFirstScratchShown(false);
    setVictoryRevealed(false);
    _nailAdviceShown = false; // reset consiglio unghia per nuova run
    if (DEBUG_COMBAT) {
      setIntroCardsLeft(0);
      if (DEBUG_COMBAT === "boss") {
        const bossName = BIOMES[startBiome]?.boss || "Il Drago d'Oro";
        setCombatEnemy({ name: bossName, isBoss: true, isMiniboss: false, isElite: false });
        setCurrentNode({ type: "boss", id: "boss", bossName, row: 10 }); // debug: currentNode boss
      } else {
        setCombatEnemy({ name: "Ladro di Strada", isBoss: false, isMiniboss: false, isElite: false });
      }
      setScreen("combat");
    } else if (DEBUG_BIOME != null) {
      setIntroCardsLeft(0); // salta Nonno Carmelo — debug bioma
      if (typeof DEBUG_ROW === "number") setCurrentRow(DEBUG_ROW);
      setScreen("map");
    } else if (DEBUG_MODE) {
      setIntroCardsLeft(0); // salta Nonno Carmelo
      setCurrentNode({ type:"tabaccaio" });
      setScreen("shop");
    } else {
      setScreen("tutorialNails");
    }
    addLog(`Benvenuto a ${BIOMES[startBiome].name}!`, C.cyan);
    addLog("Nonno Carmelo ti ferma al bancone. Ha tre biglietti e mani che tremano. Gratti tu, scegli tu.", C.gold);
  };

  // ─── HOOK: useNailEffects ───
  const { globalPainFlash, nailDeathFlash, setNailDeathFlash, screenShake, setScreenShake, moneyBling } = useNailEffects({ player, screen, gameStats, unlockAchievement, updateAllTimeStats, addLog });

  // ─── HOOK: useVictoryCanvas ───
  const { victoryRevealed, setVictoryRevealed, victoryCanvasRef, victoryDrawing, handleVictoryScratch } = useVictoryCanvas({ screen });

  // ─── HELPER: isAlive ────────────────────────────────────────
  const isAlive = (nails) => {
    const n = nails || player?.nails;
    if (!n) return true;
    return n.some(nail => nail.state !== "morta");
  };

  // ─── HELPER: consumeGrattatore ────────────────────────────
  const consumeGrattatore = useCallback(() => {
    updatePlayer(p => {
      if (!p.equippedGrattatore) return p;
      const idx = p.equippedGrattatore.inventoryIdx;
      const grattatori = [...p.grattatori];
      const g = {...grattatori[idx]};
      g.usesLeft -= 1;
      if (g.usesLeft <= 0) {
        grattatori.splice(idx, 1);
        addLog(`${g.name} consumato!`, C.dim);
        return {...p, grattatori, equippedGrattatore: null};
      } else {
        grattatori[idx] = g;
        const newEquipped = {...p.equippedGrattatore, usesLeft: g.usesLeft};
        return {...p, grattatori, equippedGrattatore: newEquipped};
      }
    });
  }, [updatePlayer, addLog]);

  // ─── HOOK: useNailHandlers ───
  const { playerRelicEffects, effectiveFortune, getActiveNailState, handleCellScratch, handleNailDamage, handleCombatCellScratch } = useNailHandlers({
    player, updatePlayer, triggerNpcComment, scratchingCard, setScreen, addLog,
  });

  // ─── HOOK: useItemHandlers ───
  const {
    itemFoundModal, setItemFoundModal,
    nailEquipModal, setNailEquipModal,
    nailEquipCallbackRef,
    nailEquipResult, setNailEquipResult,
    smokeChoiceModal, setSmokeChoiceModal,
    showSmokeEffect, setShowSmokeEffect,
    showInventoryPanel, setShowInventoryPanel,
    stampOverlay, setStampOverlay,
    showItemFound,
    equipItemOnNail,
    handleCardItemFound,
    handleSmoke,
    handleSaveSmoke,
    useItem,
  } = useItemHandlers({ player, updatePlayer, addLog });

  // ─── HOOK: useShopHandlers ───
  const { handleBuyCard, handleBuyItem, handleBuyGrattatore, handleSlotResult, handleShopScratch } = useShopHandlers({
    player, updatePlayer, addLog, setGameStats, setCardSelectMode, setScreen, effectiveFortune, unlockAchievement,
    setItemFoundModal,
  });

  // ─── HOOK: useScratchHandlers ───
  const { doppioONulla, setDoppioONulla, handleScratchDone, handleDoppioDecline, handleDoppioResult } = useScratchHandlers({
    player, scratchingCard, returnScreen, currentNode, currentRow, currentBiome,
    updatePlayer, addLog, triggerNpcComment, consumeGrattatore, unlockAchievement,
    setGameStats, setScratchingCard, setReturnScreen, setCardSelectMode, setSelectedCardIdx,
    setScreen, setIntroCardsLeft, setIntroPrizes, setItemFoundModal,
    setMap, setCurrentRow, setVisitedNodes, setCurrentNode, setCurrentBiome,
    setPlayer, isAlive,
  });

  // ─── HOOK: useNodeHandlers ───
  const { dreamModal, setDreamModal, selectNode, enterNode, handlePreScratch, handleSelectCard, handleRest, handleCombatEnd } = useNodeHandlers({
    player, currentNode, currentBiome, currentRow,
    updatePlayer, addLog, triggerNpcComment, unlockAchievement, updateAllTimeStats,
    consumeGrattatore, handleNailDamage, showItemFound,
    setScreen, setCurrentNode, setVisitedNodes, setCurrentRow, setPreScratchCount,
    setGameStats, setCardSelectMode, setReturnScreen, setScratchingCard, setSelectedCardIdx,
    setCombatEnemy, setCurrentBiome, setMap, setPlayer,
    setItemFoundModal, setDiscoveredRelics,
    setLabirintoState, setCombinaState, setTesoroState, setSpecialCardRef,
    effectiveFortune, gameStats, isAlive,
  });

  // ─── HOOK: useEventHandlers ───
  const { handleEventChoice } = useEventHandlers({
    player, currentNode,
    updatePlayer, addLog, unlockAchievement, showItemFound,
    setScreen, setCombatEnemy, setGameStats, setCellaProgress,
    setItemFoundModal, setSmokeChoiceModal,
    setScratchingCard, setReturnScreen,
  });

  // ─── HOOK: useSpacebarShortcut ───
  useSpacebarShortcut({ screen, startGame, handlePreScratch, enterNode, preScratchCount, player, setScreen });

  // ─── GRATTATORE EQUIP/UNEQUIP ─────────────────────────────
  const equipGrattatore = (idx) => {
    updatePlayer(p => {
      const g = p.grattatori[idx];
      return {...p, equippedGrattatore: {...g, inventoryIdx: idx}};
    });
    addLog(`Grattatore equipaggiato: ${player.grattatori[idx]?.name}`, C.cyan);
  };

  const unequipGrattatore = () => {
    updatePlayer(p => ({...p, equippedGrattatore: null}));
  };

  // ─── NAIL SELECT ──────────────────────────────────────────
  const handleSelectNail = (i) => {
    if (scratchingCard) return; // locked during scratch
    updatePlayer(p => ({...p, activeNail: i}));
    addLog(`Unghia ${i+1} selezionata come attiva.`, C.cyan);
  };

  // ─── GET REACHABLE NODES ───────────────────────────────────
  const getReachableNodes = () => {
    if (!map) return [];
    if (currentRow === 0) return map.rows[0].map(n => n.id);
    const reachable = new Set();
    map.rows[currentRow - 1]?.forEach(node => {
      if (node && visitedNodes.includes(node.id)) {
        (map.connections[node.id] || []).forEach(id => reachable.add(id));
      }
    });
    if (reachable.size === 0 && currentRow <= 1) {
      map.rows[currentRow]?.forEach(n => n && reachable.add(n.id));
    }
    return [...reachable];
  };

  // ─── RENDER ─────────────────────────────────────────────────
  // Cursore globale: mano pixel-art con unghia del colore dello stato attivo
  const globalNailState = player?.nails?.[player?.activeNail ?? 0]?.state ?? "sana";
  const globalNailCursor = makeNailCursor(screen === "gameOver" ? "scheletro" : globalNailState);

  // Neon dimming: glow effects fade when few nails alive
  const aliveCount = player?.nails?.filter(n => n.state !== "morta").length ?? 5;
  const neonDim = aliveCount <= 1 ? 0.3 : aliveCount <= 2 ? 0.5 : aliveCount <= 3 ? 0.7 : 1.0;

  const bioPal = BIOME_PALETTE[currentBiome] || BIOME_PALETTE[0];

  return (
    <div style={{
      position:"fixed", top:0, left:0,
      width:"100vw", height:"100vh",
      background: bioPal.bg,
      display:"flex", alignItems:"center", justifyContent:"center",
      overflow:"hidden",
    }}>
    {/* ── FRAME 16:9 — riempie fino al rapporto 16:9, poi letterbox ── */}
    <div style={{...S.container, cursor: globalNailCursor,
      width: "min(100vw, calc(100vh * 16 / 9))",
      height: "100vh",
      animation: screenShake ? "screenShake 0.3s ease-in-out" : "none",
      filter: neonDim < 1 ? `saturate(${neonDim}) brightness(${0.6 + neonDim * 0.4})` : "none",
      transition: "filter 1.5s ease",
      background: bioPal.bg,
    }}>
      <style>{`
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes glow { 0%,100% { text-shadow: 0 0 5px ${C.gold}; } 50% { text-shadow: 0 0 20px ${C.gold}, 0 0 40px ${C.gold}44; } }
        @keyframes fadeOut { 0% { opacity:1; } 70% { opacity:0.8; } 100% { opacity:0; } }
        @keyframes neonPulse { 0%,100% { box-shadow: 0 0 5px ${C.cyan}22, 0 0 10px ${C.cyan}11; } 50% { box-shadow: 0 0 12px ${C.cyan}44, 0 0 24px ${C.cyan}22; } }
        @keyframes slotGlow { 0%,100% { box-shadow: 0 0 8px ${C.gold}33, 0 0 16px ${C.gold}18; } 50% { box-shadow: 0 0 16px ${C.gold}55, 0 0 32px ${C.gold}28; } }
        @keyframes winFlash { 0% { box-shadow: 0 0 0px ${C.green}00; } 50% { box-shadow: 0 0 30px ${C.green}88, 0 0 60px ${C.green}44; } 100% { box-shadow: 0 0 12px ${C.green}33; } }
        @keyframes neonText { 0%,100% { text-shadow: 0 0 4px currentColor; } 50% { text-shadow: 0 0 12px currentColor, 0 0 24px currentColor; } }
        @keyframes moneyBling { 0% { text-shadow: 0 0 0px ${C.gold}; transform: scale(1); } 30% { text-shadow: 0 0 20px ${C.gold}, 0 0 40px ${C.gold}88; transform: scale(1.3); } 60% { text-shadow: 0 0 10px ${C.gold}; transform: scale(1.1); } 100% { text-shadow: none; transform: scale(1); } }
        @keyframes stampIn { 0% { transform: rotate(-12deg) scale(3); opacity:0; } 50% { transform: rotate(-12deg) scale(0.9); opacity:1; } 70% { transform: rotate(-12deg) scale(1.1); } 100% { transform: rotate(-12deg) scale(1.2); opacity:1; } }
        @keyframes screenShake { 0% { transform: translate(0,0); } 10% { transform: translate(-4px,2px); } 20% { transform: translate(4px,-2px); } 30% { transform: translate(-3px,-3px); } 40% { transform: translate(3px,3px); } 50% { transform: translate(-2px,1px); } 60% { transform: translate(2px,-1px); } 70% { transform: translate(-1px,2px); } 80% { transform: translate(1px,-1px); } 90% { transform: translate(-1px,0); } 100% { transform: translate(0,0); } }
        @keyframes glitA { 0% { opacity:0; transform:translate(0,0) scale(0.3); } 40% { opacity:1; transform:translate(9px,-14px) scale(1.2); } 70% { opacity:0.6; transform:translate(16px,-8px) scale(0.8); } 100% { opacity:0; transform:translate(6px,-22px) scale(0.3); } }
        @keyframes glitB { 0% { opacity:0; transform:translate(0,0) scale(0.3); } 40% { opacity:1; transform:translate(-11px,10px) scale(1.3); } 70% { opacity:0.5; transform:translate(-18px,4px) scale(0.9); } 100% { opacity:0; transform:translate(-8px,18px) scale(0.3); } }
        @keyframes glitC { 0% { opacity:0; transform:translate(0,0) scale(0.4); } 35% { opacity:1; transform:translate(7px,12px) scale(1.1); } 65% { opacity:0.7; transform:translate(-4px,20px) scale(0.7); } 100% { opacity:0; transform:translate(2px,26px) scale(0.3); } }
        @keyframes glitD { 0% { opacity:0; transform:translate(0,0) scale(0.3); } 45% { opacity:1; transform:translate(-8px,-16px) scale(1.4); } 75% { opacity:0.4; transform:translate(-14px,-6px) scale(0.8); } 100% { opacity:0; transform:translate(-4px,-24px) scale(0.3); } }
        @keyframes glitE { 0% { opacity:0; transform:translate(0,0) scale(0.35); } 50% { opacity:1; transform:translate(14px,6px) scale(1.2); } 80% { opacity:0.5; transform:translate(20px,-4px) scale(0.7); } 100% { opacity:0; transform:translate(10px,-14px) scale(0.3); } }
        @keyframes glitF { 0% { opacity:0; transform:translate(0,0) scale(0.4); } 40% { opacity:0.9; transform:translate(-6px,14px) scale(1.1); } 60% { opacity:1; transform:translate(-12px,8px) scale(1.3); } 100% { opacity:0; transform:translate(-20px,-6px) scale(0.3); } }
        @keyframes floatUp { 0% { transform:translateY(0) scale(1); opacity:0.7; } 100% { transform:translateY(-18px) scale(0.5); opacity:0; } }
        @keyframes achievementSlide { 0% { transform:translateX(120%); opacity:0; } 100% { transform:translateX(0); opacity:1; } }
        @keyframes nodePop { 0% { transform:scale(0.85); } 60% { transform:scale(1.05); } 100% { transform:scale(1); } }
        @keyframes lineFlow { 0% { stroke-dashoffset:20; } 100% { stroke-dashoffset:0; } }
        @keyframes newsTicker { 0% { left: 100%; } 100% { left: -100%; } }
        @keyframes dialogueCursor { 0%,49% { opacity:1; } 50%,100% { opacity:0; } }
        @keyframes dialogueIn { 0% { opacity:0; transform:translateY(8px); } 100% { opacity:1; transform:translateY(0); } }
        @keyframes titleBlink { 0%,100% { text-shadow: 0 0 10px ${C.gold}88, 0 0 30px ${C.gold}44; opacity:1; } 48% { text-shadow: 0 0 10px ${C.gold}88, 0 0 30px ${C.gold}44; opacity:1; } 50% { text-shadow: 0 0 40px ${C.gold}, 0 0 80px ${C.gold}aa, 0 0 120px ${C.gold}55; opacity:0.7; } 52% { text-shadow: 0 0 10px ${C.gold}88, 0 0 30px ${C.gold}44; opacity:1; } }
        @keyframes titleGlitter { 0% { opacity:0; transform:scale(0.4) translateY(0); } 25% { opacity:1; transform:scale(1.3) translateY(-3px); } 60% { opacity:0.5; transform:scale(0.9) translateY(-7px); } 100% { opacity:0; transform:scale(0.3) translateY(-14px); } }
        @keyframes bossGlow { 0%,100% { box-shadow:0 0 14px #ff2244aa,0 0 28px #ff224466,0 0 2px #fff; } 50% { box-shadow:0 0 28px #ff2244ff,0 0 56px #ff224499,0 0 4px #fff; } }
        @keyframes comboPulse { 0% { transform:translateX(-50%) scale(1); box-shadow:0 0 30px #ffaa0088,0 0 60px #ffaa0044; } 100% { transform:translateX(-50%) scale(1.06); box-shadow:0 0 50px #ffaa00cc,0 0 100px #ffaa0066; } }
        html, body { margin: 0; padding: 0; overflow: hidden; background: #000; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 0px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.dim}; border-radius: 3px; }
        /* Forza il cursore unghia su tutto — sovrascrive pointer di sistema su button/link */
        button, a, input, select, [role="button"], [tabindex] { cursor: inherit !important; }
      `}</style>

      {/* ═══ FLASH ROSSO — UNGHIA SANGUINANTE (estetico, sparisce da solo) ═══ */}
      {globalPainFlash > 0 && (
        <div style={{
          position:"fixed", top:0, left:0, width:"100%", height:"100%",
          background:`rgba(220,0,0,${globalPainFlash})`,
          boxShadow:"none",
          zIndex:99998, pointerEvents:"none",
        }} />
      )}

      {/* ═══ MODALE SANGUINANTE — rimane finché non clicchi ═══ */}

      {/* ═══ MODALE MORTE UNGHIA — rimane finché non clicchi ═══ */}
      {nailDeathFlash && (
        <div style={{
          position:"fixed", top:0, left:0, width:"100%", height:"100%",
          background:"rgba(0,0,0,0.94)",
          zIndex:100000,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          gap:"16px",
        }}>
          <div style={{
            fontSize:"90px", lineHeight:"1",
            animation:"pulse 0.4s infinite",
          }}>✝</div>
          <div style={{color:C.red, fontFamily:FONT, fontSize:"22px", letterSpacing:"4px", fontWeight:"bold"}}>
            UNGHIA PERSA
          </div>
          <div style={{color:C.dim, fontFamily:FONT, fontSize:"12px", textAlign:"center", lineHeight:"1.8"}}>
            Questa unghia è fuori gioco.<br/>
            Il gioco continua con le unghie rimaste.
          </div>
          <button onClick={() => setNailDeathFlash(false)} style={{
            fontFamily:FONT, background:"#111", color:"#888", border:"1px solid #444",
            padding:"10px 28px", cursor:"pointer", borderRadius:"0", fontSize:"14px",
            marginTop:"8px", letterSpacing:"1px",
          }}>Avanti →</button>
        </div>
      )}

      {/* ── HUD PERSISTENTE (tutte le screen tranne title e tutorial) ── */}
      {player && !["title","tutorialNails"].includes(screen) && (
        <div style={{width:"100%", flexShrink:0, paddingTop:"6px"}}>
          <HUD player={player} onOpenInventory={() => setShowInventoryPanel(v => !v)} inventoryOpen={showInventoryPanel} moneyBling={moneyBling} currentBiome={currentBiome} />
        </div>
      )}

      {/* ── 3-COLUMN MAIN AREA ── */}
      <div style={{flex:1, width:"100%", display:"flex", overflow:"hidden", minHeight:0}}>

      {/* ── SIDEBAR SINISTRA: unghie ── */}
      {player && !["title","tutorialNails"].includes(screen) && (
        <div style={{
          width:"160px", flexShrink:0,
          borderRight:"1px solid #12121e",
          background:"#05050d",
          display:"flex", flexDirection:"column",
          overflowY:"auto", overflowX:"hidden",
          padding:"8px 6px",
        }}>
          <NailSidebar nails={player.nails} activeNail={player.activeNail} onSelectNail={handleSelectNail} locked={!!scratchingCard} grattatori={player.grattatori||[]} equippedGrattatore={player.equippedGrattatore} onEquipGrattatore={equipGrattatore} />
        </div>
      )}

      {/* ── DESK — area di gioco centrale, scrollabile ── */}
      <div style={{flex:1, minHeight:0, overflowY:"auto", overflowX:"hidden", display:"flex", flexDirection:"column", alignItems:"center",
        backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
        backgroundAttachment:"local", position:"relative",
      }}>

      {/* ═══ TITLE SCREEN ═══ */}
      {["title","tutorialNails"].includes(screen) && (
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden",
        }}>
          {[
            {x:8,y:15,d:0,dur:2.1},{x:92,y:22,d:0.4,dur:1.8},{x:18,y:70,d:0.8,dur:2.4},
            {x:82,y:65,d:1.2,dur:1.6},{x:45,y:8,d:0.3,dur:2.8},{x:55,y:88,d:1.6,dur:2.0},
            {x:3,y:45,d:0.7,dur:1.9},{x:97,y:50,d:1.1,dur:2.3},{x:30,y:30,d:2.0,dur:1.7},
            {x:70,y:75,d:0.5,dur:2.6},{x:12,y:85,d:1.4,dur:2.2},{x:88,y:10,d:0.9,dur:1.5},
            {x:50,y:50,d:1.8,dur:2.9},{x:25,y:55,d:0.2,dur:2.0},{x:75,y:35,d:1.5,dur:1.8},
            {x:60,y:5,d:1.0,dur:2.2},{x:35,y:92,d:0.6,dur:1.9},{x:5,y:80,d:1.3,dur:2.5},
            {x:95,y:40,d:0.1,dur:1.7},{x:48,y:60,d:2.2,dur:2.1},{x:22,y:18,d:0.8,dur:2.8},
            {x:78,y:88,d:1.7,dur:1.6},{x:65,y:45,d:0.4,dur:2.3},{x:15,y:50,d:1.9,dur:2.0},
            {x:85,y:30,d:0.2,dur:1.8},{x:40,y:78,d:1.1,dur:2.6},{x:58,y:25,d:2.0,dur:1.5},
          ].map((s,i) => (
            <div key={i} style={{
              position:"absolute", left:`${s.x}%`, top:`${s.y}%`,
              color:C.gold, fontSize:`${8+Math.round(i%4)*4}px`, pointerEvents:"none",
              animation:`titleGlitter ${s.dur}s ${s.d}s infinite`,
              opacity:0, textShadow:`0 0 8px ${C.gold}`,
            }}>✦</div>
          ))}
        </div>
      )}

      {screen === "title" && (
        <div style={{
          width:"100%", flex:1, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          position:"relative", padding:"24px 0",
        }}>

          {/* Contenuto titolo */}
          <div style={{textAlign:"center", width:"min(95%, 1120px)", position:"relative", zIndex:1}}>
            <pre style={{...S.pre, color:C.gold,
              fontSize:"clamp(11px, 1.9vw, 20px)",
              lineHeight:"1.2", overflowX:"auto",
              textShadow:`0 0 14px ${C.gold}aa, 0 0 40px ${C.gold}55`,
              animation:"titleBlink 3s ease-in-out infinite",
              margin:"0 auto",
            }}>
              {ASCII_TITLE}
            </pre>
            <div style={{color:C.gold, fontSize:"clamp(11px, 1.2vw, 15px)", marginTop:"16px", letterSpacing:"5px",
              textShadow:`0 0 10px ${C.gold}88`,
            }}>
              ░░░ BETA 3 — 3 Biomi ░░░
            </div>
            <div style={{color:C.text, marginBottom:"28px", marginTop:"20px", fontSize:"clamp(12px, 1.1vw, 15px)", letterSpacing:"0.5px", textAlign:"center"}}>
            Un roguelike di grattate, unghie e fortuna.
          </div>
          <Btn variant="gold" onClick={startGame} style={{fontSize:"clamp(14px, 1.4vw, 18px)", padding:"16px 48px", letterSpacing:"3px"}}>
            ░░░ INIZIA LA RUN ░░░
          </Btn>
          <div style={{color:C.dim, fontSize:"clamp(10px, 0.9vw, 12px)", marginTop:"24px", letterSpacing:"1px", lineHeight:"1.8"}}>
            5 unghie · 3 biomi · 1 destino<br/>
            Gratta con saggezza. Le unghie non ricrescono.
          </div>
          {activeCedola && (() => {
            const cd = CEDOLE.find(c => c.id === activeCedola);
            return cd ? (
              <div style={{
                marginTop:"12px", border:`2px solid ${C.gold}`, padding:"8px 14px",
                background:"#000000", display:"inline-block",
              }}>
                <div style={{color:C.gold, fontSize:"10px", letterSpacing:"2px"}}>CEDOLA ATTIVA</div>
                <div style={{color:C.text, fontSize:"12px", marginTop:"4px"}}>
                  {cd.icon} {cd.name}
                </div>
                <div style={{color:C.dim, fontSize:"9px", marginTop:"2px"}}>
                  ✚ {cd.pro} &nbsp;|&nbsp; ✖ {cd.contro}
                </div>
                <button onClick={() => {
                  localStorage.removeItem('grattini_cedola');
                  setActiveCedola(null);
                }} style={{
                  background:"none", border:`1px solid ${C.red}`, color:C.red,
                  fontSize:"9px", cursor:"pointer", marginTop:"6px", padding:"2px 8px",
                  fontFamily:FONT,
                }}>✖ rimuovi cedola</button>
              </div>
            ) : null;
          })()}
          <div style={{display:"flex", gap:"10px", justifyContent:"center", marginTop:"16px", flexWrap:"wrap"}}>
            <Btn onClick={() => setShowTrophies(true)} style={{fontSize:"11px", padding:"7px 16px", borderColor:C.gold, color:C.gold}}>
              🏆 Trofei ({Object.keys(achievements).length}/{ACHIEVEMENTS.length})
            </Btn>
            <Btn onClick={() => setShowReliquie(true)} style={{fontSize:"11px", padding:"7px 16px", borderColor:"#c060ff", color:"#c060ff"}}>
              🏺 Reliquie ({discoveredRelics.length}/{Object.keys(RELIC_DEFS).length})
            </Btn>
            <Btn onClick={() => setShowAllTimeStats(true)} style={{fontSize:"11px", padding:"7px 16px", borderColor:C.cyan, color:C.cyan}}>
              📊 Statistiche
            </Btn>
          </div>
          </div>
        </div>
      )}

      {/* ═══ TUTORIAL UNGHIE ═══ */}
      {screen === "tutorialNails" && (
        <div style={{maxWidth:"560px", width:"100%", textAlign:"center", margin:"auto", position:"relative", zIndex:1}}>
          <div style={{...S.panel, background:"#0a0a18", border:`2px solid ${C.cyan}`}}>
            <div style={{...S.h2, color:C.cyan, marginBottom:"6px"}}>🖐 Le tue unghie sono la tua vita</div>
            <div style={{color:C.dim, fontSize:"11px", letterSpacing:"2px", marginBottom:"18px"}}>TUTORIAL — leggi bene, non si torna indietro</div>

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"18px", textAlign:"left"}}>
              {[
                { state:"sana",        label:"Sana",         color:C.green,   desc:"Unghia intatta. Premio pieno." },
                { state:"graffiata",   label:"Graffiata",    color:C.gold,    desc:"Primo segno di usura. Premio pieno." },
                { state:"sanguinante", label:"Sanguinante",  color:C.orange,  desc:"Fa male. Premio ridotto al 50%." },
                { state:"marcia",      label:"Marcia",       color:C.red,     desc:"Pericolosa. Premio ridotto al 25%." },
                { state:"morta",       label:"Morta ✝",      color:"#555",    desc:"Inutilizzabile. Passi alla prossima." },
                { state:"kawaii",      label:"Kawaii ♡",     color:C.pink,    desc:"Speciale. Premio x2. Usala bene." },
              ].map(({state, label, color, desc}) => (
                <div key={state} style={{
                  background:"#111122", border:`1px solid ${color}44`,
                  borderRadius:"0", padding:"8px 10px",
                  display:"flex", alignItems:"flex-start", gap:"8px",
                }}>
                  <div style={{
                    width:"10px", height:"10px", borderRadius:"0",
                    background:color, flexShrink:0, marginTop:"3px",
                    boxShadow:"none",
                  }}/>
                  <div>
                    <div style={{color, fontSize:"12px", fontWeight:"bold"}}>{label}</div>
                    <div style={{color:C.dim, fontSize:"10px", lineHeight:"1.4"}}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background:"#0d1200", border:`1px solid ${C.gold}55`,
              borderRadius:"0", padding:"10px 14px", marginBottom:"18px", textAlign:"left",
            }}>
              <div style={{color:C.gold, fontSize:"11px", fontWeight:"bold", marginBottom:"6px"}}>⚠ COME SI CONSUMANO</div>
              <div style={{color:C.text, fontSize:"11px", lineHeight:"1.7"}}>
                Ogni <strong style={{color:C.bright}}>3 celle grattate</strong> l'unghia attiva degrada di un livello.<br/>
                Hai <strong style={{color:C.bright}}>5 unghie</strong> — quando una muore si passa automaticamente alla prossima.<br/>
                Quando muoiono <strong style={{color:C.red}}>tutte e 5</strong> → <strong style={{color:C.red}}>GAME OVER</strong>.<br/>
                In combattimento grattare consuma l'unghia esattamente come i biglietti normali.
              </div>
            </div>

            <div style={{
              background:"#0a0808", border:`1px solid ${C.cyan}44`,
              borderRadius:"0", padding:"8px 14px", marginBottom:"20px", textAlign:"left",
            }}>
              <div style={{color:C.cyan, fontSize:"11px", fontWeight:"bold", marginBottom:"4px"}}>💡 CONSIGLIO DEL VECCHIO</div>
              <div style={{color:C.dim, fontSize:"11px", lineHeight:"1.6"}}>
                Compra cerotti e disinfettanti al tabaccaio. Non aspettare che sia troppo tardi.<br/>
                L'unghia Kawaii vale doppio — tienila per le carte grosse.
              </div>
            </div>

            <Btn variant="gold" onClick={() => setScreen("introScratch")} style={{fontSize:"14px", padding:"10px 32px"}}>
              Ho capito — iniziamo! →
            </Btn>
          </div>
        </div>
      )}

      {/* ═══ INTRO SCRATCH (scratch 2 starting cards, pocket 1 prize) ═══ */}
      {screen === "introScratch" && player && (
        <div style={{width:"100%", maxWidth:"900px", padding:"8px", display:"flex", flexDirection:"column", gap:"6px", height:"100%", minHeight:0, overflow:"hidden"}}>

          {/* NPC Dialogue Log */}
          <CarmeloLogBox
            npc="vecchio"
            name="Nonno Carmelo"
            color={C.gold}
            messages={carmeloLog}
            height="200px"
            footer={player.scratchCards.length > 0
              ? <Btn onClick={(e) => {
                  e.stopPropagation();
                  addLog("Tieni le mani in tasca e vai.", C.dim);
                  updatePlayer(p => ({...p, scratchCards: []}));
                  setIntroPrizes([{prize:0, cardName:"(rifiutato)"}]);
                  setScreen("map");
                }} style={{fontSize:"10px", color:C.dim, borderColor:"#333", padding:"3px 10px"}}>
                  😶 Rifiuta — non guadagni niente ma non rovini le unghie
                </Btn>
              : null
            }
          />

          {/* Cards to scratch */}
          {player.scratchCards.length > 0 && (
            <div style={{display:"flex", flexDirection:"column", gap:"6px", flex:1, minHeight:0, overflowY:"auto"}}>
              {!scratchingCard && (<>
                <div style={{color:C.dim, fontSize:"10px", letterSpacing:"2px", textAlign:"center"}}>
                  — BIGLIETTI DI NONNO CARMELO — rimasti {player.scratchCards.length}/3 —
                </div>
                <div style={{display:"flex", justifyContent:"center", gap:"8px", flexWrap:"wrap"}}>
                  {player.scratchCards.map((card, idx) => (
                    <div key={idx} style={{textAlign:"center"}}
                      onMouseEnter={() => setHoveredIntroIdx(idx)}
                      onMouseLeave={() => setHoveredIntroIdx(-1)}>
                      <Btn variant="gold" onClick={() => {
                        if (!firstScratchShown) triggerNpcComment("first_warning");
                        setScratchingCard(card);
                        setReturnScreen("introScratch");
                        setHoveredIntroIdx(-1);
                      }}>
                        🎫 {card.name}
                        <span style={{display:"block", fontSize:"10px"}}>
                          <span style={{color:C.red, textDecoration:"line-through"}}>€{card.cost}</span>
                          {" "}
                          <span style={{color:C.green, fontWeight:"bold"}}>GRATIS!</span>
                        </span>
                      </Btn>
                    </div>
                  ))}
                </div>
                {/* Preview panel — hover mostra anteprima card */}
                {(() => {
                  const c = hoveredIntroIdx >= 0 ? player.scratchCards[hoveredIntroIdx] : null;
                  const borderColor = c?.theme?.border || C.gold;
                  const cols = c?.cols || 3;
                  const rows = c?.mechanic === "setteemezzo" ? 1 : (c?.rows || 3);
                  return (
                    <div style={{
                      width:"100%", marginTop:"4px",
                      border:`2px solid ${c ? borderColor : "#1a1a2e"}`,
                      background: c ? "#0a0a1a" : "#070710",
                      padding:"16px 20px",
                      height:"130px",
                      display:"flex", alignItems:"center", gap:"24px",
                      overflow:"hidden",
                      transition:"border-color 0.15s",
                      boxShadow: c ? `inset 0 0 40px ${borderColor}08` : "none",
                    }}>
                      {c ? (<>
                        {/* Covered grid preview */}
                        <div style={{flexShrink:0}}>
                          <div style={{
                            display:"grid",
                            gridTemplateColumns:`repeat(${cols}, 1fr)`,
                            gap:"3px", marginBottom:"5px",
                            width:"130px",
                          }}>
                            {Array(cols * rows).fill(0).map((_, i) => (
                              <div key={i} style={{
                                height:"20px",
                                background:`linear-gradient(160deg, #c0c0cc 0%, #888898 60%, #606070 100%)`,
                                border:`1px solid #aaa8`,
                                borderRadius:"2px",
                                boxShadow:"inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.3)",
                              }}/>
                            ))}
                          </div>
                          <div style={{color:borderColor, fontSize:"9px", textAlign:"center", letterSpacing:"1px"}}>
                            clicca per grattare
                          </div>
                        </div>
                        {/* Info */}
                        <div style={{flex:1, borderLeft:`1px solid ${borderColor}22`, paddingLeft:"20px"}}>
                          <div style={{color:borderColor, fontWeight:"bold", fontSize:"13px", marginBottom:"6px"}}>
                            {c.emoji || "🎫"} {c.name}
                          </div>
                          <div style={{color:C.text, fontSize:"11px", lineHeight:"1.7", marginBottom:"8px"}}>
                            {(MECH_RULES[c.mechanic] || MECH_RULES.match)(c)}
                          </div>
                          <div style={{display:"flex", gap:"16px", flexWrap:"wrap"}}>
                            <span style={{color:C.dim, fontSize:"10px"}}>
                              Premio max: <span style={{color:C.gold, fontWeight:"bold"}}>€{c.maxPrize}</span>
                            </span>
                            {c.malus && <span style={{color:C.red, fontSize:"10px"}}>⚠ {c.malus.desc}</span>}
                          </div>
                        </div>
                      </>) : (
                        <div style={{color:"#333", fontSize:"10px", letterSpacing:"3px", margin:"0 auto"}}>
                          — passa sopra un biglietto per l'anteprima —
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>)}

              {/* Scratch inline */}
              {scratchingCard && (
                <ScratchCardView
                  card={scratchingCard}
                  nailState={getActiveNailState()}
                  nailImplant={player.nails[player.activeNail]?.implant || null}
                  fortune={effectiveFortune}
                  grattaMania={player.grattaMania}
                  equippedGrattatore={player.equippedGrattatore}
                  relicEffects={playerRelicEffects}
                  ambidestri={player.skills?.includes("ambidestri")}
                  onCellScratch={handleCellScratch}
                  onNailDamage={handleNailDamage}
                  onItemFound={handleCardItemFound}
                  onDone={(r) => { setFirstScratchShown(true); handleScratchDone(r); }}
                  showFirstWarning={!firstScratchShown}
                  lastWonPrize={player.lastWonPrize || 0}
                  extraTiles={player.extraTiles || []}
                  onExtraTileUsed={(tileId, tileIdx) => {
                    // Attiva effetto tile e rimuovila
                    if (tileId === "monetaCinese") {
                      updatePlayer(p => {
                        const tiles = [...(p.extraTiles||[])];
                        tiles.splice(tileIdx, 1);
                        return {...p, extraTiles: tiles, monetaCineseActive: true};
                      });
                      addLog("🀄 MONETA CINESE ATTIVATA! La prossima grattata sarà x5 GARANTITA!", C.gold);
                    }
                  }}
                  onCardActivate={(event) => {
                    if (event === "maledetto_curse") {
                      updatePlayer(p => ({
                        ...p,
                        nails: p.nails.map(n =>
                          n.state !== "morta" && n.state !== "marcia" && n.state !== "sanguinante"
                            ? {...n, state: "sanguinante"} : n
                        ),
                      }));
                      addLog("💀 LA MALEDIZIONE SI APRE! Tutte le unghie sanguinano!", C.red);
                    }
                  }}
                />
              )}
            </div>
          )}

          {/* Prize selection after all scratched */}
          {player.scratchCards.length === 0 && introPrizes.length >= 3 && (
            <div style={{display:"flex", flexDirection:"column", gap:"8px", flex:1, minHeight:0, overflowY:"auto"}}>
              <div style={{color:C.dim, fontSize:"10px", letterSpacing:"2px", textAlign:"center"}}>
                — QUALE INTASCHI? —
              </div>
              <div style={{display:"flex", justifyContent:"center", gap:"10px", flexWrap:"wrap"}}>
                {introPrizes.map((ip, idx) => (
                  <div key={idx} style={{
                    border:`2px solid ${ip.prize > 0 ? C.gold : C.dim}`,
                    background:"#0a0a18", padding:"12px 18px",
                    cursor:"pointer", textAlign:"center", minWidth:"130px",
                    transition:"all 0.15s",
                    boxShadow: ip.prize > 0 ? `0 0 14px ${C.gold}22` : "none",
                  }}
                    onClick={() => {
                      updatePlayer(p => ({...p, money: ip.prize}));
                      setGameStats(s => ({...s, moneyEarned: s.moneyEarned + ip.prize}));
                      addLog(`Intaschi €${ip.prize} dal "${ip.cardName}". Il vecchio annuisce.`, C.green);
                      setScreen("map");
                    }}
                  >
                    <div style={{color:C.dim, fontSize:"10px", marginBottom:"4px", letterSpacing:"1px"}}>{ip.cardName}</div>
                    <div style={{
                      color: ip.prize > 0 ? C.gold : C.dim,
                      fontSize:"22px", fontWeight:"bold",
                      textShadow: ip.prize > 0 ? `0 0 10px ${C.gold}` : "none",
                      marginBottom:"8px",
                    }}>
                      {ip.prize > 0 ? `€${ip.prize}` : "—"}
                    </div>
                    <Btn variant={ip.prize > 0 ? "gold" : "default"} style={{fontSize:"10px", padding:"4px 10px"}}>
                      Intasca →
                    </Btn>
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>
      )}

      {/* ═══ SCRATCH CARD ═══ */}
      {screen === "scratch" && player && scratchingCard && (
        <div style={{maxWidth:"900px", width:"100%"}}>
          <ScratchCardView
            card={scratchingCard}
            nailState={getActiveNailState()}
            nailImplant={player.nails[player.activeNail]?.implant || null}
            fortune={player.fortune}
            grattaMania={player.grattaMania}
            equippedGrattatore={player.equippedGrattatore}
            ambidestri={player.skills?.includes("ambidestri")}
            onCellScratch={handleCellScratch}
            onNailDamage={handleNailDamage}
            onItemFound={handleCardItemFound}
            onDone={(r) => { setFirstScratchShown(true); handleScratchDone(r); }}
            showFirstWarning={!firstScratchShown}
            lastWonPrize={player.lastWonPrize || 0}
            extraTiles={player.extraTiles || []}
            onExtraTileUsed={(tileId, tileIdx) => {
              if (tileId === "monetaCinese") {
                updatePlayer(p => {
                  const tiles = [...(p.extraTiles||[])];
                  tiles.splice(tileIdx, 1);
                  return {...p, extraTiles: tiles, monetaCineseActive: true};
                });
                addLog("🀄 MONETA CINESE ATTIVATA! La prossima grattata sarà x5 GARANTITA!", C.gold);
              }
            }}
            onCardActivate={(event) => {
              if (event === "maledetto_curse") {
                updatePlayer(p => ({
                  ...p,
                  nails: p.nails.map(n =>
                    n.state !== "morta" && n.state !== "marcia" && n.state !== "sanguinante"
                      ? {...n, state: "sanguinante"}
                      : n
                  ),
                }));
                addLog("💀 LA MALEDIZIONE SI APRE! Tutte le unghie sanguinano!", C.red);
              }
            }}
          />
        </div>
      )}

      {/* ═══ DOPPIO O NULLA ═══ */}
      {screen === "doppioONulla" && player && doppioONulla && (
        <div style={{maxWidth:"900px", width:"100%"}}>
          <DoppioONullaView
            prize={doppioONulla.prize}
            onDecline={handleDoppioDecline}
            onResult={handleDoppioResult}
          />
        </div>
      )}

      {/* ═══ SELECT CARD TO SCRATCH ═══ */}
      {screen === "selectCard" && player && (
        <div style={{maxWidth:"900px", width:"100%"}}>
          <div style={{...S.panel, textAlign:"center"}}>
            <div style={{...S.h2}}>Scegli un biglietto da grattare</div>
            <div style={{display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"8px", marginBottom:"10px"}}>
              {player.scratchCards.map((card, idx) => {
                const catColor = card.cost <= 1 ? C.green : card.cost <= 5 ? C.gold : C.orange;
                return (
                  <div key={idx} onClick={() => handleSelectCard(idx)} style={{
                    border:`1px solid ${catColor}`, background:C.card,
                    padding:"10px", borderRadius:"0", cursor:"pointer",
                    minWidth:"120px", textAlign:"center", transition:"all 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor=C.bright}
                  onMouseLeave={e => e.currentTarget.style.borderColor=catColor}>
                    <div style={{color:catColor, fontWeight:"bold", fontSize:"13px"}}>{card.name}</div>
                    <div style={{color:C.dim, fontSize:"11px"}}>€{card.cost} · Max €{card.maxPrize}</div>
                    {card.malus && <div style={{color:C.red, fontSize:"9px"}}>⚠ {card.malus.desc}</div>}
                  </div>
                );
              })}
            </div>
            <Btn onClick={() => { setCardSelectMode(false); setScreen(currentNode ? "preScratch" : "map"); }}>
              ← Torna indietro
            </Btn>
          </div>
        </div>
      )}

      {/* ═══ PRE-SCRATCH (before entering node) ═══ */}
      {screen === "preScratch" && player && currentNode && (
        <div style={{maxWidth:"900px", width:"100%"}}>
          {/* ── BOX AVVISO BOSS ────────────────────────────────── */}
          {currentNode.type === "boss" && (() => {
            const bossName = currentNode.bossName || "Il Broker";
            const BOSS_ENTRY = {
              "Il Broker":             { min: 200 },
              "Il Romanaccio":         { min: 300 },
              "Il Napoletano":         { min: 500 },
              "Il Drago d'Oro":        { min: 400 },
            };
            const req = BOSS_ENTRY[bossName];
            if (!req) return null;
            const canEnter = player.money >= req.min;
            return (
              <div style={{
                background: canEnter ? "#001a00" : "#1a0000",
                border: `2px solid ${canEnter ? C.green : C.red}`,
                borderRadius:"0", padding:"10px 16px", marginBottom:"8px",
                textAlign:"center", animation: canEnter ? "none" : "pulse 1.2s infinite",
              }}>
                <div style={{color: canEnter ? C.green : C.red, fontWeight:"bold", fontSize:"13px", marginBottom:"4px"}}>
                  {canEnter ? "✅ ACCESSO CONSENTITO" : "🚫 ACCESSO NEGATO"}
                </div>
                <div style={{color:C.text, fontSize:"11px", lineHeight:"1.6"}}>
                  {bossName} richiede almeno{" "}
                  <strong style={{color:C.gold}}>€{req.min}</strong> per entrare.
                  {" "}Hai{" "}
                  <strong style={{color: canEnter ? C.green : C.red}}>€{player.money}</strong>.
                  {!canEnter && (
                    <span style={{color:C.orange, display:"block", marginTop:"4px"}}>
                      ⚠ Se entri ora verrai rispedito all'inizio della mappa.
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          <div style={{...S.panel, textAlign:"center"}}>
            <div style={{...S.h2}}>
              Prossimo nodo: {NODE_ICONS[currentNode.type]} {currentNode.type}
            </div>
            {player.scratchCards.length > 0 ? (
              <div style={{color:C.dim, marginBottom:"10px", fontSize:"12px"}}>
                Puoi grattare fino a {3 - preScratchCount} biglietti prima di entrare.
              </div>
            ) : (
              <div style={{marginBottom:"10px", textAlign:"center"}}>
                <pre style={{...S.pre, display:"block", margin:"0 auto 12px", fontSize:"22px", color:C.dim}}>{`( ._.)
 ﾉ   )`}</pre>
                <div style={{color:C.red, fontSize:"13px", marginBottom:"5px", fontWeight:"bold", letterSpacing:"1px"}}>
                  — nessun grattino —
                </div>
                <div style={{color:C.dim, fontSize:"11px", marginBottom:"6px", lineHeight:"1.5"}}>
                  Di solito qui ci si ferma a grattare<br/>i biglietti comprati al Tabaccaio.
                </div>
                <div style={{color:C.gold, fontSize:"12px"}}>
                  Comprane al prossimo 🏪 Tabaccaio!
                </div>
              </div>
            )}
            <div style={{display:"flex", justifyContent:"center", gap:"10px", flexWrap:"wrap"}}>
              {preScratchCount < 3 && player.scratchCards.length > 0 && (
                <Btn variant="gold" onClick={handlePreScratch}>
                  🎫 Gratta ({3 - preScratchCount} rimasti)
                </Btn>
              )}
              <Btn onClick={enterNode}>
                Entra nel nodo →
              </Btn>
            </div>
          </div>

          {/* Grattatori */}
          {player.grattatori.length > 0 && (
            <div style={{...S.panel, borderColor: C.cyan+"44"}}>
              <div style={{...S.h3, color:C.cyan}}>🔧 Grattatori</div>
              <div style={{color:C.dim, fontSize:"10px", marginBottom:"6px"}}>
                Equipaggia un grattatore per proteggere le unghie durante la grattata.
              </div>
              {player.equippedGrattatore && (
                <div style={{color:C.green, fontSize:"11px", marginBottom:"6px",
                  background:"#001a00", padding:"4px 8px", borderRadius:"0"}}>
                  ✓ Equipaggiato: {player.equippedGrattatore.emoji} {player.equippedGrattatore.name}
                  ({player.equippedGrattatore.usesLeft} usi)
                  <Btn onClick={unequipGrattatore} style={{fontSize:"10px", marginLeft:"8px", padding:"2px 6px"}}>
                    ✗ Rimuovi
                  </Btn>
                </div>
              )}
              <div style={{display:"flex", flexWrap:"wrap", gap:"4px"}}>
                {player.grattatori.map((g, idx) => {
                  const def = GRATTATORE_DEFS[g.id];
                  return (
                    <Tooltip key={idx} text={def ? `${def.desc} · ${g.usesLeft} uso/i rimasti` : g.name}>
                      <Btn
                        onClick={() => equipGrattatore(idx)}
                        variant={player.equippedGrattatore?.inventoryIdx === idx ? "gold" : "normal"}
                        style={{fontSize:"11px"}}>
                        {g.emoji} {g.name} ({g.usesLeft} usi)
                      </Btn>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inventory */}
          {player.items.length > 0 && (
            <div style={{...S.panel}}>
              <div style={S.h3}>💊 Consumabili</div>
              <div style={{display:"flex", flexWrap:"wrap", gap:"4px"}}>
                {player.items.map((itemId, idx) => {
                  const item = ITEM_DEFS[itemId];
                  return item ? (
                    <Tooltip key={idx} text={item.desc}>
                      <Btn onClick={() => useItem(idx)} style={{fontSize:"11px"}}>
                        {item.emoji} {item.name}
                      </Btn>
                    </Tooltip>
                  ) : null;
                })}
              </div>
            </div>
          )}


        </div>
      )}

      {/* ═══ MAP ═══ */}
      {screen === "map" && player && map && (
        <div style={{maxWidth:"900px", width:"100%"}}>
          <MapView
            map={map}
            currentRow={currentRow}
            visitedNodes={visitedNodes}
            reachableNodes={getReachableNodes()}
            onSelectNode={selectNode}
            currentBiome={currentBiome}
            playerFortuna={player.fortuna || 0}
          />

          {/* Quick inventory */}
          {(player.items.length > 0 || player.grattatori.length > 0) && (
            <div style={{...S.panel}}>
              {player.grattatori.length > 0 && (
                <>
                  <div style={{...S.h3, color:C.cyan}}>🔧 Grattatori</div>
                  <div style={{display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"6px"}}>
                    {player.grattatori.map((g, idx) => {
                      const def = GRATTATORE_DEFS[g.id];
                      return (
                        <Tooltip key={"g"+idx} text={def ? `${def.desc} · ${g.usesLeft} uso/i rimasti` : g.name}>
                          <Btn onClick={() => equipGrattatore(idx)}
                            variant={player.equippedGrattatore?.inventoryIdx === idx ? "gold" : "normal"}
                            style={{fontSize:"11px"}}>
                            {g.emoji} {g.name} ({g.usesLeft})
                          </Btn>
                        </Tooltip>
                      );
                    })}
                  </div>
                </>
              )}
              {player.items.length > 0 && (
                <>
                  <div style={S.h3}>💊 Consumabili</div>
                  <div style={{display:"flex", flexWrap:"wrap", gap:"4px"}}>
                    {player.items.map((itemId, idx) => {
                      const item = ITEM_DEFS[itemId];
                      return item ? (
                        <Tooltip key={idx} text={item.desc}>
                          <Btn onClick={() => useItem(idx)} style={{fontSize:"11px"}}>
                            {item.emoji} {item.name}
                          </Btn>
                        </Tooltip>
                      ) : null;
                    })}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      )}

      {/* ═══ SHOP (Tabaccaio) ═══ */}
      {screen === "shop" && player && (
        <div style={{maxWidth:"900px", width:"100%"}}>
          <ShopView
            player={player}
            currentRow={currentRow}
            currentBiome={currentBiome}
            onBuyCard={handleBuyCard}
            onBuyItem={handleBuyItem}
            onBuyGrattatore={handleBuyGrattatore}
            onLeave={() => setScreen("map")}
            onScratch={handleShopScratch}
            onSlotResult={handleSlotResult}
          />
        </div>
      )}

      {/* ═══ LOCANDA ═══ */}
      {screen === "locanda" && player && (
        <div style={{maxWidth:"900px", width:"100%"}}>
          <LocandaView
            player={player}
            onRest={handleRest}
            onLeave={() => setScreen("map")}
          />
        </div>
      )}

      {/* ═══ EVENT / NPC ═══ */}
      {screen === "event" && player && currentNode && (
        <div style={{maxWidth:"900px", width:"100%"}}>
          <EventView
            node={currentNode}
            player={player}
            onChoice={handleEventChoice}
          />
        </div>
      )}

      {/* ═══ NODE (generic) ═══ */}
      {screen === "node" && player && currentNode && (
        <div style={{maxWidth:"900px", width:"100%"}}>
          <div style={{...S.panel, textAlign:"center"}}>
            <div style={{...S.h2}}>{NODE_ICONS[currentNode.type]} {currentNode.type}</div>
            <Btn onClick={() => setScreen("map")}>Continua →</Btn>
          </div>
        </div>
      )}

      {/* ═══ COMBAT ═══ */}
      {screen === "combat" && player && combatEnemy && (
        <div style={{maxWidth:"900px", width:"100%"}}>
          <CombatView
            enemy={combatEnemy}
            player={player}
            onEnd={handleCombatEnd}
            onCellScratch={handleCombatCellScratch}
            playerWallet={player.money}
            onCombo={() => { unlockAchievement("combo_master"); setGameStats(s => ({...s, combosFired: (s.combosFired || 0) + 1})); }}
            onNailDamage={(count, onExplosiva) => {
              updatePlayer(p => {
                // noCombatDegradeMeta: unghia d'acciaio — nessun danno in combat
                if (p.noCombatDegradeMeta) return p;
                const nails = [...p.nails];
                let explosivaBonus = 0;
                for (let d = 0; d < count; d++) {
                  const alive = nails.findIndex(n => n.state !== "morta");
                  if (alive >= 0) {
                    // Check esplosiva PRIMA di degradare (per verificare se muore)
                    const hadEsplosiva = nails[alive].implant === "esplosiva";
                    nails[alive] = degradeNailObj(nails[alive], 1);
                    if (hadEsplosiva && nails[alive].state === "morta") {
                      explosivaBonus += 60;
                      addLog("💥 Unghia Esplosiva esplode! -€60 al nemico!", C.orange);
                    }
                  }
                }
                // GAY OVER immediato se tutte le unghie sono morte durante il combattimento
                if (!isAlive(nails)) {
                  setTimeout(() => setScreen("gameOver"), 800);
                }
                if (explosivaBonus > 0 && onExplosiva) onExplosiva(explosivaBonus);
                return {...p, nails};
              });
            }}
          />
        </div>
      )}

      {/* ═══ CELLA ═══ */}
      {screen === "cella" && player && (() => {
        const WALL_NEEDED = 8;
        const allNailsMax = player.nails.every(n =>
          n.state === "sana" || n.state === "kawaii" || n.state === "piede" || n.state === "morta" && player.nails.filter(x=>x.state!=="morta").every(x=>x.state==="sana"||x.state==="kawaii"||x.state==="piede")
        );
        // Check reale: nessuna unghia VIVA sotto-max
        const anyAliveBelowMax = player.nails.some(n =>
          n.state !== "morta" && n.state !== "sana" && n.state !== "kawaii" && n.state !== "piede"
        );
        const canEscape = !anyAliveBelowMax && player.nails.some(n => n.state !== "morta");
        const aliveCount = player.nails.filter(n => n.state !== "morta").length;

        const handleGrattaMuro = () => {
          AudioEngine.scratch();
          if (canEscape) {
            // Avanza il contatore
            const newProgress = cellaProgress + 1;
            setCellaProgress(newProgress);
            addLog(`💪 Graffi il muro con forza! (${newProgress}/${WALL_NEEDED})`, C.green);
            // Ogni grattata consuma anche l'unghia
            updatePlayer(p => {
              const nails = [...p.nails];
              const active = p.activeNail;
              let nail = {...nails[active]};
              nail.scratchCount = (nail.scratchCount || 0) + 1;
              if (nail.scratchCount >= 3) { nail = degradeNailObj(nail); nail.scratchCount = 0; }
              nails[active] = nail;
              const newActive = nail.state === "morta"
                ? nails.findIndex((n,i) => i !== active && n.state !== "morta")
                : active;
              return {...p, nails, activeNail: newActive >= 0 ? newActive : active};
            });
            if (newProgress >= WALL_NEEDED) {
              addLog("🧱 IL MURO CEDE! Sei evaso! Corri!", C.gold);
              setTimeout(() => { setCellaProgress(0); setScreen("map"); }, 1200);
            }
          } else {
            // Nessun progresso — l'unghia si consuma contro il cemento
            addLog("🩸 Graffi il muro ma non succede nulla... l'unghia soffre.", C.red);
            updatePlayer(p => {
              const nails = [...p.nails];
              const active = p.activeNail;
              let nail = {...nails[active]};
              nail.scratchCount = (nail.scratchCount || 0) + 1;
              if (nail.scratchCount >= 3) { nail = degradeNailObj(nail); nail.scratchCount = 0; }
              nails[active] = nail;
              let newActive = active;
              if (nail.state === "morta") {
                const next = nails.findIndex((n,i) => i !== active && n.state !== "morta");
                newActive = next >= 0 ? next : active;
              }
              // GAY OVER se tutte le unghie morte
              if (!nails.some(n => n.state !== "morta")) {
                setTimeout(() => setScreen("gameOver"), 800);
              }
              return {...p, nails, activeNail: newActive};
            });
          }
        };

        const wallBricks = Array.from({length: WALL_NEEDED}, (_, i) => i < cellaProgress);

        return (
          <div style={{maxWidth:"500px", width:"100%", textAlign:"center", fontFamily:FONT}}>
            <div style={{...S.panel, borderColor:C.dim, background:"#080808", marginTop:"8px"}}>

              {/* Titolo */}
              <div style={{color:C.red, fontSize:"20px", fontWeight:"bold", letterSpacing:"3px", marginBottom:"4px", }}>
                🔒 IN CELLA
              </div>
              <div style={{color:C.dim, fontSize:"11px", marginBottom:"14px", fontStyle:"italic"}}>
                "Quindici anni di grattini illegali. Ora graffi i muri."
              </div>

              {/* ASCII art cella */}
              <pre style={{...S.pre, color:"#555", fontSize:"11px", marginBottom:"12px", lineHeight:"1.4", display:"inline-block"}}>
{`┌──────────────────────┐
│  ░░░░░░░░░░░░░░░░░░  │
│  ░ [MURO DI PIETRA]░  │
│  ░░░░░░░░░░░░░░░░░░  │
│                      │
│   ╭───╮  Tu sei qui  │
│   │ 😰│              │
│   ╰───╯              │
│_____________________ │
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓`}
              </pre>

              {/* Barra progresso muro */}
              <div style={{marginBottom:"12px"}}>
                <div style={{fontSize:"11px", color:C.dim, marginBottom:"5px"}}>
                  {canEscape ? "Graffi nel posto giusto! Il muro si sgretola..." : "Unghie danneggiate — non riesci a fare breccia"}
                </div>
                <div style={{display:"flex", gap:"4px", justifyContent:"center", marginBottom:"6px"}}>
                  {wallBricks.map((broken, i) => (
                    <div key={i} style={{
                      width:"28px", height:"16px",
                      background: broken ? C.gold : "#2a2a2a",
                      border: `1px solid ${broken ? C.gold+"88" : "#444"}`,
                      borderRadius:"0",
                      transition:"all 0.3s",
                      boxShadow: broken ? `0 0 6px ${C.gold}66` : "none",
                      fontSize:"9px", display:"flex", alignItems:"center", justifyContent:"center",
                      color: broken ? "#000" : "#555",
                    }}>
                      {broken ? "✓" : "░"}
                    </div>
                  ))}
                </div>
                <div style={{color:C.dim, fontSize:"10px"}}>{cellaProgress}/{WALL_NEEDED} mattoni rimossi</div>
              </div>

              {/* Condizione fuga */}
              <div style={{
                ...S.panel,
                borderColor: canEscape ? C.green+"66" : C.red+"44",
                background: canEscape ? "#001200" : "#120000",
                padding:"8px 12px", marginBottom:"14px", fontSize:"11px",
              }}>
                {canEscape ? (
                  <span style={{color:C.green}}>✅ Unghie al massimo — puoi scavare! Ancora {WALL_NEEDED - cellaProgress} graffi.</span>
                ) : (
                  <span style={{color:C.red}}>
                    ❌ Le unghie danneggiate non scavano il cemento.<br/>
                    <span style={{color:C.dim, fontSize:"10px"}}>Hai bisogno di tutte le unghie vive al massimo (Sana/Kawaii).<br/>Altrimenti... gratta fino alla fine.</span>
                  </span>
                )}
              </div>

              {/* Stato unghie */}
              <div style={{display:"flex", gap:"5px", justifyContent:"center", marginBottom:"14px", flexWrap:"wrap"}}>
                {player.nails.map((n, i) => {
                  const info = NAIL_INFO[n.state] || NAIL_INFO.morta;
                  return (
                    <div key={i} style={{
                      padding:"3px 7px", borderRadius:"0",
                      border: `1px solid ${info.color}66`,
                      background: i === player.activeNail ? info.color+"22" : "transparent",
                      fontSize:"10px", color: info.color,
                    }}>
                      {info.label}
                    </div>
                  );
                })}
              </div>

              {/* Bottone gratta */}
              {aliveCount > 0 ? (
                <Btn
                  variant={canEscape ? "success" : "default"}
                  onClick={handleGrattaMuro}
                  style={{
                    fontSize:"16px", padding:"12px 32px", letterSpacing:"2px",
                    boxShadow: canEscape ? `0 0 20px ${C.green}55` : "none",
                  }}
                >
                  {canEscape ? "💪 GRATTA IL MURO" : "🩸 Gratta (inutile...)"}
                </Btn>
              ) : (
                <div style={{color:C.red, fontSize:"14px", fontWeight:"bold"}}>
                  Nessuna unghia rimasta. Il muro ha vinto.
                </div>
              )}

              {/* Flavor text */}
              <div style={{color:C.dim, fontSize:"10px", marginTop:"10px", fontStyle:"italic"}}>
                {canEscape
                  ? "Le unghie kawaii scavano il cemento come un laser. Tecnica di fuga livello 9."
                  : "\"Le unghie rotte non scalfiscono il muro di una cella.\" — Guardia Penitenziaria"}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ LABIRINTO ═══ */}
      {screen === "labirinto" && player && labirintoState && (() => {
        const ls = labirintoState;
        const [row, col] = ls.pos;
        const CELL_PRIZE = 8;
        const JACKPOT_PRIZE = 300;

        const handleMove = () => {
          if (ls.done) return;
          const cell = ls.grid[row][col];
          if (cell === "💀") {
            // Danno unghia + perdi tutto
            handleNailDamage();
            addLog("💀 Hai trovato una trappola! Perdi tutto e un'unghia!", C.red);
            setLabirintoState(null);
            setSpecialCardRef(null);
            if (currentNode) setScreen("preScratch"); else setScreen("map");
            return;
          }
          if (cell === "🏆") {
            // JACKPOT!
            const totalPrize = ls.prize + JACKPOT_PRIZE;
            updatePlayer(p => ({...p, money: p.money + totalPrize}));
            addLog(`🏆 SEI USCITO! Jackpot €${JACKPOT_PRIZE} + €${ls.prize} = €${totalPrize}!`, C.gold);
            setLabirintoState(null);
            setSpecialCardRef(null);
            if (currentNode) setScreen("preScratch"); else setScreen("map");
            return;
          }
          // Calcola nuova posizione
          const DELTA = {"→":[0,1],"↓":[1,0],"←":[0,-1],"↑":[-1,0]};
          const [dr,dc] = DELTA[cell] || [0,0];
          const nr = row+dr, nc = col+dc;
          if (nr<0||nr>3||nc<0||nc>3) {
            addLog("Il percorso porta fuori dalla griglia... cella sbagliata!", C.red);
            return;
          }
          const newRevealed = new Set(ls.revealed);
          newRevealed.add(`${row},${col}`);
          const newPrize = ls.prize + CELL_PRIZE;
          setLabirintoState({...ls, pos:[nr,nc], revealed:newRevealed, prize:newPrize});
          addLog(`Avanzi! +€${CELL_PRIZE} → totale €${newPrize}`, C.green);
        };

        const handleIncassa = () => {
          if (ls.prize <= 0) { if (currentNode) setScreen("preScratch"); else setScreen("map"); return; }
          updatePlayer(p => ({...p, money: p.money + ls.prize}));
          addLog(`🏃 Hai incassato €${ls.prize} scappando dal labirinto!`, C.gold);
          setLabirintoState(null);
          setSpecialCardRef(null);
          if (currentNode) setScreen("preScratch"); else setScreen("map");
        };

        return (
          <div style={{maxWidth:"500px", width:"100%", textAlign:"center"}}>
            <div style={{...S.panel, borderColor:"#00aa55", background:"#001a0a"}}>
              <div style={{...S.h2, color:"#00aa55"}}>🌀 IL LABIRINTO</div>
              <div style={{color:C.dim, fontSize:"11px", marginBottom:"8px"}}>
                Segui le frecce — arriva a 🏆 per €{JACKPOT_PRIZE}! Ogni cella = +€{CELL_PRIZE}.
              </div>
              <div style={{color:C.gold, fontSize:"14px", marginBottom:"10px", fontWeight:"bold"}}>
                💰 Accumulato: €{ls.prize}
              </div>
              {/* Griglia 4x4 */}
              <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"4px", marginBottom:"12px", maxWidth:"220px", margin:"0 auto 12px"}}>
                {ls.grid.map((rowData, r) => rowData.map((cell, c) => {
                  const isPos = r===row && c===col;
                  const isRevealed = ls.revealed.has(`${r},${c}`);
                  return (
                    <div key={`${r},${c}`} style={{
                      width:"48px", height:"48px", border:`2px solid ${isPos?"#00ff88":"#004422"}`,
                      background: isPos ? "#002211" : isRevealed ? "#001a0a" : "#001208",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize: isPos ? "22px" : isRevealed ? "16px" : "12px",
                      color: isPos ? "#00ff88" : isRevealed ? "#006633" : "#003311",
                      borderRadius:"0",
                    }}>
                      {isPos ? "👆" : isRevealed ? cell : "?"}
                    </div>
                  );
                }))}
              </div>
              <div style={{color:C.bright, fontSize:"12px", marginBottom:"10px"}}>
                Cella attuale: <strong style={{color:"#00ff88"}}>{ls.grid[row]?.[col]}</strong> — segui questa freccia!
              </div>
              <div style={{display:"flex", gap:"8px", justifyContent:"center", flexWrap:"wrap"}}>
                <Btn variant="gold" onClick={handleMove}>
                  ➡ Muoviti!
                </Btn>
                {ls.prize > 0 && (
                  <Btn variant="normal" onClick={handleIncassa}>
                    🏃 Incassa e scappa (€{ls.prize})
                  </Btn>
                )}
                <Btn variant="danger" onClick={() => { setLabirintoState(null); setSpecialCardRef(null); if(currentNode)setScreen("preScratch");else setScreen("map"); }}>
                  ✗ Abbandona (€0)
                </Btn>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ GRATTA & COMBINA ═══ */}
      {screen === "grattaCombina" && player && combinaState && (() => {
        const cs = combinaState;
        const COMBO_PRIZE = 30;
        const MEGA_MULT = 5;
        const SYMS_LABELS = {"⭐":"Stella","🔔":"Campana","💎":"Diamante","🍋":"Limone","🎯":"Bersaglio"};

        const handleReveal = (grid, idx) => {
          if (cs.done) return;
          if (grid === "A" && cs.revealedA[idx]) return;
          if (grid === "B" && cs.revealedB[idx]) return;

          let newState = {...cs};
          if (grid === "A") {
            const newRev = [...cs.revealedA]; newRev[idx] = true;
            newState = {...newState, revealedA: newRev, lastRevealedA: cs.gridA[idx]};
          } else {
            const newRev = [...cs.revealedB]; newRev[idx] = true;
            newState = {...newState, revealedB: newRev, lastRevealedB: cs.gridB[idx]};
          }

          // Check combo: se entrambi i lastRevealed sono uguali e non-null
          const lastA = grid === "A" ? newState.lastRevealedA : newState.lastRevealedA;
          const lastB = grid === "B" ? newState.lastRevealedB : newState.lastRevealedB;
          if (lastA && lastB && lastA === lastB) {
            const newCombos = newState.combos + 1;
            const newPrize = newState.prize + COMBO_PRIZE;
            addLog(`✨ COMBO! ${lastA} = ${lastA}! +€${COMBO_PRIZE} (combo ${newCombos}/3)`, C.gold);
            if (newCombos >= 3) {
              // MEGA COMBO!
              const megaPrize = newPrize * MEGA_MULT;
              updatePlayer(p => ({...p, money: p.money + megaPrize}));
              addLog(`🎆 MEGA COMBO x${MEGA_MULT}! +€${megaPrize}!`, C.gold);
              setCombinaState(null); setSpecialCardRef(null);
              if(currentNode)setScreen("preScratch");else setScreen("map");
              return;
            }
            newState = {...newState, combos: newCombos, prize: newPrize, lastRevealedA: null, lastRevealedB: null};
          }

          // Check se tutte le celle sono rivelate
          const allRevA = newState.revealedA.every(Boolean);
          const allRevB = newState.revealedB.every(Boolean);
          if (allRevA && allRevB) {
            if (newState.prize > 0) {
              updatePlayer(p => ({...p, money: p.money + newState.prize}));
              addLog(`🃏 Gratta & Combina finita! Hai vinto €${newState.prize}!`, C.gold);
            } else {
              addLog("Nessuna combo trovata...", C.dim);
            }
            setCombinaState(null); setSpecialCardRef(null);
            if(currentNode)setScreen("preScratch");else setScreen("map");
            return;
          }
          setCombinaState(newState);
        };

        const renderGrid = (which) => {
          const grid = which === "A" ? cs.gridA : cs.gridB;
          const revealed = which === "A" ? cs.revealedA : cs.revealedB;
          const lastRev = which === "A" ? cs.lastRevealedA : cs.lastRevealedB;
          return (
            <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"4px"}}>
              {grid.map((sym, i) => (
                <div key={i} onClick={() => handleReveal(which, i)} style={{
                  width:"56px", height:"56px", border:`2px solid ${revealed[i] ? (sym===lastRev?"#ffd700":"#444") : "#336633"}`,
                  background: revealed[i] ? (sym===cs.lastRevealedA||sym===cs.lastRevealedB ? "#1a1200" : "#111") : "#001a00",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize: revealed[i] ? "24px" : "12px", cursor: revealed[i] ? "default" : "pointer",
                  color: revealed[i] ? "#fff" : "#336633", borderRadius:"0",
                }}>
                  {revealed[i] ? (sym || "—") : "?"}
                </div>
              ))}
            </div>
          );
        };

        return (
          <div style={{maxWidth:"500px", width:"100%", textAlign:"center"}}>
            <div style={{...S.panel, borderColor:"#aa00ff", background:"#0d001a"}}>
              <div style={{...S.h2, color:"#aa00ff"}}>🃏 GRATTA & COMBINA</div>
              <div style={{color:C.dim, fontSize:"11px", marginBottom:"8px"}}>
                Gratta una cella per volta. Stessa cella su entrambe le griglie = COMBO (+€{COMBO_PRIZE}). 3 COMBO = MEGA COMBO x{MEGA_MULT}!
              </div>
              <div style={{color:C.gold, fontSize:"13px", marginBottom:"8px"}}>
                Combo: {cs.combos}/3 · Premio: €{cs.prize}
              </div>
              <div style={{display:"flex", gap:"16px", justifyContent:"center", marginBottom:"12px", flexWrap:"wrap"}}>
                <div>
                  <div style={{color:"#aa00ff", fontSize:"11px", marginBottom:"4px"}}>GRIGLIA A</div>
                  {renderGrid("A")}
                </div>
                <div>
                  <div style={{color:"#aa00ff", fontSize:"11px", marginBottom:"4px"}}>GRIGLIA B</div>
                  {renderGrid("B")}
                </div>
              </div>
              <Btn variant="danger" onClick={() => {
                if (cs.prize > 0) { updatePlayer(p => ({...p, money: p.money + cs.prize})); addLog(`Incassato €${cs.prize} abbandonando.`, C.dim); }
                setCombinaState(null); setSpecialCardRef(null);
                if(currentNode)setScreen("preScratch");else setScreen("map");
              }}>
                ✗ Abbandona {cs.prize > 0 ? `(incassa €${cs.prize})` : "(€0)"}
              </Btn>
            </div>
          </div>
        );
      })()}

      {/* ═══ MAPPA DEL TESORO ═══ */}
      {screen === "mappaTesor0" && player && tesoroState && (() => {
        const ts = tesoroState;
        const X_PRIZE = 150;
        const JACKPOT_PRIZE = 400;

        const getManhattanDist = (idx) => {
          const r = Math.floor(idx/4), c = idx%4;
          let minDist = 99;
          ts.treasures.forEach(ti => {
            const tr = Math.floor(ti/4), tc = ti%4;
            minDist = Math.min(minDist, Math.abs(r-tr)+Math.abs(c-tc));
          });
          return minDist;
        };

        const handleReveal = (idx) => {
          if (ts.done || ts.revealed[idx]) return;
          const newRevealed = [...ts.revealed]; newRevealed[idx] = true;

          if (ts.bombs.has(idx)) {
            // Bomba!
            handleNailDamage();
            addLog("💣 BOMBA! Perdi tutto e un'unghia!", C.red);
            setTesoroState(null); setSpecialCardRef(null);
            if(currentNode)setScreen("preScratch");else setScreen("map");
            return;
          }

          let newPrize = ts.prize;
          let newFoundTreasures = ts.foundTreasures;
          if (ts.treasures.has(idx)) {
            newFoundTreasures++;
            newPrize += X_PRIZE;
            addLog(`💎 TESORO TROVATO! +€${X_PRIZE} (${newFoundTreasures}/2)`, C.gold);
            if (newFoundTreasures >= 2) {
              // JACKPOT — trovati tutti i tesori
              const total = JACKPOT_PRIZE;
              updatePlayer(p => ({...p, money: p.money + total}));
              addLog(`🗺️ JACKPOT! Trovato tutto! +€${total}!`, C.gold);
              setTesoroState(null); setSpecialCardRef(null);
              if(currentNode)setScreen("preScratch");else setScreen("map");
              return;
            }
          }

          setTesoroState({...ts, revealed:newRevealed, prize:newPrize, foundTreasures:newFoundTreasures});
        };

        return (
          <div style={{maxWidth:"500px", width:"100%", textAlign:"center"}}>
            <div style={{...S.panel, borderColor:"#cc8800", background:"#1a0e00"}}>
              <div style={{...S.h2, color:"#cc8800"}}>🗺️ LA MAPPA DEL TESORO</div>
              <div style={{color:C.dim, fontSize:"11px", marginBottom:"8px"}}>
                Trova le 2 X senza toccare le 💣. I numeri indicano la distanza dal tesoro più vicino.
              </div>
              <div style={{color:C.gold, fontSize:"13px", marginBottom:"10px"}}>
                Trovati: {ts.foundTreasures}/2 · Premio: €{ts.prize > 0 ? ts.prize : "?"} (jackpot €{JACKPOT_PRIZE})
              </div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"4px", maxWidth:"240px", margin:"0 auto 12px"}}>
                {Array.from({length:16}, (_,idx) => {
                  const rev = ts.revealed[idx];
                  const isTreasure = ts.treasures.has(idx);
                  const isBomb = ts.bombs.has(idx);
                  const dist = rev && !isTreasure && !isBomb ? getManhattanDist(idx) : null;
                  const distColor = dist === 1 ? C.red : dist === 2 ? C.orange : dist === 3 ? C.gold : C.dim;
                  return (
                    <div key={idx} onClick={() => handleReveal(idx)} style={{
                      width:"52px", height:"52px",
                      border:`2px solid ${rev ? (isTreasure ? C.gold : isBomb ? C.red : "#444") : "#664400"}`,
                      background: rev ? (isTreasure ? "#1a1200" : isBomb ? "#1a0000" : "#111") : "#1a0a00",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize: rev ? (isTreasure || isBomb ? "22px" : "18px") : "16px",
                      cursor: rev ? "default" : "pointer", borderRadius:"0",
                      color: rev && !isTreasure && !isBomb ? distColor : "#fff",
                    }}>
                      {rev ? (isTreasure ? "💎" : isBomb ? "💣" : dist !== null ? dist : "") : "?"}
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex", gap:"8px", justifyContent:"center", flexWrap:"wrap"}}>
                {ts.prize > 0 && (
                  <Btn variant="gold" onClick={() => {
                    updatePlayer(p => ({...p, money: p.money + ts.prize}));
                    addLog(`💰 Incassato €${ts.prize} con ${ts.foundTreasures} tesori trovati.`, C.gold);
                    setTesoroState(null); setSpecialCardRef(null);
                    if(currentNode)setScreen("preScratch");else setScreen("map");
                  }}>
                    💰 Incassa €{ts.prize}
                  </Btn>
                )}
                <Btn variant="danger" onClick={() => {
                  setTesoroState(null); setSpecialCardRef(null);
                  if(currentNode)setScreen("preScratch");else setScreen("map");
                }}>
                  ✗ Abbandona (€0)
                </Btn>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ GAME OVER ═══ */}
      {screen === "gameOver" && (
        <div style={{textAlign:"center", maxWidth:"500px"}}>
          <pre style={{
            ...S.pre, color:C.red, fontSize:"14px", marginBottom:"10px",
            border:`3px solid ${C.red}`, padding:"18px 28px",
            display:"inline-block", lineHeight:"1.3",
            boxShadow:"none",
          }}>{`
 ██████╗  █████╗ ██╗   ██╗
██╔════╝ ██╔══██╗╚██╗ ██╔╝
██║  ███╗███████║ ╚████╔╝
██║   ██║██╔══██║  ╚██╔╝
╚██████╔╝██║  ██║   ██║
 ╚═════╝ ╚═╝  ╚═╝   ╚═╝

    O  V  E  R`}
          </pre>
          <div style={{
            color:"#881122", fontSize:"12px", fontStyle:"italic",
            marginBottom:"10px", letterSpacing:"1px",
          }}>
            "Le tue unghie si sono consumate fino all'osso."
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px", marginBottom:"16px", textAlign:"left", maxWidth:"320px", margin:"0 auto 16px"}}>
            {[
              ["🖐️ Carte grattate", gameStats.cardsScratched, C.magenta],
              ["✅ Grattate vincenti", gameStats.scratchWins||0, C.green],
              ["❌ Grattate perdenti", gameStats.scratchLosses||0, C.red],
              ["💰 Guadagnato", `€${gameStats.moneyEarned}`, C.gold],
              ["🗺️ Nodi visitati", gameStats.nodesVisited, C.cyan],
              ["💸 Speso", `€${gameStats.moneySpent||0}`, C.orange],
              ["⚔️ Combat vinti", gameStats.combatsWon||0, C.green],
              ["💀 Combat persi", gameStats.combatsLost||0, C.red],
              ["🌙 Sogni", gameStats.dreamsHad||0, C.magenta],
              ["🎰 Slot plays", gameStats.slotPlays||0, C.gold],
              ["🏆 Miglior premio", `€${gameStats.bestPrize||0}`, C.gold],
              ["⚡ Combo", gameStats.combosFired||0, C.cyan],
            ].map(([label, val, color]) => (
              <div key={label} style={{background:"#0d0d18", border:"1px solid #2a2a3a", borderRadius:"0", padding:"5px 8px"}}>
                <div style={{color:C.dim, fontSize:"9px"}}>{label}</div>
                <div style={{color, fontSize:"12px", fontWeight:"bold"}}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex", gap:"10px", justifyContent:"center", flexWrap:"wrap"}}>
            <Btn variant="gold" onClick={() => { setScreen("title"); }}>
              Riprova
            </Btn>
            <Btn onClick={() => setShowTrophies(true)} style={{fontSize:"11px", borderColor:C.gold, color:C.gold}}>
              🏆 Trofei
            </Btn>
          </div>
        </div>
      )}

      {/* ═══ VICTORY ═══ */}
      {/* ═══ CEDOLE DEL BROKER — meta-progressione post-vittoria ═══ */}
      {screen === "cedole" && pendingCedoleOffer && (
        <div style={{textAlign:"center", maxWidth:"600px", width:"100%"}}>
          <div style={{color:C.gold, fontSize:"18px", fontWeight:"bold", letterSpacing:"4px", marginBottom:"4px"}}>
            IL BROKER TI OFFRE UN ACCORDO
          </div>
          <div style={{color:C.dim, fontSize:"11px", marginBottom:"20px", letterSpacing:"2px"}}>
            Scegli una cedola permanente — attiva dalla prossima run
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:"12px", marginBottom:"20px"}}>
            {pendingCedoleOffer.map(cedola => (
              <div
                key={cedola.id}
                onClick={() => {
                  localStorage.setItem('grattini_cedola', JSON.stringify(cedola.id));
                  setActiveCedola(cedola.id);
                  setPendingCedoleOffer(null);
                  setScreen("victory");
                }}
                style={{
                  border:`2px solid ${C.gold}`, background:"#000000",
                  padding:"14px 18px", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:"14px",
                  textAlign:"left",
                }}
                onMouseEnter={e => e.currentTarget.style.background=C.gold}
                onMouseLeave={e => e.currentTarget.style.background="#000000"}
              >
                <div style={{fontSize:"32px", flexShrink:0}}>{cedola.icon}</div>
                <div style={{flex:1}}>
                  <div style={{color:C.gold, fontWeight:"bold", fontSize:"13px", marginBottom:"4px", fontFamily:FONT}}>
                    {cedola.name}
                  </div>
                  <div style={{fontSize:"11px", display:"flex", gap:"12px"}}>
                    <span style={{color:C.green}}>✚ {cedola.pro}</span>
                    <span style={{color:C.red}}>✖ {cedola.contro}</span>
                  </div>
                </div>
                <div style={{color:C.gold, fontSize:"16px", flexShrink:0}}>▶</div>
              </div>
            ))}
          </div>
          <Btn onClick={() => { setPendingCedoleOffer(null); setScreen("victory"); }}
            style={{fontSize:"11px", color:C.dim, borderColor:C.dim}}>
            Rifiuta — nessuna cedola
          </Btn>
          {activeCedola && (
            <div style={{color:C.dim, fontSize:"10px", marginTop:"12px"}}>
              Cedola attiva: {CEDOLE.find(c=>c.id===activeCedola)?.icon} {CEDOLE.find(c=>c.id===activeCedola)?.name}
            </div>
          )}
        </div>
      )}

      {screen === "victory" && player && (
        <div style={{textAlign:"center", maxWidth:"520px", width:"100%"}}>

          {/* ── SCRATCH CARD TITOLO ── */}
          <div style={{position:"relative", marginBottom: victoryRevealed ? "20px" : "4px", userSelect:"none"}}>
            {/* Testo nascosto sotto */}
            <div style={{padding:"18px 0 10px"}}>
              <div style={{
                color:C.gold, fontSize:"clamp(42px,8vw,72px)", fontWeight:"bold",
                letterSpacing:"4px", lineHeight:1, fontFamily:FONT,
                animation: victoryRevealed ? "glow 2s infinite" : "none",
              }}>
                SEI LUDOPATICO
              </div>
              <div style={{
                color:C.gold, fontSize:"clamp(16px,3vw,26px)", fontWeight:"bold",
                letterSpacing:"8px", fontFamily:FONT, marginTop:"6px",
                opacity:0.85, animation: victoryRevealed ? "glow 2s infinite" : "none",
              }}>
                COMPLIMENTI!
              </div>
            </div>
            {/* Canvas overlay — sparisce quando rivelato */}
            {!victoryRevealed && (
              <canvas
                ref={victoryCanvasRef}
                width={520} height={140}
                style={{
                  position:"absolute", top:0, left:0, width:"100%", height:"100%",
                  cursor:"crosshair", touchAction:"none",
                }}
                onMouseDown={e => { victoryDrawing.current = true; handleVictoryScratch(e.clientX, e.clientY); }}
                onMouseMove={e => { if (victoryDrawing.current) handleVictoryScratch(e.clientX, e.clientY); }}
                onMouseUp={() => { victoryDrawing.current = false; }}
                onMouseLeave={() => { victoryDrawing.current = false; }}
                onTouchStart={e => { victoryDrawing.current = true; handleVictoryScratch(e.touches[0].clientX, e.touches[0].clientY); }}
                onTouchMove={e => { e.preventDefault(); handleVictoryScratch(e.touches[0].clientX, e.touches[0].clientY); }}
                onTouchEnd={() => { victoryDrawing.current = false; }}
              />
            )}
          </div>

          {/* ── CONTENUTO: visibile solo dopo il reveal ── */}
          {victoryRevealed && (<>
            <div style={{color:C.dim, fontSize:"13px", marginBottom:"10px", letterSpacing:"3px"}}>
              ─── vittoria ───
            </div>
            <div style={{color:C.green, fontSize:"13px", marginBottom:"6px"}}>
              Hai sconfitto {BIOMES[BIOMES.length-1].boss}!
            </div>
            <div style={{color:C.bright, marginBottom:"12px", fontSize:"11px"}}>
              Hai conquistato tutti e 3 i biomi. Sei il Re dei Grattini — 'o capo d'Italia!
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"5px", marginBottom:"16px", textAlign:"left", maxWidth:"380px", margin:"0 auto 16px"}}>
              {[
                ["💰 Soldi finali", `€${player.money}`, C.gold],
                ["🖐️ Unghie vive", `${player.nails.filter(n=>n.state!=="morta").length}/5`, C.green],
                ["🖐️ Carte grattate", gameStats.cardsScratched, C.magenta],
                ["✅ Grattate vincenti", gameStats.scratchWins||0, C.green],
                ["❌ Grattate perdenti", gameStats.scratchLosses||0, C.red],
                ["💰 Guadagnato", `€${gameStats.moneyEarned}`, C.gold],
                ["🗺️ Nodi visitati", gameStats.nodesVisited, C.cyan],
                ["🏆 Miglior premio", `€${gameStats.bestPrize||0}`, C.gold],
                ["⚔️ Combat vinti", gameStats.combatsWon||0, C.green],
                ["⚡ Combo", gameStats.combosFired||0, C.cyan],
              ].map(([label, val, color]) => (
                <div key={label} style={{background:"#0d0d18", border:"1px solid #2a2a3a", padding:"5px 8px"}}>
                  <div style={{color:C.dim, fontSize:"9px"}}>{label}</div>
                  <div style={{color, fontSize:"12px", fontWeight:"bold"}}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{color:C.dim, marginBottom:"12px", fontSize:"11px"}}>
              BETA 3 — Hai completato tutti i biomi!
            </div>
            <div style={{display:"flex", gap:"10px", justifyContent:"center", flexWrap:"wrap"}}>
              <Btn variant="gold" onClick={() => setScreen("title")} style={{fontSize:"16px", padding:"12px 32px"}}>
                Nuova Run
              </Btn>
              <Btn onClick={() => setShowTrophies(true)} style={{fontSize:"11px", borderColor:C.gold, color:C.gold}}>
                🏆 Trofei
              </Btn>
            </div>
          </>)}

          {/* hint se non ancora rivelato */}
          {!victoryRevealed && (
            <div style={{color:C.dim, fontSize:"10px", letterSpacing:"2px", marginTop:"6px"}}>
              gratta la tessera per scoprire il risultato
            </div>
          )}
        </div>
      )}

      {/* ═══ ITEM FOUND MODAL ═══ */}
      {itemFoundModal && (
        <div style={{
          position:"fixed", top:0, left:0, width:"100%", height:"100%",
          background:"rgba(0,0,0,0.82)", zIndex:99998,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{
            background:C.card, border:`2px solid ${C.gold}`,
            borderRadius:"0", padding:"32px 40px",
            textAlign:"center", maxWidth:"340px", width:"90%",
            boxShadow:"none",
            fontFamily:FONT,
          }}>
            <div style={{color:C.gold, fontSize:"11px", letterSpacing:"3px", marginBottom:"6px"}}>
              ✦ HAI TROVATO ✦
            </div>
            {itemFoundModal.subtitle && (
              <div style={{color:C.dim, fontSize:"10px", marginBottom:"10px", letterSpacing:"2px"}}>
                {itemFoundModal.subtitle.toUpperCase()}
              </div>
            )}
            <div style={{fontSize:"48px", margin:"8px 0 12px"}}>{itemFoundModal.emoji}</div>
            <div style={{color:C.bright, fontWeight:"bold", fontSize:"18px", marginBottom:"10px"}}>
              {itemFoundModal.name}
            </div>
            <div style={{color:C.text, fontSize:"12px", lineHeight:"1.8", marginBottom:"22px", whiteSpace:"pre-line"}}>
              {itemFoundModal.desc}
            </div>
            {itemFoundModal.choices ? (
              <div style={{display:"flex", flexDirection:"column", gap:"8px"}}>
                {itemFoundModal.choices.map((ch, ci) => (
                  <Btn key={ci} variant={ci === 0 ? "gold" : "normal"} onClick={() => { ch.action?.(); setItemFoundModal(null); }}
                    style={{fontSize:"12px", padding:"9px 20px"}}>
                    {ch.label}
                  </Btn>
                ))}
              </div>
            ) : (
              <Btn variant="success" onClick={() => setItemFoundModal(null)}
                style={{fontSize:"13px", padding:"9px 28px"}}>
                {itemFoundModal.buttonLabel || "OK →"}
              </Btn>
            )}
          </div>
        </div>
      )}

      {/* ═══ NAIL EQUIP MODAL — "Su quale unghia lo equipaggi?" ═══ */}
      {nailEquipModal && player && (() => {
        const TIER_ORDER = ["marcia","sanguinante","graffiata","sana","kawaii"];
        const TIER_COLORS = { marcia:C.red, sanguinante:C.orange, graffiata:C.gold, sana:C.green, kawaii:C.pink };
        // Sprint 2: stati speciali fuori catena — mappa pip all'equivalente più vicino
        const SPECIAL_TIER_MAP = { polliceVerde: "kawaii", unghiaNera: "marcia" };
        const activeNailColor = NAIL_INFO[player.nails[player.activeNail]?.state]?.color || C.magenta;
        return (
        <div style={{
          position:"fixed", top:0, left:0, width:"100%", height:"100%",
          background:"rgba(0,0,0,0.88)", zIndex:99998,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{
            background:C.card, border:`2px solid ${activeNailColor}`,
            boxShadow:`0 0 40px ${activeNailColor}44`,
            padding:"24px 28px", textAlign:"center", maxWidth:"420px", width:"95%",
            fontFamily:FONT,
          }}>
            {nailEquipResult ? (
              <>
                <div style={{color:C.green, fontSize:"11px", letterSpacing:"3px", marginBottom:"6px"}}>✦ APPLICATO ✦</div>
                <div style={{fontSize:"42px", margin:"6px 0 8px"}}>{nailEquipResult.emoji}</div>
                <div style={{color:C.green, fontWeight:"bold", fontSize:"16px", marginBottom:"8px"}}>
                  {nailEquipResult.text}
                </div>
                <Btn onClick={() => { setNailEquipResult(null); setNailEquipModal(null); }} style={{marginTop:"12px", fontSize:"12px"}}>
                  OK →
                </Btn>
              </>
            ) : (
            <>
            <div style={{color:activeNailColor, fontSize:"11px", letterSpacing:"3px", marginBottom:"6px"}}>
              {nailEquipModal.fromZaino ? "✦ USA OGGETTO ✦" : "✦ HAI TROVATO ✦"}
            </div>
            <div style={{fontSize:"42px", margin:"6px 0 8px"}}>{nailEquipModal.emoji}</div>
            <div style={{color:C.bright, fontWeight:"bold", fontSize:"16px", marginBottom:"4px"}}>
              {nailEquipModal.name}
            </div>
            <div style={{color:C.text, fontSize:"11px", lineHeight:"1.6", marginBottom:"16px"}}>
              {nailEquipModal.desc}
            </div>
            {/* Stat boost preview */}
            {(() => {
              const def = ITEM_DEFS[nailEquipModal.itemId];
              const boost = def?.statBoost || {};
              return Object.keys(boost).length > 0 && (
                <div style={{color:C.dim, fontSize:"10px", marginBottom:"14px", display:"flex", gap:"8px", justifyContent:"center"}}>
                  {boost.fortuna && <span style={{color:C.green}}>🍀+{boost.fortuna}</span>}
                  {boost.potenza && <span style={{color:C.red}}>⚔️+{boost.potenza}</span>}
                  {boost.resilienza && <span style={{color:C.cyan}}>🛡️+{boost.resilienza}</span>}
                </div>
              );
            })()}
            <div style={{color:C.gold, fontSize:"12px", letterSpacing:"1px", marginBottom:"12px", fontWeight:"bold"}}>
              📎 Su quale unghia lo equipaggi?
            </div>
            {/* 5 nail buttons */}
            <div style={{display:"flex", gap:"6px", justifyContent:"center", flexWrap:"wrap", marginBottom:"14px"}}>
              {player.nails.map((n, i) => {
                const ni = NAIL_INFO[n.state];
                const isDead = n.state === "morta";
                const nailEmoji = isDead ? "💀"
                  : n.state==="piede" ? "🦶"
                  : n.state==="kawaii" ? "💖"
                  : n.state==="polliceVerde" ? "🌿"
                  : n.state==="unghiaNera" ? "🖤"
                  : "🖐";
                const pipStateModal = SPECIAL_TIER_MAP[n.state] || n.state;
                const aliveTiersModal = TIER_ORDER.indexOf(pipStateModal);
                const cbRef = nailEquipCallbackRef.current;
                const canSelect = cbRef?.nailFilter ? cbRef.nailFilter(n) : !isDead;
                return (
                  <div key={i}
                    onClick={!canSelect ? undefined : () => {
                      const resultText = cbRef?.resultText?.(i, n);
                      if (cbRef?.onNailSelect) { cbRef.onNailSelect(i); }
                      else { equipItemOnNail(nailEquipModal.itemId, i); }
                      nailEquipCallbackRef.current = null;
                      if (nailEquipModal.fromZaino && resultText) {
                        setNailEquipResult({ emoji: nailEquipModal.emoji, text: resultText });
                      } else {
                        setNailEquipModal(null);
                      }
                    }}
                    style={{
                      width:"68px", padding:"8px 4px",
                      border:`1px solid ${!canSelect ? "#333" : i === player.activeNail ? ni.color : ni.color+"55"}`,
                      background: !canSelect ? "#0a0a0a" : i === player.activeNail ? ni.color+"15" : "#0a0a14",
                      cursor: !canSelect ? "not-allowed" : "pointer",
                      opacity: !canSelect ? 0.4 : 1,
                      textAlign:"center",
                      transition:"border-color 0.2s, background 0.2s",
                    }}
                    onMouseEnter={e => { if (canSelect) { e.currentTarget.style.borderColor = C.magenta; e.currentTarget.style.background = C.magenta+"15"; }}}
                    onMouseLeave={e => { if (canSelect) { e.currentTarget.style.borderColor = i === player.activeNail ? ni.color : ni.color+"55"; e.currentTarget.style.background = i === player.activeNail ? ni.color+"15" : "#0a0a14"; }}}
                  >
                    <div style={{fontSize:"18px", marginBottom:"4px"}}>{nailEmoji}</div>
                    <div style={{color:ni.color, fontSize:"7px", fontWeight:"bold", marginBottom:"3px"}}>{ni.label}</div>
                    {/* HP pips */}
                    <div style={{display:"flex", gap:"2px", justifyContent:"center", flexWrap:"wrap"}}>
                      {TIER_ORDER.map((tier, ti) => {
                        const filled = ti <= aliveTiersModal && !isDead;
                        return <span key={ti} style={{display:"inline-block", width:"7px", height:"4px", background: filled ? TIER_COLORS[tier] : "#111", border:`1px solid ${filled ? TIER_COLORS[tier]+"aa" : "#2a2a2a"}`}}/>;
                      })}
                      {Array(n.cremaHP||0).fill(0).map((_,ci) => (
                        <span key={"c"+ci} style={{display:"inline-block", width:"7px", height:"4px", background:"#fff", border:"1px solid #aaa"}}/>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Metti in inventario instead (solo quando trovato, non da zaino) */}
            {!nailEquipModal.fromZaino && (
              <Btn variant="normal" onClick={() => {
                updatePlayer(p => p.items.length >= MAX_ITEMS ? p : ({...p, items: [...p.items, nailEquipModal.itemId]}));
                addLog(`🎒 ${nailEquipModal.emoji} ${nailEquipModal.name} messo nello zaino`, C.dim);
                nailEquipCallbackRef.current = null;
                setNailEquipModal(null);
              }} style={{fontSize:"10px", padding:"6px 16px", color:C.dim}}>
                🎒 Metti nello zaino →
              </Btn>
            )}
            {nailEquipModal.fromZaino && (
              <Btn variant="normal" onClick={() => { nailEquipCallbackRef.current = null; setNailEquipModal(null); }} style={{fontSize:"10px", padding:"6px 16px", color:C.dim}}>
                ✖ Annulla
              </Btn>
            )}
            </>
            )}
          </div>
        </div>
        );
      })()}

      {/* ═══ STAMP OVERLAY (Timbro WIN) ═══ */}
      {stampOverlay && (
        <div style={{
          position:"fixed", top:0, left:0, width:"100%", height:"100%",
          zIndex:999999, pointerEvents:"none",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{
            color: stampOverlay.color || C.gold, fontSize:"72px", fontWeight:"bold", fontFamily:FONT,
            textShadow:`0 0 40px ${stampOverlay.color || C.gold}, 0 0 80px ${stampOverlay.color || C.gold}88, 0 0 120px ${stampOverlay.color || C.gold}44`,
            letterSpacing:"12px",
            transform:"rotate(-12deg) scale(1.2)",
            animation:"stampIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            border:`4px solid ${stampOverlay.color || C.gold}`,
            padding:"20px 60px",
            background:"rgba(0,0,0,0.7)",
          }}>
            {stampOverlay.text || stampOverlay}
          </div>
        </div>
      )}

      {/* ═══ SMOKE CHOICE MODAL ═══ */}
      {smokeChoiceModal && (
        <div style={{
          position:"fixed", top:0, left:0, width:"100%", height:"100%",
          background:"rgba(0,0,0,0.85)", zIndex:99999,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{
            background:"#0d0d0d", border:`2px solid ${smokeChoiceModal.itemType === "sigarettaErba" ? C.green : "#888"}`,
            borderRadius:"0", padding:"28px 36px",
            textAlign:"center", maxWidth:"320px", width:"90%",
            fontFamily:FONT, boxShadow:"none",
          }}>
            <div style={{fontSize:"48px", marginBottom:"8px"}}>
              {smokeChoiceModal.itemType === "sigarettaErba" ? "🌿" : "🚬"}
            </div>
            <div style={{color:C.bright, fontWeight:"bold", fontSize:"16px", marginBottom:"6px"}}>
              {smokeChoiceModal.itemType === "sigarettaErba" ? "Sigaretta con Erba" : "Sigaretta"}
            </div>
            <div style={{color:C.dim, fontSize:"12px", marginBottom:"20px", lineHeight:"1.7"}}>
              {smokeChoiceModal.itemType === "sigarettaErba"
                ? "+2 Fortuna per 4 turni · cura l'unghia attiva\nLa fumi o la tieni?"
                : "+1 Fortuna per 3 turni\nLa fumi subito o la conservi?"}
            </div>
            {player && (player.smokesTotal || 0) >= 4 && !player.tumore && (
              <div style={{color:C.red, fontSize:"11px", marginBottom:"12px", padding:"6px", border:`1px solid ${C.red}`, borderRadius:"0"}}>
                ⚠ Hai già fumato molto... ancora una e rischi grosso!
              </div>
            )}
            <div style={{display:"flex", gap:"10px", justifyContent:"center"}}>
              <Btn variant="gold" onClick={() => handleSmoke(smokeChoiceModal.itemType)}
                style={{fontSize:"12px", padding:"10px 20px"}}>
                🔥 Fuma subito
              </Btn>
              <Btn variant="default" onClick={() => handleSaveSmoke(smokeChoiceModal.itemType)}
                style={{fontSize:"12px", padding:"10px 20px"}}>
                🎒 Zaino →
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ═══ INVENTARIO SLIDE-IN — usabile in qualsiasi momento ═══ */}
      {showInventoryPanel && player && (
        <div
          onClick={() => setShowInventoryPanel(false)}
          style={{
            position:"fixed", top:"52px", left:"160px", right:"408px", bottom:"54px",
            background:"rgba(0,0,0,0.55)", zIndex:99990, cursor:"pointer",
          }}
        />
      )}
      {showInventoryPanel && player && (
        <div style={{
          position:"fixed", top:"56px", bottom:"58px", right:"8px", width:"400px",
          background:C.card,
          border:`2px solid ${C.magenta}`,
          boxShadow:`-4px 0 20px ${C.magenta}33, inset 0 0 30px ${C.magenta}08`,
          zIndex:99995, overflowY:"auto", overflowX:"hidden",
          display:"flex", flexDirection:"column",
          fontFamily:FONT,
        }}>
          <div style={{padding:"16px 16px 0"}}>
            <div style={{marginBottom:"14px"}}>
              <div style={{color:C.magenta, fontWeight:"bold", fontSize:"14px", letterSpacing:"1px"}}>
                🎒 ZAINO
              </div>
            </div>

            {/* Consumabili */}
            <div style={{marginBottom:"14px"}}>
              <div style={{color:C.dim, fontSize:"10px", letterSpacing:"2px", borderBottom:`1px solid #2a2a3a`, paddingBottom:"4px", marginBottom:"8px"}}>
                💊 CONSUMABILI ({player.items.length})
              </div>
              {player.items.length === 0 && (
                <div style={{color:C.dim, fontSize:"12px", fontStyle:"italic"}}>Nessun consumabile nello zaino.</div>
              )}
              <div style={{display:"flex", flexWrap:"wrap", gap:"6px"}}>
                {player.items.map((itemId, idx) => {
                  const item = ITEM_DEFS[itemId];
                  if (!item) return null;
                  return (
                    <Tooltip key={idx} text={item.desc}>
                      <Btn onClick={() => { useItem(idx); if (player.items[idx] !== "cappelloSbirro") setShowInventoryPanel(false); }}
                        style={{fontSize:"11px", borderColor: C.magenta+"44"}}>
                        {item.emoji} {item.name}
                        <span style={{display:"block", fontSize:"9px", color:C.dim}}>{item.rarity}</span>
                      </Btn>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            {/* Grattatori */}
            <div>
              <div style={{color:C.dim, fontSize:"10px", letterSpacing:"2px", borderBottom:`1px solid #2a2a3a`, paddingBottom:"4px", marginBottom:"8px"}}>
                🔧 GRATTATORI ({player.grattatori.length})
              </div>
              {player.grattatori.length === 0 && (
                <div style={{color:C.dim, fontSize:"12px", fontStyle:"italic"}}>Nessun grattatore nello zaino.</div>
              )}
              <div style={{display:"flex", flexWrap:"wrap", gap:"6px"}}>
                {player.grattatori.map((g, idx) => {
                  const def = GRATTATORE_DEFS[g.id];
                  const isEquipped = player.equippedGrattatore?.inventoryIdx === idx;
                  return (
                    <Tooltip key={idx} text={`${g.desc || def?.desc} · ${g.usesLeft} usi rimasti`}>
                      <Btn onClick={() => {
                          if (isEquipped) { unequipGrattatore(); }
                          else { equipGrattatore(idx); }
                        }}
                        style={{fontSize:"11px",
                          borderColor: isEquipped ? C.cyan : C.cyan+"44",
                          background: isEquipped ? "#001a2a" : "#0d0d1a",
                          color: C.text}}>
                        {g.emoji} {g.name}
                        <span style={{display:"block", fontSize:"9px", color: isEquipped ? C.cyan : C.dim}}>
                          {isEquipped ? "✓ EQUIPAGGIATO — clicca per togliere" : `${g.usesLeft} usi`}
                        </span>
                      </Btn>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

          </div>
          <div style={{marginTop:"auto", padding:"10px 12px", borderTop:`1px solid #1a1a2a`, color:C.text, fontSize:"10px", textAlign:"center"}}>
            Puoi usare oggetti in qualsiasi momento · Grattatori vanno equipaggiati prima di grattare
          </div>
        </div>
      )}

      {/* ═══ SMOKE EFFECT OVERLAY ═══ */}
      {showSmokeEffect && (
        <div style={{
          position:"fixed", top:0, left:0, width:"100%", height:"100%",
          background:"rgba(20,40,20,0.45)", zIndex:99997, pointerEvents:"none",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          animation:"fadeOut 2.5s forwards",
        }}>
          <div style={{fontSize:"60px", opacity:0.7, marginBottom:"12px"}}>💨</div>
          <div style={{color:C.green, fontFamily:FONT, fontSize:"18px", fontWeight:"bold",
            letterSpacing:"2px"}}>
            {player?.tumore ? "💀 TUMORE!" : `+FORTUNA`}
          </div>
        </div>
      )}

      {/* ═══ SOGNO MODAL ═══ */}
      {dreamModal && (
        <div style={{
          position:"fixed", top:0, left:0, width:"100%", height:"100%",
          background:"rgba(0,0,0,0.93)", zIndex:99999,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:FONT,
        }}>
          <div style={{
            background:"#050510", border:`2px solid #3a2a6a`,
            borderRadius:"0", padding:"36px 44px",
            textAlign:"center", maxWidth:"360px", width:"90%",
            boxShadow:"none",
          }}>
            <div style={{color:"#7a5ab8", fontSize:"11px", letterSpacing:"4px", marginBottom:"10px"}}>
              ✦ SOGNO... ✦
            </div>
            <div style={{fontSize:"56px", margin:"8px 0 16px", filter:"drop-shadow(0 0 18px #5a3a9888)"}}>
              {dreamModal.emoji}
            </div>
            <div style={{
              color:"#c8b8e8", fontSize:"13px", lineHeight:"2.0",
              marginBottom:"24px", fontStyle:"italic", whiteSpace:"pre-line",
            }}>
              {dreamModal.text}
            </div>
            {dreamModal.effect && (
              <div style={{
                color: dreamModal.effectColor || C.gold,
                fontSize:"11px", marginBottom:"16px",
                background:"#0a0820", borderRadius:"0",
                padding:"6px 12px", letterSpacing:"1px",
              }}>
                {dreamModal.effect}
              </div>
            )}
            <Btn variant="success" onClick={() => {
              if (dreamModal.onConfirm) dreamModal.onConfirm();
              setDreamModal(null);
              setScreen("map");
            }} style={{fontSize:"13px", padding:"9px 28px", borderColor:"#5a3a98", background:"#0d0828", color:"#c8b8e8"}}>
              Mi sveglio...
            </Btn>
          </div>
        </div>
      )}


      {/* ═══ MODAL RELIQUIE ═══ */}
      {showReliquie && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:9000,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:FONT,
        }} onClick={() => setShowReliquie(false)}>
          <div style={{
            background:"#08080f", border:"2px solid #c060ff",
            maxWidth:"520px", width:"92vw", maxHeight:"85vh", overflowY:"auto",
            padding:"20px",
          }} onClick={e => e.stopPropagation()}>
            <div style={{color:"#c060ff", fontSize:"16px", fontWeight:"bold", letterSpacing:"4px", textAlign:"center", marginBottom:"4px"}}>
              🏺 RELIQUIE
            </div>
            <div style={{color:C.dim, fontSize:"10px", textAlign:"center", letterSpacing:"2px", marginBottom:"16px"}}>
              Scoperte: {discoveredRelics.length}/{Object.keys(RELIC_DEFS).length} — Attive nella prossima run: {enabledRelics.length}
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:"8px", marginBottom:"16px"}}>
              {Object.entries(RELIC_DEFS).map(([id, def]) => {
                const known = discoveredRelics.includes(id);
                const active = enabledRelics.includes(id);
                const rarityColor = def.rarity === "epica" ? "#ff9900" : "#c060ff";
                return (
                  <div key={id} style={{
                    display:"flex", alignItems:"center", gap:"12px",
                    background: active ? "rgba(192,96,255,0.12)" : "#0d0d1a",
                    border: `1px solid ${active ? "#c060ff" : known ? "#3a2a5a" : "#1a1a2a"}`,
                    padding:"10px 12px",
                    opacity: known ? 1 : 0.55,
                  }}>
                    <div style={{fontSize:"28px", flexShrink:0, filter: known ? "none" : "grayscale(1) brightness(0.3)"}}>
                      {known ? def.emoji : "🔮"}
                    </div>
                    <div style={{flex:1}}>
                      {known ? (<>
                        <div style={{color: active ? "#c060ff" : C.bright, fontWeight:"bold", fontSize:"12px", marginBottom:"2px"}}>
                          {def.name}
                          <span style={{color:rarityColor, fontSize:"9px", marginLeft:"8px", letterSpacing:"1px"}}>
                            [{def.rarity.toUpperCase()}]
                          </span>
                        </div>
                        <div style={{color:C.dim, fontSize:"10px"}}>{def.desc}</div>
                      </>) : (<>
                        <div style={{color:"#3a3a5a", fontWeight:"bold", fontSize:"12px", marginBottom:"2px"}}>
                          ??? RELIQUIA SEGRETA ???
                        </div>
                        <div style={{color:"#2a2a4a", fontSize:"10px"}}>Scoprila durante una run per sbloccarne i poteri.</div>
                      </>)}
                    </div>
                    {known && (
                      <button onClick={() => {
                        setEnabledRelics(prev => {
                          const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
                          localStorage.setItem('grattini_relics_enabled', JSON.stringify(next));
                          return next;
                        });
                      }} style={{
                        background: active ? "#c060ff" : "none",
                        border:`1px solid ${active ? "#c060ff" : "#3a3a5a"}`,
                        color: active ? "#000" : "#3a3a5a",
                        fontSize:"10px", cursor:"pointer", padding:"4px 10px",
                        fontFamily:FONT, flexShrink:0, fontWeight:"bold",
                        letterSpacing:"1px",
                      }}>
                        {active ? "✓ ATTIVA" : "OFF"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {enabledRelics.length > 0 && (
              <div style={{color:"#c060ff", fontSize:"10px", textAlign:"center", marginBottom:"10px", letterSpacing:"1px"}}>
                ✦ Le reliquie attive saranno presenti dall'inizio della prossima run ✦
              </div>
            )}
            <div style={{textAlign:"center"}}>
              <Btn onClick={() => setShowReliquie(false)} style={{borderColor:"#c060ff", color:"#c060ff", fontSize:"11px"}}>
                Chiudi
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ACHIEVEMENT TOAST ═══ */}
      {achievementToast && (
        <div style={{
          position:"fixed", bottom:"80px", right:"16px", zIndex:99999,
          background:"#0d0d1a", border:`2px solid ${C.gold}`,
          borderRadius:"0", padding:"10px 14px", maxWidth:"220px",
          animation:"achievementSlide 0.4s ease-out",
          boxShadow:"none",
          fontFamily: FONT,
        }}>
          <div style={{color:C.gold, fontSize:"11px", fontWeight:"bold", marginBottom:"2px"}}>🏆 ACHIEVEMENT SBLOCCATO!</div>
          <div style={{fontSize:"20px"}}>{achievementToast.emoji}</div>
          <div style={{color:C.text, fontSize:"12px", fontWeight:"bold"}}>{achievementToast.name}</div>
          <div style={{color:C.dim, fontSize:"10px"}}>{achievementToast.desc}</div>
        </div>
      )}

      {/* ═══ TROPHIES OVERLAY ═══ */}
      {showTrophies && (
        <div style={{
          position:"fixed", top:0, left:0, width:"100%", height:"100%",
          background:"rgba(0,0,0,0.88)", zIndex:99990,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily: FONT,
        }} onClick={() => setShowTrophies(false)}>
          <div style={{
            background:"#0a0a16", border:`2px solid ${C.gold}`,
            borderRadius:"0", padding:"24px", maxWidth:"500px", width:"92%",
            maxHeight:"80vh", overflowY:"auto",
            boxShadow:"none",
          }} onClick={e => e.stopPropagation()}>
            <div style={{color:C.gold, fontSize:"16px", fontWeight:"bold", letterSpacing:"2px", marginBottom:"4px", textAlign:"center"}}>
              🏆 TROFEI
            </div>
            <div style={{color:C.dim, fontSize:"10px", textAlign:"center", marginBottom:"16px"}}>
              {Object.keys(achievements).length} / {ACHIEVEMENTS.length} sbloccati
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px"}}>
              {ACHIEVEMENTS.map(ach => {
                const unlocked = achievements[ach.id];
                return (
                  <div key={ach.id} style={{
                    background: unlocked ? "#12121f" : "#0a0a0e",
                    border:`1px solid ${unlocked ? C.gold + "66" : "#333"}`,
                    borderRadius:"0", padding:"8px 10px",
                    opacity: unlocked ? 1 : 0.55,
                  }}>
                    <div style={{fontSize:"18px", marginBottom:"2px"}}>
                      {unlocked ? ach.emoji : (ach.secret ? "🔒" : ach.emoji)}
                    </div>
                    <div style={{color: unlocked ? C.bright : C.dim, fontSize:"11px", fontWeight:"bold"}}>
                      {unlocked || !ach.secret ? ach.name : "???"}
                    </div>
                    <div style={{color:C.dim, fontSize:"9px", lineHeight:"1.4", marginTop:"2px"}}>
                      {unlocked || !ach.secret ? ach.desc : "Segreto da scoprire"}
                    </div>
                    {unlocked && (
                      <div style={{color:`${C.gold}88`, fontSize:"9px", marginTop:"4px"}}>
                        ✓ {new Date(unlocked.unlockedAt).toLocaleDateString("it-IT")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{textAlign:"center", marginTop:"16px", display:"flex", gap:"10px", justifyContent:"center"}}>
              <Btn onClick={() => setShowTrophies(false)} variant="normal" style={{fontSize:"11px"}}>Chiudi</Btn>
              <Btn onClick={() => {
                const empty = {};
                try { localStorage.setItem('grattini_achievements', '{}'); } catch {}
                setAchievements(empty);
              }} style={{fontSize:"11px", borderColor:C.red+"88", color:C.red, opacity:0.7}}>🗑 Azzera</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ALL-TIME STATS OVERLAY ═══ */}
      {showAllTimeStats && (() => {
        let alltime = {};
        try { alltime = JSON.parse(localStorage.getItem('grattini_alltime') || '{}'); } catch {}
        return (
          <div style={{
            position:"fixed", top:0, left:0, width:"100%", height:"100%",
            background:"rgba(0,0,0,0.88)", zIndex:99990,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily: FONT,
          }} onClick={() => setShowAllTimeStats(false)}>
            <div style={{
              background:"#0a0a16", border:`2px solid ${C.cyan}`,
              borderRadius:"0", padding:"24px", maxWidth:"440px", width:"92%",
              boxShadow:"none",
            }} onClick={e => e.stopPropagation()}>
              <div style={{color:C.cyan, fontSize:"16px", fontWeight:"bold", letterSpacing:"2px", marginBottom:"16px", textAlign:"center"}}>
                📊 STATISTICHE ALL-TIME
              </div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"16px"}}>
                {[
                  ["🎮 Run totali", alltime.totalRuns || 0, C.cyan],
                  ["🏆 Vittorie", alltime.totalWins || 0, C.gold],
                  ["💰 Guadagni totali", `€${alltime.totalMoneyEarned || 0}`, C.green],
                  ["🖐️ Carte grattate", alltime.totalCardsScratched || 0, C.magenta],
                ].map(([label, val, color]) => (
                  <div key={label} style={{
                    background:"#12121f", border:"1px solid #2a2a3a",
                    borderRadius:"0", padding:"10px",
                  }}>
                    <div style={{color:C.dim, fontSize:"10px"}}>{label}</div>
                    <div style={{color, fontSize:"16px", fontWeight:"bold"}}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{color:C.dim, fontSize:"10px", textAlign:"center", marginBottom:"16px", fontStyle:"italic"}}>
                {alltime.totalRuns
                  ? `Win rate: ${Math.round(((alltime.totalWins||0) / alltime.totalRuns) * 100)}%`
                  : "Nessuna run completata ancora."}
              </div>
              <div style={{textAlign:"center"}}>
                <Btn onClick={() => setShowAllTimeStats(false)} variant="normal" style={{fontSize:"11px"}}>Chiudi</Btn>
              </div>
            </div>
          </div>
        );
      })()}

      </div>{/* fine DESK */}

      </div>{/* fine 3-column */}

      {/* ── FOOTER VERSION ── */}
      <div style={{width:"100%", textAlign:"center", padding:"2px 0", flexShrink:0}}>
        <span style={{color:"#222", fontSize:"9px"}}>GRATTINI Beta 3 · 3 Biomi · v0.3</span>
      </div>

      {/* ── LOG STRIP (bottom) ── */}
      {player && !["title","tutorialNails"].includes(screen) && log.length > 0 && (
        <div style={{
          width:"100%", flexShrink:0,
          borderTop:"1px solid #12121e",
          background:"#04040c",
          padding:"4px 10px",
          display:"flex", alignItems:"center", gap:"10px",
          minHeight:"30px", maxHeight:"34px",
          overflow:"hidden",
        }}>
          <div style={{color:C.dim, fontSize:"8px", letterSpacing:"1px", flexShrink:0, opacity:0.5}}>LOG</div>
          <div style={{
            flex:1, overflowX:"auto", overflowY:"hidden",
            display:"flex", alignItems:"center", gap:"14px", whiteSpace:"nowrap",
            scrollbarWidth:"none", msOverflowStyle:"none",
          }}>
            {[...log.slice(-10)].reverse().map((l, i) => (
              <span key={i} style={{
                color: l.color || C.dim,
                fontSize:"10px",
                opacity: i === 0 ? 1 : i === 1 ? 0.6 : 0.3,
                flexShrink:0,
              }}>{l.text}</span>
            ))}
          </div>
        </div>
      )}

    </div>
    </div>
  );
}

// HMR cleanup — evita che la musica si sovrapponga quando Vite ricarica il modulo
if (import.meta.hot) {
  import.meta.hot.dispose(() => { AudioEngine.stopMusic(); });
}
