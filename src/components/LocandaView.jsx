import { C, FONT } from "../data/theme.js";
import { NPC_ART } from "../data/art.js";
import { S } from "../utils/styles.js";
import { Btn } from "./Btn.jsx";

export function LocandaView({ player, onRest, onLeave }) {
  const rooms = [
    { name: "Per Terra", cost: 0, heals: 0, risk: "pavimento", desc: "Dormi sul pavimento lurido. Recuperi metà stato unghie. 50% chance ladro ti sveglia!", isFloor: true },
    { name: "Bettola", cost: 5, heals: 1, risk: "ladri", desc: "Recuperi 1 unghia (anche morta). Rischio ladri!" },
    { name: "Camera Media", cost: 15, heals: 2, risk: null, desc: "Recuperi 2 unghie (anche morte). Conta raschiature azzerate." },
    { name: "Suite", cost: 80, heals: 5, risk: null, desc: "Recuperi TUTTE le unghie a Sana!", kawaii: false },
    { name: "Manicure Kawaii", cost: 150, heals: 5, risk: null, desc: "✨ Tutte le unghie diventano KAWAII (x2 premio)!", kawaii: true },
  ];
  return (
    <div style={{...S.panel, maxWidth:"450px", margin:"10px auto", textAlign:"center"}}>
      <pre style={{...S.pre, ...S.title, marginBottom:"6px"}}>{NPC_ART.locanda}</pre>
      <div style={{...S.h2}}>Locanda</div>
      <div style={{color:C.dim, marginBottom:"12px", fontSize:"12px"}}>
        "Riposati, viaggiatore. Le tue unghie ne hanno bisogno."
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:"8px"}}>
        {rooms.map((room, i) => (
          <div key={i} style={{
            border:`1px solid ${room.isFloor ? C.dim : (player.money >= room.cost ? C.gold : C.dim)}`,
            padding:"8px", borderRadius:"0", background: room.isFloor ? "#080808" : "#0f0f18",
          }}>
            <div style={{color: room.isFloor ? C.dim : C.gold, fontWeight:"bold"}}>{room.name}{room.cost > 0 ? ` — €${room.cost}` : " — GRATIS"}</div>
            <div style={{color:C.dim, fontSize:"11px", marginBottom:"6px"}}>{room.desc}</div>
            {room.risk && <div style={{color:C.red, fontSize:"10px", marginBottom:"4px"}}>⚠ Rischio: {room.risk === "pavimento" ? "50% ladro nel sonno!" : room.risk}</div>}
            {room.kawaii && <div style={{color:C.pink, fontSize:"10px", marginBottom:"4px"}}>+ Manicure KAWAII 💖 (inclusa)</div>}
            <Btn onClick={() => onRest(room)} disabled={!room.isFloor && player.money < room.cost}
              variant={room.isFloor ? "normal" : (player.money >= room.cost ? "gold" : "normal")}>
              {room.isFloor ? "Dormi per terra" : "Riposa qui"}
            </Btn>
          </div>
        ))}
      </div>
      <div style={{marginTop:"12px"}}>
        <Btn onClick={onLeave}>Vai via →</Btn>
      </div>
    </div>
  );
}
