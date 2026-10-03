// Rollenwahl im Kopf von /prozess: fünf Wege mit typischer Gesamtdauer
// (aus prozessDaten) – jeder Eintrag öffnet den passenden Tab.
import { ArrowRight, Clock, Factory, FolderUp, LineChart, MapPinned, Tractor } from "lucide-react";
import { ZIELGRUPPEN } from "./prozessDaten";

const ICONS = { MapPinned, Tractor, LineChart, FolderUp, Factory };

export default function RollenWahl() {
  return (
    <nav aria-labelledby="rollen-titel" className="relative mx-auto max-w-[560px] lg:ml-auto lg:mr-0">
      <div className="rounded-[1.75rem] bg-white/[0.06] p-2 ring-1 ring-inset ring-white/15 backdrop-blur-md sm:p-2.5">
        <p id="rollen-titel" className="flex items-center justify-between gap-3 px-3 pb-2 pt-2 text-[13px] text-white/70 sm:px-4">
          <span className="font-semibold text-white">Ihr Weg – wählen Sie Ihre Rolle</span>
          <span className="max-sm:hidden">Typische Gesamtdauer</span>
        </p>
        <ul className="space-y-1.5">
          {ZIELGRUPPEN.map((z, i) => {
            const Icon = ICONS[z.icon] || MapPinned;
            const [dauer, rest] = splitDauer(z.gesamt);
            return (
              <li key={z.id}>
                <a
                  href={`#${z.id}`}
                  className="group flex items-center gap-3.5 rounded-2xl bg-white p-3 text-ink-900 shadow-e2 ring-1 ring-ink-200/60 transition-[transform,box-shadow] duration-200 hover:shadow-e4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-400 motion-safe:hover:-translate-y-0.5 sm:gap-4 sm:p-3.5"
                >
                  <span
                    aria-hidden="true"
                    className={
                      i === 0
                        ? "ov-verlauf-gruen flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                        : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-100 transition-colors group-hover:bg-ov-600 group-hover:text-white"
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[16px] font-bold leading-tight">{z.label}</span>
                    <span className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug text-ink-600">
                      <Clock aria-hidden="true" className="mt-[2px] h-3.5 w-3.5 shrink-0 text-ov-600" />
                      <span>
                        <span className="ov-num font-semibold text-ink-900">{dauer}</span> {rest}
                      </span>
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-ov-600 motion-reduce:transition-none" />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/** „2–4 Jahre bis zum Betrieb“ → ["2–4 Jahre", "bis zum Betrieb"] */
function splitDauer(t) {
  const m = String(t).match(/^([\d,]+–[\d,]+\s+\S+)\s+(.*)$/);
  return m ? [m[1], m[2]] : [t, ""];
}
