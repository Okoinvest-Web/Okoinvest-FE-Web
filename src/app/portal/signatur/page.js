import Link from "next/link";
import { FileSignature, ShieldCheck } from "lucide-react";
import { Hinweis, Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { VorgangZeile } from "@/components/Portal/Signatur/teile";
import { SignaturEinstellungen, SignaturNeu } from "@/components/Portal/Signatur/SignaturVerwaltung";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { darfLesen, darfSchreiben } from "@/lib/plattform/rechte";
import { SIGNATUR_KENNZEICHNUNG, SIGNATUR_RECHTSHINWEIS } from "@/lib/plattform/signatur";

export const metadata = { title: "Elektronische Unterschrift" };

export default async function SignaturSeite({ searchParams }) {
  const n = await portalNutzer();
  const sp = await searchParams;
  const s = serviceBackend();
  const bo = n.rollen.includes("admin") && darfLesen(n, "signatur");
  const alle = bo && sp?.ansicht !== "meine";
  const [vorgaenge, einstellungen, konten] = await Promise.all([
    laden(() => s.signaturen(n, { alle })),
    bo ? s.signaturEinstellungen(n).catch(() => null) : null,
    bo && darfSchreiben(n, "signatur") ? backend().nutzerListe(n, {}).catch(() => []) : [],
  ]);
  const offen = vorgaenge.filter((v) => v.status === "laufend");
  const fertig = vorgaenge.filter((v) => v.status !== "laufend");
  const meineOffen = vorgaenge.filter((v) => v.ichBinDran);

  return (
    <>
      <SeitenKopf
        eyebrow={bo ? "Backoffice · Dokumente" : "Dokumente"}
        titel="Elektronische Unterschrift"
        text="Vereinbarungen, Absichtserklärungen und Aufträge sicher im Portal unterschreiben – mit Bestätigungscode per E-Mail, Protokoll und Prüfseite im signierten PDF."
        aktionen={bo && darfSchreiben(n, "signatur") ? <SignaturNeu vorschlaege={(konten || []).map((k) => ({ email: k.email, name: [k.vorname, k.nachname].filter(Boolean).join(" ") }))} /> : null}
      />
      {bo && (
        <nav aria-label="Ansicht" className="mb-5 flex gap-2">
          <Link href="/portal/signatur" className={`rounded-full px-4 py-2 text-[14px] font-semibold ${alle ? "bg-navy-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200"}`}>Alle Vorgänge</Link>
          <Link href="/portal/signatur?ansicht=meine" className={`rounded-full px-4 py-2 text-[14px] font-semibold ${!alle ? "bg-navy-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200"}`}>Meine</Link>
        </nav>
      )}
      {meineOffen.length > 0 && (
        <Hinweis ton="ok" titel={`${meineOffen.length === 1 ? "Ein Dokument wartet" : `${meineOffen.length} Dokumente warten`} auf Ihre Unterschrift`} className="mb-5" icon={FileSignature}>
          Öffnen Sie das Dokument, fordern Sie den Bestätigungscode an und unterschreiben Sie – das dauert etwa eine Minute.
        </Hinweis>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Karte titel="Offen" untertitel={`${offen.length} Vorgänge zur Unterschrift`} innen="p-0">
            {offen.length ? <ul className="divide-y divide-ink-100">{offen.map((v) => <VorgangZeile key={v.id} v={v} />)}</ul> : <Leer icon={FileSignature} titel="Keine offenen Dokumente" text="Sobald Ihnen ein Dokument zur Unterschrift bereitgestellt wird, erscheint es hier und Sie erhalten eine Benachrichtigung." className="m-5 border-0" />}
          </Karte>
          <Karte titel="Erledigt" untertitel="Vollständig unterschrieben, abgelehnt, widerrufen oder abgelaufen" innen="p-0">
            {fertig.length ? <ul className="divide-y divide-ink-100">{fertig.map((v) => <VorgangZeile key={v.id} v={v} />)}</ul> : <p className="px-6 py-5 text-[14px] text-ink-500">Noch keine abgeschlossenen Vorgänge.</p>}
          </Karte>
        </div>
        <aside className="min-w-0 space-y-6">
          <Karte titel="Rechtlicher Hinweis">
            <p className="flex gap-2 text-[13.5px] font-semibold leading-relaxed text-ink-900">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
              {SIGNATUR_KENNZEICHNUNG}
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-600">{SIGNATUR_RECHTSHINWEIS}</p>
          </Karte>
          {bo && einstellungen && (
            <Karte titel="Klick oder Unterschrift" untertitel="Standard-Erklärungen der Plattform">
              <SignaturEinstellungen einstellungen={einstellungen} darfBearbeiten={darfSchreiben(n, "signatur")} />
            </Karte>
          )}
        </aside>
      </div>
    </>
  );
}
