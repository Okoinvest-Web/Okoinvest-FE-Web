"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Sigma, TrendingDown } from "lucide-react";
import useLiveDaten, { useBreite } from "./useLiveDaten";
import { preisTage, zeitfenster, achse, stundenmittel, formate, markt } from "./berechnung";
import KeineDaten from "./KeineDaten";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { useSeitenLand } from "@/components/Land/LandKontext";

/* Sprachmodell: feste Texte je Sprache */
const TEXTE = {
  de: {
    keinTitel: "Börsenpreise gerade nicht verfügbar",
    keinText: "Die Strombörsendaten konnten nicht geladen werden. Die Seite versucht es automatisch erneut – aktuelle Werte finden Sie auch direkt bei Energy-Charts.",
    avg: "Durchschnitt", jeKwh: "je kWh an der Börse", tief: "Tagestief", hoch: "Tageshoch", um: (u) => `um ${u} Uhr`, fenster3: "Günstigste 3 Stunden",
    min15: "15 Min.", stuendlich: "stündlich",
    titel: (heute, tag) => `Börsenstrompreis ${heute ? "heute" : "morgen"}, ${tag}`,
    tagWaehlen: "Tag wählen", heute: "Heute", morgen: "Morgen", morgenHinweis: "Preise für morgen erscheinen gegen 13 Uhr.",
    aria: (heute, avg, tief, tiefU, hoch, hochU, f) => `Börsenstrompreis ${heute ? "heute" : "morgen"}: Durchschnitt ${avg} Cent je kWh, Tief ${tief} Cent um ${tiefU} Uhr, Hoch ${hoch} Cent um ${hochU} Uhr${f ? `, günstigstes 3-Stunden-Fenster ${f}` : ""}. Mit Pfeiltasten durch die Werte blättern.`,
    g3: "Günstigste 3 h", hochK: "Hoch", tiefK: "Tief", jetzt: "Jetzt",
    boerse: "ct/kWh Börse", dayAhead: "Day-Ahead, netto", negativ: "Negativer Börsenpreis",
    lPreis: "Day-Ahead-Preis", lFenster: "Günstigstes 3-Stunden-Fenster", lNegativ: "Negativer Preis", keiner: " (heute keiner)", lJetzt: "Aktuelle Viertelstunde", lJetztStunde: "Aktuelle Stunde",
    tabelle: "Stundenwerte als Tabelle", caption: "Börsenstrompreis je Stunde in Cent pro Kilowattstunde", stunde: "Stunde",
    fussA: "Börsenpreise netto ohne Netzentgelte, Umlagen, Steuern und Beschaffungsaufschläge (1 €/MWh = 0,1 ct/kWh). Quelle:",
  },
  en: {
    keinTitel: "Exchange prices currently unavailable",
    keinText: "The power exchange data could not be loaded. The page will try again automatically – you can also find current figures directly at Energy-Charts.",
    avg: "Average", jeKwh: "per kWh on the exchange", tief: "Daily low", hoch: "Daily high", um: (u) => `at ${u}`, fenster3: "Cheapest 3 hours",
    min15: "15 min", stuendlich: "hourly",
    titel: (heute, tag) => `Exchange power price ${heute ? "today" : "tomorrow"}, ${tag}`,
    tagWaehlen: "Choose day", heute: "Today", morgen: "Tomorrow", morgenHinweis: "Prices for tomorrow are published at around 13:00.",
    aria: (heute, avg, tief, tiefU, hoch, hochU, f) => `Exchange power price ${heute ? "today" : "tomorrow"}: average ${avg} cents per kWh, low ${tief} cents at ${tiefU}, high ${hoch} cents at ${hochU}${f ? `, cheapest 3-hour window ${f}` : ""}. Use the arrow keys to browse the values.`,
    g3: "Cheapest 3 h", hochK: "High", tiefK: "Low", jetzt: "Now",
    boerse: "ct/kWh exchange", dayAhead: "day-ahead, net", negativ: "Negative exchange price",
    lPreis: "Day-ahead price", lFenster: "Cheapest 3-hour window", lNegativ: "Negative price", keiner: " (none today)", lJetzt: "Current quarter-hour", lJetztStunde: "Current hour",
    tabelle: "Hourly values as a table", caption: "Exchange power price per hour in cents per kilowatt hour", stunde: "Hour",
    fussA: "Exchange prices net, excluding grid fees, levies, taxes and procurement mark-ups (€1/MWh = 0.1 ct/kWh). Source:",
  },
};

