"use client";

import { SperrEingaben } from "./LaenderSperre";
import { useId, useMemo, useState } from "react";
import { Banknote, CalendarClock, ClipboardCheck, Coins, FileSignature, Gauge, Scale, ShieldCheck, Sprout } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import { ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { AMPEL, AmpelMarke, BalkenJahre, DiagrammKarte, FARBEN, ZahlFeld } from "./ToolTeile";
import { FLAECHENARTEN, INDEXARTEN, MODELLE, OPTIONEN, STANDARD, pruefePachtangebot } from "@/lib/rechner/pachtangebot";
import { REGION_KURZ } from "@/lib/rechner/pacht";
import { PACHT, REGIONEN } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

const tsd = (v) => (Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 2)} Mio. €` : `${fmt(v / 1000, v >= 1e5 ? 0 : 1)} Tsd. €`);

export default function PachtangebotCheck() {
  const [e, setE] = useState(STANDARD);
  const set = (k) => (v) => setE((alt) => ({ ...alt, [k]: v }));
  useTeilbarerZustand(e, (neu) => setE((alt) => ({ ...alt, ...neu })), {
    optionen: {
      regionId: REGIONEN.map((x) => x.id),
      flaechenart: FLAECHENARTEN.map((x) => x.id),
      modell: MODELLE.map((x) => x.id),
      indexArt: INDEXARTEN.map((x) => x.id),
      ...Object.fromEntries(Object.entries(OPTIONEN).map(([k, liste]) => [k, liste.map((o) => o.id)])),
    },
    grenzen: { ha: [1, 150] },
    pruefen: pruefePachtangebot,
  });
  const r = useMemo(() => pruefePachtangebot(e), [e]);
  const idBasis = useId();
  const spanne = r.spanne;

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl
      legende="Region"
      wert={e.regionId}
      onChange={set("regionId")}
      spalten={3}
      klein
      optionen={REGIONEN.map((x) => ({ id: x.id, label: REGION_KURZ[x.id] || x.label }))}
    />
  );

  return (
    <div id="pachtcheck-bericht">
      {/* Druckansicht: nur dieser Bericht, ohne Navigation und Eingabe-Bedienelemente */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #pachtcheck-bericht, #pachtcheck-bericht * { visibility: visible !important; }
          #pachtcheck-bericht { position: absolute; left: 0; top: 0; width: 100%; }
          #pachtcheck-bericht .pc-eingaben { display: none !important; }
          #pachtcheck-bericht .pc-druckkopf { display: block !important; }
          #pachtcheck-bericht details > *:not(summary) { display: block !important; }
          @page { margin: 14mm; }
        }
      `}</style>
      <div className="pc-druckkopf mb-6 hidden">
        <p className="font-display text-[22px] font-extrabold text-ink-900">Pachtangebot-Check · ÖkoInvest</p>
        <p className="text-[13px] text-ink-600">
          {fmt(e.ha, e.ha % 1 ? 1 : 0)} ha {FLAECHENARTEN.find((f) => f.id === e.flaechenart).label}, {REGIONEN.find((x) => x.id === e.regionId)?.label} · Orientierung, keine Rechtsberatung · erstellt am{" "}
          {/* Datum nur für den Druck – Server und Browser können abweichen (Zeitzone, Mitternacht) */}
          <span suppressHydrationWarning>{new Date().toLocaleDateString("de-DE")}</span>
        </p>
      </div>

      <RechnerRahmen
        mitlaufend
        breiteLinks={430}
        sperre={sperre}
        eingaben={sperre ? (
          <SperrEingaben>{regionWahl}</SperrEingaben>
        ) : (
          <div className="pc-eingaben">
            <MobilKurz
              werte={[
                ["Summe", tsd(r.summe)],
                ["Barwert", tsd(r.barwert)],
                ["Kritisch", `${r.zaehler.kritisch} von ${r.klauseln.length}`],
              ]}
            />
            <p className="mb-6 text-[14px] leading-relaxed text-ink-600">
              Übertragen Sie die Eckdaten aus dem Angebot. Wo etwas nicht geregelt ist, wählen Sie die entsprechende Option – genau das ist oft der wichtigste Befund.
            </p>
            <div className="space-y-8">
              <Gruppe titel="1 · Fläche">
                <Regler label="Flächengröße" wert={e.ha} min={1} max={150} step={0.5} stellen={e.ha % 1 ? 1 : 0} einheit="ha" onChange={set("ha")} hinweis={`≈ ${fmt(r.kwp / 1000, 1)} MWp auf der Fläche`} />
                <Auswahl legende="Art des Projekts" wert={e.flaechenart} onChange={set("flaechenart")} optionen={FLAECHENARTEN} />
                {regionWahl}
              </Gruppe>

              <Gruppe titel="2 · Vergütung">
                <Auswahl legende="Pachtmodell laut Angebot" wert={e.modell} onChange={set("modell")} optionen={MODELLE} />
                {e.modell === "fest" && (
                  <ZahlFeld
                    id={`${idBasis}-proha`}
                    label="Pacht je Hektar und Jahr"
                    wert={e.proHa}
                    onChange={set("proHa")}
                    min={0}
                    max={10000}
                    step={50}
                    einheit="€/ha"
                    hinweis={`Übliche Spanne ${fmt(spanne.min)}–${fmt(spanne.max)} €/ha (${e.flaechenart === "agri" ? "Agri-PV" : "Freifläche"})`}
                  />
                )}
                {e.modell !== "fest" && (
                  <Regler
                    label="Umsatzbeteiligung"
                    wert={e.umsatzAnteil * 100}
                    min={1}
                    max={12}
                    step={0.5}
                    stellen={1}
                    einheit="%"
                    onChange={(v) => set("umsatzAnteil")(v / 100)}
                    hinweis={`Üblich ${fmt(PACHT.umsatzbeteiligung.min * 100)}–${fmt(PACHT.umsatzbeteiligung.max * 100)} % der Stromerlöse – gerechnet mit EEG-Wert, danach Marktwert.`}
                  />
                )}
                {e.modell === "kombi" && (
                  <ZahlFeld id={`${idBasis}-min`} label="Mindestpacht" wert={e.mindestProHa} onChange={set("mindestProHa")} min={0} max={8000} step={50} einheit="€/ha" />
                )}
                {e.modell !== "umsatz" && (
                  <>
                    <Auswahl legende="Wertsicherung (Indexierung)" wert={e.indexArt} onChange={set("indexArt")} optionen={INDEXARTEN} />
                    {e.indexArt === "fest" && (
                      <Regler label="Feste Steigerung" wert={e.indexSatz * 100} min={0.25} max={3} step={0.25} stellen={2} einheit="% p. a." onChange={(v) => set("indexSatz")(v / 100)} />
                    )}
                  </>
                )}
              </Gruppe>

              <Gruppe titel="3 · Laufzeit">
                <Regler label="Feste Laufzeit" wert={e.laufzeit} min={15} max={45} step={1} einheit="Jahre" onChange={set("laufzeit")} />
                <Regler
                  label="Verlängerungsoptionen des Pächters"
                  wert={e.verlaengerungJahre}
                  min={0}
                  max={30}
                  step={1}
                  format={(v) => (v ? `${v} Jahre` : "keine")}
                  onChange={set("verlaengerungJahre")}
                  hinweis={`Üblich ${PACHT.laufzeit} Jahre + ${PACHT.verlaengerung}`}
                />
              </Gruppe>

              <Gruppe titel="4 · Bis zum Baubeginn">
                <Regler
                  label="Reservierungsprämie"
                  wert={e.reservierungProHa}
                  min={0}
                  max={600}
                  step={10}
                  format={(v) => (v ? `${fmt(v)} €/ha·a` : "keine")}
                  onChange={set("reservierungProHa")}
                  hinweis={`Üblich ${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €/ha je Jahr bis Baubeginn`}
                />
                <Regler label="Erwartete Jahre bis Baubeginn" wert={e.vorlaufJahre} min={0} max={8} step={1} format={(v) => (v ? `${v} Jahre` : "sofort")} onChange={set("vorlaufJahre")} />
                <Regler
                  label="Späteste Frist laut Vertrag"
                  wert={e.optionsfrist}
                  min={0}
                  max={10}
                  step={1}
                  format={(v) => (v ? `${v} Jahre` : "unbegrenzt")}
                  minLabel="unbegrenzt"
                  onChange={set("optionsfrist")}
                  hinweis="Nach dieser Frist sollte der Vertrag automatisch enden, wenn nicht gebaut wird."
                />
                <Auswahl legende="Bewirtschaftung bis Baubeginn" wert={e.bewirtschaftung} onChange={set("bewirtschaftung")} optionen={OPTIONEN.bewirtschaftung} klein />
                <Auswahl legende="Wenn nicht gebaut wird" wert={e.nichtbau} onChange={set("nichtbau")} optionen={OPTIONEN.nichtbau} klein />
                <Auswahl legende="Rücktrittsrecht des Projektierers" wert={e.kuendigung} onChange={set("kuendigung")} optionen={OPTIONEN.kuendigung} klein />
              </Gruppe>

              <Gruppe titel="5 · Sicherheit & Grundbuch">
                <Auswahl legende="Rückbausicherheit" wert={e.rueckbau} onChange={set("rueckbau")} optionen={OPTIONEN.rueckbau} spalten={2} klein />
                {e.rueckbau !== "keine" && <Auswahl legende="Sicherheit liegt vor" wert={e.rueckbauAb} onChange={set("rueckbauAb")} optionen={OPTIONEN.rueckbauAb} klein />}
                <Auswahl legende="Dienstbarkeit im Grundbuch" wert={e.dienstbarkeit} onChange={set("dienstbarkeit")} optionen={OPTIONEN.dienstbarkeit} klein />
                <Schalter icon={Scale} label="Rangrücktritt gefordert" beschreibung="Bestehende Grundschulden sollen zurücktreten" an={e.rangruecktritt} onChange={set("rangruecktritt")} />
                <Auswahl legende="Nebenflächen (Weg, Kabel, Ausgleich)" wert={e.nebenflaechen} onChange={set("nebenflaechen")} optionen={OPTIONEN.nebenflaechen} spalten={2} klein />
              </Gruppe>

              <Gruppe titel="6 · Kosten der Prüfung">
                <Auswahl legende="Anwalt/Notar übernimmt der Projektierer" wert={e.anwalt} onChange={set("anwalt")} optionen={OPTIONEN.anwalt} klein />
                {e.anwalt === "gedeckelt" && (
                  <Regler label="Deckel" wert={e.anwaltBetrag} min={250} max={5000} step={250} format={(v) => `${fmt(v)} €`} onChange={set("anwaltBetrag")} />
                )}
              </Gruppe>

              <Gruppe titel="Bewertung">
                <Regler
                  label="Kalkulationszins für den Barwert"
                  wert={e.diskont * 100}
                  min={0}
                  max={8}
                  step={0.5}
                  stellen={1}
                  einheit="%"
                  onChange={(v) => set("diskont")(v / 100)}
                  hinweis="Was ist Ihnen Geld heute gegenüber Geld in 20 Jahren wert? 3 % entspricht etwa einer sicheren Alternativanlage plus Inflation."
                />
              </Gruppe>
            </div>
          </div>
        )}
        ergebnis={
          <>
            <p className="sr-only" aria-live="polite">
              {`${r.urteil.titel}. Summe ${Math.round(r.summe)} Euro, Barwert ${Math.round(r.barwert)} Euro. ${r.zaehler.kritisch} kritische und ${r.zaehler.pruefen} zu prüfende Klauseln.`}
            </p>
            <ErgebnisKopf titel="Ihr Angebot im Check" plakette={`${r.klauseln.length} Punkte geprüft`} />

            <Urteil r={r} />

            <Hauptzahl
              className="mt-5"
              icon={Coins}
              label={`Summe ${r.jahre.length} Jahre`}
              zusatz={`Ø ${fmt(r.durchschnittProHa)} €/ha·a, nominal`}
              rechts={
                <div className="sm:text-right">
                  <p className="flex items-center gap-1.5 text-[12.5px] text-white/75 sm:justify-end">
                    <Banknote aria-hidden="true" className="h-3.5 w-3.5" />
                    Barwert heute
                  </p>
                  <p className="ov-kpi mt-0.5 text-white">
                    <Zahl wert={r.barwert} format={tsd} />
                  </p>
                  <p className="text-[12.5px] text-white/75">abgezinst mit {fmt(e.diskont * 100, 1)} %</p>
                </div>
              }
            >
              <Zahl wert={r.summe} format={tsd} delta="dunkel" einlauf />
            </Hauptzahl>
            <Belege spalten={2}>
              <Kennzahl ton="akzent" icon={Sprout} label="1. Betriebsjahr" zusatz={`${fmtEur(r.proHaErstesJahr * e.ha)} gesamt`}>
                <Zahl wert={r.proHaErstesJahr} suffix=" €/ha" delta="hell" />
              </Kennzahl>
              <Kennzahl icon={Gauge} label="ggü. Marktmitte" zusatz="Barwert, gleicher Vorlauf">
                {r.anteilMarktMittel != null ? <Zahl wert={r.anteilMarktMittel * 100} suffix=" %" delta="hell" deltaFormat={(dd) => `${fmt(dd)} %-Pkt.`} /> : "–"}
              </Kennzahl>
            </Belege>

            <Marktbalken r={r} />

            {r.summeVorlauf > 0 && (
              <Hinweis ton="neutral" icon={CalendarClock} className="mt-4">
                Davon {fmtEur(r.summeVorlauf)} Reservierungsprämie in {e.vorlaufJahre} {e.vorlaufJahre === 1 ? "Jahr" : "Jahren"} bis Baubeginn. Verlängerungsoptionen ({e.verlaengerungJahre} Jahre) sind nicht eingerechnet.
              </Hinweis>
            )}

            <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
                Fachliche Orientierung, keine Rechtsberatung. Lassen Sie den Vertragstext vor der Unterschrift anwaltlich prüfen – idealerweise auf Kosten des Projektierers.
              </p>
            </div>
          </>
        }
        unten={
          <div className="space-y-6">
            <Klauseln r={r} />
            <DiagrammKarte titel="Zahlungen je Jahr" zusatz="Reservierungsprämie bis Baubeginn, danach Pacht">
              <BalkenJahre
                zeilen={r.jahre.map((j) => ({ label: String(j.jahr), werte: j.betrieb ? { pacht: j.betrag } : { reservierung: j.betrag } }))}
                serien={[
                  { key: "reservierung", label: "Reservierungsprämie", farbe: FARBEN.sunHell },
                  { key: "pacht", label: "Pacht", farbe: FARBEN.gruen },
                ]}
                ariaLabel={`Balkendiagramm der jährlichen Zahlungen über ${r.jahre.length} Jahre, zusammen ${Math.round(r.summe)} Euro.`}
                tooltip={(z, i) => (
                  <>
                    <p className="font-semibold">Jahr {r.jahre[i].jahr}{r.jahre[i].betrieb ? "" : " · vor Baubeginn"}</p>
                    <p className="text-white/70">
                      Zahlung <span className="ov-num font-semibold text-white">{fmtEur(r.jahre[i].betrag)}</span>
                    </p>
                  </>
                )}
              />
            </DiagrammKarte>
            <Fragen r={r} />
            <div className="flex flex-col gap-4 rounded-3xl bg-navy-950 p-6 text-white md:flex-row md:items-center md:justify-between md:p-8 print:hidden">
              <div className="max-w-xl">
                <p className="font-display text-[20px] font-extrabold tracking-tight">Zweite Meinung zu Ihrem Angebot?</p>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/75">
                  Wir sehen uns Ihre Fläche an und legen Ihnen ein eigenes, schriftliches Angebot vor – für Flächeneigentümer kostenfrei und unverbindlich.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Button href="/flaechencheck" variant="white" size="lg" pfeil>
                  Fläche prüfen lassen
                </Button>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}

