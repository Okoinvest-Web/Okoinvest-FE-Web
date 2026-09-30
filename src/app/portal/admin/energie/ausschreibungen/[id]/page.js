import Link from "next/link";
import { Angaben, Karte, SeitenKopf } from "@/components/Portal/ui";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { BalkenChart, FARBEN, Heatmap, Legende } from "@/components/Portal/Energie/Diagramme";
import { AntwortFormular, AusschreibungSteuerung, VorschlagKnopf } from "@/components/Portal/Energie/Formulare";
import { DeskNavigation, Hinweis, PdfLink, StatusBadgeEnergie, Tabelle, datumZeit, eur, eurMwh, fmt, monatText } from "@/components/Portal/Energie/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { RECHTSHINWEISE } from "@/lib/plattform/energie/texte";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Ausschreibung Strom" };

export default async function AusschreibungDetail({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const b = energieBackend();
  const [{ ausschreibung: a }, lieferanten] = await Promise.all([laden(() => b.energieAusschreibung(n, id)), laden(() => b.energieLieferanten(n))]);
  const schreiben = darfSchreiben(n, "energie");
  const zeilen = a.vergleichRunde?.zeilen?.length ? a.vergleichRunde.zeilen : a.vergleich.zeilen;
  const top = zeilen.slice(0, 6);
  const sz = a.vergleich.szenarien || [-30, -15, 15, 30];
  const vorschlagen = schreiben && a.status === "auswertung";
  return (
    <>
      <SeitenKopf
        eyebrow={`Ausschreibung · ${a.los}`}
        titel={a.titel}
        text={`${a.kunden.map((k) => k.firma || k.name).join(", ")} · Lieferbeginn ${monatText(a.lieferbeginn)} · Zone ${a.zone}`}
        aktionen={
          <>
            <StatusBadgeEnergie status={a.status} />
            <PdfLink href={`/api/portal/energie/dokument?art=vergleich&id=${a.id}`}>Angebotsvergleich</PdfLink>
            {a.status === "zuschlag" && <PdfLink href={`/api/portal/energie/dokument?art=zuschlag&id=${a.id}`}>Zuschlagsschreiben</PdfLink>}
          </>
        }
      />
      <DeskNavigation aktiv="ausschreibungen" />
      {a.kommune && <div className="mb-4"><Hinweis ton="warn">{RECHTSHINWEISE.vergaberecht}</Hinweis></div>}
      {a.kurveDemo && <div className="mb-4"><Hinweis ton="warn">Normierung auf eine Terminkurve mit Demo-Werten.</Hinweis></div>}
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Wert ton="dunkel" label="Runde" wert={a.runde ? `${a.runde.nr}${a.runde.offen ? " (offen)" : ""}` : "–"} hinweis={a.runde ? `Frist ${datumZeit(a.runde.frist)}` : "Entwurf"} />
        <Wert label="Menge (Normierung)" wert={`${fmt(a.vergleich.ctx.kwh / 1000)} MWh`} hinweis={`${a.anonym.anzahlKunden} · ${a.anonym.abnahmestellen} Stellen`} />
        <Wert label="Terminpreis Base €/MWh" wert={fmt(a.vergleich.ctx.baseEurMwh, 2)} hinweis={`lastgewichtet ${eurMwh(a.vergleich.ctx.lastgewichtetEurMwh)}`} />
        <Wert label="Angebote (Runde)" wert={`${a.teilnehmer.filter((t) => t.geboten).length}/${a.teilnehmer.length}`} />
        <Wert label="Bester Preis" wert={zeilen[0] ? `${fmt(zeilen[0].ctKwh, 3)} ct` : "–"} hinweis={zeilen[0]?.lieferant} />
        <Wert label="Vergütung ÖkoInvest" wert={a.verguetung?.festgelegt ? eur(a.verguetung.gesamtEur) : "offen"} hinweis="Parameter im Handelsdesk" />
      </section>

      {schreiben && (
        <Karte titel="Steuerung" untertitel="Fristen, Runden, Erinnerungen, Zuschlag nur nach Kundenfreigabe" className="mb-6">
          <AusschreibungSteuerung a={a} lieferanten={lieferanten} />
        </Karte>
      )}

      <Karte titel={`Normierter Vergleich${a.vergleichRunde ? ` – Runde ${a.vergleichRunde.runde}` : ""}`} untertitel="Energiekosten €/Jahr auf das Profil des Loses (erstes Lieferjahr), inkl. Grundpreis und HKN" className="mb-6" innen="p-0 md:p-2">
        <Tabelle
          kopf={["Rang", "Versorger", "Produkt", "ct/kWh", "€/Jahr", "Abstand", "Bindefrist", ""]}
          rechts={[3, 4, 5]}
          zeilen={zeilen.map((z) => {
            const g = a.angebote.find((x) => x.id === z.angebotId);
            return [z.rang, z.lieferant, `${z.produkt} · R${z.runde}`, fmt(z.ctKwh, 3), eur(z.eurJahr), `${fmt(z.abstandProzent, 2)} %`, datumZeit(g?.bindefristBis), vorschlagen ? <VorschlagKnopf key={`${z.angebotId}-${z.produktId}`} id={a.id} angebotId={z.angebotId} produktId={z.produktId} /> : a.zuschlag?.angebotId === z.angebotId && a.zuschlag?.produktId === z.produktId ? "Vorschlag" : ""];
          })}
          leer="Noch keine Angebote."
        />
      </Karte>

      {top.length > 0 && (
        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <Karte titel="Sensitivität" untertitel="Energiekosten €/Jahr bei Marktbewegung (Festpreis 0 %, Tranchen ~50 %, Spot 100 % Exposition)">
            <BalkenChart kategorien={[...sz.filter((s) => s < 0), 0, ...sz.filter((s) => s > 0)].map((s) => `${s > 0 ? "+" : ""}${s} %`)} reihen={top.slice(0, 4).map((z, i) => ({ name: `${z.lieferant} – ${z.produkt}`, farbe: [FARBEN.navy, FARBEN.gruen, FARBEN.sonne, FARBEN.grau][i], werte: [...sz.filter((s) => s < 0).map((s) => z.sensitivitaet[s]), z.eurJahr, ...sz.filter((s) => s > 0).map((s) => z.sensitivitaet[s])] }))} yEinheit="€" format={(x) => fmt(x, 0)} beschreibung="Kosten je Angebot bei Marktbewegungen" breite={520} />
            <Legende eintraege={top.slice(0, 4).map((z, i) => ({ name: `${z.lieferant} – ${z.produkt}`.slice(0, 60), farbe: [FARBEN.navy, FARBEN.gruen, FARBEN.sonne, FARBEN.grau][i] }))} />
          </Karte>
          <Karte titel="So sehen es die Versorger" untertitel={`${a.los} – nur gerundete Kennzahlen, keine Namen, Orte oder Lokations-IDs`}>
            <Angaben spalten={3} items={[{ label: "Jahresmenge", wert: `${fmt(a.anonym.jahresMengeMwh)} MWh` }, { label: "Spitze", wert: `${fmt(a.anonym.spitzeKw)} kW` }, { label: "Benutzungsstunden", wert: fmt(a.anonym.benutzungsstunden) }, { label: "Peak-Anteil", wert: `${a.anonym.peakAnteilProzent} %` }, { label: "Kunden", wert: a.anonym.anzahlKunden }, { label: "Länder", wert: Object.keys(a.anonym.laender).join(", ") || "–" }]} />
            <div className="mt-4"><Heatmap matrix={a.anonym.wochenprofil} einheit="× Mittel" beschreibung="Normiertes Wochenprofil des Loses" breite={520} /></div>
          </Karte>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Teilnehmer der aktuellen Runde">
          <Tabelle kopf={["Versorger", "Angebot"]} zeilen={a.teilnehmer.map((t) => [<Link key={t.lieferantId} href={`/portal/admin/energie/lieferanten#${t.lieferantId}`} className="text-ov-700 hover:text-ov-800">{t.name}</Link>, t.geboten ? "abgegeben" : "offen"])} leer="Noch keine Runde gestartet." />
          <div className="mt-4">
            <Tabelle kopf={["Runde", "Start", "Frist", "Hinweis", "eingeladen"]} zeilen={a.runden.map((r) => [r.nr, datumZeit(r.start), datumZeit(r.frist), r.bestpreisLabel || "–", r.eingeladen.length])} />
          </div>
        </Karte>
        <Karte titel="Fragen der Versorger" untertitel="Antworten gehen – ohne Absender – an alle eingeladenen Versorger">
          {a.fragen.length ? (
            <ul className="grid gap-4">
              {a.fragen.map((f) => (
                <li key={f.id} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
                  <p className="text-[12.5px] text-ink-500">{f.lieferant} · {datumZeit(f.am)}</p>
                  <p className="mt-1 text-[14px] text-ink-900">{f.text}</p>
                  {f.antwort ? <p className="mt-2 text-[14px] text-ov-900"><strong>Antwort:</strong> {f.antwort}</p> : schreiben ? <AntwortFormular id={a.id} frageId={f.id} /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-500">Keine Fragen.</p>
          )}
        </Karte>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Karte titel="Kunden & Freigaben">
          <Tabelle kopf={["Kunde", "Vollmacht", "Freigabe"]} zeilen={a.kunden.map((k) => [<Link key={k.id} href={`/portal/admin/energie/kunden/${k.id}`} className="text-ov-700 hover:text-ov-800">{k.firma || k.name}</Link>, k.vollmacht, k.freigabe ? `${k.freigabe.entscheidung} · ${datumZeit(k.freigabe.am)}` : a.status === "freigabe" ? "ausstehend" : "–"])} />
          {a.zuschlag && <p className="mt-3 text-[13.5px] text-ink-700">Vorschlag: <strong>{a.zuschlag.lieferant}</strong> ({a.zuschlag.produktId}) – {a.zuschlag.begruendung || "ohne Begründung"}{a.zuschlag.am ? ` · Zuschlag ${datumZeit(a.zuschlag.am)}` : ""}</p>}
        </Karte>
        <Karte titel="Verlauf">
          <ol className="grid gap-2 text-[13.5px] text-ink-700">
            {[...a.verlauf].reverse().map((v, i) => <li key={i}><span className="text-ink-500">{datumZeit(v.am)}</span> · {v.text}</li>)}
          </ol>
        </Karte>
      </div>
    </>
  );
}
