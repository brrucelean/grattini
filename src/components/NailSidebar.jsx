import { useState } from "react";
import { C, FONT } from "../data/theme.js";
import { NAIL_INFO, NAIL_ORDER } from "../data/nails.js";
import { GRATTATORE_DEFS, MACELLAIO_IMPLANTS } from "../data/items.js";
import { makeNailCursor, NAIL_CURSOR } from "../utils/nail.js";
import { Tooltip } from "./Tooltip.jsx";

export function NailSidebar({ nails, activeNail, onSelectNail, locked=false, grattatori=[], equippedGrattatore=null, onEquipGrattatore=null }) {
  // Alive tiers in order worst→best (excluding morta)
  const TIER_ORDER = ["marcia","sanguinante","graffiata","sana","kawaii"];
  const TIER_COLORS = { marcia:C.red, sanguinante:C.orange, graffiata:C.gold, sana:C.green, kawaii:C.pink };
  return (
    <div style={{display:"flex", flexDirection:"column", gap:"5px", alignItems:"stretch"}}>
      <div style={{color: locked ? C.orange+"99" : C.dim, fontSize:"9px", textAlign:"center", letterSpacing:"1px", marginBottom:"2px", opacity:0.7}}>
        {locked ? "🔒 BLOCCATA" : "🖐 UNGHIE"}
      </div>
      {nails.map((n, i) => {
        const info = NAIL_INFO[n.state];
        const col = info.color;
        const isActive = i === activeNail;
        const isDead = n.state === "morta";
        const canSwitch = !isDead && !isActive && !locked;
        // HP pips: how many tiers still alive
        const tierIdx = TIER_ORDER.indexOf(n.state); // -1 if morta, 0-4 otherwise
        const aliveTiers = isDead ? 0 : tierIdx + 1; // 1-5 pips filled
        // Scratch damage bar within current tier (3 ticks)
        const dmgFilled = isDead ? 0 : n.scratchCount;
        return (
          <div key={i} onClick={canSwitch ? () => onSelectNail(i) : undefined}
            style={{
              position:"relative",
              border:`1px solid ${isActive ? col : isDead ? "#222" : col+"33"}`,
              background: isActive ? col+"12" : "#080810",
              boxShadow: isActive ? `0 0 10px ${col}55, inset 0 0 10px ${col}08` : "none",
              padding:"5px 8px", borderRadius:"0",
              cursor: canSwitch ? "pointer" : "default",
              opacity: isDead ? 0.35 : 1,
              display:"flex", alignItems:"center", gap:"6px",
              transition:"box-shadow 0.2s, border-color 0.2s",
            }}>
            {locked && !isActive && !isDead && (
              <div style={{
                position:"absolute", inset:0,
                background:"#000000bb",
                display:"flex", alignItems:"center", justifyContent:"center",
                pointerEvents:"none",
                fontSize:"13px",
              }}>🔒</div>
            )}
            {(() => {
              const tipLines = [
                `${info.label} — x${(NAIL_INFO[n.state]?.mult||0).toFixed(1)} premio`,
                `HP: ${aliveTiers}/5 tier · ${3 - dmgFilled}/3 grattate rimaste`,
              ];
              if (n.cremaHP > 0) tipLines.push(`🧴 Crema: ${n.cremaHP} colpi extra`);
              if (n.smalto > 0) tipLines.push(`💅 Smalto: ${n.smalto} colpi protetti`);
              if (n.implant) {
                const imp = MACELLAIO_IMPLANTS.find(im=>im.id===n.implant);
                if (imp) tipLines.push(`⚙ ${imp.name}: ${imp.desc}`);
              }
              const tipText = tipLines.join("\n");
              return (
                <Tooltip text={tipText} color={col}>
                  <span style={{display:"flex", alignItems:"center", gap:"6px", width:"100%"}}>
                    <span style={{fontSize:"15px", lineHeight:1, flexShrink:0}}>
                      {isDead ? "💀" : n.state==="piede"?"🦶":n.state==="kawaii"?"💖":"🖐"}
                    </span>
                    <span style={{flex:1, minWidth:0}}>
                      <span style={{display:"flex", alignItems:"center", gap:"4px"}}>
                        <span style={{color: isActive ? col : col+"88", fontSize:"9px", fontWeight: isActive ? "bold" : "normal", whiteSpace:"nowrap"}}>{info.label}</span>
                      </span>
                      {/* HP tier pips */}
                      <span style={{display:"flex", gap:"2px", marginTop:"3px", alignItems:"center"}}>
                        {TIER_ORDER.map((tier, ti) => {
                          const filled = ti < aliveTiers;
                          const pipCol = filled ? TIER_COLORS[tier] : "#222";
                          return (
                            <span key={ti} style={{
                              display:"inline-block", width:"9px", height:"5px",
                              background: filled ? pipCol : "#111",
                              border: `1px solid ${filled ? pipCol+"aa" : "#2a2a2a"}`,
                              boxShadow: filled && isActive ? `0 0 4px ${pipCol}88` : "none",
                              flexShrink:0,
                            }}/>
                          );
                        })}
                        {/* CremaHP white pips (extra buffer beyond kawaii) */}
                        {Array(n.cremaHP||0).fill(0).map((_,ci) => (
                          <span key={"c"+ci} style={{
                            display:"inline-block", width:"9px", height:"5px",
                            background:"#ffffff",
                            border:"1px solid #aaaaaa",
                            boxShadow: isActive ? "0 0 4px #ffffff88" : "none",
                            flexShrink:0,
                          }}/>
                        ))}
                      </span>
                      {/* Scratch damage ticks */}
                      {!isDead && (
                        <span style={{display:"flex", gap:"2px", marginTop:"2px", alignItems:"center"}}>
                          {[0,1,2].map(t => {
                            const remaining = 3 - dmgFilled;
                            const filled = t < remaining;
                            return (
                              <span key={t} style={{
                                display:"inline-block", width:"9px", height:"3px",
                                background: filled ? col+"cc" : "#111",
                                border: `1px solid ${filled ? col+"55" : "#222"}`,
                                flexShrink:0,
                              }}/>
                            );
                          })}
                          <span style={{color:C.dim, fontSize:"7px", marginLeft:"2px", opacity:0.6}}>{3 - dmgFilled}/3</span>
                        </span>
                      )}
                      {n.smalto > 0 && <span style={{display:"block", color:C.magenta, fontSize:"8px", marginTop:"1px"}}>💅×{n.smalto}</span>}
                    </span>
                  </span>
                </Tooltip>
              );
            })()}
          </div>
        );
      })}
      {/* ── GRATTATORE EQUIPAGGIATO — solo quello attivo ── */}
      {(() => {
        const g = equippedGrattatore;
        if (!g) return null;
        const uses = g.usesLeft || 0;
        return (
          <>
            <div style={{color:C.dim, fontSize:"9px", textAlign:"center", letterSpacing:"1px", marginTop:"4px", marginBottom:"2px", opacity:0.5, borderTop:`1px solid #1a1a2e`, paddingTop:"4px"}}>
              🔧 GRATTATORE
            </div>
            <Tooltip text={`${g.emoji} ${g.name}\n${g.desc}\n${uses > 10 ? uses : uses + "/" + (g.maxUses||uses)} usi rimasti`} color={C.cyan}>
            <div style={{
              border:`1px solid ${C.cyan}`,
              background: C.cyan+"18",
              padding:"5px 8px", cursor:"default",
              display:"flex", alignItems:"center", gap:"6px",
            }}>
              <span style={{fontSize:"15px", lineHeight:1, flexShrink:0}}>{g.emoji}</span>
              <span style={{flex:1, minWidth:0}}>
                <span style={{color:C.cyan, fontSize:"9px", fontWeight:"bold", display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{g.name}</span>
                <span style={{display:"flex", gap:"2px", marginTop:"3px", flexWrap:"wrap", alignItems:"center"}}>
                  {Array(Math.min(uses, 10)).fill(0).map((_,pi) => (
                    <span key={pi} style={{
                      display:"inline-block", width:"9px", height:"5px",
                      background:C.cyan, border:`1px solid ${C.cyan}aa`,
                      boxShadow:`0 0 4px ${C.cyan}88`, flexShrink:0,
                    }}/>
                  ))}
                  {uses > 10 && <span style={{color:C.cyan, fontSize:"7px", marginLeft:"2px"}}>{uses}</span>}
                </span>
              </span>
            </div>
            </Tooltip>
          </>
        );
      })()}
      <div style={{color: locked ? C.orange : C.dim, fontSize:"8px", textAlign:"center", marginTop:"4px", lineHeight:"1.4", opacity: locked ? 0.8 : 0.5}}>
        {locked ? <>🔒 finisci il<br/>grattino prima</> : <>clicca per<br/>cambiare</>}
      </div>
    </div>
  );
}
