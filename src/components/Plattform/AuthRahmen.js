// Split-Screen für Login, Registrierung, Passwort und Einladungen: links das Formular auf ruhigem Weiß,
// rechts die Markenfläche (Navy-Verlauf) mit dem animierten Marken-Motiv von T7, Nutzenversprechen je Rolle
// und Vertrauenspunkten. Auf dem Handy steht das Formular zuerst, die Markenfläche folgt kompakt darunter.
// Server-Komponente; wird innerhalb des normalen Seitenkopfs/-fußes gerendert.

import { BadgeCheck, Check, Clock, FileLock2, MessagesSquare } from "lucide-react";
import { PROVISION } from "@/lib/invest/markt";
import { ROLLEN } from "@/lib/plattform/konstanten";
import { MarkenMotiv } from "@/components/illustrationen/marke";

const NUTZEN = {
  flaeche: ["Kostenlose Vorprüfung Ihrer Fläche", "Pachtangebot direkt im Portal", "Status von der Prüfung bis zum Betrieb"],
  landwirt: ["Agri-PV: verpachten, selbst investieren oder beteiligen", "Landwirtschaft bleibt Hauptnutzung", "Ein fester Ansprechpartner"],
  investor: ["Suchprofil mit Matching-Score", "NDA per Klick, Datenraum im Portal", PROVISION.kaeufer.text.charAt(0).toUpperCase() + PROVISION.kaeufer.text.slice(1)],
  anbieter: ["Anonymer Teaser, Datenraum nach NDA", "Aufrufe, Merker und NDA-Anfragen live", `Provision ${PROVISION.verkaeufer.text}`],
  unternehmen: ["Reststrom-Pool, Solarcarport, Speicher", "Angebote und Unterlagen an einem Ort", "Status jederzeit einsehbar"],
  mitglied: ["Genossenschaft und Energiegemeinschaften", "Beteiligung und Status einsehen", "Nachrichten an einem Ort"],
  kommune: ["Projekte im Gemeindegebiet ab Planung", "Beteiligungsmodelle und § 6 EEG im Überblick", "Fester Ansprechpartner für Verwaltung und Gemeinderat"],
};

const VERTRAUEN = [
  { icon: BadgeCheck, t: "ÖKOVOLT Gruppe", s: "seit 2010" },
  { icon: FileLock2, t: "Vertraulich", s: "Datenraum nach NDA" },
  { icon: MessagesSquare, t: "Direkter Draht", s: "Nachrichten im Portal" },
];

export default function AuthRahmen({ eyebrow, titel, text, rolle, children }) {
  const r = ROLLEN.find((x) => x.id === rolle);
  const punkte = NUTZEN[rolle] || [
    "Status aller Anfragen, Flächen und Projekte",
    "Dokumente und Nachrichten sicher an einem Ort",
    "Für Flächeneigentümer und Investoren kostenfrei",
  ];
  return (
    <section className="relative overflow-hidden bg-sand-50">
      <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-0" />
      <div className="ov-container relative py-6 sm:py-10 md:py-14">
        <div className="grid overflow-hidden rounded-[2rem] bg-white shadow-e3 ring-1 ring-ink-200/70 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          {/* Formularseite */}
          <div className="min-w-0 px-5 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-16 xl:px-20">
            <div className="ov-ein mx-auto w-full max-w-[32rem]">
              {eyebrow && <p className="ov-overline text-ov-700">{eyebrow}</p>}
              <h1 className="mt-2 font-display text-[28px] font-extrabold leading-[1.1] tracking-tight text-ink-900 md:text-[36px]">{titel}</h1>
              {text && <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">{text}</p>}
              <div className="mt-8">{children}</div>
            </div>
          </div>

          {/* Markenseite */}
          <aside aria-label="Ihre Vorteile im Portal" className="ov-verlauf-nacht relative isolate min-w-0 overflow-hidden px-6 py-8 text-white sm:px-10 sm:py-10 lg:px-12 lg:py-14">
            <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-60" />
            <div className="flex h-full flex-col">
              <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-[22rem] sm:block" style={{ aspectRatio: "1 / 1" }}>
                <MarkenMotiv ton="dunkel" className="absolute inset-0 h-full w-full" />
              </div>
              <p className="ov-overline mt-2 text-ov-300 sm:mt-6">{r ? `Portal für ${r.label}` : "Ein Login für alles"}</p>
              <p className="mt-3 font-display text-[24px] font-extrabold leading-tight tracking-tight md:text-[30px]">
                Flächen. Projekte. Kapital. Strom. <span className="text-ov-300">An einem Ort.</span>
              </p>
              <ul className="mt-6 space-y-3.5">
                {punkte.map((p, i) => (
                  <li key={p} className="ov-ein flex items-start gap-3 text-[15px] leading-relaxed text-white/85" style={{ "--ov-delay": `${160 + i * 70}ms` }}>
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-300/15 text-ov-300 ring-1 ring-ov-300/30">
                      <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="min-w-0">{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 grid gap-2.5 sm:grid-cols-3 lg:mt-auto lg:pt-10">
                {VERTRAUEN.map((k) => {
                  const Icon = k.icon;
                  return (
                    <div key={k.t} className="ov-glass rounded-2xl p-3.5">
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] text-ov-300" />
                      <p className="mt-2 text-[14px] font-semibold">{k.t}</p>
                      <p className="text-[12.5px] text-white/75">{k.s}</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 flex items-center gap-2 text-[13px] text-white/75">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" /> Antwort in der Regel innerhalb von zwei Werktagen
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
