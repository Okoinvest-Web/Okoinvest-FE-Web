import { FileSpreadsheet } from "lucide-react";
import DateiLink from "@/components/Portal/DateiLink";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import StatusAktionen from "@/components/Portal/StatusAktionen";
import { Angaben, Karte, Leer, SeitenKopf, StatusBadge, Tabelle, zelle } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { LAENDER, NETZANSCHLUSS, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { BEDINGUNGEN } from "@/lib/plattform/prozesse";
import { datumZeit, mwp, preisText, relativ } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";
import { phaseById } from "@/lib/invest/markt";

export const metadata = { title: "Projekt-Freigabe" };

export default async function AdminProjekte() {
  const n = await portalNutzer({ admin: true });
  const projekte = await backend().projekte(n, { alle: true });
  const pruefung = projekte.filter((p) => p.status === "pruefung");

  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Projekt-Freigabe" text="Eingereichte Projekte prüfen, veröffentlichen (mit Provisionssatz), zur Überarbeitung zurückgeben oder mit Begründung ablehnen." aktionen={<DateiLink href="/api/admin/export/projekte" icon={FileSpreadsheet}>CSV-Export</DateiLink>} />

      {pruefung.length ? (
        <div className="space-y-4">
          {pruefung.map((p) => {
            const phase = p.phase ? phaseById(p.phase) : null;
            const fehlt = BEDINGUNGEN.projektEinreichbar(p);
            const plausibel = phase && p.preisProKwp ? p.preisProKwp >= phase.preisProKwp.min * 0.5 && p.preisProKwp <= phase.preisProKwp.max * 1.5 : null;
            return (
              <Karte key={p.id} titel={<Link href={`/portal/projekte/${p.id}`} className="hover:text-ov-700">{p.titel}</Link>} untertitel={`${p.anbieter?.firma || `${p.anbieter?.vorname} ${p.anbieter?.nachname}`} · eingereicht ${relativ(p.geaendertAm)}`} aktion={<StatusBadge art="projekt" status={p.status} />}>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <Angaben
                      spalten={3}
                      items={[
                        { label: "Typ", wert: PROJEKT_TYPEN[p.typ] },
                        { label: "Leistung", wert: mwp(p.mwp) },
                        { label: "Lage", wert: [p.region, p.bundesland, LAENDER[p.land]].filter(Boolean).join(", ") },
                        { label: "Phase", wert: phase?.label },
                        { label: "Netz", wert: NETZANSCHLUSS[p.netzanschluss] },
                        { label: "Preis", wert: preisText(p) },
                        { label: "Beschreibung", wert: p.beschreibung, breit: true },
                      ]}
                    />
                    <ul className="mt-4 space-y-1.5 text-[13.5px]">
                      <li className={fehlt.length ? "text-ink-900" : "text-ov-800"}>{fehlt.length ? `Fehlt: ${fehlt.join(", ")}` : "Pflichtangaben vollständig"}</li>
                      <li className="text-ink-700">Provisionsvereinbarung: {p.provisionAkzeptiert ? `akzeptiert ${datumZeit(p.provisionAkzeptiert.am)}` : "fehlt"}</li>
                      <li className="text-ink-700">Dokumente: {fmt(p.dokumente)}{plausibel === false ? " · Preis außerhalb der üblichen Spanne – prüfen" : ""}</li>
                    </ul>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
                    <StatusAktionen art="projekt" id={p.id} status={p.status} als="admin" />
                  </div>
                </div>
              </Karte>
            );
          })}
        </div>
      ) : (
        <Leer icon={ShieldCheck} titel="Keine Projekte in Prüfung" text="Sobald ein Anbieter ein Projekt einreicht, erscheint es hier." />
      )}

      <Karte titel="Alle Projekte">
        <Tabelle kopf={["Projekt", "Anbieter", "Status", "Aufrufe / Merker / NDA", "Aktualisiert"]}>
          {projekte.map((p) => (
            <tr key={p.id} className="hover:bg-sand-50">
              <td className={zelle}>
                <Link href={`/portal/projekte/${p.id}`} className="font-semibold text-ink-900 hover:text-ov-700">{p.titel}</Link>
                <p className="text-[12.5px] text-ink-500">{[PROJEKT_TYPEN[p.typ], mwp(p.mwp), LAENDER[p.land]].filter(Boolean).join(" · ")}{p.demo ? " · Demo" : ""}</p>
              </td>
              <td className={zelle}>{p.anbieter?.firma || `${p.anbieter?.vorname} ${p.anbieter?.nachname}`}</td>
              <td className={zelle}><StatusBadge art="projekt" status={p.status} /></td>
              <td className={`${zelle} ov-num text-ink-700`}>{fmt(p.statistik.aufrufe)} / {fmt(p.statistik.merker)} / {fmt(p.statistik.ndaAnfragen)}</td>
              <td className={`${zelle} whitespace-nowrap text-ink-500`}>{relativ(p.geaendertAm)}</td>
            </tr>
          ))}
        </Tabelle>
      </Karte>
    </div>
  );
}
