"use client";

// Tour-Hinweise an den wichtigsten Stellen des Portals (Onboarding-Assistenten, Team B1).
// Leicht und abschaltbar: je Seite höchstens ein kurzer Hinweis oberhalb des Inhalts, „Verstanden“ blendet ihn dauerhaft
// aus, „Tipps ausschalten“ schaltet alle ab (serverseitig am Konto, /api/portal/onboarding aktion=tour). Der Zustand wird
// einmal je Sitzung geladen und im sessionStorage zwischengespeichert – keine Anfrage je Seitenwechsel.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Lightbulb, X } from "lucide-react";
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

  return (
    <aside aria-label="Tipp" className="mb-5 flex gap-3 rounded-2xl bg-ov-50 px-4 py-3 ring-1 ring-ov-200">
      <Lightbulb aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-700" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink-900">{h.titel}</p>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-700">{h.text}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold">
          <button type="button" className="text-ov-800 hover:underline" onClick={() => speichern({ gesehen: h.id }, { ...tour, gesehen: [...tour.gesehen, h.id] })}>Verstanden</button>
          <button type="button" className="text-ink-500 hover:text-ink-800 hover:underline" onClick={() => speichern({ aus: true }, { ...tour, aus: true })}>Tipps ausschalten</button>
        </div>
      </div>
      <button type="button" aria-label="Tipp schließen" onClick={() => speichern({ gesehen: h.id }, { ...tour, gesehen: [...tour.gesehen, h.id] })} className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ov-100 hover:text-ink-800">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </aside>
  );
}
