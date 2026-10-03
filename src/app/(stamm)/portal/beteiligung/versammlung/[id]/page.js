// /portal/beteiligung/versammlung/[id] – Generalversammlung für Mitglieder: Einladung, Tagesordnung, Unterlagen,
// Online-Abstimmung (eine Stimme je Mitglied), Ergebnis und Protokoll (PDF). Fremde Versammlungen → 404.

import { CalendarDays, CheckCircle2, FileText, Vote } from "lucide-react";
import Button from "@/components/ui/Button";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { Abstimmung } from "@/components/Portal/Mitglied/Portal";
import { PdfLink } from "@/components/Portal/Mitglied/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { mitgliedBackend } from "@/lib/plattform/backend/mitglied";
import { GV_ARTEN, GV_FORMEN, GV_STATUS, MEHRHEITEN, STIMMEN } from "@/lib/plattform/mitglied/versammlung";
import { datum, datumZeit } from "@/lib/plattform/format";

export const metadata = { title: "Generalversammlung" };
const zeit = (s) => (s ? `${datum(s)}, ${s.slice(11, 16)} Uhr` : "–");

export default async function VersammlungSeite({ params }) {
  const { id } = await params;
  const n = await portalNutzer({ rollen: ["mitglied"] });
  const gv = await laden(() => mitgliedBackend().gvDetail(n, id));
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow={`${gv.geno.name} · ${GV_ARTEN[gv.art]}`}
        titel={gv.titel}
        text={`${GV_FORMEN[gv.form]} am ${zeit(gv.datum)}${gv.ort ? ` – ${gv.ort}` : ""}.`}
        aktionen={<span className="flex flex-wrap gap-2"><PdfLink href={`/api/portal/mitglied/pdf?art=einladung&id=${gv.id}`}>Einladung</PdfLink>{gv.status === "abgeschlossen" && <PdfLink href={`/api/portal/mitglied/pdf?art=protokoll&id=${gv.id}`}>Protokoll</PdfLink>}<Button href="/portal/beteiligung" size="sm" variant="ghost">Zur Übersicht</Button></span>}
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Karte titel="Tagesordnung" aktion={<Badge ton={GV_STATUS[gv.status]?.ton}>{gv.statusLabel}</Badge>}>
            {gv.einleitung && <p className="mb-4 whitespace-pre-line text-[14px] leading-relaxed text-ink-600">{gv.einleitung}</p>}
            <ol className="space-y-3">
              {gv.tagesordnung.map((t, i) => (
                <li key={t.id} className="rounded-2xl bg-ink-50 px-4 py-3">
                  <p className="font-semibold text-ink-900">{i + 1}. {t.titel}</p>
                  {t.text && <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-600">{t.text}</p>}
                  {t.beschluss && <p className="mt-1.5 text-[12.5px] font-medium text-ink-500">Beschluss · {MEHRHEITEN[t.mehrheit]?.label}{t.satzung ? " (Satzungsänderung)" : ""}</p>}
                </li>
              ))}
            </ol>
          </Karte>
          {gv.unterlagen.length > 0 && (
            <Karte titel="Unterlagen" aktion={<FileText aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
              <div className="space-y-4">
                {gv.unterlagen.map((u) => (
                  <details key={u.id} className="rounded-2xl ring-1 ring-inset ring-ink-200/80 open:bg-ink-50/50">
                    <summary className="cursor-pointer px-4 py-3 text-[14.5px] font-semibold text-ink-900">{u.titel}</summary>
                    <p className="whitespace-pre-line px-4 pb-4 text-[14px] leading-relaxed text-ink-700">{u.text}</p>
                  </details>
                ))}
              </div>
            </Karte>
          )}
        </div>
        <div className="space-y-6">
          <Karte titel="Teilnahme" aktion={<CalendarDays aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
            <Angaben spalten={1} items={[{ label: "Termin", wert: zeit(gv.datum) }, { label: "Ort", wert: gv.ort }, { label: "Online-Teilnahme", wert: gv.zugang }, { label: "Online-Abstimmung bis", wert: gv.abstimmungBis ? zeit(gv.abstimmungBis) : "" }, { label: "Stimmen abgegeben", wert: `${gv.abgegeben} von ${gv.stimmberechtigt} Mitgliedern` }]} />
          </Karte>
          {gv.status === "abgeschlossen" && gv.ergebnis ? (
            <Karte titel="Ergebnis" untertitel={`Beteiligung ${String(gv.ergebnis.beteiligungPct).replace(".", ",")} %`} aktion={<CheckCircle2 aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
              <Tabelle kopf={["Beschluss", STIMMEN.ja, STIMMEN.nein, "Enth.", ""]} className="-mx-5 md:-mx-6">
                {gv.ergebnis.tops.map((t) => (
                  <tr key={t.id}>
                    <td className={zelle}>{t.titel}</td>
                    <td className={`${zelle} ov-num`}>{t.ja}</td>
                    <td className={`${zelle} ov-num`}>{t.nein}</td>
                    <td className={`${zelle} ov-num`}>{t.enthaltung}</td>
                    <td className={zelle}><Badge ton={t.angenommen ? "ok" : "neutral"}>{t.angenommen ? "angenommen" : "abgelehnt"}</Badge></td>
                  </tr>
                ))}
              </Tabelle>
            </Karte>
          ) : gv.eigeneStimme ? (
            <Karte titel="Ihre Stimme" aktion={<Vote aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
              <p className="mb-3 text-[14px] text-ink-600">Abgegeben am {datumZeit(gv.eigeneStimme.am)}. Das Ergebnis erscheint nach Abschluss der Versammlung.</p>
              <ul className="space-y-1.5 text-[14px]">
                {gv.tagesordnung.filter((t) => t.beschluss).map((t) => <li key={t.id}><span className="text-ink-600">{t.titel}:</span> <strong>{STIMMEN[gv.eigeneStimme.stimmen[t.id]]}</strong></li>)}
              </ul>
            </Karte>
          ) : gv.darfAbstimmen ? (
            <Karte titel="Online abstimmen" aktion={<Vote aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
              <Abstimmung gv={gv} />
            </Karte>
          ) : (
            <Hinweis ton="neutral" titel="Abstimmung">
              {gv.status === "eingeladen" ? "Die Online-Abstimmung wird vom Vorstand geöffnet – Sie werden benachrichtigt." : gv.status === "abgesagt" ? "Die Versammlung wurde abgesagt." : gv.status === "abstimmung" ? "Die Online-Abstimmung ist beendet bzw. Sie sind nicht stimmberechtigt." : "Abstimmung nur für stimmberechtigte Mitglieder."}
            </Hinweis>
          )}
        </div>
      </div>
    </div>
  );
}
