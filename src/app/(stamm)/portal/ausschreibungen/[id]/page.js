// /portal/ausschreibungen/[id] – Angebotsanfrage aus Sicht des Versorgers: anonymisiertes Los, Produktvarianten, Preisblatt,
// eigene Angebote, Hinweis der Folgerunde (ohne Namen), Fragen & Antworten. Nicht eingeladen → 404.

import { redirect } from "next/navigation";
import { Angaben, Karte, SeitenKopf } from "@/components/Portal/ui";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { BalkenChart, FARBEN, Heatmap } from "@/components/Portal/Energie/Diagramme";
import { AktionKnopf, FrageFormular, Preisblatt } from "@/components/Portal/Energie/Formulare";
import { Hinweis, PdfLink, StatusBadgeEnergie, Tabelle, datumZeit, fmt, monatText } from "@/components/Portal/Energie/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { SICHERHEITEN } from "@/lib/plattform/energie/ausschreibung";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie"; // Kundenseite Energie: Vertragsdaten + Wechsel nach Zuschlag
import { WechselKarte } from "@/components/Portal/Kundenenergie/teile";

export const metadata = { title: "Angebotsanfrage Strom" };

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const ebeneLabel = { ns: "Niederspannung", ms_ns: "Umspannung MS/NS", ms: "Mittelspannung", hs_ms: "Umspannung HS/MS", hs: "Hochspannung" };

