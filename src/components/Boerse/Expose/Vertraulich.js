// Vertrauliche Angaben im Exposé: nur die Feldbezeichnungen (öffentlich bekannt), nie Werte.
// Echte Werte werden an nicht berechtigte Besucher NIE ausgeliefert – hier stehen Platzhalterbalken.
import { Check, FolderLock, KeyRound, Lock, LockOpen, UserPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { VERTRAULICH_FELDER } from "@/lib/plattform/oeffentlich";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const TEXTE = {
  de: {
    felder: VERTRAULICH_FELDER,
    weg: [
      { titel: "Anmelden", text: "als Investor, kostenfrei" },
      { titel: "NDA akzeptieren", text: "per Klick im Portal" },
      { titel: "Datenraum öffnen", text: "nach Freigabe" },
    ],
    titel: "Vertrauliche Angaben & Datenraum",
    frei: "freigeschaltet",
    nurNda: "nur nach NDA",
    ariaFrei: "Vertrauliche Angaben im Portal",
    ariaNda: "Diese Angaben sehen Sie nach NDA",
    textFrei: "Gemeinde, Flurstücke, Netzbetreiber und alle Unterlagen finden Sie im Portal.",
    textNda: "Gemeinde, Flurstücke, Netzbetreiber, Ertragsgutachten und Unterlagen sehen registrierte Investoren nach Annahme der Vertraulichkeitsvereinbarung.",
    zugang: "So erhalten Sie Zugang",
    erledigt: "erledigt",
  },
  en: {
    felder: {
      gemeinde: "Municipality",
      gemarkung: "Cadastral district (Gemarkung / Katastralgemeinde)",
      flurstuecke: "Plots",
      netzbetreiber: "Grid operator",
      einspeisepunkt: "Feed-in point / substation",
      entfernungNetzKm: "Distance to the grid connection point (km)",
      sicherung: "Land securing (lease / permission)",
      planungsrecht: "Planning law status",
      ertragKwhKwp: "Specific yield (kWh/kWp)",
      verguetung: "Remuneration / offtake",
      details: "Further details",
    },
    weg: [
      { titel: "Sign in", text: "as an investor, free of charge" },
      { titel: "Accept the NDA", text: "in one click in the portal" },
      { titel: "Open the data room", text: "after approval" },
    ],
    titel: "Confidential details & data room",
    frei: "unlocked",
    nurNda: "only after NDA",
    ariaFrei: "Confidential details in the portal",
    ariaNda: "You will see these details after the NDA",
    textFrei: "You will find the municipality, plots, grid operator and all documents in the portal.",
    textNda: "Registered investors see the municipality, plots, grid operator, yield assessment and documents after accepting the non-disclosure agreement.",
    zugang: "How to get access",
    erledigt: "done",
  },
};

export default function Vertraulich({ freigegeben, aktion, schritt }) {
  const t = uebersetze(TEXTE, spracheDerAnfrage());
  const felder = Object.values(t.felder).slice(0, 8);
  const WEG = [UserPlus, KeyRound, FolderLock].map((icon, i) => ({ icon, ...t.weg[i] }));
  return (
    <div className="min-w-0 overflow-hidden rounded-[2rem] bg-white shadow-e1 ring-1 ring-ink-200/70">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-6 py-4 md:px-8 md:py-5">
        <h2 className="font-display text-[18px] font-bold text-ink-900 md:text-[20px]">{t.titel}</h2>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", freigegeben ? "bg-ov-50 text-ov-800 ring-ov-200" : "bg-ink-50 text-ink-600 ring-ink-200")}>
          {freigegeben ? <LockOpen aria-hidden="true" className="h-3.5 w-3.5" /> : <Lock aria-hidden="true" className="h-3.5 w-3.5" />}
          {freigegeben ? t.frei : t.nurNda}
        </span>
      </div>

      <ul className="grid gap-x-8 gap-y-1 px-6 py-5 sm:grid-cols-2 md:px-8 md:py-6" aria-label={freigegeben ? t.ariaFrei : t.ariaNda}>
        {felder.map((label, i) => (
          <li key={label} className="flex min-w-0 items-center gap-3 border-b border-ink-100 py-3 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
            <span aria-hidden="true" className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", freigegeben ? "bg-ov-50 text-ov-700" : "bg-sand-100 text-ink-400")}>
              {freigegeben ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Lock className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium leading-snug text-ink-800">{label}</span>
              {!freigegeben && <span aria-hidden="true" className="mt-1.5 block h-2 rounded-full bg-ink-100" style={{ width: `${45 + ((i * 17) % 45)}%` }} />}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t border-ink-100 bg-sand-50 px-6 py-6 md:px-8 md:py-7">
        {freigegeben ? (
          <p className="text-[14.5px] leading-relaxed text-ink-700">{t.textFrei}</p>
        ) : (
          <>
            <p className="text-[14.5px] leading-relaxed text-ink-700">{t.textNda}</p>
            <ol className="mt-5 grid gap-3 sm:grid-cols-3" aria-label={t.zugang}>
              {WEG.map((w, i) => {
                const Icon = w.icon;
                const erledigt = i < schritt;
                return (
                  <li key={w.titel} className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 ring-1 ring-ink-200/70">
                    <span aria-hidden="true" className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", erledigt ? "bg-ov-600 text-white" : "bg-navy-950 text-ov-300")}>
                      {erledigt ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-tight text-ink-900">{w.titel}</span>
                      <span className="block text-[12px] text-ink-500">{erledigt ? t.erledigt : w.text}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        )}
        <div className="mt-5">
          <Button href={aktion.href} pfeil>{aktion.label}</Button>
        </div>
      </div>
    </div>
  );
}