function Urteil({ r }) {
  const ton = r.urteil.id === "gut" ? "bg-ov-50 ring-ov-200" : r.urteil.id === "kritisch" ? "bg-ink-900 text-white ring-ink-900" : "bg-sun-300/25 ring-sun-400/50";
  const dunkel = r.urteil.id === "kritisch";
  return (
    <div className={cn("mt-5 rounded-3xl p-5 ring-1 md:p-6", ton)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn("font-display text-[21px] font-extrabold tracking-tight", dunkel ? "text-white" : "text-ink-900")}>{r.urteil.titel}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Verteilung der Bewertungen">
          {["gut", "pruefen", "kritisch"].map((a) => (
            <li key={a} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold", dunkel ? "bg-white/10 text-white" : "bg-white text-ink-800 ring-1 ring-ink-200/70")}>
              <span className={cn("h-2 w-2 rounded-full", a === "kritisch" && dunkel ? "bg-sun-400" : AMPEL[a].punkt)} aria-hidden="true" />
              {r.zaehler[a]} {AMPEL[a].kurz}
            </li>
          ))}
        </ul>
      </div>
      <p className={cn("mt-2 text-[14.5px] leading-relaxed", dunkel ? "text-white/80" : "text-ink-700")}>{r.urteil.text}</p>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/60" role="img" aria-label={`Punktwert ${Math.round(r.punkte * 100)} von 100`}>
        {r.klauseln.map((k) => (
          <span key={k.id} className={cn("h-full flex-1 border-r border-white/70 last:border-r-0", k.ampel === "kritisch" ? (dunkel ? "bg-sun-400" : "bg-ink-900") : AMPEL[k.ampel].punkt)} />
        ))}
      </div>
    </div>
  );
}

