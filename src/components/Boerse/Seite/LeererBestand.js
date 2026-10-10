// Leerer Bestand der Projektbörse (Welle 3, Paket B10 „ehrlicher Bestand“): Ist außerhalb des Demo-Modus
// kein Projekt veröffentlicht, zeigt die Börse keine leere Filterliste und keine Platzhalter-Inserate,
// sondern eine Einladung zum Inserieren und zum Suchprofil. Keine Zahlen, kein Social Proof.
import Link from "@/components/Land/Link";
import { EyeOff, FolderUp, Handshake, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { Badge } from "@/components/Boerse/Badges";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const TEXTE = {
  de: {
    marke: "Start",
    titel: "Die Börse ist bereit für die ersten Inserate.",
    text: "Derzeit ist kein Projekt veröffentlicht. Wir zeigen nur echte Inserate – keine Beispiel- oder Platzhalterprojekte. Stellen Sie Ihr Projekt als eines der ersten ein, oder hinterlegen Sie ein Suchprofil, damit wir uns melden, sobald etwas passt.",
    punkte: [
      { titel: "Kostenlos inserieren", text: "Provision nur bei Abschluss" },
      { titel: "Anonym bis zur NDA", text: "Öffentlich nur der Teaser" },
      { titel: "Neutral gekennzeichnet", text: "Gruppenprojekt oder Fremdinserat" },
    ],
    anbieten: "Projekt anbieten",
    suchprofil: "Suchprofil anlegen",
    regeln: "Neutralität & Regeln",
  },
  en: {
    marke: "Launch",
    titel: "The exchange is ready for its first listings.",
    text: "No project is published at the moment. We only show genuine listings – no example or placeholder projects. List your project as one of the first, or create a search profile so that we get in touch as soon as something fits.",
    punkte: [
      { titel: "List free of charge", text: "Commission only on closing" },
      { titel: "Anonymous until the NDA", text: "Publicly only the teaser" },
      { titel: "Neutrally labelled", text: "Group project or third-party listing" },
    ],
    anbieten: "Offer a project",
    suchprofil: "Create a search profile",
    regeln: "Neutrality & rules",
  },
};

const ICONS = [FolderUp, EyeOff, Handshake];

export default function LeererBestand() {
  const t = uebersetze(TEXTE, spracheDerAnfrage());
  return (
    <Reveal data-boerse-leer="" className="ov-noise relative overflow-hidden rounded-[2rem] bg-navy-950 p-7 text-white md:p-12">
      <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-40" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ov-500/30 blur-[100px]" />
      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15">
            <span className="rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">{t.marke}</span>
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" />
          </p>
          <p className="ov-h3 mt-5 text-balance text-white">{t.titel}</p>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-white/70">{t.text}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button href="/projektboerse/anbieten#fremdentwickler" variant="white" pfeil className="w-full sm:w-auto">{t.anbieten}</Button>
            <Button href="/registrieren?rolle=investor" variant="outlineLight" className="w-full sm:w-auto">{t.suchprofil}</Button>
          </div>
          <p className="mt-5 text-[14px]">
            <Link href="/projektboerse/neutralitaet" className="font-semibold text-white underline decoration-ov-300/70 underline-offset-4 hover:decoration-white">{t.regeln}</Link>
          </p>
        </div>
        <ul className="grid gap-3">
          {t.punkte.map((x, i) => {
            const Icon = ICONS[i];
            return (
              <li key={x.titel} className="flex items-center gap-4 rounded-2xl bg-white/[0.05] p-4 ring-1 ring-inset ring-white/10">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-ov-300"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block font-display text-[16px] font-bold text-white">{x.titel}</span>
                  <span className="block text-[13.5px] text-white/65">{x.text}</span>
                </span>
                {i === 2 && <span aria-hidden="true" className="ml-auto hidden shrink-0 sm:block"><Badge id="fremdinserat" /></span>}
              </li>
            );
          })}
        </ul>
      </div>
    </Reveal>
  );
}
