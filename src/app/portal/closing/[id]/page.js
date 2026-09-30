// /portal/closing/[id] – Closing-Raum für Käufer und Verkäufer: Stand, Signing-Checkliste, Bedingungen (eigene als erfüllt
// melden), Notartermin (.ics), Zahlung, Übergabe, Dokumente. Gegenseite anonym bis zur Kontaktfreigabe; fremd → 404.
import Link from "next/link";
import { ArrowLeft, CalendarPlus, CheckCircle2, Circle, FileDown } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import { CpMelden } from "@/components/Portal/Closing/ClosingKleinteile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { closingBackend } from "@/lib/plattform/backend/closing";
import { CL_STATUS, CP_STATUS } from "@/lib/plattform/closing/closing";
import { datumZeit } from "@/lib/plattform/format";

export const metadata = { title: "Closing-Raum" };
const eur = (x) => `${Math.round(Number(x) || 0).toLocaleString("de-DE")} €`;
const datumText = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join(".") : "");
const knopf = "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold";

function Punkt({ ok, children, text }) {
  return (
    <li className="flex items-start gap-2.5 py-2.5">
      {ok ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> : <Circle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-300" />}
      <div className="min-w-0"><p className="font-semibold text-ink-900">{children}</p>{text && <p className="text-[12.5px] leading-snug text-ink-500">{text}</p>}</div>
    </li>
  );
}

export default async function ClosingPortalSeite({ params }) {
  const n = await portalNutzer();
  const { id } = await params;
  const c = await laden(() => closingBackend().clAkte(n, id));
  const ich = c.meineRolle === "kaeufer" ? "Käufer" : c.meineRolle === "verkaeufer" ? "Verkäufer" : "Backoffice";
  const gegen = c.meineRolle === "kaeufer" ? c.verkaeufer : c.kaeufer;
  return (
    <>
      <Link href={c.meineRolle === "backoffice" ? `/portal/admin/closing/${c.id}` : "/portal/closing"} className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Deal-Abschluss</Link>
      <SeitenKopf
        eyebrow={`Closing-Raum · Sie als ${ich}`}
        titel={c.projekt?.titel || c.id}
        text={`${c.strukturLabel} · Kaufpreis ${eur(c.kaufpreis)}${c.spvName ? ` · ${c.anteilProzent} % an ${c.spvName}` : ""}`}
        aktionen={
          <div className="flex flex-wrap items-center gap-2">
            <Badge ton={CL_STATUS[c.status]?.ton}>{c.statusLabel}</Badge>
            <a href={`/api/portal/closing/${c.id}/pdf?art=spa`} className={`${knopf} bg-ov-600 text-white hover:bg-ov-700`}><FileDown aria-hidden="true" className="h-4 w-4" />Kaufvertrag (Muster)</a>
            {c.status === "vollzogen" && <a href={`/api/portal/closing/${c.id}/pdf?art=bericht`} className={`${knopf} bg-navy-900 text-white hover:bg-navy-800`}><FileDown aria-hidden="true" className="h-4 w-4" />Abschlussbericht</a>}
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Karte titel="Signing-Checkliste" untertitel={c.signingAm ? `Kaufvertrag unterzeichnet am ${datumText(c.signingAm)}` : "Voraussetzungen für die Unterzeichnung"}>
            <ul className="divide-y divide-ink-100">{c.signingStand.map((p) => <Punkt key={p.schluessel} ok={p.erledigt} text={p.text}>{p.label}</Punkt>)}</ul>
            {!c.kyc.kaeufer || !c.kyc.verkaeufer ? <Hinweis ton="warn" className="mt-3">Beide Seiten müssen verifiziert sein (KYC/KYB), bevor unterschrieben werden kann. {(c.meineRolle === "kaeufer" && !c.kyc.kaeufer) || (c.meineRolle === "verkaeufer" && !c.kyc.verkaeufer) ? <Link href="/portal/verifizierung" className="font-semibold text-ov-700 hover:text-ov-800">Jetzt verifizieren</Link> : null}</Hinweis> : null}
          </Karte>
          <Karte titel="Closing Conditions" untertitel={`${c.cpsGesamt - c.cpsOffen} von ${c.cpsGesamt} erfüllt oder verzichtet`}>
            <ul className="divide-y divide-ink-100">
              {c.cps.map((x) => (
                <li key={x.schluessel} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{x.label}</p>
                      <p className="text-[12.5px] leading-snug text-ink-500">{x.text}</p>
                      <p className="mt-1 text-[12.5px] text-ink-700">{x.verantwortlichLabel}{x.frist ? ` · Frist ${datumText(x.frist)}` : ""}{x.nachweis ? ` · ${x.nachweis}` : ""}</p>
                    </div>
                    <Badge ton={CP_STATUS[x.status]?.ton}>{x.statusLabel}</Badge>
                  </div>
                  {x.darfMelden && <CpMelden closingId={c.id} schluessel={x.schluessel} />}
                </li>
              ))}
            </ul>
          </Karte>
          {c.status === "vollzogen" && (
            <Karte titel="Übergabe" untertitel={`Closing am ${datumText(c.vollzogenAm)}`}>
              <ul className="divide-y divide-ink-100">{c.uebergabe.map((u) => <Punkt key={u.schluessel} ok={u.erledigt} text={u.text}>{u.label}</Punkt>)}</ul>
            </Karte>
          )}
        </div>
        <div className="min-w-0 space-y-6">
          <Karte titel="Gegenseite">
            <p className="text-[14px] text-ink-800">{gegen?.anzeige}</p>
            {gegen?.anonym && <p className="mt-1 text-[12.5px] text-ink-500">Namen und Kontakt werden nach der Kontaktfreigabe durch ÖkoInvest sichtbar – spätestens vor dem Signing.</p>}
          </Karte>
          <Karte titel="Notartermin">
            {c.notar?.termin ? (
              <>
                <Angaben spalten={1} items={[{ label: "Termin", wert: datumZeit(c.notar.termin) }, { label: "Notar/Notarin", wert: [c.notar.name, c.notar.kanzlei].filter(Boolean).join(", ") }, { label: "Ort", wert: c.notar.ort }]} />
                <a href={`/api/portal/closing/${c.id}/termin`} className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800"><CalendarPlus aria-hidden="true" className="h-4 w-4" />In den Kalender übernehmen (.ics)</a>
              </>
            ) : <p className="text-[14px] text-ink-500">Noch kein Termin – ÖkoInvest stimmt ihn mit beiden Seiten ab.</p>}
          </Karte>
          <Karte titel="Kaufpreiszahlung">
            <Angaben spalten={1} items={[
              { label: "Zahlungsweg", wert: c.zahlung?.treuhand ? "Treuhand- bzw. Notaranderkonto" : "Direkt an den Verkäufer" },
              { label: "Fällig", wert: c.zahlung?.faelligAm ? datumText(c.zahlung.faelligAm) : "zum Closing" },
              { label: "Eingang", wert: c.zahlung?.eingangAm ? `bestätigt am ${datumText(c.zahlung.eingangAm)}` : "offen" },
              { label: "Meilensteine", wert: (c.meilensteine || []).map((m) => `${m.label}: ${eur(m.betrag)}`).join("; ") },
            ]} />
            {c.zahlung?.treuhand && <p className="mt-3 text-[12.5px] leading-snug text-ink-500">{c.zahlung.hinweis}</p>}
          </Karte>
          {c.provision && (
            <Karte titel="Provision (Verkäufer)">
              <p className="text-[14px] text-ink-800">{eur(c.provision.betrag)} ({(c.provision.satz * 100).toLocaleString("de-DE")} %){c.rechnung ? ` · Rechnung ${c.rechnung.nummer}` : ""}</p>
              {c.rechnung && <Link href="/portal/abrechnungen" className="mt-2 inline-block text-[14px] font-semibold text-ov-700 hover:text-ov-800">Zur Rechnung</Link>}
            </Karte>
          )}
          <Karte titel="Verlauf">
            <ol className="space-y-2 text-[13.5px]">{[...c.verlauf].reverse().slice(0, 15).map((x, i) => <li key={i}><span className="text-ink-500">{datumZeit(x.am)}</span> – {x.text}</li>)}</ol>
          </Karte>
        </div>
      </div>
      <Hinweis ton="neutral" className="mt-6">{c.hinweis}</Hinweis>
    </>
  );
}
