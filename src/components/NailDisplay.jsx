import { C, FONT } from "../data/theme.js";
import { NAIL_INFO, NAIL_ORDER } from "../data/nails.js";

export function NailDisplay({ nails, activeNail, compact=false, onSelectNail=null }) {
  if (compact) {
    const THRESHOLD = 3;
    return (
      <span style={{display:"inline-flex", gap:"3px", alignItems:"flex-end", verticalAlign:"middle"}}>
        {nails.map((n, i) => {
          const info = NAIL_INFO[n.state];
          const isDead = n.state === "morta";
          const isActive = i === activeNail;
          // Colore dietro la batteria: prossimo stato peggiore, ma nero se marcia (ultima prima di morta)
          const nextIdx = NAIL_ORDER.indexOf(n.state) - 1;
          const nextColor = (isDead || n.state === "marcia" || nextIdx < 0)
            ? "#000"
            : NAIL_INFO[NAIL_ORDER[nextIdx]].color + "cc";
          // Percentuale rimanente (1.0 = piena, 0.0 = sta per degradare)
          const fillPct = isDead ? 0 : (THRESHOLD - n.scratchCount) / THRESHOLD;
          const hasSmalto = n.smalto && n.smalto > 0;
          return (
            <span key={i} title={`${info.label}${!isDead ? ` (${n.scratchCount}/${THRESHOLD})` : ""}${hasSmalto ? ` 💅×${n.smalto}` : ""}`}
              style={{
                display:"inline-block",
                width: isActive ? "11px" : "9px",
                height: "22px",
                borderRadius: "2px",
                border: `1px solid ${isDead ? "#333" : hasSmalto ? C.magenta : isActive ? info.color : info.color + "88"}`,
                boxShadow: isActive ? `0 0 5px ${hasSmalto ? C.magenta : info.color}99` : hasSmalto ? `0 0 4px ${C.magenta}66` : "none",
                background: nextColor,
                overflow:"hidden",
                position:"relative",
                transition:"width 0.15s",
              }}>
              {/* Strato pieno — sale dal basso */}
              <span style={{
                position:"absolute",
                bottom:0, left:0, right:0,
                height: `${fillPct * 100}%`,
                background: isDead ? "transparent" : info.color,
                transition:"height 0.25s ease",
                display:"block",
              }} />
            </span>
          );
        })}
      </span>
    );
  }
  return (
    <div style={{display:"flex", gap:"8px", flexWrap:"wrap"}}>
      {nails.map((n,i) => {
        const info = NAIL_INFO[n.state];
        const col = info.color;
        const isActive = i === activeNail;
        const isDead = n.state === "morta";
        const canSwitch = onSelectNail && !isDead && !isActive;
        return (
          <div key={i}
            onClick={canSwitch ? () => onSelectNail(i) : undefined}
            style={{
              width: "65px", minHeight: "80px",
              border: `1px solid ${isActive ? col : isDead ? "#333" : col + "55"}`,
              background: isActive ? col + "18" : "#0f0f18",
              boxShadow: isActive ? `0 0 8px ${col}99, 0 0 2px ${col}` : "none",
              padding: "4px 8px", borderRadius: "3px", textAlign: "center",
              cursor: canSwitch ? "pointer" : "default",
              opacity: isDead ? 0.4 : 1,
              transition: "box-shadow 0.2s, border-color 0.2s",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
            }}>
            <div style={{fontSize:"18px"}}>{
              isDead ? "💀"
              : n.state==="piede" ? "🦶"
              : n.state==="kawaii" ? "💖"
              : n.state==="polliceVerde" ? "🌿"
              : n.state==="unghiaNera" ? "🖤"
              : "🖐"}</div>
            <div style={{color: isActive ? col : isDead ? "#555" : col + "aa", fontSize:"10px", fontWeight: isActive ? "bold" : "normal"}}>{info.label}</div>
            <div style={{color: isActive ? col + "cc" : C.dim, fontSize:"9px"}}>
              {!isDead ? `${n.scratchCount}/3` : "---"}
            </div>
            {n.smalto > 0 && <div style={{color: C.magenta, fontSize:"9px", }}>💅×{n.smalto}</div>}
            {isActive && <div style={{color: col, fontSize:"9px", }}>▲ ATTIVA</div>}
            {canSwitch && <div style={{color: col + "88", fontSize:"9px"}}>↑ usa</div>}
          </div>
        );
      })}
    </div>
  );
}
