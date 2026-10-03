"use client";

// src/components/Gruppe/Offenlegung.js
//
// Offenlegung „Teil der ÖKOVOLT Gruppe“ für Seiten, auf die Gruppen- oder Partnerverweise führen (Welle 2, Paket GRP).
//
//  - Erscheint nur, wenn der Besuch über einen Gruppen- oder Partnerverweis kam (Herkunft im Arbeitsspeicher,
//    src/lib/herkunft.js – kein Cookie, kein Browserspeicher). Mit `immer` erscheint der allgemeine Gruppen-Hinweis
//    auch ohne Verweis (z. B. für Gruppen-Landingpages).
//  - Text: „Sie kommen über <Partner>. Die ÖkoInvest GmbH ist Teil der ÖKOVOLT Gruppe.“ plus Gesellschafterin aus
//    src/data/site.js (Firmenbuch). KEINE Vergütungs-, Provisions- oder Erfolgsaussage (Stop-Liste).
//  - Schließen nur für diesen Seitenaufruf (Zustand im Arbeitsspeicher), damit der Hinweis nichts verdeckt.
//  - Kennzeichnung „Prüfung Rechtsabteilung“: im Code und – außerhalb der Produktion – als sichtbares Etikett.
// Prüfung Rechtsabteilung: Wortlaut der Offenlegung und Platzierung (vor dem ersten Gruppen-/Partnerverweis).
//
// Einbau (Welle 2, Länderrouting): einmal zentral unter dem Seitenkopf aller öffentlichen Seiten
// (src/components/Reusable/LayoutWrapper.js) mit dem Land der Route bzw. der Länderwahl.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Handshake, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { GESELLSCHAFT, INDEXIERBAR, SITE } from "@/data/site";
import { herkunft } from "@/lib/herkunft";
import { offenlegungDaten } from "@/lib/gruppe/kanal";
import { pfad } from "@/lib/land";

// Gesellschafterin aus der Gruppe laut Firmenbuch (site.js) – nur nennen, wenn dort eingetragen.
const GRUPPEN_GESELLSCHAFTER = GESELLSCHAFT.gesellschafter?.find((g) => /ökovolt/i.test(g.name)) || null;

/** Einleitungssatz je Fall */
function einleitung(d) {
  if (!d) return null;
  if (d.name) return `Sie kommen über ${d.name}.`;
  if (d.kanal === "Gruppe") return `Sie kommen von einer Website der ${SITE.gruppe}.`;
  return "Sie kommen über einen Partnerverweis.";
}

/**
 * Props:
 *   immer    – Hinweis auch ohne Gruppen-/Partnerverweis zeigen (allgemeiner Gruppen-Hinweis)
 *   vorschau – Herkunftsobjekt statt der echten Herkunft (Backoffice-Vorschau, Tests)
 *   land     – DE | AT | CH (Linkziel je Land über src/lib/land; /unternehmen liegt im Stamm)
 *   className
 */
export default function Offenlegung({ immer = false, vorschau = null, land, className }) {
  const [daten, setDaten] = useState(null);
  const [bereit, setBereit] = useState(false);
  const [zu, setZu] = useState(false);

  useEffect(() => {
    // Herkunft erst im Browser lesen (Arbeitsspeicher) – serverseitig nie, daher kein Hydration-Unterschied
    setDaten(offenlegungDaten(vorschau || herkunft() || {}));
    setBereit(true);
  }, [vorschau]);

  if (!bereit || zu || (!daten && !immer)) return null;

  const satz = einleitung(daten);
  const zielUnternehmen = pfad("/unternehmen", land || daten?.land || "DE"); // Stamm: ohne Präfix

  return (
    <aside
      aria-label="Offenlegung: Teil der ÖKOVOLT Gruppe"
      data-offenlegung={daten?.kanal || "gruppe"}
      data-land={land || daten?.land || undefined}
      data-pruefung="rechtsabteilung"
      className={cn("ov-container motion-safe:animate-ov-auftauchen", className)}
    >
      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-navy-50 px-4 py-3.5 text-[14px] leading-relaxed text-navy-900 ring-1 ring-inset ring-navy-100 sm:items-center sm:px-5">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-navy-600 ring-1 ring-navy-100">
          <Handshake className="h-[18px] w-[18px]" />
        </span>
        <p className="min-w-0 flex-1">
          {satz && <span className="font-semibold">{satz} </span>}
          {daten?.text ? (
            <span>{daten.text} </span>
          ) : (
            <span>
              Die {SITE.firma} ist Teil der {SITE.gruppe}
              {GRUPPEN_GESELLSCHAFTER ? ` – Gesellschafterin ist unter anderem die ${GRUPPEN_GESELLSCHAFTER.name} (${GRUPPEN_GESELLSCHAFTER.anteil}).` : "."}{" "}
            </span>
          )}
          <Link href={zielUnternehmen} className="whitespace-nowrap font-semibold text-navy-700 underline decoration-navy-300 underline-offset-2 hover:decoration-navy-700">
            Mehr zum Unternehmen
          </Link>
          {!INDEXIERBAR && (
            <span className="ml-2 inline-flex translate-y-[-1px] items-center rounded-full bg-sun-50 px-2 py-0.5 align-middle text-[11.5px] font-semibold text-sun-700 ring-1 ring-inset ring-sun-200">
              Entwurf · Prüfung Rechtsabteilung
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setZu(true)}
          aria-label="Hinweis schließen"
          className="-m-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-navy-700 transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
