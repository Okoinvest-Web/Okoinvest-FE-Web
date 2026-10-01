"use client";

// Tour-Hinweise an den wichtigsten Stellen des Portals (Onboarding-Assistenten, Team B1).
// Leicht und abschaltbar: je Seite höchstens ein kurzer Hinweis oberhalb des Inhalts, „Verstanden“ blendet ihn dauerhaft
// aus, „Tipps ausschalten“ schaltet alle ab (serverseitig am Konto, /api/portal/onboarding aktion=tour). Der Zustand wird
// einmal je Sitzung geladen und im sessionStorage zwischengespeichert – keine Anfrage je Seitenwechsel.
// Mobil (< lg, UX-Audit P1-4): kein Block über dem Inhalt, sondern eine kompakte, wegklickbare Zeile unten über der
// Bottom-Navigation; der Text klappt erst auf Wunsch auf.

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronUp, Lightbulb, X } from "lucide-react";
import { senden } from "@/lib/plattform/client";
import { tourFuer } from "@/lib/plattform/onboarding/motor";
import { TOUREN } from "@/lib/plattform/onboarding/pfade";

const schluessel = (id) => `oi_tour_${id}`;

function cacheLesen(id) {
  try {
    const roh = sessionStorage.getItem(schluessel(id));
    return roh ? JSON.parse(roh) : null;
  } catch {
    return null;
  }
}
function cacheSchreiben(id, tour) {
  try {
    sessionStorage.setItem(schluessel(id), JSON.stringify(tour));
  } catch {
    /* privater Modus – dann eben ohne Cache */
  }
}

export default function TourHinweis({ nutzer }) {
  const pfad = usePathname() || "/portal";
  const [tour, setTour] = useState(null);
  const [offen, setOffen] = useState(false);
  const textId = useId();

  useEffect(() => {
    if (!nutzer?.id) return;
    const c = cacheLesen(nutzer.id);
    if (c) {
      setTour(c);
      return;
    }
    let aktiv = true;
    senden("/api/portal/onboarding?ansicht=tour", { method: "GET" })
      .then((r) => {
        if (!aktiv || !r?.tour) return;
        setTour(r.tour);
        cacheSchreiben(nutzer.id, r.tour);
      })
      .catch(() => {});
    return () => {
      aktiv = false;
    };
  }, [nutzer?.id]);

  if (!tour || tour.aus || pfad.startsWith("/portal/willkommen")) return null;
  const h = tourFuer(TOUREN, pfad, nutzer?.rollen || []);
  if (!h || tour.gesehen.includes(h.id)) return null;

  const speichern = (body, neu) => {
    setTour(neu);
    cacheSchreiben(nutzer.id, neu);
    senden("/api/portal/onboarding", { method: "PUT", body: { aktion: "tour", ...body } }).catch(() => {});
  };

  const verstanden = () => speichern({ gesehen: h.id }, { ...tour, gesehen: [...tour.gesehen, h.id] });
  const ausschalten = () => speichern({ aus: true }, { ...tour, aus: true });

  return (
    <>
      {/* Desktop: ruhiger Hinweis oberhalb des Inhalts */}
      <aside aria-label="Tipp" className="mb-5 hidden gap-3 rounded-2xl bg-ov-50 px-4 py-3 ring-1 ring-ov-200 lg:flex">
        <Lightbulb aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-700" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink-900">{h.titel}</p>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-700">{h.text}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold">
            <button type="button" className="text-ov-800 hover:underline" onClick={verstanden}>Verstanden</button>
            <button type="button" className="text-ink-500 hover:text-ink-800 hover:underline" onClick={ausschalten}>Tipps ausschalten</button>
          </div>
        </div>
        <button type="button" aria-label="Tipp schließen" onClick={verstanden} className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ov-100 hover:text-ink-800">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </aside>

      {/* Mobil: kompakte Zeile unten (über der Bottom-Navigation), verdrängt keinen Inhalt */}
      <aside
        aria-label="Tipp"
        className="ov-ein fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-30 mx-auto max-w-[520px] rounded-2xl bg-white shadow-e4 ring-1 ring-ov-200 lg:hidden"
      >
        <div className="flex items-center gap-1 py-1 pl-3 pr-1">
          <Lightbulb aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-700" />
          <button
            type="button"
            aria-expanded={offen}
            aria-controls={textId}
            onClick={() => setOffen((o) => !o)}
            className="flex min-h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl px-1.5 text-left text-[13.5px] focus-visible:outline-2 focus-visible:outline-ov-500"
          >
            <span className="shrink-0 font-semibold text-ov-800">Tipp:</span>
            <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{h.titel}</span>
            <ChevronUp aria-hidden="true" className={"h-4 w-4 shrink-0 text-ink-500 transition-transform duration-200 " + (offen ? "" : "rotate-180")} />
            <span className="sr-only">{offen ? "Tipp einklappen" : "Tipp anzeigen"}</span>
          </button>
          <button type="button" aria-label="Tipp schließen" onClick={verstanden} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ov-50 hover:text-ink-800">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div id={textId} hidden={!offen} className="border-t border-ink-100 px-4 pb-3 pt-2">
          <p className="text-[13.5px] leading-relaxed text-ink-700">{h.text}</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13.5px] font-semibold">
            <button type="button" className="min-h-10 text-ov-800 hover:underline" onClick={verstanden}>Verstanden</button>
            <button type="button" className="min-h-10 text-ink-500 hover:text-ink-800 hover:underline" onClick={ausschalten}>Tipps ausschalten</button>
          </div>
        </div>
      </aside>
    </>
  );
}
