// Gemeinsame Bausteine der EG-Angebotsseiten (Welle 3, Paket B7) – ohne Hooks, in Server- und
// Client-Komponenten nutzbar.
//   <NurOesterreich land="DE" pfad="/energiegemeinschaften/software/preise" en />  Länderhinweis für DE/CH
//   <FaktKasten fakt={egFakt("netzgebiet")} en />                                    Aussage mit Quelle, Stand, Status
import { ArrowRight, ExternalLink, Scale } from "lucide-react";
import Link from "@/components/Land/Link";
import { LandHinweis } from "@/components/Land/LandHinweis";
import { cn } from "@/components/ui/cn";

const TEXT = {
  DE: {
    de: "Dieses Angebot gilt nur für Österreich: Unsere Software für Energiegemeinschaften ist auf das österreichische ElWG und den Datenaustausch über EDA ausgelegt. Für Deutschland bieten wir sie derzeit nicht an.",
    en: "This offer applies to Austria only: our software for energy communities is built for Austria’s ElWG and data exchange via EDA. We do not currently offer it for Germany.",
    gemeinschaften: { de: "Energiegemeinschaften in Deutschland", en: "Energy communities in Germany" },
  },
  CH: {
    de: "Dieses Angebot gilt nur für Österreich: Für die Schweiz bieten wir keine Software für Energiegemeinschaften an. Was für LEG und vZEV gilt, steht auf unserer Seite zu Energiegemeinschaften.",
    en: "This offer applies to Austria only: we do not offer software for energy communities in Switzerland. What applies to LEGs and vZEVs is explained on our energy communities page.",
    gemeinschaften: { de: "LEG und vZEV in der Schweiz", en: "LEG and vZEV in Switzerland" },
  },
};

/** Für /de und /ch: ehrlicher Länderhinweis statt österreichischer Inhalte, mit Weg zur AT-Fassung. */
export function NurOesterreich({ land, pfad, en = false, className }) {
  const t = TEXT[land];
  if (!t) return null;
  const link = "group inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-[15px] font-semibold text-ov-700 underline-offset-4 hover:text-ov-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ov-600";
  return (
    <div className={cn("mx-auto max-w-3xl", className)}>
      <LandHinweis land={land} text={t.de} textEn={t.en} />
      <div className="mt-5 flex flex-col gap-2 px-1 sm:flex-row sm:flex-wrap sm:gap-x-8">
        <Link href={`/at${pfad}`} className={link} hrefLang="de-AT">
          {en ? "View the version for Austria" : "Fassung für Österreich ansehen"}
          <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
        <Link href="/energiegemeinschaften" className={link}>
          {en ? t.gemeinschaften.en : t.gemeinschaften.de}
          <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

/** Rechts- oder Prozessaussage aus dem Faktenregister mit Quelle, Stand und Prüfstatus. */
export function FaktKasten({ fakt, titel, en = false, dunkel = false, className }) {
  if (!fakt) return null;
  return (
    <div
      className={cn(
        "rounded-2xl p-5 text-[14.5px] leading-relaxed",
        dunkel ? "bg-white/[0.07] text-white/85 ring-1 ring-white/12" : "bg-sand-50 text-ink-700 ring-1 ring-ink-200/70",
        className
      )}
      data-fakt={fakt.id}
    >
      {titel && <p className={cn("mb-1.5 font-display text-[16px] font-bold", dunkel ? "text-white" : "text-ink-900")}>{titel}</p>}
      <p>{fakt.text}</p>
      <p className={cn("mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]", dunkel ? "text-white/60" : "text-ink-500")}>
        <span className="inline-flex items-center gap-1">
          <Scale aria-hidden="true" className="h-3.5 w-3.5" />
          {en ? "Source: " : "Quelle: "}
          {fakt.url ? (
            <a href={fakt.url} target="_blank" rel="noopener noreferrer" className={cn("font-medium underline underline-offset-2", dunkel ? "text-white/80 hover:text-white" : "text-ov-700 hover:text-ov-800")}>
              {fakt.quelle}
              <ExternalLink aria-hidden="true" className="ml-0.5 inline h-3 w-3" />
            </a>
          ) : (
            fakt.quelle
          )}
        </span>
        <span>
          {en ? "As of " : "Stand "}
          {fakt.stand} · {fakt.statusText}
        </span>
      </p>
    </div>
  );
}
