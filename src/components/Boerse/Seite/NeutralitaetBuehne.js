// Hero-Bühne „Neutralität & Regeln“ (Welle 3, Paket B10): Schema der Informationsbarriere zwischen der
// Projektbörse und der eigenen Projektentwicklung der ÖKOVOLT Gruppe. Reine Darstellung, keine Zahlen.
import { Ban, Building2, FileLock2, FolderLock, Handshake, ScrollText, ShieldCheck, Users } from "lucide-react";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { Badge } from "../Badges";

const TEXTE = {
  de: {
    schema: "Schema",
    boerse: "Projektbörse",
    boerseUnter: "Backoffice der Börse",
    boersePunkte: ["Datenraum und Unterlagen", "NDA-Anfragen und LOIs", "Suchprofile der Investoren"],
    gruppe: "ÖKOVOLT Gruppe",
    gruppeUnter: "Projektentwicklung und Flächenakquise",
    gruppePunkte: ["Eigene Projekte", "Eigene Flächensuche"],
    barriere: "Informationsbarriere",
    kein: "Keine vertraulichen Angaben aus Fremdinseraten",
    gleich: "Als Interessentin nur über die Börse – mit NDA, wie alle",
    protokoll: "Jeder Datenraum-Zugriff wird protokolliert",
  },
  en: {
    schema: "Diagram",
    boerse: "Project exchange",
    boerseUnter: "Exchange back office",
    boersePunkte: ["Data room and documents", "NDA requests and LOIs", "Investor search profiles"],
    gruppe: "ÖKOVOLT Group",
    gruppeUnter: "Project development and land acquisition",
    gruppePunkte: ["Own projects", "Own land search"],
    barriere: "Information barrier",
    kein: "No confidential information from third-party listings",
    gleich: "As an interested party only via the exchange – with an NDA, like everyone",
    protokoll: "Every data room access is logged",
  },
};

const PUNKT_ICONS = [FolderLock, Handshake, Users];

export default function NeutralitaetBuehne() {
  const t = uebersetze(TEXTE, spracheDerAnfrage());
  return (
    <div className="relative mx-auto w-full max-w-[560px] select-none lg:max-w-none" aria-hidden="true">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch sm:gap-3">
        {/* Börse */}
        <div className="rounded-2xl bg-white p-4 text-ink-900 shadow-[0_40px_80px_-30px_rgba(0,8,30,0.8)] ring-1 ring-ink-200/70 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200"><ShieldCheck className="h-[18px] w-[18px]" /></span>
            <span className="rounded-full bg-sun-300 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-navy-950">{t.schema}</span>
          </div>
          <p className="mt-3 font-display text-[16px] font-bold leading-tight">{t.boerse}</p>
          <p className="text-[11.5px] text-ink-500">{t.boerseUnter}</p>
          <ul className="mt-3 space-y-1.5">
            {t.boersePunkte.map((x, i) => {
              const I = PUNKT_ICONS[i];
              return (
                <li key={x} className="flex items-center gap-2 rounded-lg bg-sand-50 px-2.5 py-1.5 text-[12px] font-medium text-ink-700 ring-1 ring-ink-200/60">
                  <I className="h-3.5 w-3.5 shrink-0 text-ov-600" />{x}
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge id="fremdinserat" />
            <Badge id="gruppenprojekt" />
          </div>
        </div>

        {/* Barriere */}
        <div className="relative flex items-center justify-center sm:w-14">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-ov-300/60 to-transparent sm:inset-y-0 sm:left-1/2 sm:right-auto sm:top-0 sm:h-auto sm:w-px sm:bg-gradient-to-b" />
          <div className="relative flex items-center gap-2 rounded-full bg-navy-950 px-3 py-1.5 ring-1 ring-ov-300/40 sm:flex-col sm:px-1.5 sm:py-3">
            <FileLock2 className="h-4 w-4 text-ov-300" />
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ov-200 sm:[writing-mode:vertical-rl]">{t.barriere}</span>
          </div>
        </div>

        {/* Gruppe */}
        <div className="rounded-2xl bg-white/[0.06] p-4 text-white ring-1 ring-inset ring-white/15 sm:p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-ov-300"><Building2 className="h-[18px] w-[18px]" /></span>
          <p className="mt-3 font-display text-[16px] font-bold leading-tight">{t.gruppe}</p>
          <p className="text-[11.5px] text-white/60">{t.gruppeUnter}</p>
          <ul className="mt-3 space-y-1.5">
            {t.gruppePunkte.map((x) => (
              <li key={x} className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[12px] font-medium text-white/80 ring-1 ring-inset ring-white/10">{x}</li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-snug text-white/70"><Ban className="mt-px h-3.5 w-3.5 shrink-0 text-sun-300" />{t.kein}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <p className="flex items-start gap-2 rounded-xl bg-white/[0.05] px-3 py-2.5 text-[12px] leading-snug text-white/80 ring-1 ring-inset ring-white/10"><Handshake className="mt-px h-3.5 w-3.5 shrink-0 text-ov-300" />{t.gleich}</p>
        <p className="flex items-start gap-2 rounded-xl bg-white/[0.05] px-3 py-2.5 text-[12px] leading-snug text-white/80 ring-1 ring-inset ring-white/10"><ScrollText className="mt-px h-3.5 w-3.5 shrink-0 text-ov-300" />{t.protokoll}</p>
      </div>
    </div>
  );
}
