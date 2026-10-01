// src/components/Portal/EG/Energie/EnergieDashboard.js
//
// Energiedaten-Dashboard einer Gemeinschaft (WP3): Erzeugung, Verbrauch, Eigendeckung (13 Monate, 30 Tage, 7 Tage in
// Viertelstunden), Prognose der nächsten 7 Tage mit „grünen Stunden“, Datenqualitäts-Leitstand (Ampel je Zählpunkt und Tag,
// Reklamationsfälle, Lieferstatistik je Netzbetreiber), Abweichungsbericht Netzbetreiber ↔ eigene Zuteilung und Sozialquote.
// Ohne Hooks (Server-Komponente); interaktive Teile in Werkzeuge.js. Keine Fachlogik – alle Zahlen kommen aus dem Backend.

import Link from "next/link";
import { Activity, CalendarRange, Gauge, Leaf, Sun, TriangleAlert } from "lucide-react";
import { Badge, Hinweis, Karte, Kennzahl, Leer, Tabelle, zelle } from "@/components/Portal/ui";
import { BalkenChart, FARBEN, Legende, LinienChart } from "@/components/Portal/Energie/Diagramme";
import { cn } from "@/components/ui/cn";
import { ReklamierenKnopf } from "./Werkzeuge";

const zahl = (x, s = 0) => (Number.isFinite(Number(x)) && x !== null ? Number(x).toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s }) : "–");
const kwh = (x) => (Math.abs(x) >= 10000 ? `${zahl(x / 1000, 1)} MWh` : `${zahl(x, 0)} kWh`);
const pct = (x, s = 1) => (Number.isFinite(Number(x)) ? `${zahl(Number(x) * 100, s)} %` : "–");
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const monatKurz = (m) => `${MONATE[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;
const tagKurz = (t) => `${t.slice(8, 10)}.${t.slice(5, 7)}.`;
const AMPEL_KLASSE = { ok: "bg-ov-500", erwartet: "bg-ink-200", warn: "bg-sun-400", fehler: "bg-danger-500", keine: "bg-white ring-1 ring-inset ring-ink-100" };
const AMPEL_TON = { ok: "ok", erwartet: "neutral", warn: "warn", fehler: "warn" };
export const AMPEL_TEXT = { ok: "Vollständig", erwartet: "Lieferung erwartet", warn: "Prüfen (L3, verspätet)", fehler: "Reklamation nötig", keine: "keine Teilnahme" };

export function AmpelLegende() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-ink-600">
      {Object.entries(AMPEL_TEXT).map(([k, t]) => (
        <li key={k} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={cn("inline-block h-3 w-3 rounded-sm", AMPEL_KLASSE[k])} />{t}</li>
      ))}
    </ul>
  );
}

/** Kennzahlen und Verlaufsdiagramme */
export function EnergieUebersicht({ dashboard, qualitaet }) {
  const m = dashboard?.monate || [];
  const letzte12 = m.slice(-12);
  const s = (k) => letzte12.reduce((a, x) => a + (x[k] || 0), 0);
  const E = s("erzeugungTfKwh");
  const V = s("verbrauchTfKwh");
  const ED = s("eigendeckungKwh");
  if (!m.some((x) => x.tage > 0)) return <Leer icon={Activity} titel="Noch keine Energiedaten" text="Sobald der Netzbetreiber Viertelstundenwerte (CR_MSG) liefert oder Sie einen Export aus dem Netzbetreiber-Portal importieren, erscheinen hier Erzeugung, Verbrauch und Eigendeckung." />;
  const woche = dashboard.woche || [];
  const punkte = (g) => {
    const out = [];
    let x = 0;
    for (const t of woche) for (let i = 0; i < t.reihen[g].length; i++) out.push({ x: x++, y: t.reihen[g][i] * 4 });
    return out;
  };
  const ticks = [];
  let pos = 0;
  for (const t of woche) {
    ticks.push({ x: pos, t: t.tag });
    pos += t.reihen.erzeugung_tf.length;
  }
  const q = qualitaet?.zusammenfassung;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl label="Erzeugung × TF (12 Monate)" wert={kwh(E)} hinweis="in die Gemeinschaft eingebracht" icon={Sun} />
        <Kennzahl label="Verbrauch × TF (12 Monate)" wert={kwh(V)} hinweis="Bedarf der teilnehmenden Zählpunkte" icon={Gauge} />
        <Kennzahl label="Eigendeckung" wert={kwh(ED)} hinweis={`${pct(V ? ED / V : 0)} des Verbrauchs · ${pct(E ? ED / E : 0)} der Erzeugung genutzt`} icon={Leaf} />
        <Kennzahl label="Datenqualität (Monat)" wert={q ? pct(q.quoteOk, 0) : "–"} hinweis={q ? `${q.zaehler.fehler} Tage mit Reklamationsbedarf · ${q.zaehler.warn} prüfen` : ""} icon={q?.ampel === "ok" ? Activity : TriangleAlert} />
      </div>
      <Karte titel="Erzeugung, Verbrauch und Eigendeckung je Monat" untertitel="Werte des Netzbetreibers (CR_MSG) – maßgeblich für die Abrechnung (ElWG § 71)" aktion={<CalendarRange aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <BalkenChart
          kategorien={m.map((x) => monatKurz(x.monat))}
          reihen={[
            { name: "Erzeugung × TF", farbe: FARBEN.sonne, werte: m.map((x) => x.erzeugungTfKwh) },
            { name: "Verbrauch × TF", farbe: FARBEN.navy, werte: m.map((x) => x.verbrauchTfKwh) },
            { name: "Eigendeckung", farbe: FARBEN.gruen, werte: m.map((x) => x.eigendeckungKwh) },
          ]}
          yEinheit="kWh"
          format={(x) => zahl(x, 0)}
          beschreibung="Monatswerte Erzeugung, Verbrauch und Eigendeckung der Gemeinschaft"
        />
        <Legende className="mt-3" eintraege={[{ name: "Erzeugung × TF", farbe: FARBEN.sonne }, { name: "Verbrauch × TF", farbe: FARBEN.navy }, { name: "Eigendeckung", farbe: FARBEN.gruen }]} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead><tr className="text-left text-ink-500"><th className="py-1 pr-3 font-medium">Monat</th><th className="py-1 pr-3 text-right font-medium">Erzeugung</th><th className="py-1 pr-3 text-right font-medium">Verbrauch</th><th className="py-1 pr-3 text-right font-medium">Eigendeckung</th><th className="py-1 pr-3 text-right font-medium">Restüberschuss</th><th className="py-1 text-right font-medium">Quote</th></tr></thead>
            <tbody>{m.slice().reverse().filter((x) => x.tage > 0).map((x) => <tr key={x.monat} className="border-t border-ink-100"><td className="py-1 pr-3">{monatKurz(x.monat)}{x.tage < 28 ? ` (${x.tage} T.)` : ""}</td><td className="ov-num py-1 pr-3 text-right">{zahl(x.erzeugungTfKwh)}</td><td className="ov-num py-1 pr-3 text-right">{zahl(x.verbrauchTfKwh)}</td><td className="ov-num py-1 pr-3 text-right">{zahl(x.eigendeckungKwh)}</td><td className="ov-num py-1 pr-3 text-right">{zahl(x.restueberschussKwh)}</td><td className="ov-num py-1 text-right">{pct(x.eigendeckungsquote)}</td></tr>)}</tbody>
          </table>
        </div>
      </Karte>
      {woche.length > 0 && (
        <Karte titel="Letzte 7 Tage in Viertelstunden" untertitel="Leistung der Gemeinschaft in kW (kWh je Viertelstunde × 4)">
          <LinienChart
            reihen={[
              { name: "Erzeugung × TF", farbe: FARBEN.sonne, flaeche: "rgba(245,167,15,0.18)", punkte: punkte("erzeugung_tf") },
              { name: "Verbrauch × TF", farbe: FARBEN.navy, punkte: punkte("verbrauch_tf") },
              { name: "Eigendeckung", farbe: FARBEN.gruen, flaeche: FARBEN.gruenHell, punkte: punkte("eigendeckung") },
            ]}
            xTicks={ticks.map((t) => t.x)}
            xText={(x) => {
              const t = ticks.find((z) => z.x === x);
              return t ? `${WT[(new Date(`${t.t}T12:00:00Z`).getUTCDay() + 6) % 7]} ${tagKurz(t.t)}` : "";
            }}
            yEinheit="kW"
            beschreibung="Viertelstundenverlauf der letzten sieben Tage"
          />
          <Legende className="mt-3" eintraege={[{ name: "Erzeugung × TF", farbe: FARBEN.sonne }, { name: "Verbrauch × TF", farbe: FARBEN.navy }, { name: "Eigendeckung", farbe: FARBEN.gruen }]} />
        </Karte>
      )}
      {dashboard.tage?.length > 0 && (
        <Karte titel="Eigendeckungsquote der letzten 30 Tage" untertitel="Anteil des Verbrauchs, der je Tag aus der Gemeinschaft gedeckt wurde">
          <BalkenChart kategorien={dashboard.tage.map((t) => tagKurz(t.tag))} reihen={[{ name: "Eigendeckungsquote", farbe: FARBEN.gruen, werte: dashboard.tage.map((t) => t.eigendeckungsquote * 100) }]} yEinheit="%" format={(x) => zahl(x, 1)} hoehe={200} beschreibung="Tägliche Eigendeckungsquote" />
        </Karte>
      )}
    </div>
  );
}

/** Prognose der nächsten 7 Tage (Fachkonzept 4.8) */
export function PrognoseKarte({ prognose }) {
  if (!prognose?.tage?.length) return null;
  const morgen = prognose.tage[1] || prognose.tage[0];
  return (
    <Karte titel="Prognose: Gemeinschaftsstrom der nächsten 7 Tage" untertitel={`Kalibriert an ${prognose.tageHistorie} Tagen Messhistorie · ${prognose.hinweis}`} aktion={<Sun aria-hidden="true" className="h-5 w-5 text-sun-500" />}>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {prognose.tage.map((t) => (
          <li key={t.tag} className="rounded-2xl bg-sand-50 p-3 ring-1 ring-inset ring-ink-100">
            <p className="text-[12.5px] font-semibold text-ink-700">{WT[t.wochentag]} {tagKurz(t.tag)}</p>
            <p className="ov-num mt-1 font-display text-[18px] font-bold text-ink-900">{pct(t.quote, 0)}</p>
            <p className="text-[11.5px] text-ink-500">{zahl(t.erzeugungKwh)} von {zahl(t.verbrauchKwh)} kWh</p>
            <p className="mt-1 text-[11.5px] text-ink-500">Band {zahl(t.band.p10Kwh)}–{zahl(t.band.p90Kwh)} kWh</p>
            {t.gruenFenster.length > 0 ? <p className="mt-1.5 text-[12px] font-semibold text-ov-700">Grün: {t.gruenFenster.map((f) => `${f.von}–${f.bis}`).join(", ")}</p> : <p className="mt-1.5 text-[12px] text-ink-400">keine grünen Stunden</p>}
            {t.quelle === "wetter" && <Badge className="mt-1">Wetter</Badge>}
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Stundenverlauf {WT[morgen.wochentag]} {tagKurz(morgen.tag)}</p>
        <BalkenChart kategorien={morgen.stunden.map((s) => `${s.stunde}`)} reihen={[{ name: "Erzeugung", farbe: FARBEN.sonne, werte: morgen.stunden.map((s) => s.e) }, { name: "Verbrauch", farbe: FARBEN.navy, werte: morgen.stunden.map((s) => s.v) }]} yEinheit="kWh" format={(x) => zahl(x, 1)} hoehe={190} beschreibung="Prognose je Stunde für morgen" />
      </div>
      <p className="mt-3 text-[12.5px] text-ink-500">Empfehlung für Lastverschiebung (Waschen, Laden, Wärmepumpe) – keine Steuerung. Wettervorhersage (z. B. GeoSphere Austria) kann je Tag einen Bewölkungsfaktor liefern (Lizenz zu bestätigen).</p>
    </Karte>
  );
}

/** Datenqualitäts-Leitstand */
export function QualitaetLeitstand({ qualitaet, basisPfad, apiPfad, darfReklamieren = false }) {
  if (!qualitaet) return null;
  const q = qualitaet;
  const tage = q.tage || [];
  return (
    <Karte titel="Datenqualitäts-Leitstand" untertitel="Ampel je Zählpunkt und Tag: Lücken, L3-Werte (nicht abrechenbar), verspätete Lieferungen, Plausibilität (HA II 2.3.1, 13.1)" aktion={<Badge ton={AMPEL_TON[q.zusammenfassung.ampel]}>{AMPEL_TEXT[q.zusammenfassung.ampel]}</Badge>}>
      <nav aria-label="Monat wählen" className="-mx-1 mb-4 overflow-x-auto">
        <ul className="flex min-w-max gap-1 px-1">
          {q.monate.map((m) => (
            <li key={m.monat}>
              <Link href={`${basisPfad}?monat=${m.monat}`} aria-current={m.monat === q.monat ? "page" : undefined} className={cn("flex flex-col items-center rounded-xl px-2.5 py-1.5 text-[12px] ring-1 ring-inset", m.monat === q.monat ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:bg-ov-50")}>
                <span>{monatKurz(m.monat)}</span>
                <span aria-label={AMPEL_TEXT[m.tage ? m.ampel : "keine"]} className={cn("mt-1 h-1.5 w-6 rounded-full", m.tage ? AMPEL_KLASSE[m.ampel] : "bg-ink-100")} />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {q.zeilen.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-max border-separate border-spacing-[2px] text-[11.5px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white pr-2 text-left font-medium text-ink-500">Zählpunkt</th>
                {tage.map((t) => <th key={t} className="w-4 text-center font-normal text-ink-400">{Number(t.slice(8, 10))}</th>)}
              </tr>
            </thead>
            <tbody>
              {q.zeilen.map((z) => (
                <tr key={z.zaehlpunktId}>
                  <th scope="row" className="sticky left-0 z-10 max-w-[200px] truncate bg-white pr-2 text-left font-normal text-ink-700" title={z.zaehlpunktnummer}>
                    <span className="mr-1 text-ink-400">{z.richtung === "erzeugung" ? "↑" : "↓"}</span>{z.name || `…${z.zaehlpunktnummer.slice(-8)}`}
                  </th>
                  {z.tage.map((t) => <td key={t.tag}><span title={`${tagKurz(t.tag)}: ${AMPEL_TEXT[t.ampel]}${t.gruende.length ? ` – ${t.gruende.join("; ")}` : ""}`} className={cn("block h-4 w-4 rounded-[4px]", AMPEL_KLASSE[t.ampel])} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[14px] text-ink-500">Keine teilnehmenden Zählpunkte im gewählten Monat.</p>
      )}
      <AmpelLegende />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-[15px] font-bold text-ink-900">Reklamationsfälle</h3>
          {q.reklamationen.length ? (
            <ul className="mt-2 space-y-2">
              {q.reklamationen.map((r) => (
                <li key={`${r.zaehlpunktId}-${r.von}`} className="rounded-2xl p-3 ring-1 ring-inset ring-ink-200">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-ink-900">{r.name || r.zaehlpunktnummer}</p>
                      <p className="break-all text-[12px] text-ink-500">{r.zaehlpunktnummer} · {tagKurz(r.von)}{r.bis !== r.von ? `–${tagKurz(r.bis)}` : ""} ({r.tage} {r.tage === 1 ? "Tag" : "Tage"})</p>
                      <p className="mt-1 text-[12.5px] text-ink-700">{r.gruende.slice(0, 3).join(" · ")}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge ton={r.status === "offen" ? "warn" : "info"}>{r.status === "offen" ? (r.art === "nachforderung" ? "Nachforderung offen" : "Klärung offen") : r.status === "vorgemerkt" ? "vorgemerkt" : "gestellt"}</Badge>
                      {darfReklamieren && r.status === "offen" && <ReklamierenKnopf url={apiPfad} fall={r} />}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13.5px] text-ink-500">Keine offenen Fälle in diesem Monat.</p>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="font-display text-[15px] font-bold text-ink-900">Lieferstatistik (3 Monate)</h3>
          {q.lieferstatistik.map((l) => (
            <div key={l.netzbetreiberId} className="rounded-2xl bg-sand-50 p-3 ring-1 ring-inset ring-ink-100">
              <p className="text-[13.5px] font-semibold text-ink-900">{l.netzbetreiber}</p>
              <p className="text-[12.5px] text-ink-600">liefert im Schnitt nach {zahl(l.mittelTage, 1)} Tagen (Median {zahl(l.medianTage, 0)}, längstens {l.maxTage}) · {zahl(l.verspaetetPct, 1)} % nach Frist von {q.regeln.lieferFristTage} Tagen · {zahl(l.lieferungen)} Tageslieferungen</p>
            </div>
          ))}
          <Hinweis ton={q.gemeinschaftPruefung.verstoesse ? "warn" : "info"} titel="Summenprüfung der Gemeinschaft">{q.gemeinschaftPruefung.text}</Hinweis>
          <p className="text-[12px] text-ink-500">L3-Werte sind nicht abrechenbar und spätestens nach {q.regeln.l3FristTage} Tagen (BEG/VEZ: {q.regeln.l3FristTageBeg} Kalendertage) durch L1/L2 zu ersetzen. Lieferfrist und Reklamationsfrist sind Arbeitshypothesen (zu bestätigen).</p>
        </div>
      </div>
    </Karte>
  );
}

/** Abweichungsbericht und Sozialquote */
export function AbweichungKarte({ abweichung }) {
  if (!abweichung) return null;
  const a = abweichung;
  const sq = a.sozialquote;
  return (
    <Karte titel={`Abweichungsbericht ${monatKurz(a.monat)}`} untertitel={`Eigene Zuteilung (${a.verteilmodell}) gegen Netzbetreiber · Toleranz ${zahl(a.toleranzPct, 1)} % bzw. ${zahl(a.toleranzKwh, 1)} kWh je Zählpunkt`} aktion={<Badge ton={a.klaerfaelle ? "warn" : "ok"}>{a.klaerfaelle ? `${a.klaerfaelle} Klärfälle` : "im Rahmen"}</Badge>}>
      {a.zeilen.length ? (
        <Tabelle kopf={["Zählpunkt", "Größe", "Eigene Zuteilung", "Netzbetreiber", "Abweichung", ""]}>
          {a.zeilen.filter((z) => z.klaerfall).concat(a.zeilen.filter((z) => !z.klaerfall).slice(0, 8)).map((z) => (
            <tr key={z.zaehlpunktId} className={z.klaerfall ? "bg-sun-300/10" : ""}>
              <td className={zelle}><span className="font-semibold text-ink-900">{z.name || "–"}</span><span className="block break-all text-[12px] text-ink-500">{z.zaehlpunktnummer}</span></td>
              <td className={zelle}>{z.groesse === "eigendeckung" ? "Eigendeckung" : "Restüberschuss"}</td>
              <td className={`${zelle} ov-num text-right`}>{zahl(z.eigenKwh, 3)} kWh</td>
              <td className={`${zelle} ov-num text-right`}>{zahl(z.nbKwh, 3)} kWh</td>
              <td className={`${zelle} ov-num text-right`}>{zahl(z.abweichungKwh, 3)} kWh ({zahl(z.abweichungPct, 2)} %)</td>
              <td className={zelle}>{z.klaerfall ? <Badge ton="warn">Klärfall</Badge> : <Badge ton="ok">ok</Badge>}</td>
            </tr>
          ))}
        </Tabelle>
      ) : (
        <p className="text-[14px] text-ink-500">Keine Daten im Monat.</p>
      )}
      <p className="mt-3 text-[12.5px] text-ink-500">Summe eigene Zuteilung {zahl(a.summeEigenKwh, 1)} kWh · Netzbetreiber {zahl(a.summeNbKwh, 1)} kWh. {a.hinweis}</p>
      {sq?.anwendbar && (
        <Hinweis className="mt-4" ton={sq.erfuellt ? "info" : "warn"} titel={`Sozialquote § 68 Abs. 6 ElWG: ${zahl(sq.quotePct, 2)} % (Ziel ${sq.zielPct} %)`}>
          Von {zahl(sq.basisKwh, 0)} kWh aus Anlagen der Gemeinde gingen rechnerisch {zahl(sq.anSchutzbeduerftigeKwh, 0)} kWh an schutzbedürftige Haushalte bzw. Einrichtungen (Zurechnung je Viertelstunde).{sq.erfuellt ? "" : " Steuerung über Teilnahmefaktor oder Sozialtarif empfohlen – Auslegung der Bezugsgröße zu bestätigen."}
        </Hinweis>
      )}
    </Karte>
  );
}
