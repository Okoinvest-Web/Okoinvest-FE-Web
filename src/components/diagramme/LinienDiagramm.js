"use client";

// src/components/diagramme/LinienDiagramm.js
//
// Linie / Fläche / Treppe / gestapelte Fläche mit Fadenkreuz, Tooltip, Tastatur, Datentabelle, CSV/PNG.
// Linien zeichnen sich beim Einscrollen (ov-linie), Flächen blenden nach (ov-flaeche-ein); gestrichelte Reihen
// blenden nur ein (Strichmuster bleibt erhalten). Datenaktualisierung ohne erneuten Einlauf.
//
// Props (alle serialisierbar, damit Server-Komponenten sie direkt übergeben können):
//   reihen: [{ name, farbe, werte?: number[] | punkte?: [{ x, y }], texte?: string[], flaeche?: bool|Farbe,
//              gestrichelt?, treppe?, dicke?, achse?: "rechts", deckkraft? }]
//   xBeschriftung: [{ x, text }]   Achsenlabels (werden ausgedünnt);   alternativ kategorien: string[] (x = Index)
//   xTitel: string[] (je eindeutigem x, aufsteigend) – Tooltip-Titel;   alternativ xTitelFn (nur Client)
//   yEinheit, yStellen, nullLinie, gestapelt, rechts: { einheit, von, bis }
//   zusatz: [{ zeilen?: [{ name, wert }], fuss? }] je eindeutigem x – weitere Tooltip-Zeilen (z. B. Netzbezug, Fehlercode)
//   markierungen: [{ x, text }]   senkrechte Hinweislinien;   referenz: [{ y, text, farbe? }]  waagrechte (Soll)
//   direktLabels: Namen am Linienende (ohne Überlappung) – entlastet die Legende
//   titel, untertitel, beschreibung, hoehe, legende (true | false | eigene Einträge), werkzeuge, dunkel

import { useMemo } from "react";
import { ACHSE, ENERGIE, LINIENSTIL } from "@/components/ui/datenfarben";
import { DiagrammRahmen, Plot, useBreite } from "./Rahmen";
import { rahmenMasse, XBeschriftung, YRaster, YRechts } from "./Achsen";
import { achse, achsenText, flaechenPfad, linear, linienPfad, SCHRIFT, textBreite, wertText } from "./skala";

const flaechenFarbe = (r) => (typeof r.flaeche === "string" ? r.flaeche : r.farbe);
const flaechenDeckkraft = (r) => (typeof r.flaeche === "string" ? 1 : r.deckkraft ?? 0.18);

