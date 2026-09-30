// /portal/admin/closing/[id] – Closing-Raum (Backoffice): Parteien, Formhinweise, SPA-Muster, Workflow bis Closing und Übergabe,
// Provision und Provisionsrechnung, Abschlussbericht, Verlauf.
import Link from "next/link";
import { ArrowLeft, CalendarPlus, FileDown } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import ClosingRaum from "@/components/Portal/Closing/ClosingRaum";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { closingBackend } from "@/lib/plattform/backend/closing";
import { CL_STATUS } from "@/lib/plattform/closing/closing";
import { datumZeit } from "@/lib/plattform/format";

export const metadata = { title: "Closing-Raum" };
const eur = (x) => `${Math.round(Number(x) || 0).toLocaleString("de-DE")} €`;
const knopf = "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold";

export default async function ClosingAdminSeite({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const c = await laden(() => closingBackend().clAkte(n, id));
  return (
    <>
      <Link href="/portal/admin/closing" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Deal-Abschluss</Link>
      <SeitenKopf
        eyebrow={`Closing · ${c.strukturLabel} · ${c.land}`}
        titel={c.projekt?.titel || c.id}
        text={`${c.id} · ${c.herkunft === "zuschlag" ? "Zuschlag im Bieterverfahren" : "angenommene LOI"} · Kaufpreis ${eur(c.kaufpreis)}`}
        aktionen={
          <div className="flex flex-wrap items-center gap-2">
            <Badge ton={CL_STATUS[c.status]?.ton}>{c.statusLabel}</Badge>
            <a href={`/api/portal/closing/${c.id}/pdf?art=spa`} className={`${knopf} bg-ov-600 text-white hover:bg-ov-700`}><FileDown aria-hidden="true" className="h-4 w-4" />Kaufvertrag (Muster)</a>
            {c.status === "vollzogen" && <a href={`/api/portal/closing/${c.id}/pdf?art=bericht`} className={`${knopf} bg-navy-900 text-white hover:bg-navy-800`}><FileDown aria-hidden="true" className="h-4 w-4" />Abschlussbericht</a>}
            {c.notar?.termin && <a href={`/api/portal/closing/${c.id}/termin`} className={`${knopf} bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:ring-ink-300`}><CalendarPlus aria-hidden="true" className="h-4 w-4" />Notartermin (.ics)</a>}
          </div>
        }
      />
      {!c.kontaktFrei && c.status === "vorbereitung" && <Hinweis ton="warn" className="mb-5">Die Kontaktfreigabe zwischen Käufer und Verkäufer fehlt noch – sie ist Voraussetzung für das Signing (Deal-Room → Kontaktfreigabe).</Hinweis>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <ClosingRaum closing={JSON.parse(JSON.stringify(c))} />
        </div>
        <div className="min-w-0 space-y-6">
          <Karte titel="Parteien">
            <Angaben spalten={1} items={[
              { label: "Verkäufer (Anbieter)", wert: `${c.verkaeufer?.anzeige || "–"} · KYC ${c.kyc?.verkaeufer ? "verifiziert" : `nicht verifiziert (${c.kyc?.verkaeuferStatus || "offen"})`}` },
              { label: "Käufer (Investor)", wert: `${c.kaeufer?.anzeige || "–"} · KYC ${c.kyc?.kaeufer ? "verifiziert" : `nicht verifiziert (${c.kyc?.kaeuferStatus || "offen"})`}` },
              { label: "Kontaktfreigabe", wert: c.kontaktFrei ? "erteilt – beide Seiten sehen sich namentlich" : "noch nicht erteilt – Gegenseite anonym" },
              { label: "Projekt", wert: c.projekt ? <Link href={`/portal/dealroom/${c.projekt.id}`} className="font-semibold text-ov-700 hover:text-ov-800">Deal-Room öffnen</Link> : "–" },
            ]} />
          </Karte>
          {(c.provision || c.rechnung) && (
            <Karte titel="Provision & Rechnung">
              <Angaben spalten={1} items={[
                { label: "Provision", wert: c.provision ? `${eur(c.provision.betrag)} (${(c.provision.satz * 100).toLocaleString("de-DE")} %) – ${c.provision.status}` : "–" },
                { label: "Provisionsrechnung", wert: c.rechnung ? <Link href="/portal/admin/finanzen" className="font-semibold text-ov-700 hover:text-ov-800">{c.rechnung.nummer} ({c.rechnung.status})</Link> : "folgt im nächsten Abrechnungslauf" },
              ]} />
            </Karte>
          )}
          <Karte titel="Form, Steuern, Prüfungen" untertitel="Hinweise – keine Rechtsberatung">
            <ul className="list-disc space-y-2 pl-5 text-[13.5px] leading-relaxed text-ink-700">{c.formHinweise.map((h) => <li key={h}>{h}</li>)}</ul>
          </Karte>
          <Karte titel="Verlauf">
            <ol className="space-y-2.5 text-[13.5px]">{[...c.verlauf].reverse().slice(0, 30).map((x, i) => <li key={i}><span className="text-ink-500">{datumZeit(x.am)}</span><br /><span className="text-ink-800">{x.text}</span></li>)}</ol>
          </Karte>
        </div>
      </div>
    </>
  );
}
