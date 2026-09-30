"use client";

// Plan-Vorschau im Browser (ohne Fremdpakete): DXF (eigener Parser, src/lib/plattform/planung/dxf.js), GeoJSON, KML und
// abgeleitete Vorschauen (DWG → DXF, KMZ/Shapefile → GeoJSON). Canvas-Darstellung mit Layerliste (ein/aus, Farben ACI),
// Zoom (Mausrad, Knöpfe, Tasten + / − / 0), Verschieben (Ziehen, Wischen), Pinch-Zoom, Maßstabsbalken, Einheiten ($INSUNITS,
// bei fehlender Einheit umstellbar), Messwerkzeug Distanz (Taste M, Fang an Stützpunkten – Umschalt = ohne Fang) und
// Fläche einer geschlossenen Kontur (Taste F). Vereinfachung bei vielen Objekten: Sichtbarkeitsprüfung je Objekt,
// Ausdünnen von Stützpunkten unter 0,7 px, winzige Objekte als Punkt, Texte erst ab 4 px Höhe.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Layers, Loader2, Maximize2, Minus, Move, Plus, Ruler, SquareDashed } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { EINHEITEN, anzeigeFarbe, aufloesen, bbox as bboxVon, bboxenSetzen, dxfDekodieren, einheitVon, lesen, punktInPolygon } from "@/lib/plattform/planung/dxf";
import { geojsonPrimitive, kmlZuGeojson } from "@/lib/plattform/planung/geo";
import { fmt } from "@/lib/rechner/annahmen";

const NICE = [1, 2, 2.5, 5];

function schoeneLaenge(max) {
  const e = Math.pow(10, Math.floor(Math.log10(max)));
  let best = e;
  for (const n of NICE) if (n * e <= max) best = n * e;
  return best;
}

function laengeText(m) {
  if (!Number.isFinite(m)) return "–";
  if (m >= 1000) return `${fmt(m / 1000, m >= 10000 ? 1 : 2)} km`;
  if (m >= 1) return `${fmt(m, m >= 100 ? 0 : 1)} m`;
  return `${fmt(m * 100, 1)} cm`;
}
function flaecheText(m2) {
  if (!Number.isFinite(m2)) return "–";
  if (m2 >= 10000) return `${fmt(m2 / 10000, 2)} ha (${fmt(m2, 0)} m²)`;
  return `${fmt(m2, m2 >= 100 ? 0 : 1)} m²`;
}

async function laden(url, art) {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `Plan konnte nicht geladen werden (${res.status}).`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  await new Promise((r) => setTimeout(r, 0)); // Ladeanzeige zeichnen lassen
  if (art === "dxf") {
    const doc = lesen(dxfDekodieren(buf));
    const { prims, zaehler } = aufloesen(doc);
    const layer = Object.values(doc.layer).map((l) => ({ name: l.name, farbe: anzeigeFarbe(l), anfangsAus: !!(l.aus || l.gefroren) }));
    return { prims, layer, einheit: einheitVon(doc), info: { objekte: doc.entitaeten.length, primitive: zaehler.primitive, nichtUnterstuetzt: doc.nichtUnterstuetzt, abgeschnitten: zaehler.abgeschnitten, version: doc.version } };
  }
  const text = new TextDecoder("utf-8").decode(buf);
  const gj = art === "kml" ? kmlZuGeojson(text) : JSON.parse(text);
  const { prims, einheit } = geojsonPrimitive(gj);
  const namen = [...new Set(prims.map((p) => p.L))];
  const palette = ["#1f5aa1", "#669933", "#b42318", "#c77700", "#6b4fa0", "#0f766e", "#394050"];
  return { prims, layer: namen.map((name, i) => ({ name, farbe: palette[i % palette.length], anfangsAus: false })), einheit, info: { objekte: prims.length, primitive: prims.length, nichtUnterstuetzt: {} } };
}