function Marktbalken({ r }) {
  const { min, mittel, max } = r.marktBw;
  const lo = Math.min(min, r.barwert) * 0.9;
  const hi = Math.max(max, r.barwert) * 1.05;
  const anteil = (v) => (v - lo) / (hi - lo);
  const pos = (v) => `${anteil(v) * 100}%`;
  const a = anteil(r.barwert);
  const labelLage = a < 0.18 ? "left-0" : a > 0.82 ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <div className="mt-5 rounded-2xl bg-ink-50 p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[13.5px] font-semibold text-ink-800">Barwert im Marktvergleich</p>
        <p className="text-[12px] text-ink-500">übliche Pacht, VPI-indexiert, übliche Prämie</p>
      </div>
      <div className="relative mt-8 h-3 rounded-full bg-ink-200" role="img" aria-label={`Ihr Angebot ${fmtEur(r.barwert)}; marktüblich ${fmtEur(min)} bis ${fmtEur(max)}, Mitte ${fmtEur(mittel)}`}>
        <div className="absolute inset-y-0 rounded-full bg-ov-200" style={{ left: pos(min), width: `calc(${pos(max)} - ${pos(min)})` }} />
        <div className="absolute inset-y-[-3px] w-[2px] bg-ov-600" style={{ left: pos(mittel) }} />
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(r.barwert) }}>
          <span className="block h-5 w-5 rounded-full border-[3px] border-white bg-navy-700 shadow" />
          <span className={cn("absolute bottom-6 whitespace-nowrap rounded-md", labelLage, "bg-navy-950 px-2 py-0.5 text-[11.5px] font-semibold text-white")}>Ihr Angebot</span>
        </div>
      </div>
      <div className="mt-2 flex justify-between gap-2 text-[11.5px] text-ink-500">
        <span className="ov-num">untere Spanne {tsd(min)}</span>
        <span className="ov-num hidden sm:inline">Mitte {tsd(mittel)}</span>
        <span className="ov-num">obere Spanne {tsd(max)}</span>
      </div>
    </div>
  );
}

