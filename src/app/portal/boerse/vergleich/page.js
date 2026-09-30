import Link from "next/link";
import { ArrowUpRight, Columns3, Heart } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import VergleichAuswahl from "@/components/Boerse/VergleichAuswahl";
import { PhaseBadge } from "@/components/Boerse/ProjektKarte";
import { Karte, Leer, QualitaetsBalken, SeitenKopf, StatusBadge } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { LAENDER, NETZANSCHLUSS, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { mwp, preisGesamt, preisText } from "@/lib/plattform/format";
import { PHASEN, phaseById } from "@/lib/invest/markt";
import { fmt, fmtMio } from "@/lib/rechner/annahmen";

export const metadata = { title: "Projektvergleich" };

const MAX = 4;
const NETZ_RANG = { offen: 0, angefragt: 1, zusage: 2, reserviert: 3, vorhanden: 4 };

const jeKwp = (p) => (p.preisModus === "proKwp" && p.preisProKwp ? p.preisProKwp : preisGesamt(p) && p.mwp ? preisGesamt(p) / (p.mwp * 1000) : null);
const codWert = (p) => (p.codGeplant ? Number(String(p.codGeplant).replace("-", ".")) : null);

/** Index des Bestwerts einer Zeile (höher oder niedriger ist besser), null bei Gleichstand/fehlend */
function bester(werte, richtung = "hoch") {
  const gueltig = werte.map((w, i) => [w, i]).filter(([w]) => typeof w === "number" && Number.isFinite(w));
  if (gueltig.length < 2) return null;
  const sortiert = [...gueltig].sort((a, b) => (richtung === "hoch" ? b[0] - a[0] : a[0] - b[0]));
  return sortiert[0][0] === sortiert[1][0] ? null : sortiert[0][1];
}

export default async function Vergleich({ searchParams }) {
  const n = await portalNutzer({ rollen: ["investor"] });
  const sp = await searchParams;
  const daten = await backend().boerse(n, {});
  const merkliste = daten.projekte.filter((p) => p.meinInteresse?.gemerkt);
  const wunsch = typeof sp?.ids === "string" ? sp.ids.split(",").slice(0, MAX) : null;
  const gewaehlt = (wunsch ? wunsch.filter((id) => merkliste.some((p) => p.id === id)) : merkliste.slice(0, MAX).map((p) => p.id)).slice(0, MAX);
  const projekte = gewaehlt.map((id) => merkliste.find((p) => p.id === id)).filter(Boolean);

  const zeilen = [
    { label: "Typ", wert: (p) => PROJEKT_TYPEN[p.typ] },
    { label: "Leistung", wert: (p) => `${p.typ === "speicher" ? `${fmt(p.mwp, 1)} MW` : mwp(p.mwp)}${p.mwhSpeicher ? ` / ${fmt(p.mwhSpeicher)} MWh` : ""}`, zahl: (p) => p.mwp, richtung: "hoch" },
    { label: "Phase", wert: (p) => <span className="flex flex-col items-start gap-1"><PhaseBadge phase={p.phase} /><span className="text-[12.5px] text-ink-500">{phaseById(p.phase).label}</span></span>, zahl: (p) => PHASEN.findIndex((x) => x.id === p.phase), richtung: "hoch" },
    { label: "Land / Region", wert: (p) => [LAENDER[p.land], p.bundesland, p.region].filter(Boolean).join(" · ") },
    { label: "Preisindikation", wert: (p) => preisText(p) },
    { label: "Preis je kWp", wert: (p) => (jeKwp(p) ? `${fmt(jeKwp(p), jeKwp(p) < 100 ? 1 : 0)} €/kWp` : "auf Anfrage"), zahl: jeKwp, richtung: "niedrig" },
    { label: "Kaufpreis (indikativ)", wert: (p) => (preisGesamt(p) ? fmtMio(preisGesamt(p), 2) : "auf Anfrage") },
    { label: "Netzanschluss", wert: (p) => NETZANSCHLUSS[p.netzanschluss] || "–", zahl: (p) => NETZ_RANG[p.netzanschluss], richtung: "hoch" },
    { label: "Inbetriebnahme (COD)", wert: (p) => p.codGeplant || "–", zahl: codWert, richtung: "niedrig" },
    { label: "Fläche", wert: (p) => (p.flaecheHa ? `${fmt(p.flaecheHa, 1)} ha` : "–") },
    {
      label: "Matching",
      wert: (p) =>
        p.matching ? (
          <span>
            <span className={cn("ov-num font-display text-[20px] font-extrabold", p.matching.score >= 70 ? "text-ov-700" : "text-ink-900")}>{p.matching.score} %</span>
            {p.matching.gruende.length > 0 && <span className="mt-0.5 block text-[12px] text-ink-500">{p.matching.gruende.join(", ")}</span>}
          </span>
        ) : (
          <Link href="/portal/profil#suchprofil" className="text-[13px] font-semibold text-ov-700 underline">Suchprofil anlegen</Link>
        ),
      zahl: (p) => p.matching?.score,
      richtung: "hoch",
    },
    { label: "Datenraum-Qualität", wert: (p) => <QualitaetsBalken quote={p.datenraumQualitaet} label="Unterlagen" klein />, zahl: (p) => p.datenraumQualitaet, richtung: "hoch" },
    { label: "Mein Status", wert: (p) => (p.meinInteresse && p.meinInteresse.status !== "gemerkt" ? <StatusBadge art="interesse" status={p.meinInteresse.status} /> : <span className="text-ink-500">Gemerkt</span>) },
  ];

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Projektbörse"
        titel="Projekte vergleichen"
        text="Bis zu vier Projekte Ihrer Merkliste nebeneinander – Bestwerte je Kennzahl sind grün markiert."
        aktionen={<Button href="/portal/boerse?ansicht=merkliste" size="sm" variant="secondary" icon={Heart}>Zur Merkliste</Button>}
      />

      {merkliste.length < 2 ? (
        <Leer
          icon={Columns3}
          titel="Mindestens zwei Projekte merken"
          text="Merken Sie sich in der Projektbörse Projekte mit dem Herz-Symbol – dann können Sie sie hier nebeneinander vergleichen."
          aktion={<Button href="/portal/boerse" size="sm">Zur Projektbörse</Button>}
        />
      ) : (
        <>
          <Karte>
            <VergleichAuswahl projekte={merkliste.map((p) => ({ id: p.id, titel: p.titel }))} gewaehlt={gewaehlt} max={MAX} />
          </Karte>
          {projekte.length < 2 ? (
            <Leer icon={Columns3} titel="Bitte mindestens zwei Projekte wählen" />
          ) : (
            <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
                  <caption className="sr-only">Vergleich von {projekte.length} Projekten</caption>
                  <thead>
                    <tr className="border-b border-ink-100 align-top">
                      <th scope="col" className="sticky left-0 z-10 w-[9.5rem] bg-white px-4 py-4 text-[12px] font-semibold uppercase tracking-wider text-ink-500 md:w-[12rem] md:px-6">Kennzahl</th>
                      {projekte.map((p) => (
                        <th key={p.id} scope="col" className="min-w-[11.5rem] px-4 py-4 font-normal md:px-5">
                          <Link href={`/portal/boerse/${p.id}`} className="group block">
                            <span className="block font-display text-[15.5px] font-bold leading-snug text-ink-900 group-hover:text-ov-700">{p.titel}</span>
                            <span className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ov-700">
                              Exposé <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                            </span>
                          </Link>
                          {p.demo && <span className="mt-1.5 inline-block rounded-full bg-sun-400 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-navy-950">Demo</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {zeilen.map((z) => {
                      const best = z.zahl ? bester(projekte.map(z.zahl), z.richtung) : null;
                      return (
                        <tr key={z.label} className="align-top">
                          <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-3.5 text-[13px] font-medium text-ink-500 md:px-6">{z.label}</th>
                          {projekte.map((p, i) => (
                            <td key={p.id} className={cn("px-4 py-3.5 text-ink-900 md:px-5", best === i && "bg-ov-50/70")}>
                              {z.wert(p)}
                              {best === i && <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wider text-ov-700">Bestwert</span>}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-ink-100 px-4 py-3 text-[12.5px] text-ink-500 md:px-6">
                Preise und Termine sind Angaben der Anbieter (indikativ). Vertrauliche Angaben sehen Sie im Exposé nach NDA-Freigabe.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
