import { useState, useEffect, useRef, useCallback } from "react";
import { C, FONT } from "../data/theme.js";
import { SYMBOLS } from "../data/cards.js";
import { S } from "../utils/styles.js";

// ─── DOPPIO O NULLA COMPONENT ──────────────────────────────────
export function DoppioONullaView({ prize, onDecline, onResult }) {
  const [revealed, setRevealed] = useState(false);
  const [won, setWon] = useState(null);
  const [scratching, setScratching] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);

  // Determine outcome on mount (50/50)
  const outcomeRef = useRef(Math.random() < 0.5);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;
    // Fill with silver scratch layer
    ctx.fillStyle = "#888";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Add "GRATTA QUI" text
    ctx.fillStyle = "#666";
    ctx.font = "bold 16px 'Courier New'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GRATTA QUI", canvas.width / 2, canvas.height / 2);
  }, []);

  const checkReveal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = ctxRef.current;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 128) transparent++;
    }
    const pct = transparent / (pixels.length / 4);
    setScratchProgress(Math.round(pct * 100));
    if (pct > 0.45) {
      setRevealed(true);
      const w = outcomeRef.current;
      setWon(w);
      // Clear remaining scratch layer
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setTimeout(() => onResult(w), 1200);
    }
  }, [revealed, onResult]);

  const handlePointerDown = (e) => {
    if (revealed) return;
    isDrawing.current = true;
    setScratching(true);
    scratch(e);
  };
  const handlePointerMove = (e) => {
    if (!isDrawing.current || revealed) return;
    scratch(e);
  };
  const handlePointerUp = () => {
    isDrawing.current = false;
    setScratching(false);
    checkReveal();
  };

  const scratch = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
    const ctx = ctxRef.current;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x * (canvas.width / rect.width), y * (canvas.height / rect.height), 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  };

  const resultSymbol = outcomeRef.current ? "💰" : "💀";
  const resultText = outcomeRef.current ? `€${prize * 2}` : "€0";
  const resultColor = outcomeRef.current ? C.gold : C.red;

  return (
    <div style={{...S.panel, textAlign: "center", maxWidth: "450px", margin: "10px auto"}}>
      <div style={{...S.h2, fontSize: "18px", marginBottom: "4px",
        textShadow:"none",
        animation: "pulse 1.5s ease-in-out infinite"
      }}>
        🎰 DOPPIO O NULLA 🎰
      </div>
      <div style={{color: C.dim, fontSize: "10px", marginBottom: "6px", letterSpacing: "1px"}}>
        ✦ EVENTO CASUALE ✦
      </div>
      <div style={{color: C.bright, marginBottom: "12px", fontSize: "14px"}}>
        Hai vinto <span style={{color: C.gold, fontWeight: "bold"}}>€{prize}</span> —
        rischi per <span style={{color: C.gold, fontWeight: "bold"}}>€{prize * 2}</span>?
      </div>

      <div style={{
        position: "relative",
        width: "160px", height: "120px",
        margin: "0 auto 16px auto",
        border: `2px solid ${C.gold}`,
        borderRadius: "0",
        overflow: "hidden",
        boxShadow:`0 0 22px ${C.gold}66, inset 0 0 18px ${C.gold}14`,
        background: C.card,
      }}>
        {/* Result underneath — hidden until revealed to prevent spoiler */}
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontSize: "36px", zIndex: 1,
          opacity: revealed ? 1 : 0,
        }}>
          <div>{resultSymbol}</div>
          <div style={{
            fontSize: "16px", fontWeight: "bold", color: resultColor, fontFamily: FONT,
          }}>{resultText}</div>
        </div>
        {/* Placeholder text when not yet revealed */}
        {!revealed && (
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", color: "#444", fontFamily: FONT, zIndex: 0,
            pointerEvents: "none",
          }}>
            GRATTA QUI
          </div>
        )}
        {/* Scratch layer on top */}
        <canvas
          ref={canvasRef}
          width={160} height={120}
          style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            zIndex: 2, cursor: revealed ? "default" : "crosshair",
            touchAction: "none",
          }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {revealed && (
        <div style={{
          fontSize: "20px", fontWeight: "bold",
          color: won ? C.gold : C.red,
          textShadow:"none",
          marginBottom: "8px",
          animation: "pulse 0.5s ease-in-out",
        }}>
          {won ? "🎉 RADDOPPIATO!" : "💀 PERSO TUTTO!"}
        </div>
      )}

      {!scratching && !revealed && (
        <div style={{display: "flex", gap: "10px", justifyContent: "center"}}>
          <button
            style={{...S.btn, color: C.green, borderColor: C.green}}
            onClick={onDecline}
          >
            ✋ Intasca €{prize}
          </button>
          <div style={{color: C.dim, fontSize: "11px", alignSelf: "center"}}>
            oppure gratta la cella!
          </div>
        </div>
      )}

      {scratchProgress > 0 && !revealed && (
        <div style={{color: C.dim, fontSize: "10px", marginTop: "6px"}}>
          {scratchProgress}% grattato...
        </div>
      )}
    </div>
  );
}
