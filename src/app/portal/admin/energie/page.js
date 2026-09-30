import Link from "next/link";
import { Activity, BellRing, CalendarClock, Gavel, Scale, Sun, TrendingDown, Users } from "lucide-react";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import Reiter from "@/components/Portal/Anlagen/Reiter";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { BalkenChart, FARBEN, Legende, LinienChart, Quelle } from "@/components/Portal/Energie/Diagramme";
import { AktionKnopf, EinstellungenFormular, TerminEingabe, TrancheFormular } from "@/components/Portal/Energie/Formulare";
import { DeskNavigation, Hinweis, Tabelle, datum, eur, eurMwh, fmt, monatText, prozent } from "@/components/Portal/Energie/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { spotAuswertung } from "@/lib/plattform/energie/auswertung";
import { produktZeitraum } from "@/lib/plattform/energie/markt";
import { RECHTSHINWEISE } from "@/lib/plattform/energie/texte";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Handelsdesk Energie" };

const TABS = [
  { id: "uebersicht", label: "Spotmarkt", icon: Activity },
  { id: "termin", label: "Terminmarkt", icon: CalendarClock },
  { id: "portfolio", label: "Pool-Portfolio", icon: Scale },
  { id: "einstellungen", label: "Annahmen & Vergütung", icon: Gavel },
];

const uhr = (t) => new Date(t).toLocaleTimeString("de-DE", { timeZone: "Europe/Vienna", hour: "2-digit", minute: "2-digit" });
const tagKurz = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

export default async function Handelsdesk({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const tab = TABS.some((t) => t.id === sp?.tab) ? sp.tab : "uebersicht";
  const zone = sp?.zone === "AT" ? "AT" : "DE";
  const b = energieBackend();
  const schreiben = darfSchreiben(n, "energie");
  const u = await laden(() => b.energieUebersicht(n));

  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Energiebeschaffung"
        titel="Handelsdesk"
        text="Börsenpreise Day-Ahead und Terminmarkt, Beschaffungsstand des Reststrom-Pools, Wechselanalyse der Kundenverträge und Bieterwettbewerbe unter Energieversorgern."
        aktionen={schreiben ? <AktionKnopf url="/api/admin/energie" body={{ aktion: "lauf" }} label="Wechselanalyse jetzt ausführen" erfolgText="Analyse ausgeführt – Fristen-Alarme als Aufgaben angelegt." /> : null}
      />
      <DeskNavigation aktiv="desk" />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <Wert ton="dunkel" icon={Gavel} label="Offene Ausschreibungen" wert={String(u.ausschreibungenOffen)} hinweis={`${u.freigabeOffen} warten auf Kundenfreigabe`} />
        <Wert icon={Users} label="Kunden" wert={String(u.kunden)} hinweis={`${u.lieferanten} aktive Versorger`} />
        <Wert icon={TrendingDown} label="Empfehlung ausschreiben" wert={String(u.empfehlungen.ausschreiben || 0)} hinweis={`${u.empfehlungen.abwarten || 0} abwarten · ${u.empfehlungen.verlaengern || 0} verlängern`} />
        <Wert icon={CalendarClock} label="Kündigungsfristen ≤ 90 Tage" wert={String(u.fristen)} />
        <Wert icon={BellRing} label="Letzte Analyse" wert={u.laufAm ? datum(u.laufAm) : "–"} hinweis="wöchentlich automatisch" />
        <Wert icon={Sun} label="Terminkurve" wert={u.kurveDemo ? "Demo" : "Live"} hinweis={u.kurveDemo ? "Demo-Werte gekennzeichnet" : "eingespielte Kurse"} />
      </section>
      <Reiter basis="/portal/admin/energie" aktiv={tab} tabs={TABS} label="Bereiche des Handelsdesks" />
      {tab === "uebersicht" && <Spotmarkt n={n} zone={zone} />}
      {tab === "termin" && <Terminmarkt n={n} zone={zone} produkt={sp?.produkt || ""} schreiben={schreiben} />}
      {tab === "portfolio" && <Portfolio n={n} schreiben={schreiben} />}
      {tab === "einstellungen" && <Einstellungen n={n} schreiben={schreiben} />}
    </>
  );
}

function ZonenWahl({ zone, tab }) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="Gebotszone">
      {["DE", "AT"].map((z) => (
        <Link key={z} href={`/portal/admin/energie?tab=${tab}&zone=${z}`} aria-current={zone === z ? "true" : undefined} className={`inline-flex h-9 items-center rounded-full px-3.5 text-[13.5px] font-semibold ${zone === z ? "bg-ov-600 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"}`}>
          {z === "DE" ? "DE-LU" : "AT"}
        </Link>
      ))}
    </div>
  );
}

