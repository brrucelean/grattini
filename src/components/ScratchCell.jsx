import { useState, useRef, useEffect } from "react";
import { C, FONT } from "../data/theme.js";
import { SYMBOLS } from "../data/cards.js";
import { NAIL_INFO } from "../data/nails.js";
import { makeNailCursor } from "../utils/nail.js";
import { AudioEngine, ParticleSystem } from "../audio.js";

// ─── SCRATCH CELL (canvas silver-layer drag-to-reveal) ──────
export function ScratchCell({ cell, idx, onScratch, finished, isWinSymbol, isPartialMatch, ambidestri=false, bloodMode=false, themeColor=null }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const revealed = useRef(cell.scratched);

  // Init silver layer on mount
  useEffect(() => {
    if (cell.scratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // Silver gradient
    const grad = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    grad.addColorStop(0, "#909090"); grad.addColorStop(0.5,"#c0c0c0"); grad.addColorStop(1,"#808080");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Shimmer dots
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let i=0; i<40; i++) ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 1.5, 1.5);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    for (let i=0; i<20; i++) ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 2, 2);
  }, []);

  const doScratch = (e) => {
    if (finished || revealed.current || cell.scratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX == null) return;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 32, 0, Math.PI*2);
    if (ambidestri) { ctx.arc(x + 36, y - 10, 28, 0, Math.PI*2); }
    ctx.fill();
    AudioEngine.scratch();
    ParticleSystem.spawn(clientX, clientY, 9, bloodMode);
    // Check how much is scratched
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for (let i=3; i<data.length; i+=4) if (data[i]<100) transparent++;
    const pct = transparent / (canvas.width * canvas.height);
    if (pct > 0.35 && !revealed.current) {
      revealed.current = true;
      onScratch(idx);
    }
  };

  const isTrap = cell.isTrap;
  const isJolly = cell.isJolly;
  const isItem = cell.isItem;
  const isStop = cell.isStop;
  const isCard = cell.isRed !== undefined; // carta da gioco (sette e mezzo)
  // CGA: colori piatti puri, niente mezzi toni
  const borderColor = isTrap ? C.red : isJolly ? C.gold : isItem ? C.cyan : isStop ? C.red :
    isCard ? (isWinSymbol ? C.green : C.text) :
    isWinSymbol ? C.green : isPartialMatch ? C.gold : C.dim;
  const bg = isTrap ? "#550000" : isJolly ? "#555500" : isItem ? "#005555" : isStop ? "#550000" :
    isCard ? "#FFFFFF" :
    isWinSymbol ? "#005500" : isPartialMatch ? "#555500" : "#000033";
  const color = isTrap ? C.red : isJolly ? C.gold : isItem ? C.cyan : isStop ? C.red :
    isCard ? (cell.isRed ? "#FF0000" : "#000000") :
    isWinSymbol ? C.green : isPartialMatch ? C.gold : C.text;
  // CGA: cella non grattata = nero con bordo dim (aspetto "moneta da grattare")
  const unrevealedBorder = themeColor || C.dim;
  const symFontSize = isCard ? "20px" : (cell.value !== undefined || isStop) ? "16px" : "24px";

  return (
    <div style={{
      width:"100%", aspectRatio:"1.3", position:"relative",
      border:`2px solid ${cell.scratched ? borderColor : unrevealedBorder}`,
      borderRadius:"0", overflow:"hidden",
      background: cell.scratched ? bg : "#111",
      transition: "none",
    }}>
      {/* Symbol — visible only after reveal */}
      {cell.scratched && (
        <div style={{
          position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:symFontSize, fontWeight:"bold", color,
          textShadow: isWinSymbol ? `0 0 8px ${C.green}` : isJolly ? `0 0 8px #ffd700` : isItem ? `0 0 8px #00cccc` : "none",
        }}>
          {cell.symbol}
        </div>
      )}
      {/* ASCII texture underneath canvas */}
      {!cell.scratched && (
        <div style={{
          position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"10px", color:"#444", fontFamily:FONT, lineHeight:"1",
          overflow:"hidden", pointerEvents:"none", opacity:0.4,
        }}>
          ░▒▓█▓▒░<br/>▒▓█▓▒░▒<br/>▓█▓▒░▒▓
        </div>
      )}
      {/* Silver canvas overlay */}
      {!cell.scratched && (
        <canvas ref={canvasRef} width={90} height={70}
          style={{
            position:"absolute", inset:0, width:"100%", height:"100%",
            cursor: finished ? "default" : "inherit",
            touchAction:"none",
          }}
          onMouseDown={(e)=>{ drawing.current=true; doScratch(e); }}
          onMouseUp={()=>{ drawing.current=false; }}
          onMouseLeave={()=>{ drawing.current=false; }}
          onMouseMove={(e)=>{ if(drawing.current) doScratch(e); }}
          onTouchStart={(e)=>{ e.preventDefault(); drawing.current=true; doScratch(e); }}
          onTouchMove={(e)=>{ e.preventDefault(); doScratch(e); }}
          onTouchEnd={()=>{ drawing.current=false; }}
        />
      )}
    </div>
  );
}