export default function PlanViewer({ url, art = "dxf", titel = "Plan", hoehe = "min(72vh, 760px)", kompakt = false }) {
  const huelle = useRef(null);
  const canvas = useRef(null);
  const daten = useRef(null); // { prims, farben: Map layer→Farbe }
  const ansicht = useRef({ cx: 0, cy: 0, s: 1, w: 0, h: 0 });
  const zeiger = useRef(new Map());
  const zug = useRef(null);
  const frame = useRef(0);
  const [status, setStatus] = useState({ laeuft: true, fehler: "" });
  const [layer, setLayer] = useState([]);
  const [aus, setAus] = useState(() => new Set());
  const [einheit, setEinheit] = useState({ m: 1, kurz: "m", label: "Meter" });
  const [info, setInfo] = useState(null);
  const [werkzeug, setWerkzeug] = useState("pan"); // pan | messen | flaeche
  const [mess, setMess] = useState([]); // Weltpunkte
  const [treffer, setTreffer] = useState(null); // Primitiv (Fläche)
  const [maus, setMaus] = useState(null);
  const [massstab, setMassstab] = useState({ px: 100, text: "" });
  const [layerOffen, setLayerOffen] = useState(!kompakt);

  const zeichnen = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const c = canvas.current;
      const d = daten.current;
      if (!c || !d) return;
      const { cx, cy, s, w, h } = ansicht.current;
      const dpr = window.devicePixelRatio || 1;
      const g = c.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      const X = (x) => w / 2 + (x - cx) * s;
      const Y = (y) => h / 2 - (y - cy) * s;
      const wx0 = cx - w / 2 / s;
      const wx1 = cx + w / 2 / s;
      const wy0 = cy - h / 2 / s;
      const wy1 = cy + h / 2 / s;
      g.lineWidth = 1;
      g.lineJoin = "round";
      let texte = 0;
      // nach Farbe gruppiert zeichnen (ein Pfad je Farbe)
      for (const [farbe, liste] of d.gruppen) {
        g.strokeStyle = farbe;
        g.fillStyle = farbe;
        g.beginPath();
        for (const p of liste) {
          if (aus.has(p.L) || p.t !== "p") continue;
          const bb = p.bb;
          if (bb[2] < wx0 || bb[0] > wx1 || bb[3] < wy0 || bb[1] > wy1) continue;
          if ((bb[2] - bb[0]) * s < 1 && (bb[3] - bb[1]) * s < 1) {
            g.rect(X(bb[0]) - 0.5, Y(bb[1]) - 0.5, 1, 1);
            continue;
          }
          const pts = p.pts;
          let lx = X(pts[0]);
          let ly = Y(pts[1]);
          g.moveTo(lx, ly);
          const n = pts.length;
          for (let k = 2; k < n; k += 2) {
            const x = X(pts[k]);
            const y = Y(pts[k + 1]);
            if (k < n - 2 && Math.abs(x - lx) < 0.7 && Math.abs(y - ly) < 0.7) continue;
            g.lineTo(x, y);
            lx = x;
            ly = y;
          }
          if (p.punkt) g.rect(lx - 2, ly - 2, 4, 4);
        }
        g.stroke();
        for (const p of liste) {
          if (p.t !== "t" || aus.has(p.L) || texte > 4000) continue;
          const px = p.pixel || p.h * s;
          if (px < 4 || p.x < wx0 - 1e3 / s || p.x > wx1 || p.y < wy0 || p.y > wy1 + 1e3 / s) continue;
          texte++;
          g.save();
          g.translate(X(p.x), Y(p.y));
          g.rotate(-p.rot || 0);
          g.font = `${Math.min(px, 400)}px Inter, system-ui, sans-serif`;
          g.textAlign = ["left", "center", "right"][p.ha] || "left";
          g.textBaseline = ["alphabetic", "bottom", "middle", "top"][p.va] || "alphabetic";
          const zeilen = String(p.text).split("\n");
          zeilen.forEach((z, i) => g.fillText(z, 0, i * px * 1.25));
          g.restore();
        }
      }
      // Treffer (Fläche)
      if (treffer) {
        g.beginPath();
        const pts = treffer.pts;
        g.moveTo(X(pts[0]), Y(pts[1]));
        for (let k = 2; k < pts.length; k += 2) g.lineTo(X(pts[k]), Y(pts[k + 1]));
        g.closePath();
        g.fillStyle = "rgba(102,153,51,0.22)";
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = "#3d6b1f";
        g.stroke();
      }
      // Messlinie
      if (mess.length) {
        const punkte = mess.length === 1 && maus?.welt ? [mess[0], maus.welt] : mess;
        g.lineWidth = 2;
        g.strokeStyle = "#041d42";
        g.setLineDash([6, 4]);
        g.beginPath();
        g.moveTo(X(punkte[0][0]), Y(punkte[0][1]));
        for (const q of punkte.slice(1)) g.lineTo(X(q[0]), Y(q[1]));
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = "#041d42";
        for (const q of punkte) g.fillRect(X(q[0]) - 3, Y(q[1]) - 3, 6, 6);
      }
      if (maus?.fang) {
        g.strokeStyle = "#c77700";
        g.lineWidth = 1.5;
        g.strokeRect(X(maus.fang[0]) - 5, Y(maus.fang[1]) - 5, 10, 10);
      }
    });
  }, [aus, treffer, mess, maus]);

  const massstabAktualisieren = useCallback(() => {
    const { s } = ansicht.current;
    const maxWelt = 140 / s;
    const l = schoeneLaenge(maxWelt);
    setMassstab({ px: l * s, text: laengeText(l * (einheit.m || 1)) });
  }, [einheit]);

  const einpassen = useCallback(() => {
    const d = daten.current;
    if (!d) return;
    const bb = bboxVon(d.prims, { layerAus: aus }) || [0, 0, 1, 1];
    const { w, h } = ansicht.current;
    const bw = Math.max(bb[2] - bb[0], 1e-9);
    const bh = Math.max(bb[3] - bb[1], 1e-9);
    ansicht.current.s = Math.min((w - 40) / bw, (h - 40) / bh);
    ansicht.current.cx = (bb[0] + bb[2]) / 2;
    ansicht.current.cy = (bb[1] + bb[3]) / 2;
    massstabAktualisieren();
    zeichnen();
  }, [aus, massstabAktualisieren, zeichnen]);

  // Laden
  useEffect(() => {
    let aktiv = true;
    setStatus({ laeuft: true, fehler: "" });
    laden(url, art)
      .then((r) => {
        if (!aktiv) return;
        bboxenSetzen(r.prims);
        const farbeLayer = new Map(r.layer.map((l) => [l.name, l.farbe]));
        const gruppen = new Map();
        for (const p of r.prims) {
          const f = p.rgb || (p.aci !== null && p.aci !== undefined) ? anzeigeFarbe({ aci: p.aci ?? 7, rgb: p.rgb }) : farbeLayer.get(p.L) || "#151a24";
          if (!gruppen.has(f)) gruppen.set(f, []);
          gruppen.get(f).push(p);
          if (!farbeLayer.has(p.L)) farbeLayer.set(p.L, f);
        }
        const zaehl = {};
        for (const p of r.prims) zaehl[p.L] = (zaehl[p.L] || 0) + 1;
        const alle = [...farbeLayer.entries()].map(([name, farbe]) => ({ name, farbe, objekte: zaehl[name] || 0, anfangsAus: !!r.layer.find((l) => l.name === name)?.anfangsAus })).filter((l) => l.objekte > 0).sort((a, b) => a.name.localeCompare(b.name, "de"));
        daten.current = { prims: r.prims, gruppen };
        setLayer(alle);
        setAus(new Set(alle.filter((l) => l.anfangsAus).map((l) => l.name)));
        setEinheit(r.einheit);
        setInfo(r.info);
        setStatus({ laeuft: false, fehler: "" });
      })
      .catch((e) => aktiv && setStatus({ laeuft: false, fehler: e.message || "Plan konnte nicht gelesen werden." }));
    return () => {
      aktiv = false;
    };
  }, [url, art]);

  // Größe
  useEffect(() => {
    const el = huelle.current;
    const c = canvas.current;
    if (!el || !c) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const neu = !ansicht.current.w;
      ansicht.current.w = r.width;
      ansicht.current.h = r.height;
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      c.style.width = `${r.width}px`;
      c.style.height = `${r.height}px`;
      if (neu && daten.current) einpassen();
      else zeichnen();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [einpassen, zeichnen]);

  useEffect(() => {
    if (!status.laeuft && !status.fehler && ansicht.current.w) einpassen();
    // nur nach dem Laden einpassen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.laeuft]);

  // Mobil: Layerliste zunächst eingeklappt, damit der Plan im sichtbaren Bereich bleibt
  useEffect(() => {
    if (window.innerWidth < 1024) setLayerOffen(false);
  }, []);

  useEffect(() => zeichnen(), [zeichnen]);
  useEffect(() => massstabAktualisieren(), [massstabAktualisieren]);

  const welt = (ex, ey) => {
    const r = canvas.current.getBoundingClientRect();
    const { cx, cy, s, w, h } = ansicht.current;
    return [cx + (ex - r.left - w / 2) / s, cy - (ey - r.top - h / 2) / s];
  };

  const zoom = useCallback((faktor, um = null) => {
    const a = ansicht.current;
    const [ux, uy] = um || [a.cx, a.cy];
    const s2 = Math.max(1e-9, Math.min(1e9, a.s * faktor));
    a.cx = ux + (a.cx - ux) * (a.s / s2);
    a.cy = uy + (a.cy - uy) * (a.s / s2);
    a.s = s2;
    massstabAktualisieren();
    zeichnen();
  }, [massstabAktualisieren, zeichnen]);

  /** Fang: nächster Stützpunkt innerhalb 10 px */
  const fangen = (wx, wy) => {
    const d = daten.current;
    if (!d) return null;
    const tol = 10 / ansicht.current.s;
    let best = null;
    let bestD = tol * tol;
    for (const p of d.prims) {
      if (p.t !== "p" || aus.has(p.L)) continue;
      const bb = p.bb;
      if (wx < bb[0] - tol || wx > bb[2] + tol || wy < bb[1] - tol || wy > bb[3] + tol) continue;
      const pts = p.pts;
      const schritt = pts.length > 400 ? 2 * Math.ceil(pts.length / 400) : 2;
      for (let k = 0; k < pts.length; k += schritt) {
        const dx = pts[k] - wx;
        const dy = pts[k + 1] - wy;
        const dd = dx * dx + dy * dy;
        if (dd < bestD) {
          bestD = dd;
          best = [pts[k], pts[k + 1]];
        }
      }
    }
    return best;
  };

  const flaecheTreffer = (wx, wy) => {
    const d = daten.current;
    let best = null;
    for (const p of d?.prims || []) {
      if (p.t !== "p" || !p.zu || !(p.flaeche > 0) || aus.has(p.L)) continue;
      const bb = p.bb;
      if (wx < bb[0] || wx > bb[2] || wy < bb[1] || wy > bb[3]) continue;
      if (punktInPolygon(wx, wy, p.pts) && (!best || p.flaeche < best.flaeche)) best = p;
    }
    return best;
  };

  const onPointerDown = (e) => {
    canvas.current.setPointerCapture(e.pointerId);
    zeiger.current.set(e.pointerId, [e.clientX, e.clientY]);
    zug.current = { x: e.clientX, y: e.clientY, cx: ansicht.current.cx, cy: ansicht.current.cy, bewegt: false, abstand: null };
    if (zeiger.current.size === 2) {
      const [a, b] = [...zeiger.current.values()];
      zug.current.abstand = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zug.current.s = ansicht.current.s;
      zug.current.mitte = welt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
  };
  const onPointerMove = (e) => {
    const w = welt(e.clientX, e.clientY);
    const fang = werkzeug === "messen" && !e.shiftKey ? fangen(w[0], w[1]) : null;
    setMaus({ welt: fang || w, fang });
    if (!zeiger.current.has(e.pointerId)) return;
    zeiger.current.set(e.pointerId, [e.clientX, e.clientY]);
    const z = zug.current;
    if (!z) return;
    if (zeiger.current.size === 2 && z.abstand) {
      const [a, b] = [...zeiger.current.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const s2 = z.s * (d / z.abstand);
      ansicht.current.s = s2;
      z.bewegt = true;
      massstabAktualisieren();
      zeichnen();
      return;
    }
    const dx = e.clientX - z.x;
    const dy = e.clientY - z.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) z.bewegt = true;
    if (z.bewegt) {
      ansicht.current.cx = z.cx - dx / ansicht.current.s;
      ansicht.current.cy = z.cy + dy / ansicht.current.s;
      zeichnen();
    }
  };
  const onPointerUp = (e) => {
    const z = zug.current;
    zeiger.current.delete(e.pointerId);
    if (zeiger.current.size > 0) return;
    zug.current = null;
    if (z?.bewegt) return;
    const w = welt(e.clientX, e.clientY);
    if (werkzeug === "messen") {
      const q = (!e.shiftKey && fangen(w[0], w[1])) || w;
      setMess((m) => (m.length >= 2 ? [q] : [...m, q]));
    } else if (werkzeug === "flaeche") setTreffer(flaecheTreffer(w[0], w[1]));
  };
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const r = canvas.current.getBoundingClientRect();
    const { cx, cy, s, w, h } = ansicht.current;
    const um = [cx + (e.clientX - r.left - w / 2) / s, cy - (e.clientY - r.top - h / 2) / s];
    zoom(Math.exp(-e.deltaY * 0.0015), um);
  }, [zoom]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const onKeyDown = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (e.key === "+" || e.key === "=") zoom(1.4);
    else if (e.key === "-") zoom(1 / 1.4);
    else if (e.key === "0") einpassen();
    else if (e.key === "m" || e.key === "M") waehle("messen");
    else if (e.key === "f" || e.key === "F") waehle("flaeche");
    else if (e.key === "Escape") waehle("pan");
    else if (e.key.startsWith("Arrow")) {
      const d = 60 / ansicht.current.s;
      if (e.key === "ArrowLeft") ansicht.current.cx -= d;
      if (e.key === "ArrowRight") ansicht.current.cx += d;
      if (e.key === "ArrowUp") ansicht.current.cy += d;
      if (e.key === "ArrowDown") ansicht.current.cy -= d;
      zeichnen();
    } else return;
    e.preventDefault();
  };

  const waehle = (w) => {
    setWerkzeug(w);
    setMess([]);
    setTreffer(null);
  };

  const messErgebnis = useMemo(() => {
    if (mess.length < 2) return null;
    const [a, b] = mess;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { einheiten: d, m: d * (einheit.m || 1), dx: Math.abs(b[0] - a[0]) * (einheit.m || 1), dy: Math.abs(b[1] - a[1]) * (einheit.m || 1) };
  }, [mess, einheit]);

  const knopf = "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold ring-1 ring-inset transition-colors";
  const aktivK = (an) => (an ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-800 ring-ink-200 hover:bg-ink-50");

  return (
    <div className="min-w-0 rounded-3xl bg-white ring-1 ring-ink-200/70">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-3 py-2.5 md:px-4" role="toolbar" aria-label={`Werkzeuge ${titel}`}>
        <button type="button" onClick={() => waehle("pan")} className={cn(knopf, aktivK(werkzeug === "pan"))} aria-pressed={werkzeug === "pan"} title="Verschieben (Esc)"><Move aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Verschieben</span></button>
        <button type="button" onClick={() => waehle("messen")} className={cn(knopf, aktivK(werkzeug === "messen"))} aria-pressed={werkzeug === "messen"} title="Distanz messen (M)"><Ruler aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Messen</span></button>
        <button type="button" onClick={() => waehle("flaeche")} className={cn(knopf, aktivK(werkzeug === "flaeche"))} aria-pressed={werkzeug === "flaeche"} title="Fläche einer geschlossenen Kontur (F)"><SquareDashed aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Fläche</span></button>
        <span className="mx-1 hidden h-6 w-px bg-ink-200 sm:block" aria-hidden="true" />
        <button type="button" onClick={() => zoom(1.4)} className={cn(knopf, aktivK(false))} aria-label="Vergrößern (+)"><Plus aria-hidden="true" className="h-4 w-4" /></button>
        <button type="button" onClick={() => zoom(1 / 1.4)} className={cn(knopf, aktivK(false))} aria-label="Verkleinern (−)"><Minus aria-hidden="true" className="h-4 w-4" /></button>
        <button type="button" onClick={einpassen} className={cn(knopf, aktivK(false))} aria-label="Alles zeigen (0)"><Maximize2 aria-hidden="true" className="h-4 w-4" /></button>
        <button type="button" onClick={() => setLayerOffen((x) => !x)} className={cn(knopf, aktivK(layerOffen), "ml-auto")} aria-expanded={layerOffen} aria-controls="plan-layer"><Layers aria-hidden="true" className="h-4 w-4" />Layer<span className="ov-num text-[11.5px] opacity-70">{layer.length - aus.size}/{layer.length}</span></button>
      </div>
      <div className={cn("grid min-w-0", layerOffen ? "lg:grid-cols-[minmax(0,1fr)_260px]" : "")}>
        <div className="relative min-w-0">
          <div ref={huelle} className="relative w-full overflow-hidden bg-white" style={{ height: hoehe }}>
            <canvas
              ref={canvas}
              tabIndex={0}
              role="img"
              aria-label={`${titel} – Vorschau. Tasten: Plus/Minus zoomen, 0 einpassen, Pfeile verschieben, M messen, F Fläche.`}
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerLeave={() => setMaus(null)}
              className={cn("block touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ov-500", werkzeug === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair")}
            />
            {status.laeuft && <div className="absolute inset-0 grid place-items-center bg-white/80 text-[14px] text-ink-600"><span className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />Plan wird gelesen …</span></div>}
            {status.fehler && <div className="absolute inset-0 grid place-items-center p-6 text-center text-[14px] text-red-800">{status.fehler}</div>}
            {!status.laeuft && !status.fehler && (
              <>
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-white/90 px-2.5 py-1.5 text-[11.5px] text-ink-700 shadow-sm ring-1 ring-ink-200/70">
                  <div className="h-1.5 border-x-2 border-b-2 border-ink-800" style={{ width: `${massstab.px}px` }} aria-hidden="true" />
                  <span className="ov-num mt-0.5 block">{massstab.text}</span>
                </div>
                {maus?.welt && (
                  <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-xl bg-white/90 px-2.5 py-1.5 text-[11.5px] text-ink-600 shadow-sm ring-1 ring-ink-200/70 sm:block">
                    <Crosshair aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
                    <span className="ov-num">{fmt(maus.welt[0], 2)} / {fmt(maus.welt[1], 2)} {einheit.kurz}</span>
                  </div>
                )}
              </>
            )}
          </div>
          <div aria-live="polite" className="min-h-[44px] border-t border-ink-100 px-4 py-2.5 text-[13.5px] text-ink-700">
            {werkzeug === "messen" && (messErgebnis ? <span><strong className="ov-num">{laengeText(messErgebnis.m)}</strong> <span className="text-ink-500">(Δx {laengeText(messErgebnis.dx)}, Δy {laengeText(messErgebnis.dy)}{einheit.angenommen ? ", Einheit angenommen" : ""})</span> – erneut klicken für eine neue Messung.</span> : <span className="text-ink-500">Ersten und zweiten Punkt anklicken (Fang an Stützpunkten; Umschalt gedrückt = ohne Fang).</span>)}
            {werkzeug === "flaeche" && (treffer ? <span>Fläche <strong className="ov-num">{flaecheText(treffer.flaeche * (einheit.m || 1) ** 2)}</strong> · Umfang <span className="ov-num">{laengeText(treffer.laenge * (einheit.m || 1))}</span> · Layer „{treffer.L}“</span> : <span className="text-ink-500">In eine geschlossene Kontur klicken (Polylinie, Kreis, Ellipse).</span>)}
            {werkzeug === "pan" && info && <span className="text-ink-500">{fmt(info.objekte)} Objekte · {fmt(info.primitive)} Zeichenelemente{info.version ? ` · DXF ${info.version}` : ""}{Object.keys(info.nichtUnterstuetzt || {}).length ? ` · nicht dargestellt: ${Object.entries(info.nichtUnterstuetzt).map(([k, n]) => `${k} (${n})`).join(", ")}` : ""}{info.abgeschnitten ? " · sehr großer Plan – gekürzt dargestellt" : ""}</span>}
          </div>
        </div>
        {layerOffen && (
          <aside id="plan-layer" aria-label="Layer" className="min-w-0 border-t border-ink-100 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <p className="text-[13px] font-semibold text-ink-900">Layer</p>
              <div className="flex gap-1.5 text-[12px] font-semibold">
                <button type="button" className="rounded-full px-2 py-1 text-ov-700 hover:bg-ov-50" onClick={() => setAus(new Set())}>alle an</button>
                <button type="button" className="rounded-full px-2 py-1 text-ink-600 hover:bg-ink-50" onClick={() => setAus(new Set(layer.map((l) => l.name)))}>alle aus</button>
              </div>
            </div>
            <ul className="max-h-[42vh] overflow-y-auto px-2 pb-3 lg:max-h-[60vh]">
              {layer.map((l) => (
                <li key={l.name}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] hover:bg-ink-50">
                    <input type="checkbox" className="h-4 w-4 accent-ov-600" checked={!aus.has(l.name)} onChange={(e) => setAus((s) => { const n = new Set(s); if (e.target.checked) n.delete(l.name); else n.add(l.name); return n; })} />
                    <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm ring-1 ring-black/10" style={{ background: l.farbe }} />
                    <span className="min-w-0 flex-1 truncate text-ink-800" title={l.name}>{l.name}</span>
                    <span className="ov-num text-[11.5px] text-ink-500">{l.objekte}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="border-t border-ink-100 px-4 py-3 text-[12.5px] text-ink-600">
              <label className="block font-semibold text-ink-700" htmlFor="plan-einheit">Einheit</label>
              <select id="plan-einheit" className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-2 py-1.5 text-[13px]" value={einheit.angenommen ? 6 : einheit.code ?? 6} onChange={(e) => { const c = Number(e.target.value); setEinheit({ code: c, ...EINHEITEN[c], angenommen: false }); }}>
                {[4, 5, 14, 6, 7, 1, 2].map((c) => <option key={c} value={c}>{EINHEITEN[c].label} ({EINHEITEN[c].kurz})</option>)}
              </select>
              <p className="mt-1">{einheit.angenommen ? "Die Zeichnung hat keine Einheit – bitte prüfen." : `aus der Zeichnung: ${einheit.label}`}</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
