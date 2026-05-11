import { C } from "../data/theme.js";
import { ITEM_DEFS } from "../data/items.js";
import { Tooltip } from "./Tooltip.jsx";

// Corner brackets vintage — riusato per ogni tile
const cornerBrackets = (color) => (
  <>
    {["tl","tr","bl","br"].map(pos => {
      const [v, h] = pos.split("");
      return (
        <span key={pos} style={{
          position:"absolute",
          [v === "t" ? "top" : "bottom"]: "1px",
          [h === "l" ? "left" : "right"]: "1px",
          width:"5px", height:"5px",
          borderTop:    v === "t" ? `1px solid ${color}` : "none",
          borderBottom: v === "b" ? `1px solid ${color}` : "none",
          borderLeft:   h === "l" ? `1px solid ${color}` : "none",
          borderRight:  h === "r" ? `1px solid ${color}` : "none",
          pointerEvents:"none",
          opacity:0.85,
        }}/>
      );
    })}
  </>
);

// Header sezione con badge solid + foil shimmer
function SectionHeader({ color, label, count, max }) {
  return (
    <div style={{textAlign:"center", marginBottom:"5px", position:"relative", overflow:"hidden"}}>
      <div style={{
        display:"inline-block", position:"relative",
        background: color, color:"#000",
        fontSize:"7px", fontWeight:"bold",
        letterSpacing:"1.5px",
        padding:"2px 8px",
        boxShadow:`0 0 6px ${color}99`,
      }}>
        ★ {label} ★
        {/* Foil shimmer diagonale */}
        <span style={{
          position:"absolute", inset:0, pointerEvents:"none",
          background:`linear-gradient(110deg, transparent 35%, #ffffff44 50%, transparent 65%)`,
          backgroundSize:"200% 100%",
          animation:"variantShimmer 2.6s linear infinite",
          mixBlendMode:"overlay",
        }}/>
      </div>
      {typeof count === "number" && (
        <div style={{color: color+"aa", fontSize:"7px", marginTop:"2px", letterSpacing:"1px"}}>
          {count}{typeof max === "number" ? `/${max}` : ""}
        </div>
      )}
    </div>
  );
}

// Pip visuali per gli usi (max 5, poi numero)
function UsesPips({ count, color }) {
  if (count > 5) return <span style={{color, fontSize:"8px", fontWeight:"bold"}}>×{count}</span>;
  return (
    <span style={{display:"inline-flex", gap:"1px"}}>
      {Array(count).fill(0).map((_,i) => (
        <span key={i} style={{
          display:"inline-block", width:"4px", height:"4px",
          background: color, boxShadow:`0 0 3px ${color}cc`,
        }}/>
      ))}
    </span>
  );
}

