"use client";

import { SperrEingaben } from "@/components/Rechner/LaenderSperre";
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, BadgePercent, CalendarClock, Gauge, Handshake, Landmark, Percent, ScrollText, Wrench } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Tooltip, Zahl, useBreite } from "@/components/Rechner/bausteine";
import { useTeilbarerZustand } from "@/components/Rechner/kontext";
import { Ansicht, ErgebnisKopf, Hinweis, Legende, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { BESTAND, ERLOESE, PROVISION, REGIONEN } from "@/lib/invest/markt";
import { PHASE_BESTAND, STANDARD, rechneBestand, sensitivitaet, tornado, verguetungRichtwert } from "@/lib/rechner/bestandsanlage";
import { fmt, fmtEur, fmtMio } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";

const FARBE = { foerder: "#669933", markt: "#ffc53d", kosten: "#c4cad5", raster: "#eef0f4", minus: "#1f5aa1" };
const pct = (v, s = 1) => (v == null || !Number.isFinite(v) ? "–" : `${fmt(v * 100, s)} %`);
const geld = (v) => (Math.abs(v) >= 1e6 ? fmtMio(v, 2) : `${fmt(v / 1000)} Tsd. €`);
const leistung = (kwp) => (kwp >= 1000 ? `${fmt(kwp / 1000, kwp % 1000 ? 1 : 0)} MWp` : `${fmt(kwp)} kWp`);
const REGION_KURZ = { "de-nord": "Nord", "de-ost": "Ost", "de-west": "West/Mitte", "de-sued": "Süd", at: "Österreich", ch: "Schweiz" };

export default function BestandsRechner() {
  const [kwp, setKwp] = useState(STANDARD.kwp);
  const [typ, setTyp] = useState(STANDARD.typ);
  const [regionId, setRegionId] = useState(STANDARD.regionId);
  const [ibnJahr, setIbnRoh] = useState(STANDARD.ibnJahr);
  const [ertragKwhKwp, setErtrag] = useState(STANDARD.ertragKwhKwp);
  const [modell, setModell] = useState(STANDARD.modell);
  const [verguetungCt, setVerguetung] = useState(STANDARD.verguetungCt);
  const [foerderJahre, setFoerderJahre] = useState(STANDARD.foerderJahre);
  const [opexKwp, setOpex] = useState(STANDARD.opexKwp);
  const [pachtJahr, setPacht] = useState(STANDARD.pachtJahr);
  const [pachtEndeJahr, setPachtEnde] = useState(STANDARD.pachtEndeJahr);
  const [pachtVerlaengerbar, setVerlaengerbar] = useState(STANDARD.pachtVerlaengerbar);
  const [nutzungsdauer, setNutzungsdauer] = useState(STANDARD.nutzungsdauer);
  const [wrTausch, setWrTausch] = useState(STANDARD.wrTausch);
  const [wrJahr, setWrJahr] = useState(STANDARD.wrJahr);
  const [wrProKwp, setWrProKwp] = useState(STANDARD.wrProKwp);
  const [diskont, setDiskont] = useState(STANDARD.diskont);
  const [merchantCt, setMerchant] = useState(STANDARD.merchantCt);
  const [mitKaufpreis, setMitKaufpreis] = useState(false);
  const [kaufProKwp, setKaufProKwp] = useState(700);
  const [ansicht, setAnsicht] = useState("matrix");

  // Beim Wechsel des Inbetriebnahmejahres den Richtwert der Vergütung vorbelegen
  const setIbn = (j) => {
    setIbnRoh(j);
    setVerguetung(verguetungRichtwert(j));
    setModell(j >= 2015 ? "marktpraemie" : "fest");
  };

  const eingabe = {
    kwp, typ, regionId, ibnJahr, ertragKwhKwp, modell, verguetungCt, foerderJahre, opexKwp, pachtJahr, pachtEndeJahr,
    pachtVerlaengerbar, nutzungsdauer, wrTausch, wrJahr, wrProKwp, diskont, merchantCt, kaufpreis: mitKaufpreis ? kaufProKwp * kwp : 0,
  };
  // Teilen-Link: Eingaben in der Adresszeile (nur Abweichungen vom Standard), geteilter Link stellt sie wieder her
  const SETZER = {
    kwp: setKwp, typ: setTyp, regionId: setRegionId, ibnJahr: setIbnRoh, ertragKwhKwp: setErtrag, modell: setModell, verguetungCt: setVerguetung,
    foerderJahre: setFoerderJahre, opexKwp: setOpex, pachtJahr: setPacht, pachtEndeJahr: setPachtEnde, pachtVerlaengerbar: setVerlaengerbar,
    nutzungsdauer: setNutzungsdauer, wrTausch: setWrTausch, wrJahr: setWrJahr, wrProKwp: setWrProKwp, diskont: setDiskont, merchantCt: setMerchant,
    mitKaufpreis: setMitKaufpreis, kaufProKwp: setKaufProKwp,
  };
  useTeilbarerZustand(
    { ...eingabe, kaufpreis: undefined, mitKaufpreis, kaufProKwp },
    (neu) => Object.entries(neu).forEach(([k, v]) => SETZER[k]?.(v)),
    {
      optionen: { typ: ["freiflaeche", "dach"], modell: ["fest", "marktpraemie"], regionId: REGIONEN.map((x) => x.id) },
      grenzen: {
        kwp: [100, 20000], ibnJahr: [2005, 2025], ertragKwhKwp: [650, 1350], verguetungCt: [3, 40], foerderJahre: [10, 25], merchantCt: [2, 8],
        opexKwp: [6, 25], pachtJahr: [0, 150000], pachtEndeJahr: [BESTAND.bewertungsjahr, 2065], nutzungsdauer: [BESTAND.nutzungsdauerSpanne.min, BESTAND.nutzungsdauerSpanne.max],
        wrJahr: [BESTAND.bewertungsjahr, 2050], wrProKwp: [30, 120], diskont: [0.03, 0.1], kaufProKwp: [100, 2500],
      },
    }
  );
  const schluessel = JSON.stringify(eingabe);
  const r = useMemo(() => rechneBestand(eingabe), [schluessel]); // eslint-disable-line react-hooks/exhaustive-deps
  const matrix = useMemo(() => sensitivitaet(eingabe), [schluessel]); // eslint-disable-line react-hooks/exhaustive-deps
  const tor = useMemo(() => tornado(eingabe), [schluessel]); // eslint-disable-line react-hooks/exhaustive-deps

  const band = PHASE_BESTAND.preisProKwp;
  const minderertrag = r.performance != null && r.performance < BESTAND.minderertragWarnung;

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl
      legende="Region (für den Prognosevergleich)"
      wert={regionId}
      onChange={setRegionId}
      spalten={3}
      klein
      optionen={REGIONEN.map((x) => ({ id: x.id, label: REGION_KURZ[x.id] || x.label }))}
    />
  );

  return (
    <RechnerRahmen
      mitlaufend
      unten={
        <div className="space-y-6">
          <div className="rounded-3xl ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 md:px-6">
              <h3 className="font-display text-[17px] font-bold text-ink-900">Cashflow je Jahr bis {r.ende}</h3>
              <p className="text-[12.5px] text-ink-500">Zeigen oder tippen für Jahreswerte</p>
            </div>
            <CashflowBalken r={r} />
          </div>
          <div className="rounded-3xl ring-1 ring-ink-200/70">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 md:px-6">
              <div>
                <h3 className="font-display text-[17px] font-bold text-ink-900">Sensitivität</h3>
                <p className="text-[12.5px] text-ink-500">{ansicht === "matrix" ? "Wert je kWp: Diskontsatz (Zeilen) gegen Marktpreis nach Förderende (Spalten)" : "Wirkung einzelner Annahmen auf den Ertragswert"}</p>
              </div>
              <Ansicht
                name="bestand-sens"
                label="Ansicht der Sensitivität"
                wert={ansicht}
                onChange={setAnsicht}
                optionen={[
                  { id: "matrix", label: "Matrix" },
                  { id: "tornado", label: "Werttreiber" },
                ]}
              />
            </div>
            {ansicht === "matrix" ? <Matrix matrix={matrix} band={band} /> : <Tornado liste={tor} basis={r.wert} />}
          </div>
        </div>
      }
      sperre={sperre}
      eingaben={sperre ? (
        <SperrEingaben>{regionWahl}</SperrEingaben>
      ) : (
        <>
          <MobilKurz
            werte={[
              ["Ertragswert", geld(r.wert)],
              ["je kWp", `${fmt(r.wertProKwp)} €`],
              ["Förderung", r.foerderRest ? `${r.foerderRest} J.` : "ausgelaufen"],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Anlage">
              <Regler label="Leistung" wert={kwp} min={100} max={20000} step={100} format={leistung} onChange={setKwp} />
              <Auswahl
                legende="Anlagentyp"
                wert={typ}
                onChange={setTyp}
                optionen={[
                  { id: "freiflaeche", label: "Freifläche" },
                  { id: "dach", label: "Dach" },
                ]}
              />
              <Regler label="Inbetriebnahme" wert={ibnJahr} min={2005} max={2025} step={1} format={(v) => String(v)} onChange={setIbn} hinweis={`Heute ${r.alter} Jahre in Betrieb · Nutzung bis ${r.technischEnde}`} />
              {regionWahl}
              <Regler
                label="Ø Ertrag der letzten Jahre"
                wert={ertragKwhKwp}
                min={650}
                max={1350}
                step={10}
                format={(v) => `${fmt(v)} kWh/kWp`}
                onChange={setErtrag}
                hinweis={`Gemessen, am besten Mittel aus 3 Jahren. Prognose für Alter und Region: ${fmt(r.prognose)} kWh/kWp.`}
              />
            </Gruppe>

            <Gruppe titel="Förderung">
              <Auswahl
                legende="Vergütungsform"
                wert={modell}
                onChange={setModell}
                optionen={[
                  { id: "fest", label: "Feste Vergütung", sub: "EEG-Tarif" },
                  { id: "marktpraemie", label: "Marktprämie", sub: "Zuschlag als Untergrenze" },
                ]}
              />
              <Regler
                label={modell === "fest" ? "Vergütung" : "Anzulegender Wert"}
                wert={verguetungCt}
                min={3}
                max={40}
                step={0.1}
                stellen={1}
                format={(v) => `${fmt(v, 2)} ct/kWh`}
                onChange={setVerguetung}
                hinweis={`Vorbelegt mit grobem Richtwert für ${ibnJahr} (${fmt(verguetungRichtwert(ibnJahr), 1)} ct). Bitte Wert aus Abrechnung oder Zuschlag eintragen.`}
              />
              <Regler label="Förderdauer ab Inbetriebnahme" wert={foerderJahre} min={10} max={25} step={1} einheit="Jahre" onChange={setFoerderJahre} hinweis={`Ende ${r.foerderEnde} – Restlaufzeit ${r.foerderRest} Jahre. DE: 20 Jahre plus Rest des IBN-Jahres; AT/CH laut Bescheid.`} />
              <Regler
                label="Marktwert Solar nach Förderende"
                wert={merchantCt}
                min={2}
                max={8}
                step={0.1}
                stellen={1}
                format={(v) => `${fmt(v, 1)} ct/kWh`}
                onChange={setMerchant}
                hinweis={`Heutiger Wert, +${fmt(ERLOESE.merchantSteigerung * 100)} % p. a., abzüglich ${fmt(BESTAND.direktvermarktungCt, 1)} ct Direktvermarktung.`}
              />
            </Gruppe>

            <Gruppe titel="Kosten & Verträge">
              <Regler label="Betriebskosten" wert={opexKwp} min={6} max={25} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} €/kWp·a`} onChange={setOpex} hinweis="Wartung, Versicherung, Betriebsführung, Direktvermarktung – ohne Pacht." />
              <Regler label="Pacht" wert={pachtJahr} min={0} max={150000} step={500} format={(v) => (v ? `${fmt(v)} €/Jahr` : "keine")} onChange={setPacht} hinweis={pachtJahr ? `${fmt(pachtJahr / kwp, 1)} €/kWp, indexiert` : "Eigene Fläche bzw. eigenes Dach"} />
              <Regler label="Pacht- bzw. Dachvertrag bis" wert={pachtEndeJahr} min={BESTAND.bewertungsjahr} max={2065} step={1} format={(v) => String(v)} onChange={setPachtEnde} />
              <Schalter icon={ScrollText} label="Verlängerung gesichert" beschreibung="Option im Vertrag bis zum Ende der Nutzungsdauer" an={pachtVerlaengerbar} onChange={setVerlaengerbar} />
              <Regler label="Technische Nutzungsdauer" wert={nutzungsdauer} min={BESTAND.nutzungsdauerSpanne.min} max={BESTAND.nutzungsdauerSpanne.max} step={1} einheit="Jahre" onChange={setNutzungsdauer} />
              <Schalter icon={Wrench} label="Wechselrichtertausch" beschreibung={`Lebensdauer meist ${BESTAND.wechselrichterJahre.min}–${BESTAND.wechselrichterJahre.max} Jahre`} an={wrTausch} onChange={setWrTausch}>
                <div className="space-y-5">
                  <Regler label="im Jahr" wert={wrJahr} min={BESTAND.bewertungsjahr} max={2050} step={1} format={(v) => String(v)} onChange={setWrJahr} />
                  <Regler label="Kosten" wert={wrProKwp} min={30} max={120} step={5} format={(v) => `${fmt(v)} €/kWp`} onChange={setWrProKwp} hinweis={`≈ ${fmtEur(wrProKwp * kwp)}`} />
                </div>
              </Schalter>
            </Gruppe>

            <Gruppe titel="Bewertung">
              <Regler
                label="Diskontsatz"
                wert={diskont}
                min={0.03}
                max={0.1}
                step={0.0025}
                format={(v) => `${fmt(v * 100, 2)} %`}
                onChange={setDiskont}
                hinweis={`Renditeerwartung des Käufers, unverschuldet. Für Bestandsanlagen häufig ${fmt(BESTAND.diskont.min * 100, 1)}–${fmt(BESTAND.diskont.max * 100, 1)} %.`}
              />
              <Schalter icon={Handshake} label="Kaufpreis prüfen" beschreibung="Welche Rendite bringt ein konkretes Angebot?" an={mitKaufpreis} onChange={setMitKaufpreis}>
                <Regler label="Kaufpreis" wert={kaufProKwp} min={100} max={2500} step={10} format={(v) => `${fmt(v)} €/kWp`} onChange={setKaufProKwp} hinweis={`= ${geld(kaufProKwp * kwp)}`} />
              </Schalter>
            </Gruppe>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {`Ertragswert ${Math.round(r.wert)} Euro, ${Math.round(r.wertProKwp)} Euro je Kilowatt Peak.`}
          </p>
          <ErgebnisKopf titel="Ertragswert" plakette={`${leistung(kwp)} · IBN ${ibnJahr}`} />

          <Hauptzahl className="mt-5" icon={Landmark} label="Ertragswert" zusatz={`Spanne ${geld(r.spanne.min)} – ${geld(r.spanne.max)}`}>
            {geld(r.wert)}
          </Hauptzahl>
          <Belege>
            <Kennzahl ton="akzent" icon={Gauge} label="Wert je kWp" zusatz={`Spanne ${fmt(r.spanneProKwp.min)}–${fmt(r.spanneProKwp.max)} €`}>
              <Zahl wert={r.wertProKwp} suffix=" €" />
            </Kennzahl>
            <Kennzahl icon={CalendarClock} label="Förderung bis" zusatz={r.foerderRest ? `noch ${r.foerderRest} Jahre` : "bereits ausgelaufen"}>
              {r.foerderEnde}
            </Kennzahl>
            <Kennzahl icon={Percent} label="Wert aus Förderphase" zusatz={`Rest bis ${r.ende} Markt`}>
              {pct(r.anteilFoerderung, 0)}
            </Kennzahl>
          </Belege>

          <Einordnung wert={r.wertProKwp} spanne={r.spanneProKwp} band={band} />

          <div className="mt-4 space-y-2.5">
            {mitKaufpreis && (
              <Hinweis ton={r.kaufIrr != null && r.kaufIrr >= diskont ? "gut" : "warnung"} icon={Handshake}>
                Bei {fmt(kaufProKwp)} €/kWp ({geld(kaufProKwp * kwp)}) erzielt der Käufer rechnerisch <strong>{pct(r.kaufIrr)}</strong> Rendite vor Steuern und Fremdkapital –{" "}
                {r.kaufIrr != null && r.kaufIrr >= diskont ? "über" : "unter"} Ihrer Erwartung von {pct(diskont, 2)}.
              </Hinweis>
            )}
            {minderertrag && (
              <Hinweis ton="warnung" icon={Activity}>
                Der gemessene Ertrag liegt bei {pct(r.performance, 0)} der Prognose für Alter und Region. Vor einem Kauf oder Verkauf: technische Due Diligence mit Thermografie, Kennlinienmessung und Prüfung von Wechselrichtern und Verschattung.
              </Hinweis>
            )}
            {!pachtVerlaengerbar && pachtEndeJahr < r.technischEnde && (
              <Hinweis ton="warnung" icon={ScrollText}>
                Der Vertrag endet {pachtEndeJahr}, die Anlage könnte bis {r.technischEnde} laufen. Eine Verlängerungsoption vor dem Verkauf zu sichern, hebt den Wert oft deutlich.
              </Hinweis>
            )}
            <Hinweis ton="neutral" icon={BadgePercent}>
              Verkauf über die Projektbörse: Erfolgsprovision {PROVISION.verkaeufer.text} – bei diesem Wert rund {geld(r.wert * PROVISION.verkaeufer.min)} bis {geld(r.wert * PROVISION.verkaeufer.max)}. Für Käufer kostenfrei.
            </Hinweis>
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
              Ertragswert vor Steuern und ohne Fremdkapital – eine Orientierung, kein Gutachten. Grundlage einer Transaktion sind Datenraum, technische und rechtliche Due Diligence.
            </p>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button href={pfad("/bestandsanlagen#anfrage")} size="lg" pfeil>
                Anlage bewerten lassen
              </Button>
            </div>
          </div>
        </>
      }
    />
  );
}

function Einordnung({ wert, spanne, band }) {
  const oben = Math.max(band.max * 1.4, spanne.max * 1.1, 1);
  const pos = (v) => `${Math.max(0, Math.min(100, (v / oben) * 100))}%`;
  const text = wert < band.min ? "unter" : wert > band.max ? "über" : "innerhalb";
  return (
    <div className="mt-4 rounded-2xl bg-ink-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
        <span className="font-semibold text-ink-800">Einordnung gegen übliche Preise für Bestandsanlagen</span>
        <span className="ov-num text-ink-600">
          Markt {fmt(band.min)}–{fmt(band.max)} €/kWp
        </span>
      </div>
      <div className="relative mt-4 h-3 rounded-full bg-ink-100" role="img" aria-label={`Ihr Wert ${fmt(wert)} Euro je kWp liegt ${text} der üblichen Spanne von ${fmt(band.min)} bis ${fmt(band.max)} Euro je kWp.`}>
        <div className="absolute inset-y-0 rounded-full bg-ink-300/70" style={{ left: pos(band.min), right: `calc(100% - ${pos(band.max)})` }} />
        <div className="absolute inset-y-0 rounded-full bg-ov-300" style={{ left: pos(spanne.min), right: `calc(100% - ${pos(spanne.max)})` }} />
        <div className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-ov-600 shadow motion-safe:transition-[left] motion-safe:duration-300" style={{ left: pos(wert) }} />
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
        Ihr Wert liegt <strong className="text-ink-800">{text}</strong> der Spanne für jüngere Anlagen mit heutigen Tarifen bzw. PPA. Ältere Anlagen mit hohem EEG-Tarif können darüber liegen, Anlagen kurz vor Förderende oder mit kurzem Pachtvertrag deutlich darunter.
      </p>
    </div>
  );
}

function CashflowBalken({ r }) {
  const [ref, W] = useBreite(720);
  const [hover, setHover] = useState(null);
  const schmal = W < 520;
  const H = schmal ? 240 : 280;
  const P = { l: 58, r: 12, t: 16, b: 30 };
  const jahre = r.jahre;
  const n = Math.max(jahre.length, 1);
  const maxOben = Math.max(...jahre.map((j) => j.cf), 1) * 1.1;
  const minUnten = Math.min(...jahre.map((j) => j.cf), 0) * 1.1;
  const innenH = H - P.t - P.b;
  const skala = innenH / (maxOben - minUnten || 1);
  const nullY = P.t + maxOben * skala;
  const band = (W - P.l - P.r) / n;
  const bw = Math.max(2, band * 0.7);
  const x = (i) => P.l + i * band + (band - bw) / 2;
  const y = (v) => nullY - v * skala;
  const aktiv = hover != null ? jahre[hover] : null;
  const roh = (maxOben - minUnten) / 4;
  const pot = Math.pow(10, Math.floor(Math.log10(Math.max(roh, 1))));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((s) => (maxOben - minUnten) / s <= 5) || pot * 10;
  const ticks = [];
  for (let v = Math.ceil(minUnten / schritt) * schritt; v <= maxOben; v += schritt) ticks.push(v);

  if (!jahre.length) return <p className="px-6 pb-6 pt-3 text-[14px] text-ink-600">Die Anlage hat ihre Nutzungsdauer erreicht – kein Cashflow mehr.</p>;

  const ausZeiger = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(n - 1, Math.floor((px - P.l) / band)));
  };

  return (
    <div ref={ref} className="relative px-2 pb-4 pt-2 md:px-3">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block touch-pan-y select-none" role="img" aria-label={`Balkendiagramm: freier Cashflow je Jahr von ${r.start} bis ${r.ende}. Im ersten Jahr ${fmtEur(r.cfJahr1)}.`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1e-6 ? "#97a0b0" : FARBE.raster} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">
              {Math.abs(v) < 1e-6 ? "0" : Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 1)} Mio.` : `${fmt(v / 1000)} Tsd.`}
            </text>
          </g>
        ))}
        {jahre.map((j, i) => (
          <rect
            key={j.jahr}
            x={x(i)}
            width={bw}
            y={j.cf >= 0 ? y(j.cf) : nullY}
            height={Math.max(Math.abs(j.cf) * skala, 1)}
            rx={Math.min(3, bw / 3)}
            fill={j.cf < 0 ? FARBE.minus : j.gefoerdert ? FARBE.foerder : FARBE.markt}
            opacity={hover == null || hover === i ? 1 : 0.55}
          />
        ))}
        {jahre.filter((_, i) => i % (schmal ? 5 : 3) === 0 || i === n - 1).map((j) => (
          <text key={j.jahr} x={x(jahre.indexOf(j)) + bw / 2} y={H - P.b + 18} textAnchor="middle" className="fill-ink-500 text-[10.5px]">
            {j.jahr}
          </text>
        ))}
        <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={(e) => setHover(ausZeiger(e))} onPointerDown={(e) => setHover(ausZeiger(e))} onPointerLeave={() => setHover(null)} />
      </svg>
      {aktiv && (
        <Tooltip x={x(hover) + bw / 2} y={Math.max(y(Math.max(aktiv.cf, 0)) - 30, 0)} breite={W}>
          <p className="font-semibold">
            {aktiv.jahr} · {aktiv.gefoerdert ? "Förderung" : "Markt"}
          </p>
          <p className="text-white/70">Erlös <span className="ov-num font-semibold text-white">{fmtEur(aktiv.erloes)}</span> ({fmt(aktiv.preisCt, 2)} ct)</p>
          <p className="text-white/70">Betrieb + Pacht <span className="ov-num font-semibold text-white">{fmtEur(aktiv.opex + aktiv.pacht)}</span></p>
          {aktiv.wr > 0 && <p className="text-white/70">Wechselrichter <span className="ov-num font-semibold text-white">{fmtEur(aktiv.wr)}</span></p>}
          {aktiv.rueckbau > 0 && <p className="text-white/70">Rückbau <span className="ov-num font-semibold text-white">{fmtEur(aktiv.rueckbau)}</span></p>}
          <p className="text-white/70">Cashflow <span className={cn("ov-num font-semibold", aktiv.cf < 0 ? "text-sun-300" : "text-ov-300")}>{fmtEur(aktiv.cf)}</span></p>
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende
          items={[
            { label: "Förderphase", farbe: FARBE.foerder },
            { label: "Marktphase", farbe: FARBE.markt },
            { label: "negativ (Tausch, Rückbau)", farbe: FARBE.minus },
          ]}
        />
      </div>
    </div>
  );
}

function Matrix({ matrix, band }) {
  const sp = matrix[0].zellen.map((z) => z.preis);
  const vz = (d) => (d === 0 ? "±0 %" : `${d > 0 ? "+" : "−"}${fmt(Math.abs(d) * 100)} %`);
  return (
    <div className="px-3 pb-5 pt-4 md:px-4">
      <div tabIndex={0} role="region" aria-label="Sensitivitätsmatrix Wert je kWp" className="overflow-x-auto">
        <table className="w-full min-w-[440px] border-separate border-spacing-1 text-center text-[13px]">
          <caption className="sr-only">Wert je kWp bei verändertem Diskontsatz und Marktpreis nach Förderende</caption>
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1.5 text-left text-[11.5px] font-semibold text-ink-500">Diskont ↓ · Preis →</th>
              {sp.map((p) => (
                <th key={p} scope="col" className={cn("px-2 py-1.5 text-[12px] font-semibold", p === 0 ? "text-ink-900" : "text-ink-500")}>
                  {vz(p)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((z) => (
              <tr key={z.diskont}>
                <th scope="row" className={cn("whitespace-nowrap px-2 py-1.5 text-left text-[12px] font-semibold", z.diskont === 0 ? "text-ink-900" : "text-ink-500")}>
                  {fmt(z.wertDiskont * 100, 2)} %
                </th>
                {z.zellen.map((c) => {
                  const mitte = z.diskont === 0 && c.preis === 0;
                  const im = c.wertProKwp >= band.min && c.wertProKwp <= band.max;
                  const drueber = c.wertProKwp > band.max;
                  return (
                    <td key={c.preis} className={cn("ov-num rounded-lg px-2 py-2 font-semibold", drueber ? "bg-ov-500 text-white" : im ? "bg-ov-100 text-ov-800" : "bg-ink-100 text-ink-600", mitte && "ring-2 ring-ink-900")}>
                      {fmt(c.wertProKwp)} €
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-ink-500">
        Hellgrün: innerhalb der üblichen Spanne ({fmt(band.min)}–{fmt(band.max)} €/kWp), grün: darüber, grau: darunter. Umrandet: Ihre Eingabe.
      </p>
    </div>
  );
}

function Tornado({ liste, basis }) {
  const max = Math.max(...liste.flatMap((t) => [Math.abs(t.tief), Math.abs(t.hoch)]), 1);
  return (
    <div className="px-5 pb-6 pt-5 md:px-6">
      <ul className="space-y-4">
        {liste.map((t) => {
          const links = Math.min(t.tief, t.hoch);
          const rechts = Math.max(t.tief, t.hoch);
          return (
            <li key={t.id}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                <span className="font-semibold text-ink-800">{t.label}</span>
                <span className="ov-num text-ink-600">
                  {links < 0 ? "−" : "+"}{geld(Math.abs(links))} / {rechts < 0 ? "−" : "+"}{geld(Math.abs(rechts))}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-ink-100" aria-hidden="true">
                <div className="absolute inset-y-0 left-1/2 w-px bg-ink-400" />
                {links < 0 && <div className="absolute inset-y-0 rounded-l-full bg-navy-500" style={{ right: "50%", width: `${(Math.abs(links) / max) * 50}%` }} />}
                {rechts > 0 && <div className="absolute inset-y-0 rounded-r-full bg-ov-500" style={{ left: "50%", width: `${(rechts / max) * 50}%` }} />}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-500">
        Veränderung des Ertragswerts gegenüber {geld(basis)} – blau: Wertverlust, grün: Wertgewinn. Oben steht, worauf eine Due Diligence am meisten achten sollte.
      </p>
    </div>
  );
}