async function Spotmarkt({ n, zone }) {
  const b = energieBackend();
  const [spot, andere] = await Promise.all([laden(() => b.energieSpot(n, { zone, tage: 400 })), laden(() => b.energieSpot(n, { zone: zone === "DE" ? "AT" : "DE", tage: 400 }))]);
  const s = spotAuswertung(spot);
  const o = spotAuswertung(andere);
  const g = s.gesamt;
  const spread = Number.isFinite(g.base) && Number.isFinite(o.gesamt.base) ? (zone === "AT" ? g.base - o.gesamt.base : o.gesamt.base - g.base) : null;
  const letzte = s.aktuell[s.aktuell.length - 1];
  const tickStd = [];
  if (s.aktuell.length) for (let t = Math.ceil(s.aktuell[0].t / 43200e3) * 43200e3; t <= letzte.t; t += 43200e3) tickStd.push(t);
  const tage = s.tage;
  const tagTicks = tage.filter((_, i) => i % 20 === 0).map((_, i) => i * 20);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ZonenWahl zone={zone} tab="uebersicht" />
        {s.quelle === "simulation" && <Hinweis ton="warn">Simulation: {s.fehler || "Live-Daten nicht verfügbar."} Werte nicht für Entscheidungen verwenden.</Hinweis>}
      </div>
      <section aria-label="Kennzahlen Spotmarkt" className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <Wert label="Base €/MWh (365 Tage)" wert={fmt(g.base, 2)} hinweis={`Peak ${fmt(g.peak, 2)} €/MWh`} />
        <Wert label="Offpeak €/MWh" wert={fmt(g.offpeak, 2)} hinweis="Wochenende und 20–8 Uhr" />
        <Wert label="Solar-Capture €/MWh" wert={fmt(g.capture, 2)} hinweis={`Capture-Rate ${prozent(g.captureRate, 0)}`} />
        <Wert label="Negative Stunden" wert={fmt(s.negativ.gesamt)} hinweis={`längste Folge ${s.negativ.laengsteFolge} h`} />
        <Wert label="Volatilität (σ Tag)" wert={`${fmt(s.volatilitaet.tagesAenderungStd, 1)} €`} hinweis={`Ø Tagesspanne ${fmt(s.volatilitaet.tagesSpanne)} €/MWh`} />
        <Wert label={zone === "AT" ? "Spread AT − DE" : "Spread AT − DE"} wert={spread !== null ? `${fmt(spread, 2)} €` : "–"} hinweis="Base, 365 Tage" />
      </section>
      <Karte titel={`Day-Ahead ${zone === "AT" ? "Österreich" : "Deutschland/Luxemburg"} – letzte Tage`} untertitel={`Auflösung ${s.aufloesungMin} min · zuletzt ${letzte ? `${uhr(letzte.t)} Uhr: ${eurMwh(letzte.eurMwh)}` : "–"}`}>
        <LinienChart reihen={[{ name: "Day-Ahead", farbe: FARBEN.navy, flaeche: FARBEN.navyHell, treppe: true, punkte: s.aktuell.map((p) => ({ x: p.t, y: p.eurMwh })) }]} xTicks={tickStd} xText={(t) => `${new Date(t).toLocaleDateString("de-DE", { timeZone: "Europe/Vienna", day: "2-digit", month: "2-digit" })} ${uhr(t).slice(0, 2)} h`} yEinheit="€/MWh" beschreibung="Day-Ahead-Preis der letzten zwei Tage und – nach Veröffentlichung – des Folgetags" />
        <Quelle warnung={s.quelle === "simulation"}>Quelle: {s.quelleLabel}. {s.lizenz}</Quelle>
      </Karte>
      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Tagesmittel (120 Tage)" untertitel="Base und Peak je Tag">
          <LinienChart reihen={[{ name: "Base", farbe: FARBEN.navy, punkte: tage.map((t, i) => ({ x: i, y: t.base })) }, { name: "Peak", farbe: FARBEN.gruen, punkte: tage.map((t, i) => ({ x: i, y: t.peak })) }]} xTicks={tagTicks} xText={(i) => tagKurz(tage[i]?.tag || "")} yEinheit="€/MWh" beschreibung="Tagesmittel Base und Peak der letzten 120 Tage" breite={480} />
          <Legende eintraege={[{ name: "Base", farbe: FARBEN.navy }, { name: "Peak (Mo–Fr 8–20 Uhr)", farbe: FARBEN.gruen }]} />
        </Karte>
        <Karte titel="Monatsmittel und Solar-Capture" untertitel="Base, Peak und Capture-Preis (lastgewichtet mit Solarprofil)">
          <BalkenChart kategorien={s.monate.map((m) => monatText(m.monat))} reihen={[{ name: "Base", farbe: FARBEN.navy, werte: s.monate.map((m) => m.base) }, { name: "Peak", farbe: FARBEN.gruen, werte: s.monate.map((m) => m.peak) }, { name: "Solar-Capture", farbe: FARBEN.sonne, werte: s.monate.map((m) => m.capture) }]} yEinheit="€/MWh" beschreibung="Monatsmittel Base, Peak und Solar-Capture der letzten 13 Monate" breite={480} />
          <Legende eintraege={[{ name: "Base", farbe: FARBEN.navy }, { name: "Peak", farbe: FARBEN.gruen }, { name: "Solar-Capture", farbe: FARBEN.sonne }]} />
        </Karte>
      </div>
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Karte titel="Jahres- und Monatswerte" untertitel="€/MWh · negative Stunden · Capture-Rate">
          <Tabelle
            kopf={["Zeitraum", "Base", "Peak", "Offpeak", "Capture", "Rate", "neg. h", "Max"]}
            rechts={[1, 2, 3, 4, 5, 6, 7]}
            zeilen={[
              ...s.jahre.map((j) => [`${j.jahr}${j.vollstaendig ? "" : " (Teil)"}`, fmt(j.base, 2), fmt(j.peak, 2), fmt(j.offpeak, 2), fmt(j.capture, 2), prozent(j.captureRate, 0), fmt(j.negativ), fmt(j.max?.eurMwh, 0)]),
              ...s.monate.slice(-6).reverse().map((m) => [monatText(m.monat), fmt(m.base, 2), fmt(m.peak, 2), fmt(m.offpeak, 2), fmt(m.capture, 2), prozent(m.captureRate, 0), fmt(m.negativ), fmt(m.max?.eurMwh, 0)]),
            ]}
          />
        </Karte>
        <Karte titel="Durchschnittlicher Tagesgang" untertitel="365 Tage, Werktag und Wochenende">
          <LinienChart reihen={[{ name: "Werktag", farbe: FARBEN.navy, punkte: s.profil.werktag.map((y, x) => ({ x, y })) }, { name: "Wochenende", farbe: FARBEN.gruen, gestrichelt: true, punkte: s.profil.wochenende.map((y, x) => ({ x, y })) }]} xTicks={[0, 6, 12, 18, 23]} xText={(h) => `${h} Uhr`} yEinheit="€/MWh" hoehe={260} beschreibung="Durchschnittlicher Preis je Stunde" />
          <Legende eintraege={[{ name: "Werktag", farbe: FARBEN.navy }, { name: "Wochenende", farbe: FARBEN.gruen }]} />
        </Karte>
      </div>
      <Hinweis>{RECHTSHINWEISE.zonen} {RECHTSHINWEISE.spotmarkt}</Hinweis>
    </div>
  );
}

