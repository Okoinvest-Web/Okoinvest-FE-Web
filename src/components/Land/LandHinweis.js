// Bausteine für Länderinhalte (Ländermodell) – ohne Hooks, also in Server- und Client-
// Komponenten nutzbar. Das Land kommt vom Aufrufer (Server: seitenLand()/landDerAnfrage(),
// Client: useLand()). Regeln und Beispiele: src/lib/land/inhalte.js.
//
//   <LandHinweis land="CH" />                         Block statt ungeprüfter Werte
//   <LandHinweis land="AT" thema="Pachtwerte" zeile /> kompakt, z. B. in einer Werteliste
//   <GiltFuer />                                      dezent „gilt für Deutschland“
//   <LandWerte land={land} geprueft={["DE"]}>…</LandWerte>
//       DE: Werte · gemeinsame Seite: Werte + „gilt für Deutschland“ · AT/CH: LandHinweis
// Englisch (Sprachmodell): Die Bausteine schreiben ihre festen Texte über <T> selbst englisch.
// Eigene Texte englisch mitgeben: <LandHinweis land text="…" textEn="…" thema="Pachtwerte" themaEn="Lease rates" />.

import { Clock } from "lucide-react";
import Link from "@/components/Land/Link";
import { cn } from "@/components/ui/cn";
import { LAENDER, landCode, landHinweisText, landHinweisTextEn, zahlenModus } from "@/lib/land";
import T from "@/components/Sprache/T";

/** Hinweis statt Werten, die für das Land noch nicht an der Quelle geprüft sind. */
export function LandHinweis({ land, thema = "Rechenwerte", themaEn, zeile = false, text, textEn, className }) {
  const l = landCode(land);
  if (!l) return null;
  // Englisch: eigener Text nur, wenn textEn mitkommt – sonst bleibt der eigene deutsche Text stehen
  const satz = <T de={text || `${landHinweisText(l, thema)}.`} en={text ? textEn : `${landHinweisTextEn(l, themaEn)}.`} />;
  if (zeile) {
    return (
      <p className={cn("flex items-start gap-2 text-[13.5px] leading-relaxed text-ink-600", className)} data-land-hinweis={l}>
        <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />
        <span>
          {satz}{" "}
          <Link href="/kontakt" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
            <T de="Persönlich anfragen" en="Ask us directly" />
          </Link>
        </span>
      </p>
    );
  }
  return (
    <div role="status" className={cn("rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70 md:p-8", className)} data-land-hinweis={l}>
      <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">
        <Clock aria-hidden="true" className="h-4 w-4 text-navy-500" /> <T de={LAENDER[l].name} en={LAENDER[l].en.name} />
      </p>
      <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-700">{satz}</p>
      <Link
        href="/kontakt"
        className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2"
      >
        <T de="Vorhaben persönlich besprechen" en="Discuss your project with us" />
      </Link>
    </div>
  );
}

/** Dezenter Vermerk für deutsche Werte auf der gemeinsamen Seite (ohne Länderwahl). */
export function GiltFuer({ land = "DE", className, dunkel = false }) {
  const info = LAENDER[landCode(land) || "DE"];
  return (
    <span className={cn("text-[12px] font-medium", dunkel ? "text-white/60" : "text-ink-500", className)}>
      <T de={`(gilt ${info.fuerLand})`} en={`(applies to ${info.en.name})`} />
    </span>
  );
}

/**
 * Werte nur zeigen, wo sie für das Land geprüft sind (siehe zahlenModus()).
 * @param {{ land: string|null, geprueft?: string[], thema?: string, zeile?: boolean, vermerk?: boolean, children: any }} p
 *   vermerk: auf der gemeinsamen Seite „gilt für Deutschland“ unter den Werten zeigen (Standard: ja)
 */
export function LandWerte({ land, geprueft = ["DE"], thema, zeile = false, vermerk = true, className, children }) {
  const modus = zahlenModus(land, geprueft);
  if (modus === "hinweis") return <LandHinweis land={land} thema={thema} zeile={zeile} className={className} />;
  if (modus === "gemeinsam" && vermerk && geprueft.length === 1) {
    return (
      <>
        {children}
        <p className="mt-2 text-right">
          <GiltFuer land={geprueft[0]} />
        </p>
      </>
    );
  }
  return children;
}
