"use client";

// src/components/diagramme/BalkenDiagramm.js
//
// Säulen gruppiert oder gestapelt (auch negativ), optional Linie (z. B. Mittel/Capture) und Soll-Strich je Kategorie.
// Säulen wachsen gestaffelt (ov-balken-y), Hover/Tastatur heben die Kategorie hervor, Tooltip mit allen Reihen
// (+ Summe bei Stapel), direkte Wertbeschriftung, wenn Platz ist. Datentabelle, CSV, PNG über DiagrammRahmen.
//
// Props (serialisierbar):
//   kategorien: string[]   kategorienTitel?: string[] (lange Titel für Tooltip/Tabelle)
//   reihen: [{ name, farbe, werte: (number|null)[], texte?: string[], deckkraft? }]
//   gestapelt, linie?: { name, farbe, werte, texte?, gestrichelt? }, soll?: { name, farbe?, werte, texte? }
//   referenz?: [{ y, text, farbe? }]  waagrechte Ziel-/Soll-Linie über alle Kategorien
//   zusatz?: [{ zeilen?: [{ name, wert }], fuss? }] je Kategorie – weitere Tooltip-Zeilen
//   yEinheit, yStellen, werteZeigen ("auto" | true | false), summeZeigen (Stapel), hoehe, titel, beschreibung, legende

import { useMemo } from "react";
import { ACHSE, ENERGIE } from "@/components/ui/datenfarben";
import { DiagrammRahmen, Plot, useBreite } from "./Rahmen";
import { rahmenMasse, XBeschriftung, YRaster } from "./Achsen";
import { achse, linear, linienPfad, SCHRIFT, staffel, textBreite, wertText } from "./skala";