async function Terminmarkt({ n, zone, produkt, schreiben }) {
  const b = energieBackend();
  const t = await laden(() => b.energieTermin(n, { zone, produkt }));
  const monate = t.tabelle.filter((r) => r.art === "monat");
  const quartale = t.tabelle.filter((r) => r.art === "quartal");
  const jahre = t.tabelle.filter((r) => r.art === "cal");
  const kurvenPunkte = [...monate, ...quartale, ...jahre];
  const vb = t.verlauf?.base || [];
  const vp = t.verlauf?.peak || [];
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ZonenWahl zone={zone} tab="termin" />
        {t.enthaeltDemo && <Hinweis ton="warn">Die Kurve enthält Demo-Werte (keine EEX-Daten). Für Entscheidungen lizenzierte oder zitierte Kurse mit Quelle einspielen.</Hinweis>}
      </div>
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Karte titel={`Terminkurve ${zone === "AT" ? "Österreich" : "Deutschland"}`} untertitel="Monate, Quartale, Kalenderjahre – Base/Peak in €/MWh">
          <BalkenChart kategorien={kurvenPunkte.map((r) => r.produkt)} reihen={[{ name: "Base", farbe: FARBEN.navy, werte: kurvenPunkte.map((r) => r.base) }, { name: "Peak", farbe: FARBEN.gruen, werte: kurvenPunkte.map((r) => r.peak) }]} yEinheit="€/MWh" beschreibung="Terminkurve Base und Peak je Produkt" />
          <Legende eintraege={[{ name: "Base", farbe: FARBEN.navy }, { name: "Peak", farbe: FARBEN.gruen }]} />
          <div className="mt-4">
            <Tabelle
              kopf={["Produkt", "Lieferung", "Base", "Peak", "Handelstag", "Quelle"]}
              rechts={[2, 3]}
              zeilen={kurvenPunkte.map((r) => [
                <Link key={r.produkt} href={`/portal/admin/energie?tab=termin&zone=${zone}&produkt=${r.produkt}`} className="font-semibold text-ov-700 hover:text-ov-800">{r.produkt}</Link>,
                `${monatText(r.von)}–${monatText(r.bis)}`,
                fmt(r.base, 2),
                fmt(r.peak, 2),
                datum(r.handelstag),
                <span key="q" className={r.demo ? "font-medium text-ink-900" : "text-ink-600"}>{r.demo ? "Demo" : r.quelle}</span>,
              ])}
            />
          </div>
        </Karte>
        <Karte titel={`Verlauf ${t.produkt || ""}`} untertitel={t.produkt ? `Lieferung ${(() => { const z = produktZeitraum(t.produkt); return z ? `${monatText(z.von)}–${monatText(z.bis)}` : ""; })()} · Handelstage` : "Produkt wählen"}>
          {vb.length ? (
            <>
              <LinienChart reihen={[{ name: "Base", farbe: FARBEN.navy, punkte: vb.map((p, i) => ({ x: i, y: p.preis })) }, { name: "Peak", farbe: FARBEN.gruen, punkte: vp.map((p, i) => ({ x: i, y: p.preis })) }]} nullLinie={false} xTicks={vb.map((_, i) => i).filter((i) => i % Math.max(1, Math.ceil(vb.length / 6)) === 0)} xText={(i) => tagKurz(vb[i]?.handelstag || "")} yEinheit="€/MWh" beschreibung={`Verlauf des Produkts ${t.produkt}`} />
              <Legende eintraege={[{ name: "Base", farbe: FARBEN.navy }, { name: "Peak", farbe: FARBEN.gruen }]} />
              <Quelle>Veränderung seit Beginn der Reihe: {fmt(vb[vb.length - 1].preis - vb[0].preis, 2)} €/MWh Base.</Quelle>
            </>
          ) : (
            <p className="text-[14px] text-ink-500">Keine Kurse für dieses Produkt.</p>
          )}
        </Karte>
      </div>
      {schreiben && (
        <Karte titel="Kurse einspielen" untertitel="Einzelwert oder CSV – Quelle und Handelstag sind Pflicht">
          <TerminEingabe />
        </Karte>
      )}
      <Karte titel="Eigene Einspielungen" untertitel="Die jüngsten 200 Einträge (Demo-Werte werden nicht gespeichert)">
        <Tabelle kopf={["Handelstag", "Zone", "Produkt", "Typ", "€/MWh", "Quelle", "erfasst"]} rechts={[4]} zeilen={t.eintraege.map((e) => [datum(e.handelstag), e.zone, e.produkt, e.typ, fmt(e.preisEurMwh, 2), e.quelle, datum(e.am)])} leer="Noch keine eigenen Kurse eingespielt." />
      </Karte>
      <Hinweis>{RECHTSHINWEISE.terminmarkt}</Hinweis>
    </div>
  );
}

