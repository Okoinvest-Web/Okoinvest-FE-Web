"use client";

// Zeichenfeld für die Unterschrift (Canvas → PNG mit transparentem Hintergrund). Maus, Stift und Finger über
// Pointer Events; Linienstärke abhängig von der Geschwindigkeit. Tastatur-Alternative: getippter Name (SignaturUnterschreiben).

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Eraser } from "lucide-react";

const HOEHE = 180;

const SignaturPad = forwardRef(function SignaturPad({ onAenderung, beschriftung = "Unterschriftsfeld" }, ref) {
  const canvasRef = useRef(null);
  const zeichnet = useRef(false);
  const letzter = useRef(null);
  const [leer, setLeer] = useState(true);
  const meldenRef = useRef(onAenderung);
  meldenRef.current = onAenderung; // stabile Funktion – Neuaufbau des Canvas nur bei Größenänderung

  const vorbereiten = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const breite = c.parentElement.clientWidth;
    c.width = Math.round(breite * dpr);
    c.height = Math.round(HOEHE * dpr);
    c.style.width = `${breite}px`;
    c.style.height = `${HOEHE}px`;
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#041d42";
    setLeer(true);
    meldenRef.current?.(true);
  }, []);

  useEffect(() => {
    vorbereiten();
    let breite = canvasRef.current?.parentElement?.clientWidth || 0;
    // Mobil ändert das Ein-/Ausblenden der Adressleiste die Höhe – nur bei neuer Breite neu aufbauen
    const beiGroesse = () => {
      const neu = canvasRef.current?.parentElement?.clientWidth || 0;
      if (neu !== breite) {
        breite = neu;
        vorbereiten();
      }
    };
    window.addEventListener("resize", beiGroesse);
    return () => window.removeEventListener("resize", beiGroesse);
  }, [vorbereiten]);

  useImperativeHandle(ref, () => ({
    leeren: vorbereiten,
    istLeer: () => leer,
    /** PNG auf die gezeichnete Fläche zugeschnitten (kleinere Datei, sauber auf der Prüfseite) */
    alsPng() {
      const c = canvasRef.current;
      const ctx = c.getContext("2d");
      const { width: w, height: h } = c;
      const d = ctx.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          if (d[(y * w + x) * 4 + 3] > 10) {
            if (x < x0) x0 = x;
            if (y < y0) y0 = y;
            if (x > x1) x1 = x;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 <= x0 || y1 <= y0) return "";
      const rand = 12;
      x0 = Math.max(0, x0 - rand);
      y0 = Math.max(0, y0 - rand);
      x1 = Math.min(w, x1 + rand);
      y1 = Math.min(h, y1 + rand);
      const skal = Math.min(1, 900 / (x1 - x0));
      const z = document.createElement("canvas");
      z.width = Math.round((x1 - x0) * skal);
      z.height = Math.round((y1 - y0) * skal);
      z.getContext("2d").drawImage(c, x0, y0, x1 - x0, y1 - y0, 0, 0, z.width, z.height);
      return z.toDataURL("image/png");
    },
  }));

  const punkt = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now(), druck: e.pressure || 0.5 };
  };

  const start = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    zeichnet.current = true;
    letzter.current = punkt(e);
  };
  const bewegen = (e) => {
    if (!zeichnet.current) return;
    e.preventDefault();
    const p = punkt(e);
    const a = letzter.current;
    const ctx = canvasRef.current.getContext("2d");
    const dist = Math.hypot(p.x - a.x, p.y - a.y);
    const tempo = dist / Math.max(1, p.t - a.t);
    ctx.lineWidth = Math.max(1.4, Math.min(3.6, 3.4 - tempo * 1.1)) * (e.pointerType === "pen" ? 0.7 + p.druck * 0.6 : 1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(a.x, a.y, (a.x + p.x) / 2, (a.y + p.y) / 2);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    letzter.current = p;
    if (leer) {
      setLeer(false);
      meldenRef.current?.(false);
    }
  };
  const ende = () => {
    zeichnet.current = false;
  };

  return (
    <div className="min-w-0">
      <div className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-inset ring-ink-200">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${beschriftung}: mit Maus, Stift oder Finger unterschreiben`}
          className="block touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={bewegen}
          onPointerUp={ende}
          onPointerCancel={ende}
          onPointerLeave={ende}
        />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-10 left-6 right-6 border-b border-dashed border-ink-300" />
        {leer && <span aria-hidden="true" className="pointer-events-none absolute left-6 top-6 text-[13px] text-ink-400">Hier unterschreiben</span>}
      </div>
      <button type="button" onClick={vorbereiten} className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink-700 hover:bg-ink-100">
        <Eraser aria-hidden="true" className="h-4 w-4" /> Neu zeichnen
      </button>
    </div>
  );
});

export default SignaturPad;
