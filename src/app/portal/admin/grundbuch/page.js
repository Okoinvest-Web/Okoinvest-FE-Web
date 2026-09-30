// /portal/admin/grundbuch – Grundbuch & Dienstbarkeiten: Kennzahlen, Bericht „offene Grundbuch-Eintragungen“ (Fristen,
// nächster Schritt), alle Akten mit Filter, neue Akte aus Fläche/Anlage.
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileClock, ScrollText } from "lucide-react";
import { Hinweis, Karte, Kennzahl, Leer, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { GrundbuchAnlegen } from "@/components/Portal/Closing/GrundbuchFormulare";
import { StatusBadgeGb } from "@/components/Portal/Closing/GrundbuchAnzeige";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { closingBackend } from "@/lib/plattform/backend/closing";
import { GB_HINWEIS, GB_LAENDER } from "@/lib/plattform/closing/grundbuch";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Grundbuch & Dienstbarkeiten" };

const FILTER = [["offen", "Offen"], ["", "Alle"], ["eingereicht", "Eingereicht"], ["eingetragen", "Eingetragen"], ["abgebrochen", "Abgebrochen"]];
const datumText = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join(".") : "–");

export default async function GrundbuchSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const status = FILTER.some(([k]) => k === sp?.status) ? sp.status : "offen";
  const land = Object.keys(GB_LAENDER).includes(sp?.land) ? sp.land : "";
  const b = closingBackend();
  const d = await laden(() => b.gbListe(n, { status, land }));
  const auswahl = d.schreiben ? await laden(() => b.gbAuswahl(n)) : null;
  const k = d.kennzahlen;
  const q = (s, l = land) => `/portal/admin/grundbuch?status=${s}${l ? `&land=${l}` : ""}`;
  return (
    <>
      <SeitenKopf eyebrow="Backoffice · Grundbuch" titel="Grundbuch & Dienstbarkeiten" text="Dienstbarkeiten bzw. Servitute für Flächen und Dächer: Schrittfolge je Land von Vertrag über Beglaubigung und Rangrücktritt bis zur bestätigten Eintragung – mit Fristen, Nachweisen und Muster-Dokumenten." />
      <Hinweis ton="neutral" className="mb-5">{GB_HINWEIS}</Hinweis>
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl ton="dunkel" icon={ScrollText} label="Offene Akten" wert={String(k.offen)} hinweis={`${k.gesamt} Akten gesamt`} />
        <Kennzahl icon={FileClock} label="Beim Grundbuch eingereicht" wert={String(k.eingereicht)} href={q("eingereicht")} />
        <Kennzahl icon={CheckCircle2} label="Eingetragen" wert={String(k.eingetragen)} href={q("eingetragen")} />
        <Kennzahl icon={AlertTriangle} label="Fristen überschritten" wert={String(k.ueberfaellig)} hinweis="Akten mit überfälligem Schritt" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Karte titel="Bericht: offene Grundbuch-Eintragungen" untertitel="Sortiert nach nächster Frist – auch als Frappe-Bericht „Offene Grundbuch-Eintragungen“" innen="p-5 md:p-6">
            {d.bericht.length ? (
              <Tabelle kopf={["Akte", "Land", "Status", "Nächster Schritt", "Frist"]}>
                {d.bericht.map((r) => (
                  <tr key={r.id} className={cn(r.ueberfaellig && "bg-sun-300/10")}>
                    <td className={zelle}><Link href={`/portal/admin/grundbuch/${r.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{r.titel}</Link><p className="text-[12.5px] text-ink-500">{r.eigentuemer}{r.bezug ? ` · ${r.bezug}` : ""}</p></td>
                    <td className={zelle}>{r.land}</td>
                    <td className={zelle}>{r.status}</td>
                    <td className={zelle}>{r.naechster || "–"}</td>
                    <td className={cn(zelle, "whitespace-nowrap", r.ueberfaellig && "font-semibold text-red-700")}>{datumText(r.frist)}{r.ueberfaellig ? " (überfällig)" : ""}</td>
                  </tr>
                ))}
              </Tabelle>
            ) : (
              <p className="text-[14px] text-ink-500">Keine offenen Eintragungen.</p>
            )}
          </Karte>

          <Karte titel="Akten" untertitel={`${d.akten.length} Treffer`} innen="p-0">
            <nav aria-label="Filter" className="flex gap-1.5 overflow-x-auto border-b border-ink-100 px-5 py-3 ov-no-scrollbar md:px-6">
              {FILTER.map(([key, label]) => (
                <Link key={key || "alle"} href={q(key)} aria-current={status === key ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset", status === key ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300")}>{label}</Link>
              ))}
              <span aria-hidden="true" className="mx-1 w-px bg-ink-200" />
              {["", ...Object.keys(GB_LAENDER)].map((l) => (
                <Link key={l || "alle-laender"} href={q(status, l)} aria-current={land === l ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset", land === l ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300")}>{l || "DACH"}</Link>
              ))}
            </nav>
            {d.akten.length ? (
              <ul className="divide-y divide-ink-100">
                {d.akten.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
                    <div className="min-w-0">
                      <Link href={`/portal/admin/grundbuch/${a.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{a.titel}</Link>
                      <p className="text-[12.5px] text-ink-500">{a.id} · {a.landLabel} · {a.objektArtLabel} · {a.eigentuemerName || "–"} · {a.fortschritt.erledigt}/{a.fortschritt.gesamt} Schritte{a.naechsteFrist ? ` · Frist ${datumText(a.naechsteFrist)}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.ueberfaellig > 0 && <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-red-700"><AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />überfällig</span>}
                      <StatusBadgeGb status={a.status} label={a.statusLabel} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5 md:p-6"><Leer icon={ScrollText} titel="Keine Akten in dieser Ansicht" text="Neue Akten legen Sie rechts aus einer Fläche oder Anlage an." /></div>
            )}
          </Karte>
        </div>
        {auswahl && (
          <Karte titel="Neue Akte" untertitel="Aus Fläche, Anlage oder ohne Bezug" className="self-start">
            <GrundbuchAnlegen auswahl={JSON.parse(JSON.stringify(auswahl))} />
          </Karte>
        )}
      </div>
    </>
  );
}