function Klauseln({ r }) {
  const [filter, setFilter] = useState("alle");
  const liste = r.klauseln.filter((k) => filter === "alle" || (filter === "offen" ? k.ampel !== "gut" : true));
  return (
    <section aria-labelledby="pc-klauseln" className="rounded-3xl ring-1 ring-ink-200/70">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 md:px-6">
        <div>
          <h3 id="pc-klauseln" className="font-display text-[19px] font-extrabold tracking-tight text-ink-900">
            Klausel für Klausel
          </h3>
          <p className="text-[12.5px] text-ink-500">Bewertung gegenüber dem, was im Markt üblich ist</p>
        </div>
        <div role="radiogroup" aria-label="Klauseln filtern" className="inline-flex rounded-full bg-ink-100 p-1 print:hidden">
          {[
            ["alle", "Alle"],
            ["offen", "Nur offene Punkte"],
          ].map(([id, label]) => (
            <label key={id} className={cn("cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500", filter === id ? "bg-white text-ink-900 shadow-sm" : "text-ink-600")}>
              <input type="radio" name="pc-filter" className="sr-only" checked={filter === id} onChange={() => setFilter(id)} />
              {label}
            </label>
          ))}
        </div>
      </div>
      <ul className="mt-4 divide-y divide-ink-100 border-t border-ink-100">
        {liste.map((k) => (
          <li key={k.id} className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] md:gap-6 md:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <AmpelMarke ampel={k.ampel} klein />
              </div>
              <p className="mt-2 font-display text-[16px] font-bold leading-snug text-ink-900">{k.titel}</p>
              <p className="ov-num mt-0.5 text-[13px] text-ink-500">Angebot: {k.wert}</p>
            </div>
            <p className="text-[14px] leading-relaxed text-ink-700">{k.text}</p>
          </li>
        ))}
        {liste.length === 0 && <li className="px-6 py-5 text-[14px] text-ink-600">Keine offenen Punkte – alle Klauseln liegen im marktüblichen Bereich.</li>}
      </ul>
    </section>
  );
}

