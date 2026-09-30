import Link from "next/link";
import { Karte, SeitenKopf, Angaben } from "@/components/Portal/ui";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { BalkenChart, FARBEN, Heatmap, Legende } from "@/components/Portal/Energie/Diagramme";
import { AktionKnopf, VertragFormular } from "@/components/Portal/Energie/Formulare";
import { DeskNavigation, EmpfehlungBadge, FristBadge, Hinweis, PdfLink, StatusBadgeEnergie, Tabelle, ct, datum, eur, eurMwh, fmt, monatText, prozent } from "@/components/Portal/Energie/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { kundenAuswertung } from "@/lib/plattform/energie/auswertung";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Kundenanalyse Energie" };

export default async function KundenAnalyse({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const b = energieBackend();
  const k = await laden(() => b.energieKunde(n, id));
  const zone = k.vertraege.find((x) => x.zone === "AT") && !k.vertraege.find((x) => x.zone === "DE") ? "AT" : k.vertraege[0]?.zone || "DE";
  const [spot, termin] = await Promise.all([laden(() => b.energieSpot(n, { zone, tage: 400 })), laden(() => b.energieTermin(n, { zone }))]);
  const r = kundenAuswertung(k, spot, termin.kurve);
  const w = k.analyse;
  const schreiben = darfSchreiben(n, "energie");
  const vt = k.vertraege.find((x) => ["aktiv", "gekuendigt"].includes(x.status) && x.quelle !== "zuschlag") || null;

  return (
    <>
      <SeitenKopf eyebrow="Kundenanalyse · Energiebeschaffung" titel={k.kunde.firma || k.kunde.name} text={`${k.kunde.name} · ${k.kunde.email}`} aktionen={<Link href="/portal/admin/energie/ausschreibungen" className="inline-flex h-10 items-center rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white hover:bg-ov-700">Ausschreibung anlegen</Link>} />
      <DeskNavigation aktiv="kunden" />
      {k.kurveDemo && <div className="mb-6"><Hinweis ton="warn">Die Terminkurve enthält Demo-Werte – Empfehlungen und Prognosen sind nur zur Vorführung.</Hinweis></div>}

      {w && (
        <Karte titel="Wechselanalyse" untertitel={`Folgezeitraum ${monatText(w.folgezeitraum.von)}–${monatText(w.folgezeitraum.bis)} · Zone ${w.zone}`} className="mb-6" aktion={<EmpfehlungBadge empfehlung={w.empfehlung} label={w.label} />}>
          <section aria-label="Kennzahlen Wechselanalyse" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Wert label="Vertrag (Energie)" wert={ct(w.vertragCt)} />
            <Wert label="Markt inkl. Aufschlag" wert={ct(w.marktCt)} hinweis={`Termin ${eurMwh(w.forwardEurMwh)} · PF ${fmt(w.profilfaktor, 3)}`} />
            <Wert ton="dunkel" label="Differenz pro Jahr" wert={eur(w.deltaEurJahr)} hinweis={Number.isFinite(w.deltaProzent) ? `${fmt(w.deltaProzent * 100, 1)} % des Vertragspreises` : ""} />
            <Wert label="Kündigung bis" wert={datum(w.stichtag)} hinweis={w.tageBisStichtag !== null ? `${w.tageBisStichtag} Tage` : ""} />
            <Wert label="Trend Cal (20 Handelstage)" wert={`${fmt((w.trend?.prozent || 0) * 100, 1)} %`} hinweis={w.trend?.richtung} />
          </section>
          <ul className="grid gap-1.5 text-[14px] leading-relaxed text-ink-700">
            {w.begruendung.map((t, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />{t}</li>)}
          </ul>
        </Karte>
      )}

      {r.fehlt ? (
        <Hinweis ton="warn">{r.fehlt}</Hinweis>
      ) : (
        <div className="grid gap-6">
          <section aria-label="Profilkennzahlen" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Wert label="Jahresmenge" wert={`${fmt(r.kennzahlen.jahresKwh / 1000)} MWh`} hinweis={r.profilQuelle === "lastgang" ? "aus Lastgang" : "synthetisch (Lastprofil)"} />
            <Wert label="Spitze" wert={`${fmt(r.kennzahlen.spitzeKw)} kW`} hinweis={`Grundlast ${fmt(r.kennzahlen.grundlastKw)} kW`} />
            <Wert label="Benutzungsstunden" wert={fmt(r.kennzahlen.benutzungsstunden)} />
            <Wert label="Peak-Anteil" wert={prozent(r.kennzahlen.peakAnteil, 0)} hinweis={`Solarstunden ${prozent(r.kennzahlen.tagAnteil, 0)}`} />
            <Wert label="Profilfaktor (Historie)" wert={fmt(r.kennzahlen.profilfaktor, 3)} hinweis="lastgewichteter Preis / Base" />
            <Wert label="Profilfaktor (Prognose)" wert={fmt(r.prognose.kennzahlen.profilfaktor, 3)} />
          </section>
          <div className="grid gap-6 xl:grid-cols-2">
            <Karte titel="Kosten nach Beschaffungsstruktur – rückwirkend" untertitel={`${monatText(r.rueckwirkend.von)}–${monatText(r.rueckwirkend.bis)} · Spot-Historie (${r.rueckwirkend.spotQuelle === "simulation" ? "Simulation" : "Energy-Charts"}) · Base ${eurMwh(r.rueckwirkend.basePreis)}`}>
              <Tabelle kopf={["Struktur", "Energie €/Jahr", "ct/kWh"]} rechts={[1, 2]} zeilen={r.rueckwirkend.liste.map((x) => [x.label + (x.id === r.rueckwirkend.guenstigste ? " – günstigste" : ""), eur(x.eur), fmt(x.ctKwh, 3)])} />
              <p className="mt-3 text-[12.5px] leading-snug text-ink-500">Festpreis = laufender Vertrag (Energiepreis). Tranchen: 80 % Base-Band in vier Tranchen um das Periodenmittel, Rest und Profil zum Spot, 0,6 ct Aufschlag. Spot-Index: Stundenpreis + 0,5 ct.</p>
            </Karte>
            <Karte titel="Kosten nach Beschaffungsstruktur – Prognose" untertitel={`${monatText(r.prognose.von)}–${monatText(r.prognose.bis)} · Stundenpreiskurve aus Terminkurve (Base ${eurMwh(r.prognose.forwardBase)}) und historischer Stundenform`}>
              <Tabelle kopf={["Struktur", "Energie €/Jahr", "ct/kWh"]} rechts={[1, 2]} zeilen={r.prognose.liste.map((x) => [x.label + (x.id === r.prognose.guenstigste ? " – günstigste" : ""), eur(x.eur), fmt(x.ctKwh, 3)])} />
              <p className="mt-3 text-[12.5px] leading-snug text-ink-500">Festpreis = Marktannahme {ct(r.prognose.marktFixCt, 3)} (lastgewichteter Terminpreis + Lieferantenaufschlag). {r.prognose.fehlend?.length ? `Ohne Terminpreis: ${r.prognose.fehlend.join(", ")}.` : ""}</p>
            </Karte>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Karte titel="Monatsmengen und PV-Einfluss" untertitel={`Netzbezug ohne und mit ${fmt(r.pv.kwp)} kWp PV${r.pv.speicherKwh ? ` + ${fmt(r.pv.speicherKwh)} kWh Speicher` : ""}${r.pv.beispiel ? " (Beispielgröße)" : ""}`}>
              <BalkenChart kategorien={r.monate.map((m) => monatText(m.monat))} reihen={[{ name: "ohne PV", farbe: FARBEN.navy, werte: r.monate.map((m) => m.mwh) }, { name: "mit PV", farbe: FARBEN.gruen, werte: r.monate.map((m) => m.pvMwh) }]} yEinheit="MWh" beschreibung="Monatlicher Netzbezug ohne und mit PV" breite={520} />
              <Legende eintraege={[{ name: "Netzbezug ohne PV", farbe: FARBEN.navy }, { name: "mit PV/Speicher", farbe: FARBEN.gruen }]} />
              <Angaben
                spalten={3}
                items={[
                  { label: "Eigenverbrauch", wert: `${fmt(r.pv.eigenverbrauchKwh / 1000)} MWh` },
                  { label: "Reststrom", wert: `${fmt(r.pv.restKwh / 1000)} MWh` },
                  { label: "Kosten Spot-Index", wert: `${eur(r.pv.spotOhne)} → ${eur(r.pv.spotMit)}` },
                  { label: "ct/kWh Reststrom", wert: `${fmt(r.pv.ctOhne, 2)} → ${fmt(r.pv.ctMit, 2)}` },
                  { label: "Profilfaktor", wert: `${fmt(r.pv.profilfaktorOhne, 3)} → ${fmt(r.pv.profilfaktorMit, 3)}` },
                ]}
              />
              <p className="mt-3 text-[12.5px] leading-snug text-ink-500">PV senkt die Menge, verteuert aber die verbleibende Kilowattstunde (Reststrom fällt in teure Abend- und Winterstunden) – das gehört in die Ausschreibung (Profil statt Jahresmenge).</p>
            </Karte>
            <Karte titel="Wochenprofil" untertitel="Mittlere Last je Stunde (kW), Prognosejahr">
              <Heatmap matrix={r.wochenprofil} einheit="kW" beschreibung="Mittlere Last nach Wochentag und Stunde" breite={520} />
            </Karte>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Karte titel="Stromverträge" untertitel="Laufend, gekündigt, neu (aus Zuschlag)">
          <Tabelle kopf={["Lieferant", "Struktur", "Preis", "Laufzeit", "Frist", "Status"]} zeilen={k.vertraege.map((x) => [x.lieferantName || x.lieferant, x.strukturLabel + (x.pool ? " · Pool" : ""), x.preisCt !== null && x.preisCt !== undefined ? `${fmt(x.preisCt, 3)} ct${x.preisArt === "gesamt" ? " (gesamt)" : ""}` : x.aufschlagCt !== undefined ? `+${fmt(x.aufschlagCt, 3)} ct` : "–", `${datum(x.beginn)} – ${datum(x.vertragEnde)}`, <FristBadge key="f" tage={x.tageBisStichtag} />, x.status])} leer="Noch kein Vertrag erfasst." />
          <div className="mt-4"><PdfLink href={`/api/portal/energie/dokument?art=kundenbericht&id=${k.kunde.id}`}>Beschaffungsbericht für den Kunden (PDF)</PdfLink></div>
          {schreiben && <div className="mt-4"><VertragFormular url={`/api/admin/energie/kunden/${k.kunde.id}`} vertrag={vt} titel={vt ? "Laufenden Vertrag bearbeiten" : "Laufenden Vertrag erfassen"} /></div>}
        </Karte>
        <Karte titel="Stammdaten & Vollmacht" untertitel="Abnahmestellen und Lastgänge aus dem Kundenportal (Fachprüfung)">
          <Tabelle kopf={["Abnahmestelle", "Land", "Messart", "Menge", "Lieferant bis"]} zeilen={k.abnahmestellen.map((s) => [s.bezeichnung, s.land, (s.messart || "").toUpperCase(), `${fmt((s.jahresverbrauchKwh || 0) / 1000)} MWh`, `${s.lieferant || "–"} · ${datum(s.vertragEnde)}`])} leer="Keine Abnahmestellen gepflegt." />
          <p className="mt-3 text-[13px] text-ink-600">Lastgänge: {k.lastgaenge.length ? k.lastgaenge.map((l) => `${l.name} (${fmt((l.jahresverbrauchKwh || 0) / 1000)} MWh, ${l.benutzungsstunden} h)`).join(" · ") : "keiner hochgeladen – Profil synthetisch aus dem Lastprofil"}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[14px] text-ink-700">Beschaffungsvollmacht: <strong>{k.vollmacht?.status === "erteilt" ? `erteilt am ${datum(k.vollmacht.am)}` : k.vollmacht?.status === "widerrufen" ? "widerrufen" : "fehlt"}</strong>{k.vollmacht?.signaturId ? ` · Signatur ${k.vollmacht.signaturId}` : ""}</span>
            {k.vollmacht && <PdfLink href={`/api/portal/energie/dokument?art=vollmacht&id=${k.kunde.id}`}>Vollmacht (PDF)</PdfLink>}
            {schreiben && k.vollmacht?.status === "erteilt" && !k.vollmacht.signaturId && <AktionKnopf url={`/api/admin/energie/kunden/${k.kunde.id}/vollmacht-signatur`} body={{}} label="Zur elektronischen Unterschrift senden" erfolgText="Signaturvorgang angelegt." />}
          </div>
        </Karte>
      </div>
      <Karte titel="Ausschreibungen des Kunden" className="mt-6">
        <Tabelle kopf={["Ausschreibung", "Lieferbeginn", "Status"]} zeilen={k.ausschreibungen.map((a) => [<Link key={a.id} href={`/portal/admin/energie/ausschreibungen/${a.id}`} className="font-semibold text-ov-700 hover:text-ov-800">{a.titel}</Link>, monatText(a.lieferbeginn), <StatusBadgeEnergie key="s" status={a.status} />])} leer="Noch keine Ausschreibung." />
        {k.analyseVerlauf.length > 0 && <p className="mt-3 text-[12.5px] text-ink-500">Analyseverlauf: {k.analyseVerlauf.slice(-6).map((x) => `${datum(x.am)} ${x.empfehlung}`).join(" · ")}</p>}
      </Karte>
    </>
  );
}
