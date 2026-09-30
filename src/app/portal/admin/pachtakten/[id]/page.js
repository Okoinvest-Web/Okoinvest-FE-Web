// /portal/admin/pachtakten/[id] – eine Pachtakte im Backoffice: Vertrag, Fristen, Anliegen (mit Kontenauswahl für
// Übertragungen), Rückbausicherheit, Rückbau bis zur Abnahme, Vertragsende, Agri-PV-Nachweise, Eigentümerhistorie.

import Link from "next/link";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { AgriBackofficeSchritte, AnliegenBackofficeSchritte, RueckbauBackofficeSchritte, SicherheitBackoffice, VertragBeenden } from "@/components/Portal/Pachtakte/Formulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";
import { ANLIEGEN_STATUS, AGRI_NACHWEIS_ARTEN, AGRI_NACHWEIS_STATUS, LAND_TEXT, RUECKBAU_STATUS, SICHERHEIT_STATUS, datumDe } from "@/lib/plattform/pachtakte";
import { PACHTVERTRAG_STATUS, euro } from "@/lib/plattform/finanzen/index.js";

export const metadata = { title: "Pachtakte" };

function Verlauf({ liste = [] }) {
  if (!liste.length) return null;
  return <ul className="mt-3 space-y-1 text-[12.5px] text-ink-600">{[...liste].reverse().map((x, i) => <li key={i}>{new Date(x.am).toLocaleString("de-DE")} · {x.name || (x.wer === "admin" ? "Backoffice" : "Eigentümer")}: {x.nach}{x.text ? ` – ${x.text}` : ""}</li>)}</ul>;
}

