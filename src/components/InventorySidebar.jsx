import { C, FONT } from "../data/theme.js";
import { ITEM_DEFS, GRATTATORE_DEFS } from "../data/items.js";

export function InventorySidebar({ items, grattatori, equippedGrattatore, onUseItem, onEquipGrattatore }) {
  const hasAnything = items.length > 0 || grattatori.length > 0;
  return (
    <div style={{height:"100%", overflowY:"auto", padding:"6px 4px", display:"flex", flexDirection:"column", gap:"3px"}}>
      <div style={{color:C.dim, fontSize:"9px", letterSpacing:"1px", marginBottom:"4px", textAlign:"center", opacity:0.7, borderBottom:`1px solid #1a1a2e`, paddingBottom:"4px", flexShrink:0}}>
        🎒 ZAINO
      </div>
      {!hasAnything && (
        <div style={{color:C.dim, fontSize:"9px", textAlign:"center", opacity:0.4, marginTop:"10px", lineHeight:"1.5"}}>
          zaino<br/>vuoto
        </div>
      )}
      {grattatori.length > 0 && (
        <>
          <div style={{color:C.cyan, fontSize:"8px", letterSpacing:"1px", opacity:0.7, marginBottom:"2px"}}>🔧 GRATTATORI</div>
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
          <div style={{color:C.gold, fontSize:"8px", letterSpacing:"1px", opacity:0.7, marginTop: grattatori.length > 0 ? "6px" : 0, marginBottom:"2px"}}>💊 CONSUMABILI</div>
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