function Fragen({ r }) {
  const [erledigt, setErledigt] = useState({});
  const offen = r.fragen.filter((_, i) => !erledigt[i]).length;
  return (
    <section aria-labelledby="pc-fragen" className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="pc-fragen" className="flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-tight text-ink-900">
          <ClipboardCheck aria-hidden="true" className="h-5 w-5 text-ov-600" /> Fragen an den Projektierer
        </h3>
        <span className="text-[12.5px] font-semibold text-ink-500">{offen} offen</span>
      </div>
      <p className="mt-1 text-[13px] text-ink-500">Zum Abhaken im Gespräch – und zum Ausdrucken.</p>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {r.fragen.map((f, i) => (
          <li key={f.frage} className="flex">
            <label className="flex w-full cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ink-200/70 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
              <input
                type="checkbox"
                checked={!!erledigt[i]}
                onChange={(ev) => setErledigt((alt) => ({ ...alt, [i]: ev.target.checked }))}
                className="mt-1 h-4 w-4 shrink-0 accent-[#558227]"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">{f.thema}</span>
                  {f.ampel !== "standard" && <AmpelMarke ampel={f.ampel} klein />}
                </span>
                <span className={cn("mt-1 block text-[14px] leading-relaxed", erledigt[i] ? "text-ink-400 line-through" : "text-ink-800")}>{f.frage}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-500">
        <FileSignature aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
        Lassen Sie sich Antworten schriftlich geben und in den Vertrag übernehmen. Mündliche Zusagen helfen im Streitfall nicht.
      </p>
      <p className="mt-2 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-500">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
        Ihre Eingaben bleiben in Ihrem Browser und werden nicht gespeichert oder übertragen.
      </p>
    </section>
  );
}
