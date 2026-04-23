import { C, FONT } from "../data/theme.js";
import { ITEM_DEFS, GRATTATORE_DEFS } from "../data/items.js";

export function InventorySidebar({ items, grattatori, equippedGrattatore, onUseItem, onEquipGrattatore }) {
  const hasAnything = items.length > 0 || grattatori.length > 0;
  return (
    <div style={{height:"100%", overflowY:"auto", padding:"6px 4px", display:"flex", flexDirection:"column", gap:"3px"}}>
      {/* Heading Vintage: solid badge */}
      <div style={{textAlign:"center", marginBottom:"6px", paddingBottom:"4px", borderBottom:`1px solid #1a1a2e`, flexShrink:0}}>
        <div style={{
          display:"inline-block",
          background: C.magenta, color:"#000",
          fontSize:"8px", fontWeight:"bold",
          letterSpacing:"2px",
          padding:"2px 8px",
          boxShadow:`0 0 6px ${C.magenta}99`,
        }}>
          ★ 🎒 ZAINO ★
        </div>
      </div>
      {!hasAnything && (
        <div style={{
          color:C.dim, fontSize:"9px", textAlign:"center", opacity:0.5,
          marginTop:"14px", lineHeight:"1.5",
          border:`1px dashed ${C.dim}44`,
          padding:"10px 6px",
          fontStyle:"italic",
        }}>
          ❝ zaino<br/>vuoto ❞
        </div>
      )}
      {grattatori.length > 0 && (
        <>
          <div style={{textAlign:"center", marginBottom:"4px"}}>
            <div style={{
              display:"inline-block",
              background: C.cyan, color:"#000",
              fontSize:"7px", fontWeight:"bold",
              letterSpacing:"1.5px",
              padding:"1px 6px",
              boxShadow:`0 0 4px ${C.cyan}88`,
            }}>
              ★ 🔧 GRATTATORI ★
            </div>
          </div>
          {grattatori.map((g, idx) => {
            const isEquipped = equippedGrattatore?.inventoryIdx === idx;
            return (
              <div key={idx} onClick={() => onEquipGrattatore(idx)}
                style={{
                  border:`1px solid ${isEquipped ? C.cyan : C.cyan+"44"}`,
                  background: isEquipped ? C.cyan+"12" : "#080810",
                  boxShadow: isEquipped ? `0 0 8px ${C.cyan}44, inset 0 0 6px ${C.cyan}08` : "none",
                  padding:"4px 6px", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:"4px",
                  transition:"border-color 0.15s, box-shadow 0.15s",
                }}>
                <span style={{fontSize:"13px", lineHeight:1}}>{g.emoji}</span>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{color: isEquipped ? C.cyan : C.cyan+"88", fontSize:"8px", fontWeight: isEquipped ? "bold" : "normal", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{g.name}</div>
                  <div style={{color:C.dim, fontSize:"8px"}}>{g.usesLeft} usi</div>
                </div>
                {isEquipped && <span style={{color:C.cyan, fontSize:"9px"}}>✓</span>}
              </div>
            );
          })}
        </>
      )}
      {items.length > 0 && (
        <>
          <div style={{textAlign:"center", marginTop: grattatori.length > 0 ? "8px" : 0, marginBottom:"4px"}}>
            <div style={{
              display:"inline-block",
              background: C.gold, color:"#000",
              fontSize:"7px", fontWeight:"bold",
              letterSpacing:"1.5px",
              padding:"1px 6px",
              boxShadow:`0 0 4px ${C.gold}88`,
            }}>
              ★ 💊 CONSUMABILI ★
            </div>
          </div>
          {items.map((itemId, idx) => {
            const item = ITEM_DEFS[itemId];
            if (!item) return null;
            return (
              <div key={idx} onClick={() => onUseItem(idx)}
                style={{
                  border:`1px solid ${C.gold+"55"}`,
                  background:"#080810",
                  padding:"4px 6px", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:"4px",
                  transition:"border-color 0.15s",
                }}>
                <span style={{fontSize:"13px", lineHeight:1}}>{item.emoji}</span>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{color:C.gold+"aa", fontSize:"8px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{item.name}</div>
                </div>
                <span style={{color:C.dim, fontSize:"8px", flexShrink:0}}>▶</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
