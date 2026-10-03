import Skeleton, { SkeletonText } from "@/components/ui/Skeleton";
import KpiKachel from "@/components/ui/KpiKachel";

// Ladezustand aller Portalseiten ohne eigene loading.js: Platzhalter in der Form der
// üblichen Seite (Kopf, Kennzahlen-Reihe, Haupt- und Seitenspalte) – nichts springt,
// der Lichtstreifen läuft per transform und steht bei reduzierter Bewegung still.
export default function PortalLaedt() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6 md:space-y-8">
      <span className="sr-only">Wird geladen …</span>

      {/* Seitenkopf: Überzeile, Titel, Einleitung */}
      <div aria-hidden="true" className="mb-6 md:mb-8">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="mt-3 h-8 w-[min(22rem,80%)] rounded-xl md:h-9" />
        <Skeleton className="mt-3 h-4 w-[min(36rem,92%)] rounded-full" />
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <KpiKachel key={i} laedt label="" icon={LeerIcon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div aria-hidden="true" className="min-w-0 space-y-6">
          {/* Hauptkarte mit Liste */}
          <div className="rounded-3xl bg-white shadow-e1 ring-1 ring-ink-200/70">
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4 md:px-6">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <div className="divide-y divide-ink-100 px-5 md:px-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 py-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-3.5 rounded-full" style={{ width: `${[62, 48, 56, 40][i]}%` }} />
                    <Skeleton className="mt-2.5 h-3 rounded-full" style={{ width: `${[38, 30, 44, 26][i]}%` }} />
                  </div>
                  <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="min-w-0 space-y-6">
          <div className="rounded-3xl bg-white p-5 shadow-e1 ring-1 ring-ink-200/70 md:p-6">
            <Skeleton className="h-4 w-32 rounded-full" />
            <SkeletonText zeilen={4} className="mt-5" />
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-e1 ring-1 ring-ink-200/70 md:p-6">
            <Skeleton className="h-4 w-24 rounded-full" />
            <SkeletonText zeilen={3} className="mt-5" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Platzhalter-Icon, damit die Kachel ihre Icon-Fläche reserviert (wird im Ladezustand nicht gezeichnet) */
function LeerIcon() {
  return null;
}