export default function LinienDiagramm({
  reihen = [],
  kategorien,
  xBeschriftung,
  xTitel,
  xTitelFn,
  zusatz,
  yEinheit = "",
  yStellen,
  format,
  nullLinie = true,
  gestapelt = false,
  rechts,
  markierungen = [],
  referenz = [],
  direktLabels = false,
  titel,
  einheit,
  untertitel,
  beschreibung,
  hoehe = 260,
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

  // Reihen normalisieren → punkte [{ x, y, text }]
  const norm = useMemo(
    () =>
      reihen.map((r, ri) => ({
        ...r,
        idx: ri,
        pkt: (r.punkte || (r.werte || []).map((y, x) => ({ x, y }))).map((p, i) => ({ x: Number(p.x), y: p.y == null ? null : Number(p.y), text: r.texte?.[i] })),
      })),
    [reihen]
  );

  // Eindeutige x-Werte (aufsteigend) und Index-Zuordnung
  const xs = useMemo(() => {
    const s = new Set();
    norm.forEach((r) => r.pkt.forEach((p) => Number.isFinite(p.x) && s.add(p.x)));
    return [...s].sort((a, b) => a - b);
  }, [norm]);
  const proX = useMemo(() => norm.map((r) => new Map(r.pkt.map((p) => [p.x, p]))), [norm]);

  // Stapel: kumulierte Werte je x (nur linke Achse)
  const stapel = useMemo(() => {
    if (!gestapelt) return null;
    const basis = new Map(xs.map((x) => [x, 0]));
    return norm.map((r, ri) => {
      if (r.achse === "rechts") return null;
      const m = new Map();
      xs.forEach((x) => {
        const p = proX[ri].get(x);
        const b = basis.get(x);
        const v = p && Number.isFinite(p.y) ? Math.max(0, p.y) : 0;
        m.set(x, [b, b + v]);
        basis.set(x, b + v);
      });
      return m;
    });
  }, [gestapelt, norm, xs, proX]);

  const fmt = (v, r) => (format ? format(v, r) : wertText(v, { stellen: yStellen, einheit: yEinheit }));

  if (!xs.length || !norm.some((r) => r.pkt.some((p) => Number.isFinite(p.y)))) {
    return <p className="text-[14px] text-ink-500">{leerText}</p>;
  }

  const links = norm.filter((r) => r.achse !== "rechts");
  const yWerte = gestapelt ? stapel.filter(Boolean).flatMap((m) => [...m.values()].map((v) => v[1])) : links.flatMap((r) => r.pkt.map((p) => p.y)).filter(Number.isFinite);
  referenz.forEach((r) => yWerte.push(r.y));
  const yA = achse(Math.min(nullLinie ? 0 : Infinity, ...yWerte), Math.max(nullLinie ? 0 : -Infinity, ...yWerte), hoehe < 200 ? 4 : 5);
  const rA = rechts ? achse(rechts.von ?? 0, rechts.bis ?? Math.max(...norm.filter((r) => r.achse === "rechts").flatMap((r) => r.pkt.map((p) => p.y)).filter(Number.isFinite)), 2) : null;

  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  const treppe = norm.some((r) => r.treppe);
  const xLabels = xBeschriftung || (kategorien ? kategorien.map((text, x) => ({ x, text })) : []);
  const masse = rahmenMasse({ breite, hoehe, yAchse: yA, rechts: rA, einheit: yEinheit || rechts?.einheit, xBeschriftung: xLabels.length > 0 });
  const direktB = direktLabels && !rA ? Math.min(140, Math.max(...norm.map((r) => textBreite(r.kurz || r.name))) + 24) : 0;
  const P = { ...masse.P, r: masse.P.r + direktB };
  const innenB = masse.innenB - direktB;
  const { innenH } = masse;
  const schritt = treppe && xs.length > 1 ? innenB / xs.length : 0;
  const X = linear([xMin, xMax === xMin ? xMin + 1 : xMax], [P.l + (xMax === xMin ? innenB / 2 : 0), P.l + innenB - schritt]);
  const Y = linear([yA.von, yA.bis], [P.t + innenH, P.t]);
  const YR = rA ? linear([rA.von, rA.bis], [P.t + innenH, P.t]) : Y;
  const basisY = Y(Math.max(yA.von, Math.min(0, yA.bis)));

  const titelFuer = (i) => (xTitelFn ? xTitelFn(xs[i]) : xTitel?.[i]) || xLabels.filter((l) => l.x <= xs[i] && l.text).pop()?.text || String(xs[i]);

  // Pfade
  const pfade = norm.map((r, ri) => {
    const S = r.achse === "rechts" ? YR : Y;
    if (stapel?.[ri]) {
      const oben = xs.map((x) => [X(x), Y(stapel[ri].get(x)[1])]);
      const unten = xs.map((x) => [X(x), Y(stapel[ri].get(x)[0])]);
      return { linie: linienPfad(oben, { treppe: r.treppe, stufenBreite: schritt }), flaeche: flaechenPfad(oben, unten, { treppe: r.treppe, stufenBreite: schritt }) };
    }
    const pk = r.pkt.map((p) => (Number.isFinite(p.y) ? [X(p.x), S(p.y)] : null));
    return {
      linie: linienPfad(pk, { treppe: r.treppe, stufenBreite: schritt }),
      flaeche: r.flaeche ? flaechenPfad(pk, r.achse === "rechts" ? YR(rA.von) : basisY, { treppe: r.treppe, stufenBreite: schritt }) : "",
    };
  });

  const indexAusPx = (px) => {
    const x = X.invers(px - schritt / 2);
    let lo = 0;
    let hi = xs.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (xs[m] < x) lo = m;
      else hi = m;
    }
    return Math.abs(xs[lo] - x) <= Math.abs(xs[hi] - x) ? lo : hi;
  };

  const info = (i) => {
    const x = xs[i];
    const zeilen = [];
    let yMin = P.t + innenH;
    norm.forEach((r, ri) => {
      const p = proX[ri].get(x);
      if (!p || !Number.isFinite(p.y)) return;
      const S = r.achse === "rechts" ? YR : Y;
      const yy = stapel?.[ri] ? Y(stapel[ri].get(x)[1]) : S(p.y);
      yMin = Math.min(yMin, yy);
      zeilen.push({ name: r.name, wert: p.text ?? (r.achse === "rechts" ? wertText(p.y, { einheit: rechts?.einheit }) : fmt(p.y, r)), farbe: r.farbe, stil: r.flaeche && !r.gestrichelt ? "flaeche" : "linie" });
    });
    if (zusatz?.[i]?.zeilen) zeilen.push(...zusatz[i].zeilen);
    return { x: X(x) + schritt / 2, y: yMin, titel: titelFuer(i), zeilen, fuss: zusatz?.[i]?.fuss };
  };

  const fadenkreuz = (i) => {
    const x = xs[i];
    const px = X(x) + schritt / 2;
    return (
      <>
        <line x1={px} x2={px} y1={P.t} y2={P.t + innenH} stroke={dunkel ? "rgba(255,255,255,0.45)" : "#97a0b0"} strokeDasharray="3 3" />
        {norm.map((r, ri) => {
          const p = proX[ri].get(x);
          if (!p || !Number.isFinite(p.y)) return null;
          const S = r.achse === "rechts" ? YR : Y;
          const yy = stapel?.[ri] ? Y(stapel[ri].get(x)[1]) : S(p.y);
          return <circle key={ri} cx={px} cy={yy} r="4.5" fill={r.farbe} stroke={dunkel ? "#03122b" : "#fff"} strokeWidth="2" />;
        })}
      </>
    );
  };

  // Datentabelle + CSV
  const tabelle =
    tabelleProp ??
    {
      kopf: [kategorien ? "Kategorie" : "Zeitpunkt", ...norm.map((r) => `${r.name}${r.achse === "rechts" ? (rechts?.einheit ? ` (${rechts.einheit})` : "") : yEinheit ? ` (${yEinheit})` : ""}`)],
      zeilen: xs.map((x, i) => [titelFuer(i), ...norm.map((r, ri) => {
        const p = proX[ri].get(x);
        return p && Number.isFinite(p.y) ? p.text ?? wertText(p.y, { stellen: yStellen }) : "–";
      })]),
      csv: {
        kopf: [kategorien ? "Kategorie" : "Zeitpunkt", ...norm.map((r) => `${r.name}${yEinheit && r.achse !== "rechts" ? ` (${yEinheit})` : ""}`)],
        zeilen: xs.map((x, i) => [titelFuer(i), ...norm.map((r, ri) => proX[ri].get(x)?.y ?? "")]),
      },
    };

  const legendeEintraege =
    legende === true
      ? norm.map((r) => ({ name: r.name, farbe: r.farbe, stil: r.flaeche && !r.gestrichelt ? "flaeche" : "linie", gestrichelt: r.gestrichelt }))
      : Array.isArray(legende)
        ? legende
        : null;

  const kurz = beschreibung || `${titel || "Liniendiagramm"}${yEinheit ? ` in ${yEinheit}` : ""}: ${norm.map((r) => r.name).join(", ")}`;

  return (
    <DiagrammRahmen titel={titel} einheit={einheit} untertitel={untertitel} beschreibung={kurz} tabelle={tabelle} legende={legendeEintraege} werkzeuge={werkzeuge} dunkel={dunkel} className={className}>
      <div ref={ref} className="min-w-0">
        <Plot breite={breite} hoehe={hoehe} anzahl={xs.length} indexAusPx={indexAusPx} info={info} fadenkreuz={fadenkreuz} beschreibung={kurz} dunkel={dunkel}>
          <YRaster yAchse={yA} Y={Y} P={P} breite={breite} einheit={yEinheit} dunkel={dunkel} />
          {rA && <YRechts achse={rA} Y={YR} P={P} breite={breite} einheit={rechts.einheit} farbe={rechts.farbe} dunkel={dunkel} />}
          {referenz.map((r) => (
            <g key={`ref-${r.y}-${r.text}`}>
              <line x1={P.l} x2={breite - P.r} y1={Y(r.y)} y2={Y(r.y)} stroke={r.farbe || ENERGIE.plan} strokeWidth="1.5" strokeDasharray="6 4" />
              {r.text && (
                <text x={breite - P.r - 4} y={Y(r.y) - 6} textAnchor="end" fontSize={SCHRIFT.achse} fill={f.textStark} paintOrder="stroke" stroke={dunkel ? "#03122b" : "#fff"} strokeWidth="3">
                  {r.text}
                </text>
              )}
            </g>
          ))}
          {pfade.map((p, ri) =>
            p.flaeche ? (
              <path key={`f${ri}`} d={p.flaeche} fill={flaechenFarbe(norm[ri])} fillOpacity={stapel ? norm[ri].deckkraft ?? 0.85 : flaechenDeckkraft(norm[ri])} stroke="none" className="ov-flaeche-ein" />
            ) : null
          )}
          {pfade.map((p, ri) => {
            const r = norm[ri];
            const strich = r.gestrichelt ? (typeof r.gestrichelt === "string" ? r.gestrichelt : LINIENSTIL[1]) : undefined;
            return (
              <path
                key={`l${ri}`}
                d={p.linie}
                pathLength={strich ? undefined : 1}
                fill="none"
                stroke={r.farbe}
                strokeWidth={r.dicke || 2}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={strich}
                className={strich ? "ov-flaeche-ein" : "ov-linie"}
                style={{ "--ov-delay": `${ri * 120}ms` }}
              />
            );
          })}
          {markierungen.map((m) => {
            const px = X(m.x) + schritt / 2;
            return (
              <g key={`m-${m.x}-${m.text}`}>
                <line x1={px} x2={px} y1={P.t} y2={P.t + innenH} stroke={ENERGIE.erzeugung} strokeWidth="1.5" strokeDasharray="4 3" />
                {m.text && (
                  <text x={px > breite - 90 ? px - 5 : px + 5} y={P.t + 12} textAnchor={px > breite - 90 ? "end" : "start"} fontSize={SCHRIFT.achse} fill={f.textStark} paintOrder="stroke" stroke={dunkel ? "#03122b" : "#fff"} strokeWidth="3">
                    {m.text}
                  </text>
                )}
              </g>
            );
          })}
          {direktB > 0 &&
            (() => {
              const pos = norm
                .map((r, ri) => {
                  const letzte = [...r.pkt].reverse().find((p) => Number.isFinite(p.y));
                  return letzte ? { ri, y: stapel?.[ri] ? Y(stapel[ri].get(letzte.x)[1]) : Y(letzte.y) } : null;
                })
                .filter(Boolean)
                .sort((a, b) => a.y - b.y);
              for (let k = 1; k < pos.length; k++) if (pos[k].y - pos[k - 1].y < 15) pos[k].y = pos[k - 1].y + 15;
              return pos.map(({ ri, y }) => (
                <g key={`d${ri}`} className="ov-flaeche-ein">
                  <line x1={breite - P.r + 4} x2={breite - P.r + 14} y1={y} y2={y} stroke={norm[ri].farbe} strokeWidth="3" strokeLinecap="round" />
                  <text x={breite - P.r + 18} y={y} dy="0.34em" fontSize={SCHRIFT.achse} fontWeight="600" fill={f.textStark}>
                    {norm[ri].kurz || norm[ri].name}
                  </text>
                </g>
              ));
            })()}
          <XBeschriftung eintraege={xLabels.map((l) => ({ pos: X(l.x) + schritt / 2, text: l.text }))} P={P} breite={breite} hoehe={hoehe} dunkel={dunkel} />
        </Plot>
      </div>
    </DiagrammRahmen>
  );
}

export { achsenText };