export default async function PachtakteSeite({ params }) {
  const { id } = await params;
  const n = await portalNutzer({ admin: true });
  const d = await laden(() => pachtakteBackend().pachtakteBackoffice(n, { vertragId: id }));
  const { akte, eigentuemer, konten, schreiben } = d;
  const { vertrag, sicherheit, rueckbau, flaeche } = akte;
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice · Pachtakte" titel={vertrag.bezeichnung} text={`${vertrag.id} · ${LAND_TEXT[vertrag.land] || vertrag.land} · Eigentümer ${eigentuemer.name} (${eigentuemer.email})`} aktionen={<Badge ton={vertrag.status === "aktiv" ? "ok" : vertrag.status === "gekuendigt" ? "warn" : "neutral"}>{PACHTVERTRAG_STATUS[vertrag.status]?.label || vertrag.status}</Badge>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Vertrag & Fristen">
          <Angaben items={[
            { label: "Vertragsdatum", wert: vertrag.vertragsdatum ? datumDe(vertrag.vertragsdatum) : null },
            { label: "Pachtbeginn", wert: vertrag.beginn ? datumDe(vertrag.beginn) : "noch offen" },
            { label: "Grundlaufzeit", wert: vertrag.laufzeitJahre ? `${vertrag.laufzeitJahre} Jahre${vertrag.ende ? ` bis ${datumDe(vertrag.ende)}` : ""}` : null },
            { label: "Kündigung wirksam zum", wert: vertrag.kuendigungZum ? datumDe(vertrag.kuendigungZum) : null },
            { label: "Fläche", wert: flaeche ? <Link href={`/portal/flaechen/${flaeche.id}`} className="text-ov-700 underline">{flaeche.bezeichnung}</Link> : null },
          ]} />
          <ul className="mt-4 space-y-1.5 text-[13.5px] text-ink-700">{akte.fristen.map((f) => <li key={f.id}><span className="font-semibold">{datumDe(f.datum)}</span> · {f.titel}</li>)}</ul>
          <p className="mt-4 text-[13px]"><Link href="/portal/admin/finanzen" className="font-semibold text-ov-700">Pachtvertrag in Finanzen & Abrechnung</Link></p>
        </Karte>
        <Karte titel="Rückbausicherheit">
          <Badge ton={SICHERHEIT_STATUS[sicherheit.status]?.ton}>{sicherheit.statusLabel}</Badge>
          <Angaben items={[{ label: "Art", wert: sicherheit.artLabel }, { label: "Betrag", wert: sicherheit.betrag ? euro(sicherheit.betrag) : null }, { label: "Sicherungsgeber", wert: sicherheit.geber }, { label: "Hinterlegt am", wert: sicherheit.hinterlegtAm ? datumDe(sicherheit.hinterlegtAm) : null }]} />
          {sicherheit.hinweise.map((h, i) => <Hinweis key={i} ton={h.ton} className="mt-3">{h.text}</Hinweis>)}
          <Verlauf liste={sicherheit.verlauf} />
          {schreiben && <div className="mt-4"><SicherheitBackoffice vertragId={vertrag.id} status={sicherheit.status} rueckbauStatus={rueckbau.status} standard={{ betrag: sicherheit.betrag }} /></div>}
        </Karte>
        <Karte titel="Rückbau">
          <Badge ton={RUECKBAU_STATUS[rueckbau.status]?.ton}>{rueckbau.statusLabel}</Badge>
          {rueckbau.termin && <p className="mt-2 text-[13.5px] text-ink-700">Termin: {datumDe(rueckbau.termin)}</p>}
          {!rueckbau.moeglich && rueckbau.status === "offen" && <p className="mt-2 text-[13px] text-ink-500">Ankündigung erst nach Kündigung oder in den letzten 24 Monaten vor Laufzeitende möglich.</p>}
          <Verlauf liste={rueckbau.verlauf} />
          {schreiben && <div className="mt-4"><RueckbauBackofficeSchritte vertragId={vertrag.id} aktionen={rueckbau.aktionen} /></div>}
          {schreiben && akte.beendbar && <div className="mt-4 border-t border-ink-100 pt-4"><VertragBeenden vertragId={vertrag.id} /></div>}
        </Karte>
        <Karte titel="Eigentümerhistorie">
          {akte.historie.length ? <ul className="space-y-1.5 text-[13.5px] text-ink-700">{akte.historie.map((h, i) => <li key={i}>{new Date(h.am).toLocaleDateString("de-DE")}{h.ab ? ` (wirksam ${datumDe(h.ab)})` : ""}: {h.vonName} → {h.nachName} · {h.anlass}</li>)}</ul> : <p className="text-[14px] text-ink-500">Kein Eigentümerwechsel erfasst.</p>}
        </Karte>
      </div>

      <Karte titel="Anliegen">
        {akte.anliegen.length ? (
          <ul className="space-y-4">
            {akte.anliegen.map((a) => (
              <li key={a.id} className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink-200/70">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><p className="font-semibold text-ink-900">{a.artLabel}</p><p className="text-[13px] text-ink-600">{a.zusammenfassung}</p></div>
                  <Badge ton={ANLIEGEN_STATUS[a.status]?.ton}>{a.statusLabel}</Badge>
                </div>
                {a.ergebnis?.text && <p className="mt-2 text-[13px] text-ink-700">Ergebnis: {a.ergebnis.text}</p>}
                <Verlauf liste={a.verlauf} />
                {schreiben && a.aktionen.length > 0 && <div className="mt-3"><AnliegenBackofficeSchritte anliegen={a} konten={konten} /></div>}
              </li>
            ))}
          </ul>
        ) : <p className="text-[14px] text-ink-500">Keine Anliegen.</p>}
      </Karte>

      {akte.agri.moeglich && (
        <Karte titel="Agri-PV-Nachweise" untertitel={akte.agri.referenz ? `Vergleichswert ${akte.agri.referenz.wert} (${akte.agri.referenz.quelle})` : "Noch kein Referenzertrag"}>
          {akte.agri.nachweise.length ? (
            <ul className="space-y-3">
              {akte.agri.nachweise.map((x) => (
                <li key={x.id} className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink-200/70">
                  <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold text-ink-900">{x.daten.jahr} · {AGRI_NACHWEIS_ARTEN[x.daten.art]}</p><Badge ton={AGRI_NACHWEIS_STATUS[x.status]?.ton}>{x.statusLabel}</Badge></div>
                  <ul className="mt-2 space-y-1 text-[13px] text-ink-600">{x.pruefung.punkte.map((p) => <li key={p.id}>{p.titel}</li>)}</ul>
                  {schreiben && x.aktionen?.length > 0 && <div className="mt-3"><AgriBackofficeSchritte id={x.id} aktionen={x.aktionen} /></div>}
                </li>
              ))}
            </ul>
          ) : <p className="text-[14px] text-ink-500">Noch keine Nachweise.</p>}
        </Karte>
      )}
      <p className="text-[13px]"><Link href="/portal/admin/pachtakten" className="font-semibold text-ov-700">Zurück zur Arbeitsliste</Link></p>
    </div>
  );
}
