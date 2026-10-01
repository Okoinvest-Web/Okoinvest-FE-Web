"use client";

// src/components/diagramme/WasserfallDiagramm.js
//
// Wasserfall (Brücke): Startwert → Zu-/Abgänge → Zwischen-/Endsumme, z. B. Ersparnis-Aufbau, Erlösbrücke, Cashflow.
// Summen Navy, Zugänge Grün, Abgänge Sonne (kein Rot-Grün-Gegensatz) + Vorzeichen im Text; Verbindungslinien
// zwischen den Stufen; Säulen wachsen gestaffelt. Tooltip, Tastatur, Tabelle, CSV, PNG wie alle Bausteine.
//
// Props: schritte [{ name, wert, typ?: "start" | "delta" | "summe", text? }]  (summe: Wert wird berechnet, wenn leer)
//        yEinheit, stellen, hoehe, titel, beschreibung, farben?: { summe, plus, minus }

import { ACHSE } from "@/components/ui/datenfarben";
import { DiagrammRahmen, Plot, useBreite } from "./Rahmen";
import { rahmenMasse, XBeschriftung, YRaster } from "./Achsen";
import { achse, linear, minus, SCHRIFT, staffel, textBreite, wertText } from "./skala";

const STANDARD = { summe: "#003473", plus: "#669933", minus: "#c98500" };

export default function WasserfallDiagramm({ schritte = [], yEinheit = "", stellen, hoehe = 260, titel, untertitel, beschreibung, farben = STANDARD, werkzeuge, dunkel = false, leerText = "Keine Daten.", className }) {
  const [ref, gemessen] = useBreite(720);
  const breite = Math.max(240, gemessen);
  const f = dunkel ? ACHSE.dunkel : ACHSE.hell;
  if (!schritte.length) return <p className="text-[14px] text-ink-500">{leerText}</p>;

  let lauf = 0;
  const balken = schritte.map((s, i) => {
    const typ = s.typ || (i === 0 ? "start" : "delta");
    if (typ === "start") {
      lauf = Number(s.wert) || 0;
      return { ...s, typ, von: 0, bis: lauf, wert: lauf };
    }
    if (typ === "summe") {
      const w = Number.isFinite(s.wert) ? s.wert : lauf;
      lauf = w;
      return { ...s, typ, von: 0, bis: w, wert: w };
    }
    const von = lauf;
    lauf += Number(s.wert) || 0;
    return { ...s, typ, von, bis: lauf, wert: Number(s.wert) || 0 };
  });
  const n = balken.length;
  const alle = balken.flatMap((b) => [b.von, b.bis]);
  const yA = achse(Math.min(0, ...alle), Math.max(0, ...alle), 5);
  const { P, innenB, innenH } = rahmenMasse({ breite, hoehe, yAchse: yA, einheit: yEinheit });
  const Y = linear([yA.von, yA.bis], [P.t + innenH, P.t]);
  const band = innenB / n;
  const bw = Math.max(4, Math.min(64, band * 0.62));
  const x0 = (i) => P.l + band * i + (band - bw) / 2;
  const farbe = (b) => (b.typ === "delta" ? (b.wert >= 0 ? farben.plus : farben.minus) : farben.summe);
  const text = (b) => b.text ?? (b.typ === "delta" ? `${b.wert >= 0 ? "+" : ""}${wertText(b.wert, { stellen })}` : wertText(b.wert, { stellen }));
  const passt = Math.max(...balken.map((b) => textBreite(text(b)))) + 4 < band;

  const info = (i) => {
    const b = balken[i];
    return {
      x: x0(i) + bw / 2,
      y: Y(Math.max(b.von, b.bis)),
      titel: b.name,
      zeilen: [{ name: b.typ === "delta" ? (b.wert >= 0 ? "Zugang" : "Abgang") : "Summe", wert: `${minus(text(b))}${yEinheit ? ` ${yEinheit}` : ""}`, farbe: farbe(b) }],
      fuss: b.typ === "delta" ? `Stand danach ${wertText(b.bis, { stellen, einheit: yEinheit })}` : undefined,
    };
  };
  const kurz = beschreibung || `${titel || "Wasserfall"}: von ${wertText(balken[0].bis, { stellen, einheit: yEinheit })} auf ${wertText(balken[n - 1].bis, { stellen, einheit: yEinheit })}`;
  const tabelle = {
    kopf: ["Schritt", `Veränderung${yEinheit ? ` (${yEinheit})` : ""}`, "Stand"],
    zeilen: balken.map((b) => [b.name, b.typ === "delta" ? minus(text(b)) : "", wertText(b.bis, { stellen })]),
    csv: { kopf: ["Schritt", "Typ", "Wert", "Stand"], zeilen: balken.map((b) => [b.name, b.typ, b.wert, b.bis]) },
  };
  const legende = [
    { name: "Summe", farbe: farben.summe },
    { name: "Zugang", farbe: farben.plus },
    { name: "Abgang", farbe: farben.minus },
  ].filter((l) => (l.name === "Summe" ? true : balken.some((b) => b.typ === "delta" && (l.name === "Zugang" ? b.wert >= 0 : b.wert < 0))));

  return (
    <DiagrammRahmen titel={titel} untertitel={untertitel} beschreibung={kurz} tabelle={tabelle} legende={legende} werkzeuge={werkzeuge} dunkel={dunkel} className={className}>
      <div ref={ref} className="min-w-0">
        <Plot
          breite={breite}
          hoehe={hoehe}
          anzahl={n}
          indexAusPx={(px) => Math.max(0, Math.min(n - 1, Math.floor((px - P.l) / band)))}
          info={info}
          fadenkreuz={(i) => <rect x={P.l + band * i} y={P.t} width={band} height={innenH} rx="6" fill={dunkel ? "rgba(255,255,255,0.06)" : "rgba(0,52,115,0.05)"} />}
          beschreibung={kurz}
          dunkel={dunkel}
        >
          <YRaster yAchse={yA} Y={Y} P={P} breite={breite} einheit={yEinheit} dunkel={dunkel} />
          {balken.map((b, i) => {
            const oben = Y(Math.max(b.von, b.bis));
            const h = Math.max(1, Math.abs(Y(b.von) - Y(b.bis)));
            const runter = b.typ === "delta" && b.wert < 0;
            return (
              <g key={`${b.name}-${i}`}>
                {i < n - 1 && (
                  <line x1={x0(i) + bw} x2={x0(i + 1)} y1={Y(b.bis)} y2={Y(b.bis)} stroke={f.achse} strokeWidth="1.25" strokeDasharray="3 3" className="ov-flaeche-ein" />
                )}
                <rect x={x0(i)} y={oben} width={bw} height={h} rx={Math.min(4, bw / 4)} fill={farbe(b)} className="ov-balken-y" style={{ "--i": staffel(i, n), transformOrigin: runter ? "50% 0%" : undefined }} />
                {passt && (
                  <text x={x0(i) + bw / 2} y={runter ? oben + h + 15 : oben - 6} textAnchor="middle" fontSize={SCHRIFT.wert} fontWeight="600" fill={f.textStark} className="ov-flaeche-ein" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {minus(text(b))}
                  </text>
                )}
              </g>
            );
          })}
          <XBeschriftung eintraege={balken.map((b, i) => ({ pos: x0(i) + bw / 2, text: b.name }))} P={P} breite={breite} hoehe={hoehe} dunkel={dunkel} />
        </Plot>
      </div>
    </DiagrammRahmen>
  );
}