// Farben (nur im Diagramm): Preislinie Markenblau, Negativpreise Markengrün
const F = {
  linie: "#1f5aa1",
  flaeche: "rgba(31,90,161,0.10)",
  negativ: "#436621",
  negativFlaeche: "rgba(102,153,51,0.28)",
  fenster: "rgba(102,153,51,0.13)",
  fensterKante: "#669933",
  raster: "#eef0f4",
  basis: "#c4cad5",
  text: "#6b7486",
  tinte: "#151a24",
};

/**
 * Day-Ahead-Preis (DE-LU) in 15-Minuten-Auflösung für heute bzw. morgen.
 * Negative Preise grün, günstigstes 3-Stunden-Fenster markiert, Fadenkreuz-Tooltip
 * (Maus, Touch und Pfeiltasten) und Tabellenansicht.
 */
export default function PreisChart({ initial }) {
  const { daten, jetzt } = useLiveDaten(initial);
  const sprache = useSprache();
  const { ct, uhr, spanne, tagLang, zahl } = formate(sprache);
  const w = TEXTE[sprache === "en" ? "en" : "de"];
  const tage = useMemo(() => preisTage(daten.preis, jetzt), [daten.preis, jetzt]);
  const [wahl, setWahl] = useState("heute");
  const [hover, setHover] = useState(null);
  const [ref, breite] = useBreite(1000);
  const zone = markt(useSeitenLand()).zone;

  const tag = (wahl === "morgen" && tage.morgen) || tage.heute || tage.morgen;
  const istHeute = tag && tag === tage.heute;

  const fenster = useMemo(
    () => (tag ? zeitfenster(tag.punkte, 180, tage.schrittMs).guenstig : null),
    [tag, tage.schrittMs]
  );

  if (!tag) {
    return (
      <KeineDaten
        titel={w.keinTitel}
        text={w.keinText}
      />
    );
  }

  const schmal = breite < 640;
  const H = schmal ? 280 : 380;
  const PAD = { l: schmal ? 36 : 46, r: 12, t: 34, b: 30 };
  const plotW = Math.max(breite - PAD.l - PAD.r, 50);
  const plotH = H - PAD.t - PAD.b;

  const werte = tag.punkte.map((p) => p.eurMwh / 10);
  const ax = achse(Math.min(0, ...werte), Math.max(0, ...werte), schmal ? 4 : 5);
  const x = (t) => PAD.l + ((t - tag.start) / (tag.ende - tag.start)) * plotW;
  const y = (v) => PAD.t + (1 - (v - ax.von) / (ax.bis - ax.von)) * plotH;
  const y0 = y(0);
  const s = tage.schrittMs;

  // Treppenlinie: jede Viertelstunde ein waagerechtes Stück
  let linie = "";
  tag.punkte.forEach((p, i) => {
    const yy = y(p.eurMwh / 10).toFixed(1);
    linie += i === 0 ? `M${x(p.t).toFixed(1)},${yy}` : `V${yy}`;
    linie += `H${x(p.t + s).toFixed(1)}`;
  });
  const flaeche = `${linie}V${y0.toFixed(1)}H${x(tag.start).toFixed(1)}Z`;
  const hatNegativ = tag.min.eurMwh < 0;

  // x-Achse
  const tickStd = schmal ? 6 : 3;
  const xTicks = [];
  for (let t = tag.start; t <= tag.ende; t += tickStd * 3600000) xTicks.push(t);

  const jetztX = istHeute && jetzt >= tag.start && jetzt < tag.ende ? x(jetzt) : null;
  const aktuellerPunkt = istHeute ? tage.aktuell : null;

  const idx = hover != null ? Math.min(Math.max(hover, 0), tag.punkte.length - 1) : null;
  const hp = idx != null ? tag.punkte[idx] : null;

  const zeigerAus = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.floor(((px - PAD.l) / plotW) * tag.punkte.length);
    setHover(Math.min(Math.max(i, 0), tag.punkte.length - 1));
  };

  const tasten = (e) => {
    const n = tag.punkte.length;
    const start = idx ?? (aktuellerPunkt ? tag.punkte.indexOf(aktuellerPunkt) : 0);
    const sprung = e.shiftKey ? 4 : 1;
    if (e.key === "ArrowRight") setHover(Math.min(start + (idx == null ? 0 : sprung), n - 1));
    else if (e.key === "ArrowLeft") setHover(Math.max(start - (idx == null ? 0 : sprung), 0));
    else if (e.key === "Home") setHover(0);
    else if (e.key === "End") setHover(n - 1);
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };

  // Beschriftungen Min/Max (selektiv, nicht jeder Punkt)
  const markeX = (t) => Math.min(Math.max(x(t + s / 2), PAD.l + 34), PAD.l + plotW - 34);
  const tooltipLinks = hp ? Math.min(Math.max(x(hp.t + s / 2) - 115, 0), breite - 230) : 0;

  const stat = [
    { icon: Sigma, label: w.avg, wert: `${ct(tag.avg)} ct`, sub: w.jeKwh },
    { icon: ArrowDownRight, label: w.tief, wert: `${ct(tag.min.eurMwh)} ct`, sub: w.um(uhr(tag.min.t)) },
    { icon: ArrowUpRight, label: w.hoch, wert: `${ct(tag.max.eurMwh)} ct`, sub: w.um(uhr(tag.max.t)) },
    fenster && { icon: TrendingDown, label: w.fenster3, wert: `${ct(fenster.avg)} ct`, sub: spanne(fenster.start, fenster.ende) },
  ].filter(Boolean);

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-ink-200/70">
      {/* Kopf mit Umschalter */}
      <div className="flex flex-col gap-5 border-b border-ink-100 p-5 sm:p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-600">
            Day-Ahead · {zone} · {tage.aufloesungMin === 15 ? w.min15 : w.stuendlich}
          </p>
          <h3 className="ov-h3 mt-2 text-ink-900">{w.titel(istHeute, tagLang(tag.start))}</h3>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <div role="group" aria-label={w.tagWaehlen} className="inline-flex rounded-full bg-ink-100 p-1">
            {[
              { v: "heute", l: w.heute, ok: !!tage.heute },
              { v: "morgen", l: w.morgen, ok: !!tage.morgen },
            ].map((o) => {
              const aktiv = (o.v === "heute" && istHeute) || (o.v === "morgen" && !istHeute);
              return (
                <button
                  key={o.v}
                  type="button"
                  aria-pressed={aktiv}
                  disabled={!o.ok}
                  onClick={() => {
                    setWahl(o.v);
                    setHover(null);
                  }}
                  className={`h-11 min-w-[96px] rounded-full px-5 text-[14px] font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45 ${
                    aktiv ? "bg-white text-ink-900 shadow-md" : "text-ink-600 hover:text-ink-800"
                  }`}
                >
                  {o.l}
                </button>
              );
            })}
          </div>
          {!tage.morgen && <p className="text-[12.5px] text-ink-500">{w.morgenHinweis}</p>}
        </div>
      </div>

      {/* Kennzahlen des gewählten Tages */}
      <dl className="grid grid-cols-2 gap-px bg-ink-100 lg:grid-cols-4">
        {stat.map((k) => (
          <div key={k.label} className="bg-white px-5 py-4 md:px-8 md:py-5">
            <dt className="flex items-center gap-2 text-[13px] text-ink-500">
              <k.icon aria-hidden="true" className="h-4 w-4 text-ov-600" />
              {k.label}
            </dt>
            <dd className="mt-1 font-display text-[22px] font-extrabold tracking-tight text-ink-900 md:text-[26px]">{k.wert}</dd>
            <dd className="text-[12.5px] text-ink-500">{k.sub}</dd>
          </div>
        ))}
      </dl>

      {/* Diagramm */}
      <div className="px-3 pb-2 pt-5 sm:px-5 md:px-8 md:pt-7">
        <div ref={ref} className="relative">
          <div
            tabIndex={0}
            role="img"
            aria-label={w.aria(istHeute, ct(tag.avg), ct(tag.min.eurMwh), uhr(tag.min.t), ct(tag.max.eurMwh), uhr(tag.max.t), fenster ? spanne(fenster.start, fenster.ende) : null)}
            onKeyDown={tasten}
            onBlur={() => setHover(null)}
            className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-4"
          >
            <svg width={breite} height={H} viewBox={`0 0 ${breite} ${H}`} className="block max-w-full select-none" aria-hidden="true">
              <defs>
                <clipPath id="pc-oben">
                  <rect x="0" y="0" width={breite} height={Math.max(y0, 0)} />
                </clipPath>
                <clipPath id="pc-unten">
                  <rect x="0" y={y0} width={breite} height={Math.max(H - y0, 0)} />
                </clipPath>
              </defs>

              {/* Raster + y-Achse */}
              {ax.ticks.map((v) => (
                <g key={v}>
                  <line x1={PAD.l} x2={PAD.l + plotW} y1={y(v)} y2={y(v)} stroke={v === 0 ? F.basis : F.raster} strokeWidth="1" />
                  <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11.5" fill={F.text} className="ov-num">
                    {zahl(v, ax.schritt < 1 ? 1 : 0)}
                  </text>
                </g>
              ))}
              <text x={2} y={PAD.t - 16} fontSize="11" fill={F.text}>
                ct/kWh
              </text>

              {/* Günstigstes 3-Stunden-Fenster – erscheint nach der Kurve (lenkt den Blick auf die Handlungsempfehlung).
                  key = Tag: beim Umschalten heute/morgen läuft der Einlauf neu */}
              {fenster && (
                <g key={`f-${tag.start}`} className="ov-flaeche-ein" style={{ animationDelay: "1050ms" }}>
                  <rect x={x(fenster.start)} y={PAD.t} width={x(fenster.ende) - x(fenster.start)} height={plotH} fill={F.fenster} />
                  <rect x={x(fenster.start)} y={PAD.t - 3} width={x(fenster.ende) - x(fenster.start)} height="3" rx="1.5" fill={F.fensterKante} />
                  <text
                    x={Math.min(Math.max((x(fenster.start) + x(fenster.ende)) / 2, PAD.l + 70), PAD.l + plotW - 70)}
                    y={PAD.t - 10}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="600"
                    fill="#436621"
                  >
                    {schmal ? w.g3 : `${w.g3} · Ø ${ct(fenster.avg)} ct`}
                  </text>
                </g>
              )}

              {/* Fläche + Linie, oberhalb/unterhalb 0 getrennt eingefärbt */}
              {/* Einlauf: Preiskurve zeichnet sich durch den Tag (00 → 24 Uhr), Flächen blenden nach */}
              <g key={`k-${tag.start}`}>
                <path d={flaeche} fill={F.flaeche} clipPath="url(#pc-oben)" className="ov-flaeche-ein" />
                {hatNegativ && <path d={flaeche} fill={F.negativFlaeche} clipPath="url(#pc-unten)" className="ov-flaeche-ein" />}
                <path d={linie} pathLength="1" fill="none" stroke={F.linie} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" clipPath={hatNegativ ? "url(#pc-oben)" : undefined} className="ov-linie" />
                {hatNegativ && <path d={linie} pathLength="1" fill="none" stroke={F.negativ} strokeWidth="2" strokeLinejoin="round" clipPath="url(#pc-unten)" className="ov-linie" />}
              </g>

              {/* x-Achse */}
              {xTicks.map((t) => (
                <text key={t} x={Math.min(Math.max(x(t), PAD.l + 14), PAD.l + plotW - 14)} y={H - 8} textAnchor="middle" fontSize="11.5" fill={F.text} className="ov-num">
                  {uhr(t) === "00:00" && t === tag.ende ? "24:00" : uhr(t)}
                </text>
              ))}

              {/* Tief/Hoch selektiv beschriften */}
              {[
                { p: tag.max, label: `${w.hochK} ${ct(tag.max.eurMwh)}`, oben: true },
                { p: tag.min, label: `${w.tiefK} ${ct(tag.min.eurMwh)}`, oben: false },
              ].map(({ p, label, oben }) => {
                const yy = y(p.eurMwh / 10);
                const ty = oben ? Math.max(yy - 14, PAD.t + 12) : Math.min(yy + 20, PAD.t + plotH - 6);
                return (
                  <g key={`${label}-${tag.start}`} className="ov-flaeche-ein" style={{ animationDelay: "900ms" }}>
                    <circle cx={x(p.t + s / 2)} cy={yy} r="4" fill={p.eurMwh < 0 ? F.negativ : F.linie} stroke="#fff" strokeWidth="2" />
                    <text x={markeX(p.t)} y={ty} textAnchor="middle" fontSize="12" fontWeight="600" fill={F.tinte} className="ov-num" paintOrder="stroke" stroke="#fff" strokeWidth="4" strokeLinejoin="round">
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* Jetzt-Markierung */}
              {jetztX != null && (
                <g>
                  <line x1={jetztX} x2={jetztX} y1={PAD.t} y2={PAD.t + plotH} stroke={F.tinte} strokeWidth="1" />
                  <rect x={Math.min(Math.max(jetztX - 21, PAD.l), PAD.l + plotW - 42)} y={PAD.t + plotH - 22} width="42" height="18" rx="9" fill={F.tinte} />
                  <text x={Math.min(Math.max(jetztX, PAD.l + 21), PAD.l + plotW - 21)} y={PAD.t + plotH - 9.5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">
                    {w.jetzt}
                  </text>
                  {aktuellerPunkt && (
                    <circle cx={jetztX} cy={y(aktuellerPunkt.eurMwh / 10)} r="5" fill={F.tinte} stroke="#fff" strokeWidth="2" />
                  )}
                </g>
              )}

              {/* Fadenkreuz */}
              {hp && (
                <g>
                  <line x1={x(hp.t + s / 2)} x2={x(hp.t + s / 2)} y1={PAD.t} y2={PAD.t + plotH} stroke={F.tinte} strokeOpacity="0.35" strokeWidth="1" />
                  <circle cx={x(hp.t + s / 2)} cy={y(hp.eurMwh / 10)} r="5" fill={hp.eurMwh < 0 ? F.negativ : F.linie} stroke="#fff" strokeWidth="2" />
                </g>
              )}

              {/* Trefferfläche größer als die Linie */}
              <rect
                x={PAD.l}
                y={0}
                width={plotW}
                height={H}
                fill="transparent"
                style={{ touchAction: "pan-y" }}
                onPointerMove={zeigerAus}
                onPointerDown={zeigerAus}
                onPointerLeave={() => setHover(null)}
              />
            </svg>
          </div>

          {hp && (
            <div
              className="pointer-events-none absolute top-0 z-10 w-[230px] rounded-xl bg-ink-900 px-4 py-3 text-white shadow-xl"
              style={{ left: tooltipLinks }}
              role="status"
            >
              <p className="text-[12px] text-white/60">{spanne(hp.t, hp.t + s)}</p>
              <p className="mt-0.5 flex items-center gap-2">
                <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: hp.eurMwh < 0 ? "#8cba58" : "#7fa7d6" }} />
                <span className="font-display text-[20px] font-extrabold tracking-tight">{ct(hp.eurMwh, 2)}</span>
                <span className="text-[12.5px] text-white/70">{w.boerse}</span>
              </p>
              <p className="mt-1 text-[12px] text-white/60">
                = <span className="ov-num text-white">{zahl(hp.eurMwh, 2)} €/MWh</span> {w.dayAhead}
              </p>
              {hp.eurMwh < 0 && <p className="mt-1 text-[12px] font-semibold text-ov-300">{w.negativ}</p>}
            </div>
          )}
        </div>

        {/* Legende */}
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 px-1 text-[13px] text-ink-600">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ background: F.linie }} />
            {w.lPreis}
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: F.fenster, boxShadow: `inset 0 2px 0 ${F.fensterKante}` }} />
            {w.lFenster}
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: F.negativFlaeche, boxShadow: `inset 0 -2px 0 ${F.negativ}` }} />
            {w.lNegativ}{hatNegativ ? ` (${zahl(tag.negativStunden, tag.negativStunden % 1 ? 2 : 0)} h)` : w.keiner}
          </li>
          {jetztX != null && (
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="h-3.5 w-px bg-ink-900" />
              {tage.aufloesungMin === 15 ? w.lJetzt : w.lJetztStunde}
            </li>
          )}
        </ul>
      </div>

      {/* Tabellenansicht */}
      <details className="group mx-5 mb-5 mt-4 rounded-2xl bg-ink-50 md:mx-8 md:mb-8">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-[14px] font-semibold text-ink-700 [&::-webkit-details-marker]:hidden">
          {w.tabelle}
          <span aria-hidden="true" className="text-ink-400 transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className="max-h-80 overflow-auto px-4 pb-4">
          <table className="ov-num w-full text-left text-[13.5px]">
            <caption className="sr-only">{w.caption}</caption>
            <thead className="sticky top-0 bg-ink-50 text-ink-600">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">{w.stunde}</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Ø ct/kWh</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Min</th>
                <th scope="col" className="py-2 text-right font-medium">Max</th>
              </tr>
            </thead>
            <tbody className="text-ink-800">
              {stundenmittel(tag.punkte).map((r) => (
                <tr key={r.t} className="border-t border-ink-200/70">
                  <td className="py-1.5 pr-3">{spanne(r.t, r.t + 3600000).replace(" Uhr", "")}</td>
                  <td className="py-1.5 pr-3 text-right font-semibold">{ct(r.avg, 2)}</td>
                  <td className="py-1.5 pr-3 text-right">{ct(r.min, 2)}</td>
                  <td className="py-1.5 text-right">{ct(r.max, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="border-t border-ink-100 px-5 py-4 text-[12.5px] leading-relaxed text-ink-500 md:px-8">
        {w.fussA}{" "}
        {tage.quelle || "Energy-Charts (Fraunhofer ISE)"}.
      </p>
    </div>
  );
}
