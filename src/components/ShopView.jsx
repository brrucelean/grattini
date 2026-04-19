import { useState, useRef } from "react";
import { C, FONT } from "../data/theme.js";
import { ITEM_DEFS, GRATTATORE_DEFS } from "../data/items.js";
import { CARD_TYPES } from "../data/cards.js";
import { TABACCAIO_LINES, NPC_ART } from "../data/art.js";
import { rng } from "../utils/random.js";
import { S } from "../utils/styles.js";
import { Btn } from "./Btn.jsx";
import { Tooltip } from "./Tooltip.jsx";

const SLOT_SYMBOLS = ["🍋","🍒","🔔","💎","7️⃣","⭐"];

export function ShopView({ player, onBuyCard, onBuyItem, onBuyGrattatore, onLeave, onScratch, onSlotResult, currentRow=0, currentBiome=0 }) {
  // Stabilize punchline for this visit
  const punchline = useRef(TABACCAIO_LINES[Math.floor(rng() * TABACCAIO_LINES.length)]);

  // ─── SLOT MACHINE STATE ────────────────────────────────────────
  const [slotReels, setSlotReels] = useState(["🎰","🎰","🎰"]);
  const [slotSpinning, setSlotSpinning] = useState(false);
  const [slotResult, setSlotResult] = useState(null); // { text, prize, type }
  const slotIntervalRef = useRef(null);

  const spinSlot = () => {
    if (slotSpinning || player.money < 1) return;
    onSlotResult({ type: "pay", amount: 1 }); // pay €1
    setSlotResult(null);
    setSlotSpinning(true);
    let ticks = 0;
    const maxTicks = 22;
    slotIntervalRef.current = setInterval(() => {
      setSlotReels([
        SLOT_SYMBOLS[Math.floor(rng() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(rng() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(rng() * SLOT_SYMBOLS.length)],
      ]);
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(slotIntervalRef.current);
        // Final result
        const r1 = SLOT_SYMBOLS[Math.floor(rng() * SLOT_SYMBOLS.length)];
        const r2 = SLOT_SYMBOLS[Math.floor(rng() * SLOT_SYMBOLS.length)];
        const r3 = SLOT_SYMBOLS[Math.floor(rng() * SLOT_SYMBOLS.length)];
        setSlotReels([r1, r2, r3]);
        setSlotSpinning(false);
        // Check result
        let type = "lose";
        let prize = 0;
        let text = "Nessun premio. Meglio così.";
        if (r1 === "7️⃣" && r2 === "7️⃣" && r3 === "7️⃣") {
          type = "superjackpot"; prize = 100;
          text = "🎆 SUPER JACKPOT! Tre sette! +€100!";
        } else if (r1 === r2 && r2 === r3) {
          type = "jackpot"; prize = 50;
          text = `🎉 JACKPOT! Tre ${r1}! +€50!`;
        } else if (r1 === r2 || r2 === r3 || r1 === r3) {
          type = "small"; prize = 5;
          text = `✨ Piccola vincita! Due uguali! +€5`;
        } else {
          type = "lose"; prize = 0;
          text = "💨 Niente. Solo fumo e rimpianti.";
        }
        setSlotResult({ text, prize, type });
        if (prize > 0) onSlotResult({ type: "win", amount: prize });
      }
    }, 80);
  };

  const shopCards = [
    CARD_TYPES[0], CARD_TYPES[1], CARD_TYPES[2],
    ...(player.money >= 5  ? [CARD_TYPES[3]] : []),   // fintoMilionario €5
    ...(player.money >= 10 ? [CARD_TYPES[4]] : []),   // puzzle €10
    ...(player.money >= 20 ? [CARD_TYPES[5]] : []),   // boccaDrago €20
    ...(player.money >= 30 && currentRow >= 3 ? [CARD_TYPES[6]] : []),   // miliardario €30, row 3+
    ...(player.money >= 50 && currentRow >= 5 ? [CARD_TYPES[7]] : []),   // tredici €50, row 5+
    ...(player.money >= 100 && currentRow >= 6 ? [CARD_TYPES[8]] : []),  // maledetto €100, row 6+
    ...(player.money >= 15 ? [CARD_TYPES[9]] : []),   // La Ruota €15
    ...(player.money >= 20 && player.lastWonPrize > 0 ? [CARD_TYPES[13]] : []),  // Doppio o Nulla €20, only if has won before
    ...(currentBiome === 3 && player.money >= 25 ? [CARD_TYPES.find(c => c.id === "mahjong")] : []).filter(Boolean),  // 🀄 Mahjong — solo Quartiere Cinese
  ];
  const shopItems = ["cerotto","disinfettante","sigaretta","smalto"];
  const rareItems = player.money >= 20 ? ["cremaRinforzante","cappelloSbirro"] : [];
  const shopGrattatori = ["bottone","bullone","unghiaFinta"];
  const rareGrattatori = player.money >= 15 ? ["plettro","moneta_argento","discoRotto"] : [];
  const legendaryGrattatori = player.money >= 40 ? ["moneta_oro"] : [];
  // Porta-Chiavi SCRATCH-LITE: solo nei tabacchi del terzo bioma (biome index 2)
  const vipGrattatori = (currentBiome >= 2 && player.money >= 2000) ? ["portaChiavi"] : [];
  // Zone VIP: sbloccate con Tessera VIP — grattatori rari + consumabili esclusivi
  const vipItems = player.hasVIP ? ["sieroRicrescita","gettoneLavaggio","manoProtesica"] : [];
  const vipCards = player.hasVIP ? [
    ...(player.money >= 15 ? [CARD_TYPES.find(t=>t.id==="labirinto")] : []),
    ...(player.money >= 25 ? [CARD_TYPES.find(t=>t.id==="grattaCombina")] : []),
    ...(player.money >= 35 ? [CARD_TYPES.find(t=>t.id==="mappaTesor0")] : []),
  ].filter(Boolean) : [];

  const Section = ({ label, children }) => (
    <div style={{marginBottom:"14px"}}>
      <div style={{
        color: C.dim, fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase",
        borderBottom:`1px solid #2a2a3a`, paddingBottom:"4px", marginBottom:"8px",
      }}>{label}</div>
      <div style={{display:"flex", flexWrap:"wrap", gap:"6px"}}>{children}</div>
    </div>
  );

  return (
    <div style={{...S.panel, margin:"10px auto"}}>

      {/* ── Cassa header ── */}
      <div style={{
        display:"flex", alignItems:"center", gap:"16px",
        borderBottom:`1px solid #2a2a3a`, paddingBottom:"12px", marginBottom:"14px",
      }}>
        <pre style={{...S.pre, fontSize:"12px", color:C.gold, margin:0, lineHeight:"1.3"}}>{NPC_ART.tabaccaio}</pre>
        <div style={{flex:1}}>
          <div style={{fontSize:"18px", fontWeight:"bold", color:C.bright, letterSpacing:"1px"}}>
            🏪 TABACCHERIA
          </div>
          <div style={{color:C.dim, fontSize:"10px", letterSpacing:"2px", marginBottom:"6px"}}>
            — gratta & vinci — sigarette — lotto —
          </div>
          <div style={{
            color:C.gold, fontSize:"11px", fontStyle:"italic",
            background:"#0f0f00", border:`1px solid #3a3a00`,
            borderRadius:"0", padding:"5px 8px", lineHeight:"1.4",
          }}>
            {punchline.current}
          </div>
        </div>
      </div>

      {/* ── Gratta & Vinci ── */}
      <Section label="🎫 Gratta &amp; Vinci">
        {shopCards.map(c => (
          <Tooltip key={c.id} text={`${c.desc} · Max: €${c.maxPrize}${c.malus ? ` · ⚠ ${c.malus.desc}` : ""}`}>
            <Btn onClick={() => onBuyCard(c.id)}
              disabled={player.money < c.cost}
              variant={player.money >= c.cost ? "gold" : "normal"}
              style={{fontSize:"11px"}}>
              🎫 {c.name}<br/>
              <span style={{fontSize:"9px", color:C.dim}}>€{c.cost} · max €{c.maxPrize}</span>
            </Btn>
          </Tooltip>
        ))}
      </Section>

      {/* ── Grattatori ── */}
      <Section label="🔧 Grattatori — proteggono le unghie">
        {[...shopGrattatori, ...rareGrattatori, ...legendaryGrattatori, ...vipGrattatori].map(id => {
          const g = GRATTATORE_DEFS[id];
          if (!g) return null;
          const isRare = g.rarity === "rara";
          const isLeg = g.rarity === "leggendaria" || g.rarity === "rarissimo";
          return (
            <Tooltip key={id} text={`${g.desc} · ${g.maxUses === 99 ? "∞" : g.maxUses} uso/i · Rarità: ${g.rarity}`}>
              <Btn onClick={() => onBuyGrattatore(id)}
                disabled={player.money < g.cost}
                style={{
                  fontSize:"11px",
                  borderColor: isLeg ? C.gold : isRare ? C.magenta : undefined,
                  boxShadow: isLeg ? `0 0 8px ${C.gold}66, 0 0 16px ${C.gold}22` : isRare ? `0 0 4px ${C.magenta}44` : undefined,
                }}>
                {g.emoji} {g.name}<br/>
                <span style={{fontSize:"9px", color: isLeg ? C.gold : isRare ? C.magenta : C.dim}}>€{g.cost} · {g.rarity}</span>
              </Btn>
            </Tooltip>
          );
        })}
      </Section>

      {/* ── Consumabili ── */}
      <Section label="💊 Consumabili">
        {[...shopItems, ...rareItems].map(id => {
          const item = ITEM_DEFS[id];
          if (!item) return null;
          return (
            <Tooltip key={id} text={`${item.desc} · Rarità: ${item.rarity}`}>
              <Btn onClick={() => onBuyItem(id)}
                disabled={player.money < item.cost}
                style={{fontSize:"11px"}}>
                {item.emoji} {item.name}<br/>
                <span style={{fontSize:"9px", color:C.dim}}>€{item.cost}</span>
              </Btn>
            </Tooltip>
          );
        })}
      </Section>

      {/* ── Zona VIP ── */}
      {player.hasVIP && (vipItems.length > 0 || vipCards.length > 0) && (
        <Section label="🎫 ZONA VIP — Accesso Esclusivo">
          {vipCards.map(c => (
            <Tooltip key={c.id} text={`${c.desc} · Max €${c.maxPrize}`}>
              <Btn onClick={() => onBuyCard(c.id)} disabled={player.money < c.cost}
                style={{fontSize:"11px", borderColor:C.gold+"88", boxShadow:`0 0 6px ${C.gold}22`}}>
                🎫 {c.name}<br/>
                <span style={{fontSize:"9px", color:C.gold}}>€{c.cost} · max €{c.maxPrize}</span>
              </Btn>
            </Tooltip>
          ))}
          {vipItems.map(id => {
            const item = ITEM_DEFS[id];
            if (!item) return null;
            return (
              <Tooltip key={id} text={`${item.desc} · Rarità: ${item.rarity}`}>
                <Btn onClick={() => onBuyItem(id)} disabled={player.money < item.cost}
                  style={{fontSize:"11px", borderColor:C.gold+"88", boxShadow:`0 0 6px ${C.gold}22`}}>
                  {item.emoji} {item.name}<br/>
                  <span style={{fontSize:"9px", color:C.gold}}>€{item.cost}</span>
                </Btn>
              </Tooltip>
            );
          })}
        </Section>
      )}

      {/* ── Slot Machine ── */}
      <div style={{
        borderTop:`1px solid #2a2a3a`, paddingTop:"12px", marginBottom:"14px",
      }}>
        <div style={{
          color:C.dim, fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase",
          paddingBottom:"4px", marginBottom:"10px", borderBottom:`1px solid #2a2a3a`,
        }}>🎰 Slot Machine — €1 per giocata</div>

        {/* Reels */}
        <div style={{display:"flex", gap:"8px", justifyContent:"center", marginBottom:"10px"}}>
          {slotReels.map((sym, i) => (
            <div key={i} style={{
              width:"56px", height:"56px", background:"#0a0a18",
              border:`2px solid ${slotSpinning ? C.gold+"88" : "#3a3a5a"}`,
              borderRadius:"0", display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:"30px",
              boxShadow: slotSpinning ? `0 0 10px ${C.gold}44` : "none",
              transition:"border-color 0.15s",
            }}>
              {sym}
            </div>
          ))}
        </div>

        {/* Result text */}
        {slotResult && (
          <div style={{
            textAlign:"center", marginBottom:"8px",
            color: slotResult.type === "superjackpot" ? C.gold
                 : slotResult.type === "jackpot" ? C.gold
                 : slotResult.type === "small" ? C.green
                 : C.dim,
            fontSize: slotResult.type === "lose" ? "11px" : "13px",
            fontWeight: slotResult.type !== "lose" ? "bold" : "normal",
            letterSpacing: slotResult.type !== "lose" ? "1px" : "0",
            textShadow: slotResult.type === "superjackpot" ? `0 0 14px ${C.gold}` : "none",
          }}>
            {slotResult.text}
          </div>
        )}

        {/* Lever button */}
        <div style={{textAlign:"center"}}>
          <Btn
            onClick={spinSlot}
            disabled={slotSpinning || player.money < 1}
            variant={player.money >= 1 && !slotSpinning ? "gold" : "normal"}
            style={{fontSize:"12px", minWidth:"160px"}}>
            {slotSpinning ? "⠿ Girando..." : "🎰 Tira la leva! — €1"}
          </Btn>
        </div>

        {player.money < 1 && (
          <div style={{textAlign:"center", color:C.red, fontSize:"10px", marginTop:"6px"}}>
            Sei in bolletta. La slot ti guarda storto.
          </div>
        )}
      </div>

      {/* ── Prestito del Broker ── */}
      {!player.brokerLoan && player.money < 30 && (
        <Section label="🤝 Il Broker sussurra...">
          <div style={{color:C.dim, fontSize:"11px", marginBottom:"6px", fontStyle:"italic"}}>
            "Vedo che sei al verde, amico. Ti presto €50... ma al boss mi ridai €80. Affare?"
          </div>
          <Btn variant="gold" onClick={() => {
            onBuyItem("__brokerLoan__");
          }}>
            💰 Accetta prestito (€50 ora → €80 al boss)
          </Btn>
        </Section>
      )}
      {player.brokerLoan && (
        <div style={{color:C.red, fontSize:"10px", padding:"4px 8px", border:`1px solid ${C.red}33`, marginBottom:"8px"}}>
          ⚠ DEBITO: €{player.brokerLoan} da restituire al prossimo boss
        </div>
      )}

      {/* ── Azioni ── */}
      <div style={{display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap", borderTop:`1px solid #2a2a3a`, paddingTop:"10px"}}>
        {player.scratchCards.length > 0 && (
          <Btn onClick={onScratch} variant="gold">🎫 Gratta un biglietto</Btn>
        )}
        <Btn onClick={onLeave}>Esci dal Tabaccaio →</Btn>
      </div>
    </div>
  );
}
