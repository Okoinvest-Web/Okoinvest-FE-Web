import Link from "next/link";
import { Landmark, TriangleAlert, Users } from "lucide-react";
import { Badge, Karte, Kennzahl, Leer, SeitenKopf } from "@/components/Portal/ui";
import { teur, datumDe } from "@/components/Portal/Finanzierung/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";
import { ANFRAGE_STATUS } from "@/lib/plattform/finanzierung/bank";
import { KREDIT_ERGEBNIS } from "@/lib/plattform/finanzierung/bankakte";

export const metadata = { title: "Finanzierungsanfragen" };

// Bank-Portal: Anfragen der eigenen Bank(en) – Rolle „bank“ (nur per Einladung), andere Rollen 404; je Anfrage offene Punkte der Bank-Akte
export default async function BankSeite() {
  const n = await portalNutzer({ rollen: ["bank"] });
  const d = await laden(() => finanzierungBackend().fzBankMeine(n));
  const st = await bankakteBackend().baStaende(n).catch(() => ({}));
  const laufend = d.anfragen.filter((a) => ["offen", "in_pruefung", "termsheet"].includes(a.status));
  const finanziert = d.anfragen.filter((a) => a.status === "ausgewaehlt");
  const summe = (k) => Object.values(st).reduce((s, x) => s + (x?.[k] || 0), 0);
  return (
    <>
      <SeitenKopf eyebrow={d.banken.map((b) => b.name).join(", ") || "Finanzierungspartner"} titel="Finanzierungsanfragen" text="Anfragen von ÖkoInvest an Ihr Haus: Bankenpaket einsehen, Unterlagen anfordern, Fragen stellen, Term Sheet abgeben – und nach der Auswahl Kreditentscheidung, Auszahlungen und Monitoring."
        aktionen={<Link href="/portal/bank/team" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:ring-ink-300"><Users aria-hidden="true" className="h-4 w-4" />Team</Link>} />
      {d.anfragen.length === 0 ? (
        <Leer icon={Landmark} titel="Keine offenen Anfragen" text="Sobald ÖkoInvest Ihr Haus anfragt, erscheint die Anfrage hier und Sie erhalten eine E-Mail." />
      ) : (
        <>
          <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kennzahl label="Laufende Anfragen" wert={laufend.length} icon={Landmark} />
            <Kennzahl label="Finanzierungen" wert={finanziert.length} hinweis="Ihr Haus ausgewählt" />
            <Kennzahl label="Unterlagen zur Prüfung" wert={summe("anforderungenZuPruefen") + summe("berichteZuPruefen")} hinweis="Lieferungen und Berichte" />
            <Kennzahl label="Überfällig bei ÖkoInvest" wert={summe("anforderungenUeberfaellig") + summe("berichteUeberfaellig")} icon={TriangleAlert} hinweis="Anforderungen und Berichte" />
          </section>
          <Karte titel="Anfragen" innen="p-0">
            <ul className="divide-y divide-ink-100">
              {d.anfragen.map((a) => {
                const s = st[a.id] || {};
                const punkte = [s.anforderungenOffen && `${s.anforderungenOffen} Unterlage(n) angefordert`, s.fragenOffen && `${s.fragenOffen} Frage(n) offen`, s.anforderungenZuPruefen && `${s.anforderungenZuPruefen} Lieferung(en) prüfen`, s.berichteZuPruefen && `${s.berichteZuPruefen} Bericht(e) prüfen`, s.auszahlungenOffen && `${s.auszahlungenOffen} Auszahlung(en) offen`].filter(Boolean);
                return (
                  <li key={a.id}>
                    <Link href={`/portal/bank/${a.id}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-ink-50/60 md:flex-row md:items-center md:px-6">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-ink-900">{a.titel}</p>
                        <p className="text-[12.5px] text-ink-500">{String(a.mwp).replace(".", ",")} MWp · {a.land} · Bedarf {teur(a.betragWunsch)}{a.status === "ausgewaehlt" ? "" : ` · Frist ${datumDe(a.frist)}`}{s.zustaendig ? ` · zuständig ${s.zustaendig}` : ""}</p>
                        {punkte.length > 0 && <p className="text-[12.5px] text-ink-700">{punkte.join(" · ")}</p>}
                      </div>
                      <span className="flex flex-wrap gap-2">
                        {s.kredit && <Badge ton={KREDIT_ERGEBNIS[s.kredit]?.ton === "rot" ? "neutral" : KREDIT_ERGEBNIS[s.kredit]?.ton}>{KREDIT_ERGEBNIS[s.kredit]?.label}</Badge>}
                        <Badge ton={ANFRAGE_STATUS[a.status]?.ton}>{ANFRAGE_STATUS[a.status]?.label}</Badge>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Karte>
        </>
      )}
    </>
  );
}