async function Portfolio({ n, schreiben }) {
  const b = energieBackend();
  const [p, lieferanten] = await Promise.all([laden(() => b.energiePortfolio(n)), laden(() => b.energieLieferanten(n))]);
  return (
    <div className="grid gap-6">
      {p.kurveDemo && <Hinweis ton="warn">Mark-to-Market und Risiko beruhen auf einer Terminkurve mit Demo-Werten.</Hinweis>}
      {Object.entries(p.zonen).map(([zone, z]) => (
        <Karte key={zone} titel={`Reststrom-Pool ${zone === "AT" ? "Österreich" : "Deutschland"}`} untertitel={`Beschaffungsstand je Quartal (Base-Tranchen) · Risiko = offene Menge × ${p.schockProzent} % Preisbewegung`}>
          <section aria-label="Kennzahlen Pool" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Wert label="Bedarf" wert={`${fmt(z.summe.bedarfMwh)} MWh`} />
            <Wert label="Gesichert" wert={`${fmt(z.summe.gesichertMwh)} MWh`} hinweis={`offen ${fmt(z.summe.offenMwh)} MWh`} />
            <Wert ton="dunkel" label="Hedge-Quote" wert={prozent(z.summe.hedgeQuote, 0)} />
            <Wert label="Mark-to-Market" wert={eur(z.summe.mtmEur)} hinweis="positiv = Tranchen günstiger als heute" />
            <Wert label="Risiko offene Position" wert={eur(z.summe.risikoEur)} hinweis={`bei ±${p.schockProzent} %`} />
          </section>
          <BalkenChart gestapelt kategorien={z.perioden.map((x) => x.periode)} reihen={[{ name: "gesichert", farbe: FARBEN.gruen, werte: z.perioden.map((x) => Math.min(x.gesichertMwh, x.bedarfMwh || x.gesichertMwh)) }, { name: "offen", farbe: FARBEN.grau, deckkraft: 0.55, werte: z.perioden.map((x) => x.offenMwh) }]} yEinheit="MWh" format={(x) => fmt(x, 0)} beschreibung="Gesicherte und offene Mengen je Quartal" />
          <Legende eintraege={[{ name: "gesichert (Tranchen)", farbe: FARBEN.gruen }, { name: "offen", farbe: FARBEN.grau }]} />
          <div className="mt-4">
            <Tabelle kopf={["Periode", "Bedarf MWh", "Gesichert", "Hedge", "Ø Einstand", "Markt", "MtM", "Risiko"]} rechts={[1, 2, 3, 4, 5, 6, 7]} zeilen={z.perioden.map((x) => [x.periode, fmt(x.bedarfMwh), fmt(x.gesichertMwh), prozent(x.hedgeQuote, 0), eurMwh(x.mittelpreis), eurMwh(x.marktpreis), eur(x.mtmEur), eur(x.risikoEur)])} />
          </div>
        </Karte>
      ))}
      <div className="grid gap-6 2xl:grid-cols-2">
        <Karte titel="Tranchen" untertitel="Gekaufte Base-Mengen je Quartal">
          <Tabelle
            kopf={["Periode", "Zone", "MWh", "€/MWh", "gekauft", "Gegenpartei", ""]}
            rechts={[2, 3]}
            zeilen={p.tranchen.map((t) => [t.periode, t.zone, fmt(t.mwh, 1), fmt(t.preisEurMwh, 2), datum(t.gekauftAm), t.lieferant || "–", t.status === "storniert" ? "storniert" : schreiben ? <AktionKnopf key={t.id} url="/api/admin/energie/portfolio" body={{ aktion: "stornieren", id: t.id }} label="Stornieren" bestaetigen="Tranche stornieren?" variant="ghost" /> : ""])}
            leer="Noch keine Tranchen gebucht."
          />
        </Karte>
        <Karte titel="Pool-Kunden" untertitel="Lieferverträge über ÖkoInvest (strukturiert)">
          <Tabelle kopf={["Kunde", "Zone", "Menge", "Lieferung", "Versorger"]} rechts={[2]} zeilen={p.kunden.map((k) => [<Link key={k.vertragId} href={`/portal/admin/energie/kunden/${k.kunde.id}`} className="font-semibold text-ov-700 hover:text-ov-800">{k.kunde.firma || k.kunde.name}</Link>, k.zone, `${fmt((k.jahresKwh || 0) / 1000)} MWh`, `${datum(k.beginn)} – ${datum(k.ende)}`, k.lieferant])} leer="Noch keine Pool-Verträge." />
        </Karte>
      </div>
      {schreiben && (
        <Karte titel="Tranche buchen" untertitel="Nach Ausführung beim Versorger bzw. im Handel – Jahresprodukte als vier Quartale erfassen">
          <TrancheFormular lieferanten={lieferanten} />
        </Karte>
      )}
    </div>
  );
}

async function Einstellungen({ n, schreiben }) {
  const e = await laden(() => energieBackend().energieEinstellungen(n));
  return (
    <div className="grid gap-6">
      <Karte titel="Annahmen der Wechselanalyse und Vergütung" untertitel="Wirken auf Empfehlungen, Fristen-Alarme, Normierung und die Vergütungsberechnung">
        {schreiben ? <EinstellungenFormular einstellungen={e.einstellungen} /> : <p className="text-[14px] text-ink-600">Nur lesen.</p>}
      </Karte>
      <Karte titel="Rechtlicher Rahmen" untertitel="Vor dem Livegang juristisch prüfen lassen">
        <ul className="grid gap-3 text-[14px] leading-relaxed text-ink-700">
          {["vergaberecht", "privat", "datenschutz", "wechselDe", "wechselAt", "verguetung"].map((k) => <li key={k}>{RECHTSHINWEISE[k]}</li>)}
        </ul>
      </Karte>
    </div>
  );
}