export function InventorySidebar({ items, grattatori, equippedGrattatore, onUseItem, onEquipGrattatore }) {
  const hasAnything = items.length > 0 || grattatori.length > 0;

  return (
    <div style={{height:"100%", overflowY:"auto", padding:"6px 4px", display:"flex", flexDirection:"column", gap:"3px"}}>
      {/* ── Heading principale ZAINO con corner brackets + foil ── */}
      <div style={{position:"relative", marginBottom:"6px", paddingBottom:"6px", borderBottom:`1px solid ${C.magenta}33`}}>
        <div style={{textAlign:"center", position:"relative"}}>
          <div style={{
            display:"inline-block", position:"relative",
            background: C.magenta, color:"#000",
            fontSize:"8px", fontWeight:"bold",
            letterSpacing:"2px",
            padding:"3px 12px",
            boxShadow:`0 0 8px ${C.magenta}aa, 0 0 16px ${C.magenta}55`,
          }}>
            ★ 🎒 ZAINO ★
            <span style={{
              position:"absolute", inset:0, pointerEvents:"none",
              background:`linear-gradient(110deg, transparent 30%, #ffffff66 50%, transparent 70%)`,
              backgroundSize:"200% 100%",
              animation:"variantShimmer 2.2s linear infinite",
              mixBlendMode:"overlay",
            }}/>
          </div>
        </div>
      </div>

      {/* ── Stato vuoto: ASCII art borsa vuota ── */}
      {!hasAnything && (
        <div style={{
          color:C.dim, fontSize:"9px", textAlign:"center",
          marginTop:"18px", lineHeight:"1.6",
          position:"relative",
          border:`1px dashed ${C.dim}55`,
          padding:"14px 8px",
          fontStyle:"italic",
          background:"#08080d",
        }}>
          {cornerBrackets(C.dim+"99")}
          <div style={{fontSize:"22px", marginBottom:"6px", opacity:0.4, filter:"grayscale(1)"}}>🎒</div>
          <div style={{opacity:0.6}}>❝ zaino<br/>vuoto ❞</div>
          <div style={{fontSize:"7px", marginTop:"6px", letterSpacing:"1px", opacity:0.4}}>
            ★ niente da usare ★
          </div>
        </div>
      )}

      {/* ── GRATTATORI ── */}
      {grattatori.length > 0 && (
        <>
          <SectionHeader color={C.cyan} label="🔧 GRATTATORI" count={grattatori.length} />
          {grattatori.map((g, idx) => {
            const isEquipped = equippedGrattatore?.inventoryIdx === idx;
            const lowUses = g.usesLeft <= 1;
            return (
              <Tooltip key={idx} text={isEquipped
                ? `${g.name} — equipaggiato (${g.usesLeft} usi)`
                : `${g.name} — clicca per equipaggiare (${g.usesLeft} usi)`}>
                <div
                  onClick={() => onEquipGrattatore(idx)}
                  style={{
                    position:"relative",
                    border:`1px solid ${isEquipped ? C.cyan : C.cyan+"44"}`,
                    background: isEquipped
                      ? `linear-gradient(135deg, ${C.cyan}22, ${C.cyan}08)`
                      : "#080810",
                    boxShadow: isEquipped
                      ? `0 0 10px ${C.cyan}66, inset 0 0 8px ${C.cyan}14`
                      : "none",
                    padding:"5px 7px", cursor:"pointer",
                    display:"flex", alignItems:"center", gap:"5px",
                    transition:"transform 0.15s, box-shadow 0.15s, border-color 0.15s",
                    animation: isEquipped ? "slotGlow 2.4s ease-in-out infinite" : "none",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = `0 0 12px ${C.cyan}88, inset 0 0 8px ${C.cyan}22`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = isEquipped
                      ? `0 0 10px ${C.cyan}66, inset 0 0 8px ${C.cyan}14`
                      : "none";
                  }}>
                  {cornerBrackets((isEquipped ? C.cyan : C.cyan+"88"))}
                  <span style={{
                    fontSize:"14px", lineHeight:1, flexShrink:0,
                    filter: isEquipped ? `drop-shadow(0 0 4px ${C.cyan})` : "none",
                  }}>{g.emoji}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{
                      color: isEquipped ? C.cyan : C.cyan+"aa",
                      fontSize:"8px", fontWeight: isEquipped ? "bold" : "normal",
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      letterSpacing:"0.3px",
                    }}>{g.name}</div>
                    <div style={{
                      color: lowUses ? C.orange : C.dim,
                      fontSize:"7px", display:"flex", alignItems:"center", gap:"3px", marginTop:"1px",
                    }}>
                      <UsesPips count={g.usesLeft} color={lowUses ? C.orange : C.cyan}/>
                      <span style={{opacity:0.7}}>{g.usesLeft > 5 ? "" : "usi"}</span>
                    </div>
                  </div>
                  {isEquipped && (
                    <span style={{
                      color: C.cyan, fontSize:"10px", fontWeight:"bold", flexShrink:0,
                      textShadow:`0 0 4px ${C.cyan}`,
                    }}>✓</span>
                  )}
                </div>
              </Tooltip>
            );
          })}
        </>
      )}

      {/* ── CONSUMABILI ── */}
      {items.length > 0 && (
        <>
          <div style={{marginTop: grattatori.length > 0 ? "8px" : 0}}/>
          <SectionHeader color={C.gold} label="💊 CONSUMABILI" count={items.length} max={5} />
          {items.map((itemId, idx) => {
            const item = ITEM_DEFS[itemId];
            if (!item) return null;
            return (
              <Tooltip key={idx} text={`${item.name} — ${item.desc || "clicca per usare"}`}>
                <div
                  onClick={() => onUseItem(idx)}
                  style={{
                    position:"relative",
                    border:`1px solid ${C.gold}55`,
                    background:"#080810",
                    padding:"5px 7px", cursor:"pointer",
                    display:"flex", alignItems:"center", gap:"5px",
                    transition:"transform 0.15s, box-shadow 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.borderColor = C.gold;
                    e.currentTarget.style.boxShadow = `0 0 10px ${C.gold}66, inset 0 0 8px ${C.gold}14`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = C.gold+"55";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                  {cornerBrackets(C.gold+"aa")}
                  <span style={{fontSize:"14px", lineHeight:1, flexShrink:0}}>{item.emoji}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{
                      color: C.gold+"cc", fontSize:"8px",
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      letterSpacing:"0.3px",
                    }}>{item.name}</div>
                  </div>
                  <span style={{
                    color: C.gold, fontSize:"9px", flexShrink:0, fontWeight:"bold",
                    textShadow:`0 0 4px ${C.gold}88`,
                  }}>▶</span>
                </div>
              </Tooltip>
            );
          })}
        </>
      )}

      {/* Footer slot count se ci sono items — capienza max visibile */}
      {hasAnything && items.length > 0 && (
        <div style={{
          marginTop:"6px", paddingTop:"4px",
          borderTop:`1px solid ${C.dim}33`,
          textAlign:"center", color:C.dim, fontSize:"7px", letterSpacing:"1px",
        }}>
          slot consumabili: {items.length}/5
        </div>
      )}
    </div>
  );
}
