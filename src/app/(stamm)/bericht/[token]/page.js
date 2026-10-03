// src/app/bericht/[token]/page.js – Berichtsseite des Bericht-Bausteins (Welle 2, Paket B4)
//
// Ein Link für beides (src/lib/bericht/token.js):
//   offen       → Bestätigungsseite mit Knopf (POST /api/rechner/bericht/bestaetigen) – ein GET bestätigt nie
//   bestaetigt  → Bericht (30 Tage ab Bestätigung)
//   abgelaufen  → Hinweis (die API antwortet dann mit 410)
//   unbekannt   → 404
// noindex/nofollow, kein Referrer (Token in der Adresse), dynamisch (Cache-Control no-store). Nicht in der Sitemap.
// Die Seite zeigt nie Personendaten.

import { notFound } from "next/navigation";
import { berichtLesen } from "@/lib/bericht/dienst";
import { RECHNER } from "@/lib/bericht/neuRechnen";
import BerichtSeite, { BerichtAbgelaufen, BerichtBestaetigung } from "@/components/Bericht/BerichtSeite";
import { pfad as seitenPfad } from "@/lib/land";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = {
  title: "Ihr Bericht | ÖkoInvest",
  description: "Persönlicher Bericht zu einem Rechner-Ergebnis.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
  referrer: "no-referrer",
  alternates: { canonical: null },
};

export default async function BerichtRoute({ params }) {
  const { token } = await params;
  let r;
  try {
    r = await berichtLesen({ token });
  } catch {
    return (
      <div className="mx-auto max-w-[680px] px-4 pb-16 pt-28 sm:px-6 md:pt-32">
        <h1 className="font-display text-[1.75rem] font-extrabold tracking-tight text-ink-900">Bericht gerade nicht erreichbar</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-700">Bitte versuchen Sie es in einigen Minuten erneut.</p>
      </div>
    );
  }
  if (!r?.zustand) notFound();
  if (r.zustand === "abgelaufen") return <BerichtAbgelaufen />;
  if (r.zustand === "offen" || r.zustand === "in_bestaetigung") {
    return <BerichtBestaetigung token={token} titel={RECHNER[r.bericht?.rechner]?.titel ? `Bericht zum ${RECHNER[r.bericht.rechner].titel}` : ""} laeuft={r.zustand === "in_bestaetigung"} />;
  }
  return <BerichtSeite bericht={r.bericht} rechnerPfad={RECHNER[r.bericht.rechner]?.pfad || seitenPfad("/rechner")} />;
}
