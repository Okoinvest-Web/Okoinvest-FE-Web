// /portal/energie/beschaffung – „Meine Energiebeschaffung“ (Rolle unternehmen): laufender Vertrag, Wechselanalyse,
// Ersparnis gegenüber dem Vorvertrag, Ausschreibungsstatus, Angebotsvergleich zur Freigabe, Beschaffungsvollmacht,
// Dokumente. Abnahmestellen und Lastgang pflegt der Kunde unter /portal/energie (Fachprüfung).

import Link from "next/link";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { BalkenChart, FARBEN, Legende } from "@/components/Portal/Energie/Diagramme";
import { FreigabeKnoepfe, VertragFormular, VollmachtKarte } from "@/components/Portal/Energie/Formulare";
import { EmpfehlungBadge, FristBadge, Hinweis, PdfLink, StatusBadgeEnergie, Tabelle, ct, datum, datumZeit, eur, fmt, monatText } from "@/components/Portal/Energie/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { RECHTSHINWEISE } from "@/lib/plattform/energie/texte";

export const metadata = { title: "Meine Energiebeschaffung" };

export default async function MeineEnergiebeschaffung() {
  const n = await portalNutzer({ rollen: ["unternehmen"] });
  if (!n.rollen.includes("unternehmen")) {
    return (
      <>
        <SeitenKopf eyebrow="Energiebeschaffung" titel="Meine Energiebeschaffung" text="Diese Ansicht ist für Unternehmenskonten. Das Backoffice nutzt den Handelsdesk." />
        <Link href="/portal/admin/energie" className="font-semibold text-ov-700 hover:text-ov-800">Zum Handelsdesk</Link>
      </>
    );
  }
  const d = await laden(() => energieBackend().energieMeine(n));
  const vt = d.vertraege.find((x) => ["aktiv", "gekuendigt"].includes(x.status) && x.quelle !== "zuschlag") || null;
  const neu = d.vertraege.filter((x) => x.quelle === "zuschlag");
  const w = d.analyse;
  const freigabe = d.ausschreibungen.filter((a) => a.status === "freigabe" && a.vorschlag);
  const ersparnis = d.ersparnis.reduce((s, x) => s + (x.eurJahr || 0), 0);
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Reststrom-Pool"
        titel="Meine Energiebeschaffung"
        text="ÖkoInvest holt für Ihren Reststrom Angebote mehrerer Energieversorger ein – einzeln oder gebündelt im Pool – und überwacht laufend, ob sich ein Wechsel lohnt. Ohne Ihre Freigabe wird kein Vertrag geschlossen."
        aktionen={<Link href="/portal/energie" className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Abnahmestellen & Lastgang</Link>}
      />
      <section aria-label="Überblick" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Wert ton="dunkel" label="Aktueller Vertrag" wert={vt ? ct(vt.energiepreisCt) : "–"} hinweis={vt ? `${vt.lieferantName} · bis ${datum(vt.vertragEnde)}` : "noch nicht erfasst"} />
        <Wert label="Kündigung bis" wert={vt?.kuendigungsStichtag ? datum(vt.kuendigungsStichtag) : "–"} hinweis={vt?.tageBisStichtag !== null && vt?.tageBisStichtag !== undefined ? `${vt.tageBisStichtag} Tage` : ""} />
        <Wert label="Markteinschätzung" wert={w ? w.label : "–"} hinweis={w?.marktCt ? `Markt ${ct(w.marktCt)}` : ""} />
        <Wert label="Ersparnis ggü. Vorvertrag" wert={d.ersparnis.length ? eur(ersparnis) : "–"} hinweis={d.ersparnis.some((x) => x.erwartet) ? "pro Jahr, erwartet (Tranchen)" : "pro Jahr"} />
      </section>

      {freigabe.map((a) => (
        <Karte key={a.id} id={`freigabe-${a.id}`} titel="Angebotsvergleich zur Freigabe" untertitel={`${a.titel} · Lieferbeginn ${monatText(a.lieferbeginn)}${a.pool ? " · Pool" : ""}`} aktion={<PdfLink href={`/api/portal/energie/dokument?art=vergleich&id=${a.id}`}>PDF</PdfLink>}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="grid gap-4">
              <div className="rounded-2xl bg-ov-50 p-4 ring-1 ring-ov-200">
                <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ov-800">Vorschlag von ÖkoInvest</p>
                <p className="mt-1 font-display text-[20px] font-extrabold text-ink-900">{a.vorschlag.lieferant}</p>
                <p className="text-[14px] text-ink-700">{a.vorschlag.produkt} · {ct(a.vorschlag.ctKwh, 3)} · rund {eur(a.vorschlag.eurJahr)} pro Jahr (Energie)</p>
                {a.vorschlag.ersparnisEurJahr !== null && <p className="mt-1 text-[14px] font-semibold text-ov-900">Gegenüber Ihrem bisherigen Energiepreis ({ct(a.vorschlag.altCt, 3)}): {eur(a.vorschlag.ersparnisEurJahr)} pro Jahr</p>}
                {a.vorschlag.begruendung && <p className="mt-2 text-[13.5px] text-ink-700">{a.vorschlag.begruendung}</p>}
                <p className="mt-2 text-[12.5px] text-ink-500">Angebot bindend bis {datumZeit(a.vorschlag.bindefristBis)} · Zahlungsziel {a.vorschlag.zahlungszielTage} Tage · Sicherheit: {a.vorschlag.sicherheit}</p>
              </div>
              <Tabelle kopf={["Rang", "Versorger", "Produkt", "ct/kWh", "€/Jahr"]} rechts={[3, 4]} zeilen={a.vergleich.zeilen.map((z) => [z.rang, z.lieferant, z.produkt, fmt(z.ctKwh, 3), eur(z.eurJahr)])} />
              <p className="text-[12.5px] leading-snug text-ink-500">Normiert auf Ihr Verbrauchsprofil, ohne Netzentgelte, Umlagen, Abgaben und Steuern (die ändern sich durch den Wechsel nicht).</p>
            </div>
            <div className="grid gap-4">
              <p className="text-[13.5px] font-semibold text-ink-800">Was passiert bei Marktbewegungen?</p>
              <BalkenChart
                kategorien={a.vergleich.szenarien.map((s) => `${s > 0 ? "+" : ""}${s} %`)}
                reihen={a.vergleich.zeilen.slice(0, 3).map((z, i) => ({ name: `${z.lieferant} – ${z.produkt}`, farbe: [FARBEN.navy, FARBEN.gruen, FARBEN.sonne][i], werte: a.vergleich.szenarien.map((s) => z.sensitivitaet[s]) }))}
                yEinheit="€/Jahr"
                format={(x) => fmt(x, 0)}
                hoehe={220}
                beschreibung="Kosten der besten Angebote bei Marktbewegungen" breite={520}
              />
              <Legende eintraege={a.vergleich.zeilen.slice(0, 3).map((z, i) => ({ name: `${z.lieferant} – ${z.produkt}`.slice(0, 60), farbe: [FARBEN.navy, FARBEN.gruen, FARBEN.sonne][i] }))} />
              {a.eigeneFreigabe ? <Hinweis>Ihre Entscheidung: {a.eigeneFreigabe.entscheidung} am {datumZeit(a.eigeneFreigabe.am)}.</Hinweis> : <FreigabeKnoepfe ausschreibungId={a.id} />}
            </div>
          </div>
        </Karte>
      ))}

      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Wechselanalyse" untertitel="Ihr Vertrag im Vergleich zur aktuellen Terminkurve" aktion={w ? <EmpfehlungBadge empfehlung={w.empfehlung} label={w.label} /> : null}>
          {w ? (
            <ul className="grid gap-1.5 text-[14px] leading-relaxed text-ink-700">
              {w.begruendung.map((t, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />{t}</li>)}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-600">Erfassen Sie Ihren laufenden Stromvertrag – dann überwachen wir Kündigungsfrist und Marktpreis für Sie.</p>
          )}
        </Karte>
        <Karte titel="Beschaffungsvollmacht" untertitel="Damit ÖkoInvest Angebote einholen und – nach Ihrer Freigabe – den Wechsel einleiten darf">
          <VollmachtKarte vollmacht={d.vollmacht} text={d.vollmachtText} version={d.vollmachtVersion} />
        </Karte>
      </div>

      <Karte titel="Ausschreibungen" untertitel="Status Ihrer Angebotsanfragen">
        <Tabelle
          kopf={["Ausschreibung", "Lieferbeginn", "Runde", "Angebote", "Status", ""]}
          zeilen={d.ausschreibungen.map((a) => [a.titel, monatText(a.lieferbeginn), a.runden.length ? `${a.runden.length}${a.runden[a.runden.length - 1].offen ? ` · Frist ${datumZeit(a.runden[a.runden.length - 1].frist)}` : ""}` : "–", `${a.angeboteAnzahl} Versorger`, <StatusBadgeEnergie key="s" status={a.status} />, a.status === "zuschlag" ? <PdfLink key="p" href={`/api/portal/energie/dokument?art=vergleich&id=${a.id}`}>Vergleich</PdfLink> : ""])}
          leer="Noch keine Ausschreibung – mit erteilter Vollmacht startet ÖkoInvest sie rechtzeitig vor Ihrem Kündigungsstichtag."
        />
      </Karte>

      <Karte titel="Meine Stromverträge" untertitel="Laufend, gekündigt und neu über ÖkoInvest">
        <Tabelle
          kopf={["Lieferant", "Struktur", "Preis", "Laufzeit", "Kündigung", "Status"]}
          zeilen={d.vertraege.map((x) => [x.lieferantName || x.lieferant, x.strukturLabel + (x.pool ? " · Pool" : ""), x.preisCt !== null && x.preisCt !== undefined ? `${fmt(x.preisCt, 3)} ct${x.preisArt === "gesamt" ? " (gesamt)" : ""}` : x.aufschlagCt !== undefined && x.aufschlagCt !== null ? `Tranchen/Spot + ${fmt(x.aufschlagCt, 3)} ct` : "–", `${datum(x.beginn)} – ${datum(x.vertragEnde)}`, <FristBadge key="f" tage={x.tageBisStichtag} />, x.status])}
          leer="Noch kein Vertrag erfasst."
        />
        {neu.length > 0 && <p className="mt-3 text-[13px] text-ink-600">Neue Verträge aus einem Zuschlag: Den Lieferantenwechsel und die Kündigung des bisherigen Vertrags leitet ÖkoInvest ein.</p>}
        <div className="mt-5 border-t border-ink-100 pt-5">
          <VertragFormular url="/api/portal/energie" vertrag={vt && vt.quelle !== "zuschlag" ? vt : null} titel={vt ? "Laufenden Vertrag bearbeiten" : "Laufenden Vertrag erfassen"} />
        </div>
      </Karte>
      <Hinweis>{RECHTSHINWEISE.datenschutz} {RECHTSHINWEISE.wechselDe} {RECHTSHINWEISE.wechselAt}</Hinweis>
      {!d.fach.abnahmestellen && <Hinweis ton="warn">Für belastbare Angebote bitte Abnahmestellen (Marktlokation bzw. Zählpunkt) und – bei RLM – den Lastgang unter „Abnahmestellen & Lastgang“ hinterlegen.</Hinweis>}
    </div>
  );
}
