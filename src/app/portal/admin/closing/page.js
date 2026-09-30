// /portal/admin/closing – Deal-Abschluss: Closing-Räume (Signing, CPs, Zahlung, Closing), Kandidaten aus Zuschlag bzw.
// angenommener LOI, Kennzahlen.
import Link from "next/link";
import { Coins, FileSignature, Stamp, Timer } from "lucide-react";
import { Badge, Hinweis, Karte, Kennzahl, Leer, SeitenKopf } from "@/components/Portal/ui";
import { ClosingEroeffnen } from "@/components/Portal/Closing/ClosingKleinteile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { closingBackend } from "@/lib/plattform/backend/closing";
import { CL_HINWEIS, CL_STATUS } from "@/lib/plattform/closing/closing";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Deal-Abschluss (Closing)" };

const FILTER = [["offen", "Offen"], ["", "Alle"], ["vollzogen", "Vollzogen"], ["abgebrochen", "Abgebrochen"]];
const eur = (x) => `${Math.round(Number(x) || 0).toLocaleString("de-DE")} €`;
const datumText = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join(".") : "");

export default async function ClosingListeSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const status = FILTER.some(([k]) => k === sp?.status) ? sp.status : "offen";
  const d = await laden(() => closingBackend().clListe(n, { status }));
  const k = d.kennzahlen;
  return (
    <>
      <SeitenKopf eyebrow="Backoffice · Transaktion" titel="Deal-Abschluss (Closing)" text="Nach Zuschlag oder angenommener LOI: Struktur, Kaufvertrag (Muster), Signing-Checkliste mit KYC beider Seiten, Closing Conditions, Notartermin, Kaufpreiszahlung, Übergabe – und automatisch die Provisionsrechnung beim Closing." />
      <Hinweis ton="neutral" className="mb-5">{CL_HINWEIS}</Hinweis>
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl ton="dunkel" icon={Stamp} label="Offene Closings" wert={String(k.offen)} />
        <Kennzahl icon={FileSignature} label="Signed, CPs offen" wert={String(k.signing)} />
        <Kennzahl icon={Timer} label="Kandidaten" wert={String(d.kandidaten.length)} hinweis="Zuschlag bzw. LOI ohne Closing-Raum" />
        <Kennzahl icon={Coins} label="Volumen vollzogen" wert={eur(k.volumen)} href="/portal/admin/closing?status=vollzogen" />
      </section>

      {d.schreiben && d.kandidaten.length > 0 && (
        <Karte titel="Bereit für den Closing-Raum" untertitel="Zuschlag im Bieterverfahren bzw. angenommene LOI" className="mb-6" innen="p-0">
          <ul className="divide-y divide-ink-100">
            {d.kandidaten.map((x) => (
              <li key={x.interesseId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{x.projekt}</p>
                  <p className="text-[12.5px] text-ink-500">{x.herkunft === "zuschlag" ? "Zuschlag" : "LOI angenommen"} · {[x.investor?.firma, [x.investor?.vorname, x.investor?.nachname].filter(Boolean).join(" ")].filter(Boolean).join(" – ") || "Investor"} · {x.mwp} MWp · {x.land} · Kaufpreis {x.kaufpreis ? eur(x.kaufpreis) : "offen"}</p>
                </div>
                <ClosingEroeffnen kandidat={x} />
              </li>
            ))}
          </ul>
        </Karte>
      )}

      <Karte titel="Closing-Räume" untertitel={`${d.closings.length} Treffer`} innen="p-0">
        <nav aria-label="Filter" className="flex gap-1.5 overflow-x-auto border-b border-ink-100 px-5 py-3 ov-no-scrollbar md:px-6">
          {FILTER.map(([key, label]) => (
            <Link key={key || "alle"} href={`/portal/admin/closing${key ? `?status=${key}` : "?status="}`} aria-current={status === key ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset", status === key ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300")}>{label}</Link>
          ))}
        </nav>
        {d.closings.length ? (
          <ul className="divide-y divide-ink-100">
            {d.closings.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
                <div className="min-w-0">
                  <Link href={`/portal/admin/closing/${c.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{c.projekt?.titel || c.id}</Link>
                  <p className="text-[12.5px] text-ink-500">{c.id} · {c.strukturLabel} · {eur(c.kaufpreis)} · {c.verkaeufer?.anzeige} → {c.kaeufer?.anzeige} · CPs {c.cpsGesamt - c.cpsOffen}/{c.cpsGesamt}{c.notarTermin ? ` · Notar ${datumText(c.notarTermin)}` : ""}</p>
                </div>
                <Badge ton={CL_STATUS[c.status]?.ton}>{c.statusLabel}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5 md:p-6"><Leer icon={Stamp} titel="Keine Closing-Räume in dieser Ansicht" text="Closing-Räume entstehen aus einem Zuschlag im Bieterverfahren oder einer angenommenen LOI." /></div>
        )}
      </Karte>
    </>
  );
}