export default function BalkenDiagramm({
  kategorien = [],
  kategorienTitel,
  reihen = [],
  gestapelt = false,
  linie = null,
  soll = null,
  referenz = [],
  zusatz,
  yEinheit = "",
  yStellen,
  format,
  werteZeigen = "auto",
  summeZeigen = true,
  titel,
  einheit,
  untertitel,
  beschreibung,
  hoehe = 240,
  legende = true,
  werkzeuge,
  tabelle: tabelleProp,
  dunkel = false,
  leerText = "Keine Daten.",
  className,
}) {
  const [ref, gemessen] = useBreite(720);
  const breite = Math.max(240, gemessen);
  const f = dunkel ? ACHSE.dunkel : ACHSE.hell;
  const n = kategorien.length;
  const fmt = (v, r) => (format ? format(v, r) : wertText(v, { stellen: yStellen, einheit: yEinheit }));
  const text = (r, i) => (Number.isFinite(r.werte[i]) ? r.texte?.[i] ?? fmt(r.werte[i], r) : "–");

  // Stapel: positive nach oben, negative nach unten
  const segmente = useMemo(
    () =>
      kategorien.map((_, i) => {
        let pos = 0;
        let neg = 0;
        return reihen.map((r) => {
          const v = r.werte[i];
          if (!Number.isFinite(v)) return null;
          if (!gestapelt) return [Math.min(0, v), Math.max(0, v)];
          if (v >= 0) {
            const s = [pos, pos + v];
            pos += v;
            return s;
          }
          const s = [neg + v, neg];
          neg += v;
          return s;
        });
      }),
    [kategorien, reihen, gestapelt]
  );

  if (!n || !reihen.length) return <p className="text-[14px] text-ink-500">{leerText}</p>;

  const werte = segmente.flat().filter(Boolean).flat();
  if (linie) werte.push(...linie.werte.filter(Number.isFinite));
  if (soll) werte.push(...soll.werte.filter(Number.isFinite));
  referenz.forEach((r) => werte.push(r.y));
  const yA = achse(Math.min(0, ...werte), Math.max(0, ...werte), hoehe < 200 ? 4 : 5);
  const { P, innenB, innenH } = rahmenMasse({ breite, hoehe, yAchse: yA, einheit: yEinheit });
  const Y = linear([yA.von, yA.bis], [P.t + innenH, P.t]);
  const band = innenB / n;
  const gruppenAnteil = gestapelt || reihen.length === 1 ? 0.62 : 0.8;
  const luecke = !gestapelt && reihen.length > 1 && band > 24 ? 2 : 0;
  const bw = gestapelt || reihen.length === 1 ? Math.max(1, Math.min(56, band * gruppenAnteil)) : Math.max(1, Math.min(28, (band * gruppenAnteil) / reihen.length - luecke));
  const gruppeB = gestapelt ? bw : reihen.length * (bw + luecke) - luecke;
  const x0 = (i) => P.l + band * i + (band - gruppeB) / 2;
  const mitte = (i) => P.l + band * (i + 0.5);
  const rund = Math.min(4, bw / 3);

  // Direkte Werte: nur bei Platz (eine Reihe bzw. Stapelsumme, Text passt über die Säule)
  const summe = (i) => reihen.reduce((s, r) => s + (Number.isFinite(r.werte[i]) ? r.werte[i] : 0), 0);
  const direkt = (i) => (gestapelt ? fmt(summe(i)) : reihen.length === 1 ? text(reihen[0], i) : null);
  const zeigen =
    werteZeigen === true ||
    (werteZeigen === "auto" && (gestapelt || reihen.length === 1) && n <= 16 && Math.max(...kategorien.map((_, i) => textBreite(direkt(i) || ""))) + 6 < band);

  const titelFuer = (i) => kategorienTitel?.[i] ?? kategorien[i];

  const info = (i) => {
    const zeilen = reihen.map((r) => ({ name: r.name, wert: text(r, i), farbe: r.farbe, stil: "flaeche" }));
    if (linie && Number.isFinite(linie.werte[i])) zeilen.push({ name: linie.name, wert: linie.texte?.[i] ?? fmt(linie.werte[i]), farbe: linie.farbe, stil: "linie" });
    if (soll && Number.isFinite(soll.werte[i])) zeilen.push({ name: soll.name, wert: soll.texte?.[i] ?? fmt(soll.werte[i]), farbe: soll.farbe || f.textStark, stil: "strich" });
    if (zusatz?.[i]?.zeilen) zeilen.push(...zusatz[i].zeilen);
    const oben = Math.max(0, ...segmente[i].filter(Boolean).map((s) => s[1]), linie?.werte[i] ?? 0, soll?.werte[i] ?? 0);
    return { x: mitte(i), y: Y(oben), titel: titelFuer(i), zeilen, fuss: zusatz?.[i]?.fuss ?? (gestapelt && reihen.length > 1 && summeZeigen ? `Summe ${fmt(summe(i))}` : undefined) };
  };

  const fadenkreuz = (i) => <rect x={P.l + band * i} y={P.t} width={band} height={innenH} fill={dunkel ? "rgba(255,255,255,0.06)" : "rgba(0,52,115,0.05)"} rx="6" />;

  const tabelle = tabelleProp ?? {
    kopf: ["Kategorie", ...reihen.map((r) => r.name), ...(linie ? [linie.name] : []), ...(soll ? [soll.name] : []), ...(gestapelt && reihen.length > 1 ? ["Summe"] : [])],
    zeilen: kategorien.map((_, i) => [
      titelFuer(i),
      ...reihen.map((r) => text(r, i)),
      ...(linie ? [Number.isFinite(linie.werte[i]) ? linie.texte?.[i] ?? fmt(linie.werte[i]) : "–"] : []),
      ...(soll ? [Number.isFinite(soll.werte[i]) ? soll.texte?.[i] ?? fmt(soll.werte[i]) : "–"] : []),
      ...(gestapelt && reihen.length > 1 ? [fmt(summe(i))] : []),
    ]),
    csv: {
      kopf: ["Kategorie", ...reihen.map((r) => `${r.name}${yEinheit ? ` (${yEinheit})` : ""}`), ...(linie ? [linie.name] : []), ...(soll ? [soll.name] : [])],
      zeilen: kategorien.map((_, i) => [titelFuer(i), ...reihen.map((r) => r.werte[i] ?? ""), ...(linie ? [linie.werte[i] ?? ""] : []), ...(soll ? [soll.werte[i] ?? ""] : [])]),
    },
  };

  const legendeEintraege =
    legende === true
      ? [
          ...reihen.map((r) => ({ name: r.name, farbe: r.farbe })),
          ...(linie ? [{ name: linie.name, farbe: linie.farbe, stil: "linie", gestrichelt: linie.gestrichelt !== false }] : []),
          ...(soll ? [{ name: soll.name, farbe: soll.farbe || f.textStark, stil: "strich" }] : []),
          ...referenz.filter((r) => r.text).map((r) => ({ name: r.text, farbe: r.farbe || ENERGIE.plan, stil: "linie", gestrichelt: true })),
        ]
      : Array.isArray(legende)
        ? legende
        : null;

  const kurz = beschreibung || `${titel || "Säulendiagramm"}${yEinheit ? ` in ${yEinheit}` : ""}: ${reihen.map((r) => r.name).join(", ")} über ${n} Kategorien`;

  return (
    <DiagrammRahmen titel={titel} einheit={einheit} untertitel={untertitel} beschreibung={kurz} tabelle={tabelle} legende={legendeEintraege} werkzeuge={werkzeuge} dunkel={dunkel} className={className}>
      <div ref={ref} className="min-w-0">
        <Plot breite={breite} hoehe={hoehe} anzahl={n} indexAusPx={(px) => Math.max(0, Math.min(n - 1, Math.floor((px - P.l) / band)))} info={info} fadenkreuz={fadenkreuz} beschreibung={kurz} dunkel={dunkel}>
          <YRaster yAchse={yA} Y={Y} P={P} breite={breite} einheit={yEinheit} dunkel={dunkel} />
          {kategorien.map((k, i) => (
            <g key={`${k}-${i}`}>
              {reihen.map((r, j) => {
                const s = segmente[i][j];
                if (!s) return null;
                const top = Y(s[1]);
                const h = Math.max(s[1] === s[0] ? 0 : 0.75, Y(s[0]) - top);
                const negativ = s[1] <= 0 && s[0] < 0;
                const x = gestapelt ? x0(i) : x0(i) + j * (bw + luecke);
                // Abgerundet nur am äußeren Ende der Säule bzw. des Stapels
                const aussen =
                  !gestapelt ||
                  !segmente[i].some((t, k) => k > j && t && t[1] !== t[0] && (negativ ? t[0] < 0 && t[1] <= 0 : t[1] > 0 && t[0] >= 0));
                const rr = aussen ? Math.min(rund, h / 2) : 0;
                const d = negativ
                  ? `M${x},${top}h${bw}v${h - rr}q0,${rr} ${-rr},${rr}h${-(bw - 2 * rr)}q${-rr},0 ${-rr},${-rr}Z`
                  : `M${x},${top + h}v${-(h - rr)}q0,${-rr} ${rr},${-rr}h${bw - 2 * rr}q${rr},0 ${rr},${rr}v${h - rr}Z`;
                return (
                  <path
                    key={r.name}
                    d={d}
                    fill={r.farbe}
                    fillOpacity={r.deckkraft ?? 1}
                    className="ov-balken-y"
                    style={{ "--i": staffel(i, n), transformOrigin: negativ ? "50% 0%" : undefined }}
                  />
                );
              })}
              {soll && Number.isFinite(soll.werte[i]) && (
                <line x1={x0(i) - 3} x2={x0(i) + gruppeB + 3} y1={Y(soll.werte[i])} y2={Y(soll.werte[i])} stroke={soll.farbe || f.textStark} strokeWidth="2.5" strokeLinecap="round" className="ov-flaeche-ein" />
              )}
              {zeigen && direkt(i) && (
                <text x={mitte(i)} y={Y(Math.max(0, gestapelt ? summe(i) : reihen[0].werte[i] ?? 0)) - 6} textAnchor="middle" fontSize={SCHRIFT.wert} fontWeight="600" fill={f.textStark} className="ov-flaeche-ein" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {direkt(i)}
                </text>
              )}
            </g>
          ))}
          {referenz.map((r) => (
            <g key={`ref-${r.y}-${r.text}`} className="ov-flaeche-ein">
              <line x1={P.l} x2={breite - P.r} y1={Y(r.y)} y2={Y(r.y)} stroke={r.farbe || ENERGIE.plan} strokeWidth="2" strokeDasharray="6 5" />
              {r.text && (
                <text x={breite - P.r - 2} y={Y(r.y) - 6} textAnchor="end" fontSize={SCHRIFT.achse} fontWeight="600" fill={f.textStark} paintOrder="stroke" stroke={dunkel ? "#03122b" : "#fff"} strokeWidth="3">
                  {r.text}
                </text>
              )}
            </g>
          ))}
          {linie && (
            <path
              d={linienPfad(linie.werte.map((v, i) => (Number.isFinite(v) ? [mitte(i), Y(v)] : null)))}
              fill="none"
              stroke={linie.farbe}
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={linie.gestrichelt === false ? undefined : "5 4"}
              className="ov-flaeche-ein"
            />
          )}
          <XBeschriftung eintraege={kategorien.map((k, i) => ({ pos: mitte(i), text: String(k) }))} P={P} breite={breite} hoehe={hoehe} dunkel={dunkel} />
        </Plot>
      </div>
    </DiagrammRahmen>
  );
}

export { ENERGIE };
