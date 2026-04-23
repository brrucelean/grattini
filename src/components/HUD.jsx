import { useState } from "react";
import { C, FONT } from "../data/theme.js";
import { NAIL_INFO, NAIL_ORDER } from "../data/nails.js";
import { ITEM_DEFS, RELIC_DEFS } from "../data/items.js";
import { AudioEngine } from "../audio.js";
import { S } from "../utils/styles.js";
import { Tooltip } from "./Tooltip.jsx";
import { NewsTicker } from "./NewsTicker.jsx";

export function HUD({ player, onOpenInventory, inventoryOpen = false, moneyBling = 0, currentBiome = 0 }) {
  const aliveNails = player.nails.filter(n => n.state !== "morta").length;
  const [vol, setVol] = useState(AudioEngine.getVolume());
  const handleVol = (e) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    AudioEngine.setVolume(v);
  };
  const muted = vol === 0;
  // Divider Vintage fra gruppi del HUD
  const Sep = () => (
    <span style={{color:C.dim+"66", fontSize:"10px", userSelect:"none", margin:"0 2px"}}>│</span>
  );
  return (
    <div style={{...S.panel, display:"flex", justifyContent:"space-between", alignItems:"center",
      flexWrap:"wrap", gap:"8px", padding:"8px 14px", background:"#0d0d18", borderColor:C.dim,
      maxWidth:"100%", width:"calc(100% - 16px)", margin:"4px 8px",
      position:"relative",
      boxShadow:`0 0 10px ${C.gold}12, inset 0 0 16px #00000088`,
    }}>
      {/* ── Corner brackets Vintage (discreti) ── */}
      {["tl","tr","bl","br"].map(pos => {
        const [v,h] = pos.split("");
        return (
          <span key={pos} style={{
            position:"absolute",
            [v==="t"?"top":"bottom"]:"-2px",
            [h==="l"?"left":"right"]:"-2px",
            width:"10px", height:"10px",
            borderTop: v==="t" ? `1px solid ${C.gold}88` : "none",
            borderBottom: v==="b" ? `1px solid ${C.gold}88` : "none",
            borderLeft: h==="l" ? `1px solid ${C.gold}88` : "none",
            borderRight: h==="r" ? `1px solid ${C.gold}88` : "none",
            boxShadow:`0 0 4px ${C.gold}66`,
            pointerEvents:"none",
          }}/>
        );
      })}
      {/* ── SINISTRA: soldi + grattini ── */}
      <div style={{display:"flex", alignItems:"center", gap:"8px", flexShrink:0}}>
        <Tooltip text={`🤑 i tuoi SUDATISSIMI soldi!! spendili bene o piangi`}>
          <span key={moneyBling} style={{
            display:"inline-flex", alignItems:"center", gap:"4px",
            background:`linear-gradient(180deg, ${C.gold}22, ${C.gold}08)`,
            border:`1px solid ${C.gold}aa`,
            color:C.gold, fontWeight:"bold",
            padding:"2px 8px",
            letterSpacing:"1px",
            boxShadow:`0 0 8px ${C.gold}55, inset 0 0 6px ${C.gold}14`,
            textShadow:`0 0 6px ${C.gold}88`,
            cursor:"default",
            animation: moneyBling > 0 ? "moneyBling 0.6s ease-out" : "none",
          }}>💰 €{player.money}</span>
        </Tooltip>
        <Tooltip text={`🎫 grattini tuoi — comprati al tabaccaio`}>
          <span style={{
            display:"inline-flex", alignItems:"center", gap:"3px",
            color:C.cyan, cursor:"default",
            border:`1px solid ${C.cyan}66`,
            padding:"2px 7px",
            boxShadow:`inset 0 0 6px ${C.cyan}10`,
          }}>🎫 <b>{player.scratchCards.filter(c => c.owned).length}</b></span>
        </Tooltip>
      </div>
      {player.items.includes("cappelloSbirro") && (
        <Tooltip text={
          player.cappelloSbirroWorn
            ? "🎩 INDOSSATO — poliziotto ti saluta, spacciatore SCAPPA! Clicca per toglierlo."
            : "🎩 In borsa — non ti protegge! Clicca per indossarlo."
        }>
          <span
            onClick={onOpenInventory}
            style={{
              color: player.cappelloSbirroWorn ? C.gold : C.dim,
              fontSize: player.cappelloSbirroWorn ? "16px" : "12px",
              cursor: "pointer",
              textShadow: player.cappelloSbirroWorn ? `0 0 10px ${C.gold}` : "none",
              border: `1px solid ${player.cappelloSbirroWorn ? C.gold+"88" : C.dim+"44"}`,
              borderRadius: "3px",
              padding: "1px 5px",
              background: player.cappelloSbirroWorn ? "#1a1200" : "transparent",
              animation: player.cappelloSbirroWorn ? "glow 2s infinite" : "none",
            }}>
            🎩{player.cappelloSbirroWorn ? "▲" : "▼"}
          </span>
        </Tooltip>
      )}
      {player.clipViraleActive && (
        <Tooltip text="🎬 CLIP VIRALE ATTIVA! La prossima vincita sarà RIPRESA e x2!">
          <span style={{
            color:C.gold, fontSize:"12px", cursor:"default",
            animation:"pulse 1s infinite",
            border:`1px solid ${C.gold}88`, borderRadius:"3px",
            padding:"1px 5px", background:"#1a1200",
          }}>
            🎬x2
          </span>
        </Tooltip>
      )}
      {player.equippedGrattatore && (
        <Tooltip text={`${player.equippedGrattatore.name} equipaggiato — ancora ${player.equippedGrattatore.usesLeft} usi rimasti!`}>
          <span style={{color:C.cyan, fontSize:"11px", cursor:"default"}}>
            {player.equippedGrattatore.emoji}({player.equippedGrattatore.usesLeft})
          </span>
        </Tooltip>
      )}
      {player.fortune > 0 && (
        <Tooltip text={`🍀 FORTUNA +${player.fortune} — aumenta le probabilità di vincita (${player.fortuneTurns} turni rimasti)`}>
          <span style={{color:C.green, cursor:"default", }}>🍀+{player.fortune} <span style={{fontSize:"8px",opacity:0.7}}>({player.fortuneTurns}t)</span></span>
        </Tooltip>
      )}
      {player.tumore && (
        <Tooltip text={`💀 TUMORE AI POLMONI — -5 Fortuna permanente. Troppo fumo.`}>
          <span style={{color:C.red, cursor:"default", animation:"pulse 1s infinite"}}>💀−5F</span>
        </Tooltip>
      )}
      {player.skills?.includes("ambidestri") && (
        <Tooltip text={`🙌 DOPPIA MANO — seconda mano con 5 dita arancioni (meno allenate)`}>
          <span style={{color:C.magenta, cursor:"default", }}>🙌</span>
        </Tooltip>
      )}
      {player.grattaMania && (
        <Tooltip text={`⚡ GRATTAMANIA ATTIVA — Premi x2 su tutto! MA ogni cella grattata danneggia 1 unghia random!`}>
          <span style={{color:C.red, animation:"pulse 0.5s infinite", cursor:"default"}}>⚡GRATTAMANIA ☠</span>
        </Tooltip>
      )}
      {player.relics?.length > 0 && player.relics.map((r, i) => (
        <Tooltip key={i} text={`${r.emoji} ${r.name}\n${r.desc}\n(Reliquia permanente)`}>
          <span style={{cursor:"default", fontSize:"12px"}}>{r.emoji}</span>
        </Tooltip>
      ))}
      {/* ── CENTRO: news ticker ── */}
      <NewsTicker currentBiome={currentBiome} />
      {/* ── DESTRA: vite + volume ── */}
      <div style={{display:"flex", alignItems:"center", gap:"10px", flexShrink:0}}>
        <Tooltip text={`💀 unghie ancora vive su 5 — se arrivano a 0 sei MORTO poverino`}>
          <span style={{
            display:"inline-flex", alignItems:"center", gap:"5px",
            border:`1px solid ${aliveNails <= 1 ? C.red : aliveNails <= 2 ? C.orange : C.green}88`,
            padding:"2px 7px", cursor:"default",
            background: aliveNails <= 1 ? "#1a0005" : "transparent",
            boxShadow: aliveNails <= 1 ? `0 0 6px ${C.red}66, inset 0 0 4px ${C.red}22` : "none",
            animation: aliveNails <= 1 ? "pulse 1s infinite" : "none",
          }}>
            <span style={{color:C.dim, fontSize:"9px", letterSpacing:"1px"}}>VITE</span>
            {/* Pip bar */}
            <span style={{display:"inline-flex", gap:"2px"}}>
              {[0,1,2,3,4].map(i => {
                const filled = i < aliveNails;
                const col = aliveNails <= 1 ? C.red : aliveNails <= 2 ? C.orange : C.green;
                return (
                  <span key={i} style={{
                    display:"inline-block", width:"6px", height:"9px",
                    background: filled ? col : "#111",
                    border: `1px solid ${filled ? col+"cc" : "#2a2a2a"}`,
                    boxShadow: filled ? `0 0 3px ${col}88` : "none",
                  }}/>
                );
              })}
            </span>
            <span style={{color: aliveNails <= 1 ? C.red : aliveNails <= 2 ? C.orange : C.green, fontSize:"10px", fontWeight:"bold"}}>
              {aliveNails}/5
            </span>
          </span>
        </Tooltip>
        <Tooltip text={`🔊 volume musicale — alzalo e GODITI l'8-bit bro`}>
          <span style={{display:"flex", alignItems:"center", gap:"4px"}}>
            <span
              style={{cursor:"pointer", fontSize:"14px", userSelect:"none"}}
              onClick={() => { const v = muted ? 0.7 : 0; setVol(v); AudioEngine.setVolume(v); }}
            >{muted ? "🔇" : vol < 0.4 ? "🔈" : "🔊"}</span>
            <input
              type="range" min="0" max="1" step="0.05" value={vol}
              onChange={handleVol}
              style={{
                width:"60px", height:"4px", cursor:"pointer", accentColor: C.gold,
                background:"transparent",
              }}
            />
          </span>
        </Tooltip>
        {onOpenInventory && (
          <Tooltip text={inventoryOpen ? "" : "cosa hai nello zaino? forse niente, forse oro"}>
            <span
              style={{
                cursor:"pointer", userSelect:"none",
                opacity: inventoryOpen ? 1 : 0.7,
                display:"inline-flex", alignItems:"center", gap:"4px",
              }}
              onClick={onOpenInventory}
            >
              <span style={{fontSize:"14px"}}>🎒</span>
              {(() => {
                const tot = (player?.items?.length||0) + (player?.grattatori?.length||0);
                return <span style={{color: tot > 0 ? C.red : C.dim, fontWeight:"bold", fontSize:"11px"}}>{tot}</span>;
              })()}
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
