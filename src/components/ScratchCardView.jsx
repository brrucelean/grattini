import { useState, useEffect, useRef } from "react";
import { C, FONT } from "../data/theme.js";
import { NAIL_INFO } from "../data/nails.js";
import { ITEM_DEFS, GRATTATORE_DEFS } from "../data/items.js";
import { SYMBOLS, CARD_SYMBOLS } from "../data/cards.js";
import { AudioEngine } from "../audio.js";
import { roll, pick, shuffle } from "../utils/random.js";
import { S } from "../utils/styles.js";
import { Btn } from "./Btn.jsx";
import { ScratchCell } from "./ScratchCell.jsx";

// ─── SCRATCH CARD COMPONENT (Beta 2: per-cell nail damage + early stop) ───
export function ScratchCardView({ card, onDone, nailState, nailImplant=null, fortune, grattaMania, equippedGrattatore, onCellScratch, onNailDamage=null, onItemFound=null, showFirstWarning, ambidestri=false, onCardActivate=null, lastWonPrize=0, extraTiles=[], onExtraTileUsed=null, relicEffects=[], onAdviceShown=null }) {
  const cardId = useRef(card.name + card.prize + card.symbols?.join(""));
  const [cells, setCells] = useState(card.cells.map(c => ({...c})));
  const [scratched, setScratched] = useState(0);
  const [finished, setFinished] = useState(false);
  // Ref-based guard to prevent double-fire of onDone from rapid clicks / spacebar spam
  // (React state updates are async: two clicks in the same tick both see finished=false).
  const finishedRef = useRef(false);
  // Real-time win detection
  const [winFound, setWinFound] = useState(false);
  const [winSymbol, setWinSymbol] = useState(null);
  const [winPrize, setWinPrize] = useState(0);
  const [winPrizeFull, setWinPrizeFull] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const [nailAdviceDismissed, setNailAdviceDismissed] = useState(false);
  const scratchedWhileMarcia = useRef(false);
  const firstHitUsed = useRef(false); // Reliquia Occhio di Tigre
  // Mechanic-specific state
  const runningSumRef = useRef(0);
  const [runningSum, setRunningSum] = useState(0);
  const [busted, setBusted] = useState(false);
  const collectedRef = useRef(0);
  const [collected, setCollected] = useState(0);
  const [hitStop, setHitStop] = useState(false);
  const [showNoWin, setShowNoWin] = useState(false);
  const [revealMsg, setRevealMsg] = useState(null); // "🔑 2 celle rivelate!" or "💿 x2!"
  const [nearWin, setNearWin] = useState(false); // quasi-vincita: 1 symbol away from winning

  // ── La Ruota: rulli in spin prima del click ──────────────────
  const RUOTA_SYMS = CARD_SYMBOLS.ruota;
  const [reelSpinSyms, setReelSpinSyms] = useState(() =>
    card.mechanic === "ruota"
      ? [pick(RUOTA_SYMS), pick(RUOTA_SYMS), pick(RUOTA_SYMS)]
      : []
  );
  useEffect(() => {
    if (card.mechanic !== "ruota" || finished) return;
    const id = setInterval(() => {
      setReelSpinSyms(prev =>
        prev.map((s, i) => cells[i]?.scratched ? s : pick(RUOTA_SYMS))
      );
    }, 100);
    return () => clearInterval(id);
  }, [card.mechanic, finished, cells]);

  const totalCells = cells.length;

  // Spacebar: gratta prossima cella o incassa vincita (ref pattern — no stale closure)
  const scratchSpaceRef = useRef(null);
  scratchSpaceRef.current = () => {
    if (finished) return;
    if (winFound) { handleFinish(true); return; }
    const nextIdx = cells.findIndex(c => !c.scratched);
    if (nextIdx >= 0) doScratch(nextIdx);
  };
  useEffect(() => {
    const onKey = (e) => { if (e.code !== "Space") { return; } e.preventDefault(); scratchSpaceRef.current?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Ricalcola winPrize live se nailState cambia mentre c'è una vincita in sospeso
  useEffect(() => {
    if (winFound && !finished && card.mechanic !== "setteemezzo" && card.mechanic !== "collect" && card.mechanic !== "doppioOnulla") {
      const { prize, fullPrize, cancelled: c } = calcPrize();
      setWinPrize(prize);
      setWinPrizeFull(fullPrize);
      setCancelled(c);
    }
  }, [nailState, winFound, finished]);

  useEffect(() => {
    const newId = card.name + card.prize + card.symbols?.join("");
    if (newId !== cardId.current) {
      cardId.current = newId;
      const newCells = card.cells.map(c => ({...c}));
      // Reliquia Malocchio: trappole 🔥 → jolly ✨
      if (relicEffects.includes("trapToJolly")) {
        newCells.forEach((c, i) => { if (c.isTrap) newCells[i] = {...c, isTrap: false, isJolly: true, symbol: "✨"}; });
      }
      // Chiave d'Ottone: reveal 2 cells on Puzzle/high-tier cards
      if (equippedGrattatore?.effect === "revealPath" && card.tier >= 3) {
        const hidden = newCells.map((c,i) => ({c,i})).filter(x => !x.c.scratched);
        const toReveal = shuffle(hidden).slice(0, 2);
        toReveal.forEach(x => { newCells[x.i] = {...newCells[x.i], scratched: true}; });
        if (toReveal.length > 0) {
          setRevealMsg(`🔑 Chiave d'Ottone: ${toReveal.length} celle rivelate!`);
          setTimeout(() => setRevealMsg(null), 2500);
        }
      }
      if (card.id === "maledetto" && onCardActivate) {
        onCardActivate("maledetto_curse");
      }
      setCells(newCells);
      setScratched(newCells.filter(c => c.scratched).length);
      finishedRef.current = false;
      setFinished(false);
      setWinFound(false); setWinSymbol(null); setWinPrize(0); setWinPrizeFull(0); setCancelled(false);
      runningSumRef.current = 0; setRunningSum(0); setBusted(false);
      collectedRef.current = 0; setCollected(0); setHitStop(false); setShowNoWin(false);
    }
  }, [card]);

  // Check for winning combo among revealed cells
  const checkWin = (newCells) => {
    if (card.mechanic === "sum13" || card.mechanic === "collect" || card.mechanic === "setteemezzo" || card.mechanic === "ruota" || card.mechanic === "doppioOnulla") return null;
    const counts = {};
    newCells.filter(c => c.scratched && !c.isTrap && !c.isItem && !c.isJolly && !c.isStop).forEach(c => {
      counts[c.symbol] = (counts[c.symbol] || 0) + 1;
    });
    const jollyCount = newCells.filter(c => c.scratched && c.isJolly).length;
    for (const [sym, count] of Object.entries(counts)) {
      if (count + jollyCount >= card.matchNeeded) return sym;
    }
    return null;
  };

  // Apply grattatore multiplier to a raw prize
  const applyGrattatoreBonus = (raw) => {
    let p = raw;
    if (equippedGrattatore) {
      if (equippedGrattatore.effect === "doublePrize") p *= 2;
      if (equippedGrattatore.effect === "quadPrize") p *= 4;
      if (equippedGrattatore.effect === "x5teleport") p *= 5;
      if (equippedGrattatore.effect === "bonusChance") p = Math.round(p * (1 + (equippedGrattatore.value || 0.1)));
    }
    if (grattaMania) p *= 2;
    return Math.round(p);
  };

  // Calculate prize with all modifiers
  const calcPrize = () => {
    let prize = card.prize;
    let fullPrize = card.prize; // premio senza penalità marcia
    // Cap piede: moltiplicatore x3 ma mai più di €500
    if (nailState === "piede") prize = Math.min(prize, 500);
    // Penalità unghia: mult basato sullo stato attuale dell'unghia
    const usingGrattatore = !!equippedGrattatore;
    const nailInfo = NAIL_INFO[nailState] || NAIL_INFO.sana;
    const nailMult = usingGrattatore ? Math.max(nailInfo.mult, 1.0) : nailInfo.mult;
    prize = Math.round(prize * nailMult);
    // Implant prize multiplier
    if (nailImplant) {
      const implantMult = {
        plastica: 0.5, ferro: 1.0, oro: 1.5,
        // Macellaio (spec): vincite garantite, prezzo al moltiplicatore
        neonato: 0.5, marcione: 0.5, baddie: 1.0,
        // Anziana (spec): unghia sacra = x5 garantito, 1 uso
        sacra: 5.0,
      }[nailImplant] ?? 1.0;
      prize = Math.round(prize * implantMult);
      fullPrize = Math.round(fullPrize * implantMult);
    }
    // Grattatore effects
    if (equippedGrattatore) {
      if (equippedGrattatore.effect === "doublePrize") { prize *= 2; fullPrize *= 2; }
      if (equippedGrattatore.effect === "quadPrize") { prize *= 4; fullPrize *= 4; }
      if (equippedGrattatore.effect === "x5teleport") { prize *= 5; fullPrize *= 5; }
      if (equippedGrattatore.effect === "bonusChance") {
        prize = Math.round(prize * (1 + (equippedGrattatore.value || 0.1)));
        fullPrize = Math.round(fullPrize * (1 + (equippedGrattatore.value || 0.1)));
      }
    }
    // GrattaMania doubles
    if (grattaMania) { prize *= 2; fullPrize *= 2; }
    // Reliquia Maneki Neko: +10% premio
    if (relicEffects.includes("globalWinBoost")) { prize = Math.round(prize * 1.10); fullPrize = Math.round(fullPrize * 1.10); }
    // Cancel check from bad nail
    if (nailInfo.cancelChance > 0 && roll(nailInfo.cancelChance)) {
      return { prize: 0, fullPrize: 0, cancelled: true };
    }
    return { prize, fullPrize, cancelled: false };
  };

  const doScratch = (idx) => {
    if (cells[idx].scratched || finished) return;
    if (!equippedGrattatore && nailState === "marcia") scratchedWhileMarcia.current = true;

    // ── Item cell: dagli l'oggetto, non conta per win/nail ──────
    if (cells[idx].isItem) {
      const newCells = [...cells];
      newCells[idx] = {...newCells[idx], scratched: true};
      setCells(newCells);
      setScratched(s => s + 1);
      onItemFound?.(cells[idx].itemId);
      return;
    }

    // Disco Rotto: scratch 2 cells at once (non su sum13)
    const indicesToScratch = [idx];
    if (equippedGrattatore?.effect === "doubleCell" && card.mechanic !== "sum13") {
      const unscratched = cells.map((c,i) => ({c,i})).filter(x => !x.c.scratched && x.i !== idx && !x.c.isItem);
      if (unscratched.length > 0) {
        indicesToScratch.push(pick(unscratched).i);
        setRevealMsg("💿 x2!");
        setTimeout(() => setRevealMsg(null), 800);
      }
    }

    const newCells = [...cells];
    indicesToScratch.forEach(i => { newCells[i] = {...newCells[i], scratched: true}; });
    setCells(newCells);
    const newScratched = scratched + indicesToScratch.length;
    setScratched(newScratched);

    // ── Trappola fuoco (boccaDrago) ──────────────────────────────
    const hitTraps = indicesToScratch.filter(i => newCells[i].isTrap);
    const hitNormal = indicesToScratch.filter(i => !newCells[i].isTrap);
    let trapsToProcess = hitTraps.length;
    // Reliquia Occhio di Tigre: primo danno assorbito gratis
    if (relicEffects.includes("firstHitShield") && trapsToProcess > 0 && !firstHitUsed.current) {
      trapsToProcess = Math.max(0, trapsToProcess - 1);
      firstHitUsed.current = true;
      setRevealMsg("🐯 Occhio di Tigre: danno assorbito!");
      setTimeout(() => setRevealMsg(null), 1500);
    }
    for (let t = 0; t < trapsToProcess; t++) { onNailDamage?.(); AudioEngine.scratch(); }
    hitNormal.forEach(() => onCellScratch(!!equippedGrattatore));
    // After trap: still check win with non-trap cells
    if (hitTraps.length > 0) {
      const sym = checkWin(newCells);
      if (sym && !winFound) {
        const { prize: rawP, fullPrize: rawFP, cancelled: wc } = calcPrize();
        const fallback = Math.max(card.cost, Math.round(card.cost + Math.random() * card.maxPrize * 0.15));
        const prize = rawP > 0 ? rawP : applyGrattatoreBonus(fallback);
        const fullPrize = rawFP > 0 ? rawFP : prize;
        setWinFound(true); setWinSymbol(sym); setWinPrize(prize); setWinPrizeFull(fullPrize); setCancelled(wc);
        AudioEngine.win();
      }
      return;
    }

    // ── sum13 mechanic ────────────────────────────────────────────
    if (card.mechanic === "sum13") {
      const cellVal = newCells[idx].value || parseInt(newCells[idx].symbol) || 0;
      const newSum = runningSumRef.current + cellVal;
      runningSumRef.current = newSum;
      setRunningSum(newSum);
      if (newSum === 13) {
        const { prize, fullPrize, cancelled: wc } = calcPrize();
        setWinFound(true); setWinPrize(prize); setWinPrizeFull(fullPrize); setCancelled(wc);
        AudioEngine.win();
      } else if (newSum > 13) {
        setBusted(true);
        onNailDamage?.();
        AudioEngine.lose();
        setTimeout(() => handleFinish(false), 700);
      }
      return;
    }

    // ── collect mechanic ──────────────────────────────────────────
    if (card.mechanic === "collect") {
      if (newCells[idx].isStop) {
        setHitStop(true);
        AudioEngine.lose();
        setTimeout(() => handleFinish(false, true), 700);
        return;
      }
      const cellVal = newCells[idx].value || 0;
      const newCollected = collectedRef.current + cellVal;
      collectedRef.current = newCollected;
      setCollected(newCollected);
      const nonStopLeft = newCells.filter(c => !c.scratched && !c.isStop).length;
      if (nonStopLeft === 0) {
        const { cancelled: wc } = calcPrize();
        const boostedCollected = applyGrattatoreBonus(newCollected);
        setWinFound(true); setWinPrize(wc ? 0 : boostedCollected); setWinPrizeFull(boostedCollected); setCancelled(wc);
        AudioEngine.win();
      }
      return;
    }

    // ── setteemezzo mechanic ──────────────────────────────────────
    if (card.mechanic === "setteemezzo") {
      const cellVal = newCells[idx].value || 0;
      const newSum = Math.round((runningSumRef.current + cellVal) * 10) / 10;
      runningSumRef.current = newSum;
      setRunningSum(newSum);
      if (newSum > 7.5) {
        setBusted(true);
        onNailDamage?.();
        AudioEngine.lose();
        setTimeout(() => handleFinish(false), 700);
      } else if (newScratched >= totalCells) {
        if (newSum > (card.bancoTotal||0)) {
          const { prize: rawPrize, fullPrize: rawFull, cancelled: wc } = calcPrize();
          const sm = Math.max(0, newSum - (card.bancoTotal || 0));
          const smRatio = Math.min(sm / 7.5, 1);
          const fallback = Math.max(card.cost * 3, Math.round(card.cost + smRatio * (card.maxPrize - card.cost)));
          const safePrize = rawPrize > 0 ? rawPrize : fallback;
          const safeFullPrize = rawFull > 0 ? rawFull : safePrize;
          setWinFound(true); setWinPrize(safePrize); setWinPrizeFull(safeFullPrize); setCancelled(wc);
          AudioEngine.win();
        } else {
          AudioEngine.lose();
          setShowNoWin(true);
        }
      }
      return;
    }

    // ── ruota mechanic ─────────────────────────────────────────────
    if (card.mechanic === "ruota") {
      AudioEngine.scratch();
      if (newScratched >= totalCells) {
        const syms = newCells.map(c => c.symbol);
        const allSame = syms[0] === syms[1] && syms[1] === syms[2];
        const twoSame = syms[0]===syms[1] || syms[1]===syms[2] || syms[0]===syms[2];
        if (allSame) {
          const { prize, fullPrize, cancelled: wc } = calcPrize();
          setWinFound(true); setWinSymbol(syms[0]); setWinPrize(prize); setWinPrizeFull(fullPrize); setCancelled(wc);
          AudioEngine.win();
        } else if (twoSame) {
          setNearWin(true);
          AudioEngine.lose();
          setTimeout(() => { setNearWin(false); setShowNoWin(true); }, 1200);
        } else {
          AudioEngine.lose();
          setShowNoWin(true);
        }
      } else if (newScratched === 2) {
        const revealed = newCells.filter(c => c.scratched);
        if (revealed.length === 2 && revealed[0].symbol === revealed[1].symbol) {
          setNearWin(true);
        }
      }
      return;
    }

    // ── doppioOnulla mechanic ─────────────────────────────────────
    if (card.mechanic === "doppioOnulla") {
      const cell = newCells[idx];
      if (cell.isDoppioWin) {
        const doubledPrize = Math.round((lastWonPrize || 50) * 2);
        setWinFound(true); setWinPrize(doubledPrize); setWinPrizeFull(doubledPrize); setCancelled(false);
        AudioEngine.win();
      } else {
        setShowNoWin(true);
        AudioEngine.lose();
        setTimeout(() => handleFinish(false), 700);
      }
      return;
    }

    // ── Normal match / jolly ──────────────────────────────────────
    const sym = checkWin(newCells);
    if (sym && !winFound) {
      const { prize: rawP, fullPrize: rawFP, cancelled: wc } = calcPrize();
      const prize = rawP > 0 ? rawP : Math.max(card.cost, Math.round(card.cost + Math.random() * card.maxPrize * 0.15));
      const fullPrize = rawFP > 0 ? rawFP : prize;
      setWinFound(true); setWinSymbol(sym); setWinPrize(prize); setWinPrizeFull(fullPrize); setCancelled(wc);
      setNearWin(false);
      AudioEngine.win();
    } else if (!sym && !winFound && card.matchNeeded) {
      const counts = {};
      newCells.filter(c => c.scratched && !c.isTrap && !c.isItem && !c.isJolly && !c.isStop).forEach(c => {
        counts[c.symbol] = (counts[c.symbol] || 0) + 1;
      });
      const jollyCount = newCells.filter(c => c.scratched && c.isJolly).length;
      const isNear = Object.values(counts).some(c => c + jollyCount === card.matchNeeded - 1);
      if (isNear && !nearWin) setNearWin(true);
    }
    if (newScratched >= totalCells && !sym && !winFound) {
      AudioEngine.lose();
      setNearWin(false);
      setShowNoWin(true);
    }
  };

  const scratchAll = () => {
    if (card.mechanic === "sum13" || card.mechanic === "collect" || card.mechanic === "setteemezzo" || card.mechanic === "ruota" || card.mechanic === "doppioOnulla") return;
    const newCells = cells.map(c => ({...c, scratched: true}));
    setCells(newCells);
    if (!equippedGrattatore && nailState === "marcia") scratchedWhileMarcia.current = true;
    newCells.forEach((c,i) => { if (!cells[i].scratched && c.isItem) onItemFound?.(c.itemId); });
    const trapCount = newCells.filter((c,i) => !cells[i].scratched && c.isTrap).length;
    for (let t=0; t<trapCount; t++) onNailDamage?.();
    const normalCount = newCells.filter((c,i) => !cells[i].scratched && !c.isTrap && !c.isItem).length;
    for (let i=0; i<normalCount; i++) { AudioEngine.scratch(); onCellScratch(!!equippedGrattatore); }
    setScratched(newCells.length);
    const sym = checkWin(newCells);
    if (sym && !winFound) {
      const { prize: rawP, fullPrize: rawFP, cancelled: wc } = calcPrize();
      const fallback2 = Math.max(card.cost, Math.round(card.cost + Math.random() * card.maxPrize * 0.15));
      const prize = rawP > 0 ? rawP : applyGrattatoreBonus(fallback2);
      const fullPrize = rawFP > 0 ? rawFP : prize;
      setWinFound(true); setWinSymbol(sym); setWinPrize(prize); setWinPrizeFull(fullPrize); setCancelled(wc);
      AudioEngine.win();
    } else if (!sym) {
      AudioEngine.lose();
      setShowNoWin(true);
    }
  };

  const handleFinish = (claiming, stopHit=false) => {
    if (finished || finishedRef.current) return;

    // ── setteemezzo incassa anticipato ──
    if (card.mechanic === "setteemezzo" && claiming && !winFound) {
      const effMarcia = nailState === "marcia" || scratchedWhileMarcia.current;
      const margin = Math.max(0, runningSumRef.current - (card.bancoTotal || 0));
      const marginRatio = Math.min(margin / 7.5, 1);
      const basePrize = card.prize > 0 ? card.prize : Math.max(card.cost * 3, Math.round(card.cost + marginRatio * (card.maxPrize - card.cost)));
      const p = effMarcia ? Math.round(basePrize * 0.15) : basePrize;
      const boostedP = applyGrattatoreBonus(p);
      const boostedFull = applyGrattatoreBonus(basePrize);
      setWinFound(true); setWinPrize(boostedP); setWinPrizeFull(boostedFull); setCancelled(false);
      AudioEngine.win();
      return;
    }

    finishedRef.current = true;
    setFinished(true);

    // ── collect win ────────────────────────
    if (card.mechanic === "collect" && claiming) {
      const effMarcia = nailState === "marcia" || scratchedWhileMarcia.current;
      const rawCollected = effMarcia ? Math.round(collectedRef.current * 0.15) : collectedRef.current;
      const effCollected = applyGrattatoreBonus(rawCollected);
      let collectMsg = effMarcia ? `🩸 INCASSATO €${effCollected} (unghia marcia!)` : `HAI INCASSATO €${effCollected}!`;
      if (equippedGrattatore && effCollected !== rawCollected) {
        collectMsg += ` ${equippedGrattatore.emoji} ${equippedGrattatore.name}: €${rawCollected} → €${effCollected}!`;
      }
      onDone({ win: effCollected > 0, prize: effCollected,
        message: collectMsg,
        cellsScratched: scratched });
      return;
    }

    if (claiming && winFound) {
      let msg = cancelled
        ? `VINCITA ANNULLATA! L'unghia ha rovinato il biglietto!`
        : grattaMania
          ? `HAI VINTO €${winPrize}! (GrattaMania x2!)`
          : card.mechanic === "sum13"
            ? `🎯 TREDICI ESATTO! Hai vinto €${winPrize}!`
            : card.mechanic === "setteemezzo"
            ? `🃏 HAI BATTUTO IL BANCO! (${runningSumRef.current.toFixed(1)} vs ${card.bancoTotal}) €${winPrize}!`
            : card.mechanic === "doppioOnulla"
            ? `🎲 DOPPIO O NULLA: HAI VINTO! €${winPrize}! (x2!)`
            : `HAI VINTO €${winPrize}!`;
      if (equippedGrattatore && !cancelled) {
        if (equippedGrattatore.effect === "doublePrize") msg += " 🎸 Plettro: premio x2!";
        if (equippedGrattatore.effect === "quadPrize") msg += " 🥇 Moneta d'Oro: premio x4!";
        if (equippedGrattatore.effect === "bonusChance") {
          const baseP = Math.round(winPrize / (1 + (equippedGrattatore.value || 0.1)));
          msg += ` 🔘 Bottone: €${baseP} +10% → €${winPrize}!`;
        }
      }
      onDone({ win: !cancelled && winPrize > 0, prize: winPrize, message: msg, cellsScratched: scratched });
    } else {
      let malusPrize = 0;
      let msg = card.mechanic === "doppioOnulla" ? "🎲 DOPPIO O NULLA: Hai perso! ❌ €0." :
        busted ? "💥 BUST! Sei andato oltre 13!" :
        hitStop ? "🛑 STOP! Hai perso l'accumulato." :
        scratched >= totalCells ? "Niente… prossima volta!" : "Hai abbandonato il gratta.";
      const hasBullone = equippedGrattatore?.effect === "ignoreMalus";
      const bulloneSuccess = hasBullone && roll(0.8);
      const ignoreMalus = bulloneSuccess || stopHit || busted;
      if (hasBullone && !stopHit && !busted && card.malus) {
        if (bulloneSuccess) {
          msg += " 🔩 Il Bullone ha protetto dal malus!";
        } else {
          msg += " 🔩💥 Hai perso persino con un bullone! (20% sfortuna)";
        }
      }
      if (!winFound && card.malus?.type === "payExtra" && !ignoreMalus) {
        malusPrize = -card.malus.amount;
        msg += ` ${card.malus.desc}`;
      }
      if (!winFound && card.malus?.type === "nailDamage" && !ignoreMalus) {
        msg += ` ${card.malus.desc}`;
      }
      onDone({
        win: false, prize: malusPrize, message: msg, cellsScratched: scratched,
        applyNailMalus: !winFound && card.malus?.type === "nailDamage" && !ignoreMalus && !busted,
        malusAmount: card.malus?.amount || 0,
      });
    }
  };

  const catColor = card.theme?.border || (card.cost <= 1 ? C.green : card.cost <= 5 ? C.gold : card.cost <= 20 ? C.orange : C.red);

  // Count matching symbols for highlighting
  const revealedCounts = {};
  cells.filter(c => c.scratched).forEach(c => {
    revealedCounts[c.symbol] = (revealedCounts[c.symbol] || 0) + 1;
  });

  return (
    <div style={{...S.panel, textAlign:"center", maxWidth:"420px", margin:"10px auto",
      border:`2px solid ${winFound ? C.green : catColor}`, background: "#000000",
      transition:"none",
      animation: winFound ? "winFlash 1.5s ease-out" : "none"}}>

      {<>
      <div style={{color:catColor, fontWeight:"bold", fontSize:"14px", marginBottom:"2px"}}>
        ✦ {card.name} ✦
      </div>
      <div style={{color:C.dim, fontSize:"11px", marginBottom:"4px"}}>
        €{card.cost} · {card.desc} · Max: €{card.maxPrize}
      </div>

      {/* 🎲 DoppioOnulla banner */}
      {card.mechanic === "doppioOnulla" && (
        <div style={{
          background:"#1a0018", border:`2px solid ${C.magenta}`,
          borderRadius:"0", padding:"8px 12px", marginBottom:"8px",
          animation:"pulse 1.5s ease-in-out infinite",
        }}>
          <div style={{color:C.magenta, fontWeight:"bold", fontSize:"12px"}}>
            🎲 DOPPIO O NULLA — gratta e scopri il destino del tuo ultimo premio!
          </div>
          {lastWonPrize > 0 && (
            <div style={{color:C.gold, fontSize:"11px", marginTop:"3px"}}>
              Ultimo premio: <strong>€{lastWonPrize}</strong> → Vinci: <strong style={{color:C.green}}>€{lastWonPrize * 2}</strong> · Perdi: <strong style={{color:C.red}}>€0</strong>
            </div>
          )}
        </div>
      )}
      {card.malus && card.malus.type !== "nailBleed" && <div style={{color:C.red, fontSize:"10px", marginBottom:"4px"}}>⚠ {card.malus.desc}</div>}

      {/* ⚠ Avviso unghia danneggiata */}
      {(nailState === "sanguinante" || nailState === "marcia") && !finished && scratched === 0 && (
        <div style={{
          background: nailState === "marcia" ? "#1a0000" : "#1a0800",
          border:`2px solid ${nailState === "marcia" ? C.red : C.orange}`,
          borderRadius:"0", padding:"8px 12px", marginBottom:"8px",
          animation:"pulse 1.2s infinite",
        }}>
          <div style={{color: nailState === "marcia" ? C.red : C.orange, fontWeight:"bold", fontSize:"12px", marginBottom:"3px"}}>
            🩸 UNGHIA {nailState === "marcia" ? "MARCIA" : "SANGUINANTE"} — ATTENZIONE!
          </div>
          <div style={{color:C.text, fontSize:"11px", lineHeight:"1.5"}}>
            I premi vengono ridotti al <strong style={{color:C.gold}}>{nailState === "marcia" ? "20%" : "35%"}</strong> del valore nominale.
            {nailState === "marcia" && " Considera di usare un'altra unghia o curati prima."}
          </div>
        </div>
      )}

      {/* ⚡ Avviso GrattaMania */}
      {grattaMania && !finished && (
        <div style={{
          background:"#1a0011", border:`2px solid ${C.red}`,
          borderRadius:"0", padding:"7px 12px", marginBottom:"8px",
          display:"flex", alignItems:"center", gap:"8px",
        }}>
          <span style={{fontSize:"18px", animation:"pulse 0.5s infinite"}}>⚡</span>
          <div>
            <div style={{color:C.red, fontWeight:"bold", fontSize:"11px"}}>GRATTAMANIA ATTIVA — PERICOLO UNGHIE</div>
            <div style={{color:C.text, fontSize:"10px"}}>Premio x2 · Ogni cella grattata danneggia <strong style={{color:C.red}}>TUTTE e 5</strong> le unghie</div>
          </div>
        </div>
      )}

      {/* ── Meccanica: Sette e Mezzo — pannello BANCO ── */}
      {card.mechanic === "setteemezzo" && (
        <div style={{
          background:"#1a1400", border:`2px solid #ccaa00`,
          borderRadius:"0", padding:"8px 12px", marginBottom:"8px",
        }}>
          <div style={{color:"#ccaa00", fontSize:"10px", letterSpacing:"2px", marginBottom:"6px"}}>🏦 IL BANCO</div>
          <div style={{display:"flex", gap:"6px", justifyContent:"center", marginBottom:"6px"}}>
            {card.bancoCards?.map((c,i) => (
              <div key={i} style={{
                background:"#f5f0e0", borderRadius:"0", padding:"4px 8px",
                fontFamily:FONT, fontWeight:"bold", fontSize:"18px",
                color: c.isRed ? "#cc1111" : "#111",
                boxShadow:"none", minWidth:"36px", textAlign:"center",
              }}>
                {c.symbol}
              </div>
            ))}
          </div>
          <div style={{color:"#ccaa00", fontSize:"12px"}}>
            Punteggio: <strong>{card.bancoTotal?.toFixed(1)}</strong>
            <span style={{color:"#666", fontSize:"10px", marginLeft:"6px"}}>
              (J/Q/K=½ · A=1 · 2-7=faccia)
            </span>
          </div>
        </div>
      )}
      {/* ── Sette e Mezzo — punteggio live ── */}
      {card.mechanic === "setteemezzo" && !finished && scratched > 0 && (
        <div style={{
          background:"#0d0a00", border:`2px solid ${busted ? C.red : runningSum > (card.bancoTotal||0) ? C.green : "#555"}`,
          borderRadius:"0", padding:"6px 14px", marginBottom:"8px",
          display:"flex", alignItems:"center", justifyContent:"center", gap:"12px",
        }}>
          <span style={{color:"#888", fontSize:"10px"}}>TUO PUNTEGGIO</span>
          <span style={{
            fontSize:"26px", fontWeight:"bold",
            color: busted ? C.red : runningSum > 7 ? C.orange : runningSum > (card.bancoTotal||0) ? C.green : C.bright,
            textShadow: runningSum > (card.bancoTotal||0) && !busted ? `0 0 10px ${C.green}` : "none",
          }}>
            {runningSum.toFixed(1)}
          </span>
          {busted && <span style={{color:C.red, fontWeight:"bold"}}>💥 SBALLATO!</span>}
          {!busted && runningSum > (card.bancoTotal||0) && <span style={{color:C.green, fontSize:"11px"}}>✓ stai vincendo</span>}
        </div>
      )}
      {/* INCASSA anticipato se stai già battendo il banco */}
      {card.mechanic === "setteemezzo" && !finished && !winFound && !busted
        && scratched > 0 && scratched < totalCells
        && runningSum > (card.bancoTotal||0) && runningSum <= 7.5 && (
        <div style={{marginBottom:"8px"}}>
          <Btn variant="gold" onClick={() => handleFinish(true)} style={{fontSize:"12px", padding:"5px 16px"}}>
            🃏 INCASSA ORA ({runningSum.toFixed(1)} vs {card.bancoTotal?.toFixed(1)}) — rischi ancora?
          </Btn>
        </div>
      )}

      {/* ── Trap hint ── */}
      {card.mechanic === "trap" && !finished && (
        <div style={{color:"#ff8800", fontSize:"10px", marginBottom:"4px", letterSpacing:"0.5px"}}>
          🔥 Alcune celle nascondono trappole — ogni 🔥 grattata danneggia l'unghia!
        </div>
      )}
      {/* ── Jolly hint ── */}
      {card.mechanic === "jolly" && !finished && (
        <div style={{color:"#ccaa00", fontSize:"10px", marginBottom:"4px"}}>
          ✨ C'è un JOLLY nascosto — vale qualsiasi simbolo!
        </div>
      )}
      {/* ── sum13 counter ── */}
      {card.mechanic === "sum13" && !finished && (
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
          background:"#1a0000", border:`2px solid ${runningSum >= 12 ? "#ff4444" : runningSum >= 8 ? C.orange : "#444"}`,
          borderRadius:"0", padding:"6px 16px", marginBottom:"8px",
        }}>
          <span style={{color:C.dim, fontSize:"10px", letterSpacing:"1px"}}>SOMMA</span>
          <span style={{
            fontSize:"30px", fontWeight:"bold", lineHeight:1,
            color: busted ? C.red : runningSum >= 12 ? "#ff4444" : runningSum >= 9 ? C.orange : runningSum >= 5 ? C.gold : C.green,
            textShadow: runningSum >= 10 ? `0 0 12px currentColor` : "none",
            transition:"color 0.3s",
          }}>{runningSum}</span>
          <span style={{color:C.dim, fontSize:"16px"}}>/13</span>
          {busted && <span style={{color:C.red, fontWeight:"bold", fontSize:"13px"}}>💥 BUST!</span>}
          {runningSum === 13 && !busted && <span style={{color:C.green, fontSize:"13px"}}>🎯 TREDICI!</span>}
        </div>
      )}
      {/* ── collect accumulator ── */}
      {card.mechanic === "collect" && !finished && (
        <div style={{
          background:"#141100", border:`2px solid ${hitStop ? C.red : collected >= 200 ? C.green : "#ccaa00"}`,
          borderRadius:"0", padding:"8px 16px", marginBottom:"8px",
          display:"flex", flexDirection:"column", alignItems:"center", gap:"6px",
        }}>
          <div style={{display:"flex", alignItems:"baseline", gap:"6px"}}>
            <span style={{color:C.dim, fontSize:"10px"}}>ACCUMULATO</span>
            <span style={{
              fontSize:"26px", fontWeight:"bold",
              color: hitStop ? C.red : collected >= 200 ? C.green : collected >= 100 ? C.gold : C.bright,
              transition:"color 0.3s",
            }}>€{collected}</span>
            {collected >= 200 && !hitStop && <span style={{color:C.green, fontSize:"11px"}}>✓ obiettivo!</span>}
          </div>
          {hitStop && <div style={{color:C.red, fontWeight:"bold"}}>🛑 STOP! Perdi tutto!</div>}
          {!hitStop && !winFound && collected > 0 && (
            <Btn variant="gold" onClick={() => handleFinish(true)} style={{fontSize:"12px", padding:"5px 18px"}}>
              💰 INCASSA ORA €{collected}
            </Btn>
          )}
        </div>
      )}

      {/* Grattatore indicator */}
      {equippedGrattatore && (
        <div style={{color:C.cyan, fontSize:"11px", marginBottom:"6px",
          background:"#001a2a", padding:"3px 8px", borderRadius:"0", display:"inline-block"}}>
          {GRATTATORE_DEFS[equippedGrattatore.id]?.emoji} Grattatore: {equippedGrattatore.name}
          {" · Unghia protetta!"}
        </div>
      )}

      {/* Grid — canvas scratch cells */}
      {card.mechanic === "ruota" ? (
        <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:"8px", margin:"10px auto 12px"}}>
          <div style={{color:C.gold, fontSize:"11px", letterSpacing:"3px", fontFamily:FONT}}>
            ★ FERMA I RULLI ★
          </div>
          <div style={{
            display:"flex", justifyContent:"center", gap:"8px",
            border:`2px solid ${C.dim}`, padding:"8px 12px", background:"#000000",
          }}>
            {cells.map((cell, idx) => {
              const allScratched = cells.every(c => c.scratched);
              const isMatch = allScratched && winFound;
              const spinning = !cell.scratched && !finished;
              const displaySym = cell.scratched ? cell.symbol : (reelSpinSyms[idx] || "?");
              return (
                <div key={idx}
                  onClick={() => !cell.scratched && !finished && doScratch(idx)}
                  style={{
                    width:"80px", height:"90px",
                    border:`2px solid ${cell.scratched ? (isMatch ? C.gold : C.cyan) : C.text}`,
                    background: cell.scratched ? (isMatch ? "#555500" : "#080808") : "#111",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    cursor: spinning ? "pointer" : "default",
                    userSelect:"none", gap:"4px",
                    animation: isMatch ? "winFlash 0.6s infinite" : "none",
                  }}>
                  <div style={{fontSize:"32px", lineHeight:1}}>{displaySym}</div>
                  <div style={{
                    fontSize:"9px", letterSpacing:"1px",
                    color: cell.scratched ? (isMatch ? C.gold : C.dim) : C.text,
                  }}>
                    {cell.scratched ? (isMatch ? "STOP!" : "STOP") : "▶ CLICK"}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{fontSize:"10px", color:C.dim, letterSpacing:"1px"}}>
            {cells.filter(c=>c.scratched).length === 0 && "Clicca per fermare ogni rullo"}
            {cells.filter(c=>c.scratched).length === 1 && "2 rulli ancora in giro..."}
            {cells.filter(c=>c.scratched).length === 2 && (nearWin ? `⚡ QUASI! Ferma l'ultimo!` : "Ultimo rullo — dai!")}
            {cells.every(c=>c.scratched) && (winFound ? "🎰 JACKPOT!" : "Niente...")}
          </div>
        </div>
      ) : (
      <div style={{
        display:"grid", gridTemplateColumns:`repeat(${card.cols}, 1fr)`,
        gap:"4px", maxWidth:"300px", margin:"6px auto 8px",
      }}>
        {cells.map((cell, idx) => {
          const matchCount = revealedCounts[cell.symbol] || 0;
          const isWinSymbol = cell.scratched && winFound && cell.symbol === winSymbol;
          const isPartialMatch = cell.scratched && !winFound && matchCount >= 2 && matchCount < card.matchNeeded;
          return (
            <ScratchCell key={idx} cell={cell} idx={idx}
              onScratch={doScratch} finished={finished}
              isWinSymbol={isWinSymbol} isPartialMatch={isPartialMatch}
              bloodMode={nailState === "sanguinante" || nailState === "marcia"}
              ambidestri={ambidestri} themeColor={card.theme?.border} />
          );
        })}
      </div>
      )}

      {/* Extra tiles */}
      {extraTiles.length > 0 && (
        <div style={{display:"flex", gap:"6px", justifyContent:"center", margin:"4px 0 8px", flexWrap:"wrap"}}>
          {extraTiles.map((tileItemId, ti) => {
            const tileDef = ITEM_DEFS[tileItemId];
            return (
              <div key={ti}
                onClick={() => onExtraTileUsed?.(tileItemId, ti)}
                style={{
                  width:"52px", height:"52px",
                  background:"#111",
                  border:"2px solid #888",
                  borderRadius:"0",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", fontSize:"22px",
                  transition:"border-color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#888"; }}
                title={tileDef?.name || tileItemId}
              >
                {tileDef?.emoji || "❓"}
                <span style={{fontSize:"7px", color:C.dim, marginTop:"2px"}}>{tileDef?.name?.slice(0,8)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Status bar */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center",
        fontSize:"11px", margin:"4px 0 8px", padding:"0 4px"}}>
        <span style={{color:C.dim}}>Grattate: {scratched}/{totalCells}</span>
        {!equippedGrattatore
          ? <span style={{color:C.orange, fontSize:"10px"}}>🖐 Trascina per grattare!</span>
          : <span style={{color:C.cyan, fontSize:"10px"}}>🛡️ Unghia protetta</span>
        }
      </div>

      {revealMsg && (
        <div style={{color:C.cyan, fontSize:"12px", textAlign:"center", margin:"4px 0", fontWeight:"bold",
          animation:"pulse 0.6s ease-out"}}>{revealMsg}</div>
      )}

      {/* Consiglio unghia sanguinante */}
      {!finished && !winFound && !nailAdviceDismissed && !showFirstWarning &&
        (nailState === "marcia" || scratchedWhileMarcia.current) &&
        Object.values(revealedCounts).some(v => v >= 2) && (
        <div style={{
          background:"#1a0000", border:`2px solid ${C.red}`,
          borderRadius:"0", padding:"9px 12px", marginBottom:"8px",
          animation: showFirstWarning ? "none" : "pulse 1s infinite",
        }}>
          {!showFirstWarning ? (
            <>
              <div style={{color:C.red, fontWeight:"bold", fontSize:"13px", marginBottom:"4px"}}>
                🩸 Consiglio: abbandona ora!
              </div>
              <div style={{color:C.text, fontSize:"11px", lineHeight:"1.6", marginBottom:"8px"}}>
                L'unghia <span style={{color:C.orange}}>insanguinata</span> sporca la schedina: vinci solo il <strong>25%</strong> del premio.<br/>
                Abbandona, curati con disinfettante o cambia unghia.<br/>
                <span style={{color:C.dim}}>Continua solo se vuoi rischiare.</span>
              </div>
              <div style={{display:"flex", gap:"8px", justifyContent:"center"}}>
                <Btn variant="danger" onClick={() => handleFinish(false)} style={{fontSize:"12px"}}>
                  ✗ Abbandona e cambia unghia
                </Btn>
                <Btn onClick={() => { onAdviceShown?.(); setNailAdviceDismissed(true); }} style={{fontSize:"11px", opacity:0.7}}>
                  Rischio lo stesso
                </Btn>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Gratta tutto */}
      {!finished && !winFound && scratched < totalCells
        && card.mechanic !== "sum13" && card.mechanic !== "collect" && card.mechanic !== "setteemezzo" && (
        <div style={{marginBottom:"6px"}}>
          <Btn onClick={scratchAll} style={{fontSize:"11px", background:"#1a1a00", color:C.gold, borderColor:C.dim}}>
            ⚡ Gratta Tutto in Una Volta
          </Btn>
        </div>
      )}
      </>}

      {/* WIN FOUND - CLAIM BUTTON */}
      {winFound && !finished && (() => {
        const isDirty = !cancelled && (nailState === "marcia" || scratchedWhileMarcia.current);
        const borderCol = cancelled ? C.red : isDirty ? C.red : C.green;
        const prizeCol  = cancelled ? C.red : isDirty ? C.orange : C.green;
        return (
          <div style={{
            background: isDirty ? "#1a0000" : "#001a00",
            border:`2px solid ${borderCol}`, borderRadius:"0",
            padding:"10px", marginBottom:"8px", animation:"pulse 1s infinite",
          }}>
            {isDirty && (
              <div style={{color:C.red, fontSize:"11px", marginBottom:"5px", letterSpacing:"0.5px"}}>
                🩸 Unghia insanguinata ha sporcato la schedina — vinci solo il 25%
              </div>
            )}
            <div style={{color: prizeCol, fontSize:"18px", fontWeight:"bold", marginBottom:"6px",
              textShadow: cancelled ? "none" : `0 0 15px ${prizeCol}`}}>
              {(() => {
                if (cancelled) return "VINCITA ANNULLATA!";
                if (isDirty) return <span><span style={{textDecoration:"line-through", color:C.dim, fontSize:"15px"}}>€{winPrizeFull}</span>{" → "}🩸 €{winPrize}</span>;
                const eff = equippedGrattatore?.effect;
                const base = eff === "doublePrize" ? Math.round(winPrize / 2)
                  : eff === "quadPrize" ? Math.round(winPrize / 4)
                  : eff === "x5teleport" ? Math.round(winPrize / 5)
                  : eff === "bonusChance" ? Math.round(winPrize / (1 + (equippedGrattatore.value || 0.1)))
                  : winPrize;
                const showBase = equippedGrattatore && base !== winPrize;
                const displayP = showBase ? base : winPrize;
                if (card.mechanic === "sum13") return `🎯 TREDICI ESATTO! €${displayP}`;
                if (card.mechanic === "collect") return `💰 TUTTO ACCUMULATO: €${displayP}!`;
                if (card.mechanic === "setteemezzo") return `🃏 BANCO BATTUTO! €${displayP}`;
                return `💰 COMBO TROVATA: €${displayP}!`;
              })()}
            </div>
            {equippedGrattatore && !cancelled && winPrize > 0 && (() => {
              const eff = equippedGrattatore.effect;
              const basePrize = eff === "doublePrize" ? Math.round(winPrize / 2)
                : eff === "quadPrize" ? Math.round(winPrize / 4)
                : eff === "x5teleport" ? Math.round(winPrize / 5)
                : eff === "bonusChance" ? Math.round(winPrize / (1 + (equippedGrattatore.value || 0.1)))
                : null;
              if (basePrize === null || basePrize === winPrize) return null;
              return (
                <div style={{color:C.cyan, fontSize:"11px", marginBottom:"6px"}}>
                  {equippedGrattatore.emoji} {equippedGrattatore.name}: €{basePrize} → €{winPrize}
                  {eff === "doublePrize" && " (x2!)"}
                  {eff === "quadPrize" && " (x4!)"}
                  {eff === "bonusChance" && " (+10%)"}
                  {eff === "x5teleport" && " (x5!)"}
                </div>
              );
            })()}
            <div style={{display:"flex", justifyContent:"center", gap:"8px"}}>
              <Btn variant={isDirty ? "danger" : "gold"} onClick={() => handleFinish(true)} style={{fontSize:"14px"}}>
                {cancelled ? "Chiudi" : isDirty ? `🩸 RITIRA €${winPrize} (di €${winPrizeFull})` : card.mechanic === "collect" ? `✓ CONFERMA €${winPrize}` : `✓ RITIRA €${winPrize}`}
              </Btn>
              {!cancelled && scratched < totalCells && (
                <span style={{color:C.dim, fontSize:"11px", alignSelf:"center"}}>o continua a grattare →</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* NOT YET WON - abandon */}
      {!winFound && !finished && !showNoWin && scratched > 0
        && !(
          !nailAdviceDismissed && !showFirstWarning
          && (nailState === "marcia" || scratchedWhileMarcia.current)
          && Object.values(revealedCounts).some(v => v >= 2)
        ) && (
        <div style={{display:"flex", justifyContent:"center", gap:"8px"}}>
          <Btn variant="danger" onClick={() => handleFinish(false)} style={{fontSize:"11px"}}>
            ✗ Abbandona
          </Btn>
        </div>
      )}

      {/* QUASI-VINCITA */}
      {nearWin && !winFound && !finished && !showNoWin && (
        <div style={{
          marginTop:"8px", padding:"8px 12px", borderRadius:"0",
          border:`1px solid ${C.gold}88`, background:"#1a1200",
          textAlign:"center",
          animation:"pulse 0.6s infinite",
          boxShadow:"none",
        }}>
          <span style={{color:C.gold, fontSize:"13px", fontWeight:"bold"}}>
            ✨ QUASI VINCITA! Manca solo 1 simbolo! ✨
          </span>
        </div>
      )}

      {/* NO WIN */}
      {showNoWin && !finished && (
        <div style={{
          marginTop:"6px", padding:"8px 12px", borderRadius:"0",
          border:`2px solid ${C.red}`, background:"#1a0000",
          display:"flex", alignItems:"center", gap:"12px",
        }}>
          <div style={{fontSize:"20px", flexShrink:0}}>😔</div>
          <div style={{flex:1}}>
            <div style={{color:C.red, fontSize:"13px", fontWeight:"bold"}}>Nessuna vincita.</div>
            <div style={{color:C.dim, fontSize:"10px"}}>Sarà per la prossima...</div>
          </div>
          <Btn variant="default" onClick={() => handleFinish(false)}
            style={{fontSize:"11px", padding:"5px 14px", flexShrink:0}}>
            OK →
          </Btn>
        </div>
      )}

      {/* FINISHED RESULT */}
      {finished && (
        <div style={{marginTop:"6px"}}>
          <div style={{
            color: winFound && !cancelled ? C.green : C.red,
            fontSize:"16px", fontWeight:"bold", marginBottom:"6px",
          }}>
            {winFound && !cancelled ? `HAI VINTO €${winPrize}!` :
             winFound && cancelled ? "VINCITA ANNULLATA dall'unghia!" :
             scratched >= totalCells ? "Niente… prossima volta!" : "Biglietto abbandonato."}
          </div>
        </div>
      )}
    </div>
  );
}
