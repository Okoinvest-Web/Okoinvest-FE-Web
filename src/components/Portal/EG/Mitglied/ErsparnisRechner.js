"use client";

// Öffentlicher Ersparnis-Rechner Energiegemeinschaft Österreich (WP6). Reine Funktion eg/interesse.js rechnerOeffentlich
// (= Python eg_portal_kern.rechner_oeffentlich, API POST /api/eg/rechner): Netzentgelt aus der Regeltabelle (SNE-V 2018 bis
// Ende 2026, Arbeitshypothese ab 2027), Abgabenbefreiung nur EEG, Standardpreise aus src/lib/invest/markt.js.

import { useMemo, useState } from "react";
import { AlertTriangle, Info, Leaf, PiggyBank, Sun, Users, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import { Auswahl, Gruppe, Kennzahl, Regler, Zahl } from "@/components/Rechner/bausteine";
import { ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { RECHNER_DECKUNG, RECHNER_MODELLE, RECHNER_PROFILE, RECHNER_ROLLEN, RECHNER_STANDARD, rechnerOeffentlich } from "@/lib/plattform/eg/interesse";
import { fmt } from "@/lib/rechner/annahmen";

const opt = (o) => Object.entries(o).map(([id, x]) => ({ id, label: typeof x === "string" ? x : x.label, sub: typeof x === "string" ? undefined : x.sub }));
const euro = (v) => `${v < 0 ? "−" : ""}${fmt(Math.abs(Math.round(v)))} €`;

export default function ErsparnisRechner({ ctaHref = "/registrieren?rolle=mitglied&weiter=%2Fportal%2Feg%2Fbeitritt" }) {
  const [e, setE] = useState({ ...RECHNER_STANDARD });
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  const r = useMemo(() => rechnerOeffentlich(e), [e]);
  const verbraucht = e.rolle !== "erzeuger";
  const erzeugt = e.rolle !== "verbraucher";
  const max = Math.max(1, ...r.teile.map((t) => Math.abs(t.eur)));
  return (
    <RechnerRahmen
      mitlaufend
      eingaben={
        <>
          <MobilKurz werte={[["Vorteil netto", euro(r.nettoEur)], ["aus Gemeinschaft", `${fmt(r.quotePct)} %`], ["CO₂", `${fmt(r.co2Kg)} kg`]]} />
          <div className="space-y-8">
            <Gruppe titel="Sie">
              <Auswahl legende="Rolle" wert={e.rolle} onChange={set("rolle")} optionen={opt(RECHNER_ROLLEN)} klein />
              {verbraucht && <Auswahl legende="Verbrauch" wert={e.profil} onChange={set("profil")} optionen={opt(RECHNER_PROFILE)} spalten={2} klein />}
              {verbraucht && <Regler label="Jahresverbrauch" wert={e.verbrauchKwh} min={500} max={60000} step={100} format={(v) => `${fmt(v)} kWh`} onChange={set("verbrauchKwh")} hinweis="steht auf Ihrer Jahresabrechnung" />}
              {erzeugt && <Regler label="PV-Anlage" wert={e.kwp} min={1} max={500} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} kWp`} onChange={set("kwp")} hinweis={`≈ ${fmt(r.erzeugungKwh)} kWh Erzeugung pro Jahr`} />}
              {erzeugt && <Regler label="Eigenverbrauch im Haus" wert={e.eigenverbrauchPct} min={0} max={90} step={5} format={(v) => `${fmt(v)} %`} onChange={set("eigenverbrauchPct")} />}
            </Gruppe>
            <Gruppe titel="Gemeinschaft">
              <Auswahl legende="Modell" wert={e.modell} onChange={set("modell")} optionen={opt(RECHNER_MODELLE)} spalten={2} klein />
              <Auswahl legende="Erzeugung in der Gemeinschaft" wert={e.deckung} onChange={set("deckung")} optionen={opt(RECHNER_DECKUNG)} klein />
              <Auswahl legende="Netzentgelt-Regeln" wert={String(e.jahr)} onChange={(v) => set("jahr")(Number(v))} optionen={[{ id: "2026", label: "2026", sub: "SNE-V 2018" }, { id: "2027", label: "ab 2027", sub: "Arbeitshypothese" }]} klein />
            </Gruppe>
            <Gruppe titel="Preise netto (ct/kWh)">
              {verbraucht && <Regler label="Energiepreis Ihres Lieferanten" wert={e.lieferantCt} min={5} max={30} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("lieferantCt")} hinweis="nur Energieanteil, ohne Netz und Abgaben" />}
              {verbraucht && <Regler label="Preis in der Gemeinschaft" wert={e.gemeinschaftCt} min={3} max={25} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("gemeinschaftCt")} hinweis="üblich 9–14 ct (Marktbeobachtung)" />}
              {verbraucht && <Regler label="Netznutzungs-Arbeitspreis" wert={e.netzApCt} min={2} max={12} step={0.1} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("netzApCt")} hinweis="je Netzgebiet verschieden, siehe Netzrechnung" />}
              {erzeugt && <Regler label="Einspeisepreis der Gemeinschaft" wert={e.einspeiseEgCt} min={2} max={15} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("einspeiseEgCt")} />}
              {erzeugt && <Regler label="Alternative: Marktpreis Überschuss" wert={e.marktCt} min={0} max={15} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("marktCt")} />}
              <Regler label="Gebühren und Beitrag" wert={e.gebuehrenJahr} min={0} max={150} step={5} format={(v) => `${fmt(v)} €/Jahr`} onChange={set("gebuehrenJahr")} />
            </Gruppe>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">{`Vorteil netto ${Math.round(r.nettoEur)} Euro pro Jahr, ${r.quotePct} Prozent Ihres Verbrauchs aus der Gemeinschaft.`}</p>
          <ErgebnisKopf titel="Ihr Vorteil pro Jahr" plakette={`${RECHNER_MODELLE[e.modell].label} · ${e.jahr === 2027 ? "ab 2027" : "2026"}`} />
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kennzahl ton="gruen" icon={PiggyBank} label="Vorteil netto" zusatz={`nach ${fmt(r.gebuehrenEur)} € Gebühren`}><Zahl wert={r.nettoEur} suffix=" €" /></Kennzahl>
            <Kennzahl ton="navy" icon={Users} label="Aus der Gemeinschaft" zusatz={verbraucht ? `${fmt(r.bezugKwh)} kWh im Jahr` : "nur Erzeugung"}><Zahl wert={r.quotePct} stellen={0} suffix=" %" /></Kennzahl>
            <Kennzahl icon={Zap} label="Vorteil je kWh" zusatz="Energie + Netz + Abgabe">{verbraucht ? `${fmt(r.vorteilJeKwhCt, 2)} ct` : "–"}</Kennzahl>
            <Kennzahl icon={Leaf} label="CO₂ (rechnerisch)" zusatz="UBA-Faktor, AT eher niedriger"><Zahl wert={r.co2Kg} suffix=" kg" /></Kennzahl>
          </div>
          <ul className="mt-5 space-y-3 rounded-2xl p-4 ring-1 ring-ink-200/70" aria-label="Zusammensetzung des Vorteils">
            {r.teile.map((t) => (
              <li key={t.id}>
                <div className="flex justify-between gap-3 text-[13.5px]"><span className="text-ink-700">{t.label}</span><span className="ov-num font-semibold text-ink-900">{euro(t.eur)}</span></div>
                <div className="mt-1 h-2 rounded-full bg-ink-100"><div className={t.id === "erzeuger" ? "h-2 rounded-full bg-sun-400" : t.id === "netz" ? "h-2 rounded-full bg-navy-600" : "h-2 rounded-full bg-ov-500"} style={{ width: `${Math.max(2, (Math.abs(t.eur) / max) * 100)}%` }} /></div>
              </li>
            ))}
            {erzeugt && <li className="flex items-center gap-2 text-[12.5px] text-ink-500"><Sun aria-hidden="true" className="h-3.5 w-3.5 text-sun-500" />{fmt(r.eingebrachtKwh)} kWh Ihres Überschusses nutzt die Gemeinschaft (ca. {fmt(r.nutzungsgradPct * 0.85)} %).</li>}
          </ul>
          <div className="mt-4 space-y-2.5">
            <Hinweis ton={r.regel.status === "gesichert" ? "neutral" : "warnung"} icon={Info}>Netzentgelt: {r.regel.text}{r.regel.abgabenBefreit ? "; Elektrizitätsabgabe entfällt für Gemeinschaftsstrom" : ""}. Quelle: {r.regel.quelle}.</Hinweis>
            {r.hinweise.map((h) => <Hinweis key={h.id} ton={h.id === "negativ" ? "warnung" : "neutral"} icon={h.id === "negativ" ? AlertTriangle : Info}>{h.text}</Hinweis>)}
          </div>
          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">Näherung für eine erste Einschätzung, netto. Maßgeblich sind die Viertelstundenwerte Ihres Netzbetreibers und das Preisblatt Ihrer Gemeinschaft. Typisch sind 50–200 € im Jahr je Haushalt.</p>
            <Button href={ctaHref} size="lg" pfeil className="shrink-0">Gemeinschaft finden</Button>
          </div>
        </>
      }
    />
  );
}
