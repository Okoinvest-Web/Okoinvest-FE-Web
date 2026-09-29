"use client";

import { useMemo, useState } from "react";
import { Leaf, Sun, Wind, Factory } from "lucide-react";
import useLiveDaten, { useBreite } from "./useLiveDaten";
import { QUELLEN, erzeugungsVerlauf, achse, gw, uhr, zahl, textAuf, berlinTag, tagKurz, STUNDE } from "./berechnung";
import KeineDaten from "./KeineDaten";

const RASTER = "#eef0f4";
const TEXT = "#6b7486";
const TINTE = "#151a24";

/**
 * Öffentliche Nettostromerzeugung der letzten 24 Stunden, gestapelt nach Quelle,
 * mit Stromverbrauch (Last) als Linie. Die Differenz zwischen Stapel und Linie
 * entspricht grob Stromimport/-export und Speicherbetrieb.
 */
export default function ErzeugungChart({ initial }) {
  const { daten } = useLiveDaten(initial);
  const zeilen = useMemo(() => erzeugungsVerlauf(daten.erzeugung, 24), [daten.erzeugung]);
  const [hover, setHover] = useState(null);
  const [ref, breite] = useBreite(1000);

  const kennzahlen = useMemo(() => {
    if (!zeilen) return null;
    let gesamt = 0, ee = 0, solarMax = zeilen[0], windMax = zeilen[0], lastMax = zeilen[0];
    for (const z of zeilen) {
      gesamt += z.summe;
      ee += QUELLEN.filter((q) => q.ee).reduce((a, q) => a + z[q.key], 0);
      if (z.solar > solarMax.solar) solarMax = z;
      if (z.windOnshore + z.windOffshore > windMax.windOnshore + windMax.windOffshore) windMax = z;
      if ((z.last || 0) > (lastMax.last || 0)) lastMax = z;
    }
    const schrittH = (zeilen[1].t - zeilen[0].t) / STUNDE;
    return { gwh: (gesamt * schrittH) / 1000, eeQuote: (ee / gesamt) * 100, solarMax, windMax, lastMax };
  }, [zeilen]);

  if (!zeilen) {
    return (
      <KeineDaten
        titel="Erzeugungsdaten gerade nicht verfügbar"
        text="Die Daten zur Stromerzeugung werden gerade aktualisiert oder sind vorübergehend nicht erreichbar. Bitte versuchen Sie es in einigen Minuten erneut."
      />
    );
  }

  const schmal = breite < 640;
  const H = schmal ? 300 : 400;
  const PAD = { l: schmal ? 34 : 44, r: 10, t: 30, b: 30 };
  const plotW = Math.max(breite - PAD.l - PAD.r, 50);
  const plotH = H - PAD.t - PAD.b;
  const t0 = zeilen[0].t;
  const t1 = zeilen[zeilen.length - 1].t;
  const maxMw = Math.max(...zeilen.map((z) => Math.max(z.summe, z.last || 0)));
  const ax = achse(0, maxMw / 1000, schmal ? 4 : 5);
  const x = (t) => PAD.l + ((t - t0) / (t1 - t0 || 1)) * plotW;
  const y = (gwWert) => PAD.t + (1 - (gwWert - ax.von) / (ax.bis - ax.von)) * plotH;

  // Stapel berechnen
  const kum = zeilen.map((z) => {
    let b = 0;
    return QUELLEN.map((q) => {
      const unten = b;
      b += z[q.key] / 1000;
      return [unten, b];
    });
  });
  const flaechen = QUELLEN.map((q, k) => {
    const oben = zeilen.map((z, i) => `${x(z.t).toFixed(1)},${y(kum[i][k][1]).toFixed(1)}`);
    const unten = zeilen.map((z, i) => `${x(z.t).toFixed(1)},${y(kum[i][k][0]).toFixed(1)}`).reverse();
    return { q, d: `M${oben.join("L")}L${unten.join("L")}Z`, kante: `M${oben.join("L")}` };
  });
  const lastPunkte = zeilen.filter((z) => z.last != null).map((z) => `${x(z.t).toFixed(1)},${y(z.last / 1000).toFixed(1)}`);

  // Direkte Beschriftung der dicksten Bänder (nur wenn genug Platz)
  const labels = [];
  if (!schmal) {
    const kandidaten = QUELLEN.map((q, k) => {
      let best = -1, dicke = 0;
      zeilen.forEach((z, i) => {
        const px = y(kum[i][k][0]) - y(kum[i][k][1]);
        const xx = x(z.t);
        if (px > dicke && xx > PAD.l + 60 && xx < PAD.l + plotW - 60) { dicke = px; best = i; }
      });
      return { q, k, best, dicke };
    })
      .filter((c) => c.best >= 0 && c.dicke >= 24)
      .sort((a, b) => b.dicke - a.dicke)
      .slice(0, 4);
    for (const c of kandidaten) {
      const [u, o] = kum[c.best][c.k];
      labels.push({ q: c.q, x: x(zeilen[c.best].t), y: (y(u) + y(o)) / 2 + 4 });
    }
  }

  // Mitternacht markieren
  const mitternacht = zeilen.find((z, i) => i > 0 && berlinTag(z.t) !== berlinTag(zeilen[i - 1].t));

  // x-Ticks auf volle Stunden
  const tickStd = schmal ? 6 : 3;
  const xTicks = zeilen.filter((z) => {
    const h = Number(uhr(z.t).slice(0, 2));
    return uhr(z.t).endsWith(":00") && h % tickStd === 0;
  });

  const idx = hover != null ? Math.min(Math.max(hover, 0), zeilen.length - 1) : null;
  const hz = idx != null ? zeilen[idx] : null;

  const zeiger = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = t0 + ((e.clientX - r.left - PAD.l) / plotW) * (t1 - t0);
    let best = 0;
    zeilen.forEach((z, i) => { if (Math.abs(z.t - t) < Math.abs(zeilen[best].t - t)) best = i; });
    setHover(best);
  };
  const tasten = (e) => {
    const n = zeilen.length;
    const s = e.shiftKey ? 4 : 1;
    if (e.key === "ArrowRight") setHover(idx == null ? n - 1 : Math.min(idx + s, n - 1));
    else if (e.key === "ArrowLeft") setHover(idx == null ? n - 1 : Math.max(idx - s, 0));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };

  const tipX = hz ? x(hz.t) : 0;
  const tipLinks = hz ? (tipX > breite / 2 ? Math.max(tipX - 236, 0) : Math.min(tipX + 16, breite - 220)) : 0;
  const letzte = zeilen[zeilen.length - 1];

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-ink-200/70">
      <div className="flex flex-col gap-2 border-b border-ink-100 p-5 sm:p-6 md:flex-row md:items-end md:justify-between md:p-8">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-600">Nettostromerzeugung · Deutschland</p>
          <h3 className="ov-h3 mt-2 text-ink-900">Woher der Strom in den letzten 24 Stunden kam</h3>
        </div>
        <p className="text-[13px] text-ink-500">
          {tagKurz(t0)} {uhr(t0)} bis {tagKurz(t1)} {uhr(t1)} Uhr · in GW
        </p>
      </div>

      <div className="grid xl:grid-cols-[1fr_260px]">
        <div className="min-w-0 px-3 pb-4 pt-5 sm:px-5 md:px-8 md:pt-7">
          <div ref={ref} className="relative">
            <div
              tabIndex={0}
              role="img"
              aria-label={`Stromerzeugung der letzten 24 Stunden: ${zahl(kennzahlen.gwh, 0)} Gigawattstunden, davon ${Math.round(kennzahlen.eeQuote)} Prozent aus Wind, Sonne, Biomasse und Wasser. Mit Pfeiltasten durch die Werte blättern.`}
              onKeyDown={tasten}
              onBlur={() => setHover(null)}
              className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-4"
            >
              <svg width={breite} height={H} viewBox={`0 0 ${breite} ${H}`} className="block max-w-full select-none" aria-hidden="true">
                {ax.ticks.map((v) => (
                  <g key={v}>
                    <line x1={PAD.l} x2={PAD.l + plotW} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#c4cad5" : RASTER} strokeWidth="1" />
                    <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11.5" fill={TEXT} className="ov-num">{zahl(v, 0)}</text>
                  </g>
                ))}
                <text x={2} y={PAD.t - 14} fontSize="11" fill={TEXT}>GW</text>

                {flaechen.map(({ q, d }) => (
                  <path key={q.key} d={d} fill={q.farbe} />
                ))}
                {/* 2px Flächenfuge statt Umrandung */}
                {flaechen.map(({ q, kante }) => (
                  <path key={q.key} d={kante} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
                ))}

                {mitternacht && (
                  <g>
                    <line x1={x(mitternacht.t)} x2={x(mitternacht.t)} y1={PAD.t - 6} y2={PAD.t + plotH} stroke={TINTE} strokeOpacity="0.5" strokeWidth="1" />
                    {x(mitternacht.t) + 50 < PAD.l + plotW && (
                      <text x={x(mitternacht.t) + 6} y={PAD.t - 10} fontSize="11.5" fontWeight="600" fill={TINTE}>Heute</text>
                    )}
                    {x(mitternacht.t) - 60 > PAD.l && (
                      <text x={x(mitternacht.t) - 6} y={PAD.t - 10} textAnchor="end" fontSize="11.5" fill={TEXT}>{x(mitternacht.t) + 50 < PAD.l + plotW ? "Gestern" : "Mitternacht"}</text>
                    )}
                  </g>
                )}

                {/* Last mit Flächenring */}
                <polyline points={lastPunkte.join(" ")} fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={lastPunkte.join(" ")} fill="none" stroke={TINTE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

                {labels.map((l) => (
                  <text key={l.q.key} x={l.x} y={l.y} textAnchor="middle" fontSize="12" fontWeight="600" fill={textAuf(l.q.farbe)}>
                    {l.q.name}
                  </text>
                ))}

                {xTicks.map((z) => (
                  <text key={z.t} x={Math.min(Math.max(x(z.t), PAD.l + 14), PAD.l + plotW - 14)} y={H - 8} textAnchor="middle" fontSize="11.5" fill={TEXT} className="ov-num">
                    {uhr(z.t)}
                  </text>
                ))}

                {hz && (
                  <g>
                    <line x1={tipX} x2={tipX} y1={PAD.t} y2={PAD.t + plotH} stroke={TINTE} strokeWidth="1" />
                    {hz.last != null && <circle cx={tipX} cy={y(hz.last / 1000)} r="5" fill={TINTE} stroke="#fff" strokeWidth="2" />}
                  </g>
                )}

                <rect
                  x={PAD.l}
                  y={0}
                  width={plotW}
                  height={H}
                  fill="transparent"
                  style={{ touchAction: "pan-y" }}
                  onPointerMove={zeiger}
                  onPointerDown={zeiger}
                  onPointerLeave={() => setHover(null)}
                />
              </svg>
            </div>

            {hz && (
              <div className="pointer-events-none absolute top-2 z-10 w-[220px] rounded-xl bg-ink-900 px-4 py-3 text-white shadow-xl" style={{ left: tipLinks }}>
                <p className="text-[12px] text-white/60">{uhr(hz.t)} Uhr</p>
                <ul className="mt-1.5 space-y-0.5 text-[12.5px]">
                  {[...QUELLEN].reverse().map((q) => (
                    <li key={q.key} className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: q.farbe }} />
                      <span className="flex-1 text-white/70">{q.name}</span>
                      <span className="ov-num font-semibold">{gw(hz[q.key])}</span>
                    </li>
                  ))}
                  <li className="mt-1.5 flex items-center gap-2 border-t border-white/15 pt-1.5">
                    <span aria-hidden="true" className="h-0.5 w-3 shrink-0 rounded-full bg-white" />
                    <span className="flex-1 text-white/70">Verbrauch (Last)</span>
                    <span className="ov-num font-semibold">{gw(hz.last)}</span>
                  </li>
                  {hz.eeAnteil != null && (
                    <li className="flex items-center gap-2 pl-5">
                      <span className="flex-1 text-white/70">Erneuerbare</span>
                      <span className="ov-num font-semibold">{Math.round(hz.eeAnteil)} %</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 px-1 text-[13px] text-ink-600">
            {[...QUELLEN].reverse().map((q) => (
              <li key={q.key} className="flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: q.farbe }} />
                {q.name}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-ink-900" />
              Stromverbrauch (Last)
            </li>
          </ul>
        </div>

        <dl className="grid grid-cols-2 gap-px border-t border-ink-100 bg-ink-100 sm:grid-cols-4 xl:grid-cols-1 xl:border-l xl:border-t-0">
          <Kennzahl icon={Leaf} label="Anteil Erneuerbare" wert={`${Math.round(kennzahlen.eeQuote)} %`} sub="der Erzeugung in 24 h" />
          <Kennzahl icon={Sun} label="Solar-Spitze" wert={`${gw(kennzahlen.solarMax.solar)} GW`} sub={kennzahlen.solarMax.solar > 50 ? `um ${uhr(kennzahlen.solarMax.t)} Uhr` : "keine Solarerzeugung"} />
          <Kennzahl icon={Wind} label="Wind-Spitze" wert={`${gw(kennzahlen.windMax.windOnshore + kennzahlen.windMax.windOffshore)} GW`} sub={`um ${uhr(kennzahlen.windMax.t)} Uhr`} />
          <Kennzahl icon={Factory} label="Erzeugt in 24 h" wert={`${zahl(kennzahlen.gwh / 1000, 2)} TWh`} sub={`Lastspitze ${gw(kennzahlen.lastMax.last)} GW`} />
        </dl>
      </div>

      <details className="group mx-5 mb-5 rounded-2xl bg-ink-50 md:mx-8 md:mb-8">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-[14px] font-semibold text-ink-700 [&::-webkit-details-marker]:hidden">
          Stundenwerte als Tabelle
          <span aria-hidden="true" className="text-ink-400 transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className="max-h-80 overflow-auto px-4 pb-4">
          <table className="ov-num w-full min-w-[720px] text-left text-[13px]">
            <caption className="sr-only">Stromerzeugung je Quelle und Verbrauch in Gigawatt, volle Stunden</caption>
            <thead className="sticky top-0 bg-ink-50 text-ink-600">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">Uhrzeit</th>
                {[...QUELLEN].reverse().map((q) => (
                  <th key={q.key} scope="col" className="py-2 pr-3 text-right font-medium">{q.name}</th>
                ))}
                <th scope="col" className="py-2 text-right font-medium">Last</th>
              </tr>
            </thead>
            <tbody className="text-ink-800">
              {zeilen.filter((z) => uhr(z.t).endsWith(":00")).map((z) => (
                <tr key={z.t} className="border-t border-ink-200/70">
                  <td className="py-1.5 pr-3">{uhr(z.t)}</td>
                  {[...QUELLEN].reverse().map((q) => (
                    <td key={q.key} className="py-1.5 pr-3 text-right">{gw(z[q.key])}</td>
                  ))}
                  <td className="py-1.5 text-right font-semibold">{gw(z.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="border-t border-ink-100 px-5 py-4 text-[12.5px] leading-relaxed text-ink-500 md:px-8">
        Stand der Erzeugungsdaten: {uhr(letzte.t)} Uhr (Meldungen laufen mit etwas Verzögerung ein). Liegt die Linie über dem Stapel, wird Strom
        importiert oder aus Speichern entnommen; liegt sie darunter, exportiert Deutschland. „Sonstige“: Müll, Öl, Grubengas, Geothermie,
        Pumpspeicher. Quelle: Energy-Charts (Fraunhofer ISE), CC BY 4.0.
      </p>
    </div>
  );
}

function Kennzahl({ icon: Icon, label, wert, sub }) {
  return (
    <div className="bg-white p-5 md:p-6">
      <dt className="flex items-center gap-2 text-[13px] text-ink-500">
        <Icon aria-hidden="true" className="h-4 w-4 text-ov-600" />
        {label}
      </dt>
      <dd className="mt-1.5 font-display text-[24px] font-extrabold tracking-tight text-ink-900 md:text-[28px]">{wert}</dd>
      <dd className="text-[12.5px] text-ink-500">{sub}</dd>
    </div>
  );
}