export default async function LieferantAusschreibung({ params }) {
  const n = await portalNutzer({ rollen: ["lieferant", "unternehmen"] });
  const { id } = await params;
  if (n.rollen.includes("admin")) redirect(`/portal/admin/energie/ausschreibungen/${id}`);
  const r = await laden(() => energieBackend().energieAusschreibung(n, id));
  if (r.rolle === "kunde") redirect("/portal/energie/beschaffung");
  const a = r.ausschreibung;
  const p = a.profil;
  const letztes = a.eigeneAngebote.find((g) => g.runde === a.runde?.nr && g.status === "abgegeben") || null;
  const zuschlag = a.ergebnis === "zuschlag";
  const [vd, wechsel] = zuschlag ? await Promise.all([laden(() => kundenenergieBackend().vertragsdaten(n, a.id)), laden(() => kundenenergieBackend().lieferantenwechsel(n, { ausschreibungId: a.id }))]) : [null, []];
  return (
    <>
      <SeitenKopf
        eyebrow={`Angebotsanfrage · ${a.los}`}
        titel={a.titel}
        text="Anonymisiertes Los: Kundennamen, Anschriften und Lokations-IDs erhalten Sie erst nach Zuschlag und Freigabe durch den Kunden."
        aktionen={
          <>
            <StatusBadgeEnergie status={a.status} />
            {a.ergebnis === "zuschlag" && <PdfLink href={`/api/portal/energie/dokument?art=zuschlag&id=${a.id}`}>Zuschlagsschreiben</PdfLink>}
          </>
        }
      />
      {a.ergebnis && <div className="mb-6"><Hinweis ton={a.ergebnis === "zuschlag" ? "info" : "warn"}>{a.ergebnis === "zuschlag" ? "Ihr Angebot hat den Zuschlag erhalten. Die Kundendaten für Liefervertrag und Anmeldung finden Sie unten im Vertragsdatenblatt." : a.ergebnis === "absage" ? "Der Zuschlag ging an einen anderen Versorger. Vielen Dank für Ihr Angebot." : a.ergebnis === "abgebrochen" ? "Die Angebotsanfrage wurde ohne Zuschlag beendet." : "Die Ausschreibung ist abgeschlossen."}</Hinweis></div>}
      {vd && (
        <Karte id="vertragsdaten" titel="Vertragsdatenblatt" untertitel={`Kundendaten und Lokationen für Liefervertrag und Anmeldung – Lieferbeginn ${monatText(vd.ausschreibung.lieferbeginn)}`} className="mb-6" aktion={<PdfLink href={`/api/portal/kundenenergie/vertragsdaten?ausschreibung=${a.id}&format=pdf`}>PDF</PdfLink>}>
          <div className="grid gap-5">
            {vd.kunden.map((k, i) => (
              <div key={i} className="grid gap-2">
                <p className="text-[14px] font-semibold text-ink-900">{k.firma || k.ansprechpartner}<span className="font-normal text-ink-600"> · {k.ansprechpartner} · {k.email}{k.telefon ? ` · ${k.telefon}` : ""} · {k.jahresKwh ? `${fmt(k.jahresKwh)} kWh/Jahr` : ""}</span></p>
                <Tabelle kopf={["Abnahmestelle", "PLZ / Ort", "MaLo / Zählpunkt", "MeLo", "Messart", "Netzbetreiber"]} zeilen={k.abnahmestellen.map((x) => [x.bezeichnung, `${x.plz} ${x.ort}`.trim() || "–", x.maloId || x.zaehlpunkt || "–", x.meloId || "–", String(x.messart || "–").toUpperCase(), x.netzbetreiber || "–"])} leer="Lokationsdaten folgen durch ÖkoInvest." />
              </div>
            ))}
            <p className="text-[12.5px] leading-snug text-ink-500">{vd.hinweis} Abrufe werden protokolliert.</p>
          </div>
        </Karte>
      )}
      {wechsel.map((w) => (
        <Karte key={w.id} id="wechsel" titel="Lieferantenwechsel" untertitel="Bitte bestätigen Sie Ihre Schritte: Liefervertrag bereitgestellt, Anmeldung beim Netzbetreiber, Lieferbeginn" className="mb-6">
          <WechselKarte w={w} />
        </Karte>
      ))}
      <section aria-label="Eckdaten" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Wert ton="dunkel" label="Angebotsfrist" wert={a.runde ? datumZeit(a.runde.frist) : "–"} hinweis={a.runde ? `Runde ${a.runde.nr}${a.runde.offen ? " · offen" : " · geschlossen"}` : ""} />
        <Wert label="Lieferbeginn" wert={monatText(a.lieferbeginn)} hinweis={a.zone === "AT" ? "Gebotszone AT" : "Gebotszone DE-LU"} />
        <Wert label="Jahresmenge" wert={`${fmt(p.jahresMengeMwh)} MWh`} hinweis={`${p.anzahlKunden} · ${p.abnahmestellen} Abnahmestellen`} />
        <Wert label="Spitze" wert={`${fmt(p.spitzeKw)} kW`} hinweis={`${fmt(p.benutzungsstunden)} Benutzungsstunden`} />
        <Wert label="Peak-Anteil" wert={`${p.peakAnteilProzent} %`} hinweis="Mo–Fr 8–20 Uhr" />
        <Wert label="Spannungsebene" wert={Object.keys(p.spannungsebenen).map((k) => ebeneLabel[k] || k).join(", ") || "–"} hinweis={Object.keys(p.messarten).map((k) => k.toUpperCase()).join(", ")} />
      </section>
      {a.hinweis && <div className="mb-6"><Hinweis>{a.hinweis.text}</Hinweis></div>}
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Karte titel="Lastprofil (normiert)" untertitel="Faktor zur mittleren Last je Wochentag und Stunde – keine Rohdaten">
          <Heatmap matrix={p.wochenprofil} einheit="× Mittel" beschreibung="Normiertes Wochenprofil des Loses" breite={520} />
        </Karte>
        <Karte titel="Monatsverteilung" untertitel="Anteil an der Jahresmenge in %">
          <BalkenChart kategorien={MONATE} reihen={[{ name: "Anteil", farbe: FARBEN.navy, werte: p.monatsanteileProzent }]} yEinheit="%" hoehe={220} beschreibung="Monatsanteile an der Jahresmenge" breite={520} />
        </Karte>
      </div>
      <Karte titel="Produktvarianten" className="mb-6">
        <ul className="grid gap-2 text-[14px] text-ink-700">
          {a.produkte.map((x) => <li key={x.id}><strong className="text-ink-900">{x.id}: {x.label}</strong> – {x.text}</li>)}
        </ul>
      </Karte>
      {a.darfBieten ? (
        <Karte titel={letztes ? `Ihr Angebot ersetzen (Version ${letztes.version})` : "Preisblatt"} untertitel={`Verdeckt bis ${datumZeit(a.runde.frist)} – danach gesperrt`} className="mb-6">
          <Preisblatt a={a} letztes={letztes} />
          {letztes && <div className="mt-4"><AktionKnopf url={`/api/portal/ausschreibungen/${a.id}/angebot`} body={{ aktion: "zurueckziehen", angebotId: letztes.id }} label="Angebot zurückziehen" bestaetigen="Angebot wirklich zurückziehen?" variant="ghost" /></div>}
        </Karte>
      ) : (
        a.status === "laufend" && a.runde && !a.runde.zugelassen && <div className="mb-6"><Hinweis ton="warn">Sie sind für die aktuelle Runde nicht zugelassen.</Hinweis></div>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Ihre Angebote">
          <Tabelle
            kopf={["Runde", "Version", "abgegeben", "Positionen", "Bindefrist", "Status"]}
            zeilen={a.eigeneAngebote.map((g) => [g.runde, g.version, datumZeit(g.am), g.positionen.map((x) => `${x.produktId}: ${x.arbeitspreisCt !== null && x.arbeitspreisCt !== undefined ? `${fmt(x.arbeitspreisCt, 3)} ct` : `+${fmt(x.aufschlagCt, 3)} ct`}`).join(" · "), datumZeit(g.bindefristBis), g.status])}
            leer="Noch kein Angebot abgegeben."
          />
          {a.eigeneAngebote[0] && <div className="mt-3"><Angaben items={[{ label: "Zahlungsziel", wert: `${a.eigeneAngebote[0].zahlungszielTage} Tage` }, { label: "Sicherheit", wert: SICHERHEITEN[a.eigeneAngebote[0].sicherheit] || a.eigeneAngebote[0].sicherheit }]} /></div>}
        </Karte>
        <Karte titel="Fragen & Antworten" untertitel="Antworten erhalten alle eingeladenen Versorger – ohne Absender">
          {a.fragen.length > 0 && (
            <ul className="mb-4 grid gap-3">
              {a.fragen.map((f) => (
                <li key={f.id} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
                  <p className="text-[12.5px] text-ink-500">{f.eigene ? "Ihre Frage" : "Frage eines Bieters"} · {datumZeit(f.am)}</p>
                  <p className="mt-1 text-[14px] text-ink-900">{f.text}</p>
                  <p className="mt-2 text-[14px] text-ov-900">{f.antwort ? <><strong>Antwort:</strong> {f.antwort}</> : "Noch nicht beantwortet."}</p>
                </li>
              ))}
            </ul>
          )}
          {a.status === "laufend" && a.runde?.offen ? <FrageFormular id={a.id} /> : <p className="text-[14px] text-ink-500">Fragen sind nur während der Angebotsphase möglich.</p>}
        </Karte>
      </div>
      <div className="mt-6"><Hinweis>Länder: {Object.keys(p.laender).join(", ") || "–"}. Mengen und Spitze sind gerundet. Preise bitte netto ohne Netzentgelte, Umlagen, Abgaben und Steuern angeben; Normierung durch ÖkoInvest auf das Profil des Loses.</Hinweis></div>
    </>
  );
}
