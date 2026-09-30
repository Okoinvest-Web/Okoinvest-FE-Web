// Split-Ansicht für Login, Registrierung und Passwort: links Formular, rechts Navy-Fläche
// mit Nutzenversprechen. Wird innerhalb des normalen Seitenkopfs/-fußes gerendert.

import { BadgeCheck, Check, Clock, FileLock2, MessagesSquare } from "lucide-react";
import { PROVISION } from "@/lib/invest/markt";
import { ROLLEN } from "@/lib/plattform/konstanten";

const NUTZEN = {
  flaeche: ["Kostenlose Vorprüfung Ihrer Fläche", "Pachtangebot direkt im Portal", "Status von der Prüfung bis zum Betrieb"],
  landwirt: ["Agri-PV: verpachten, selbst investieren oder beteiligen", "Landwirtschaft bleibt Hauptnutzung", "Ein fester Ansprechpartner"],
  investor: ["Suchprofil mit Matching-Score", "NDA per Klick, Datenraum im Portal", PROVISION.kaeufer.text.charAt(0).toUpperCase() + PROVISION.kaeufer.text.slice(1)],
  anbieter: ["Anonymer Teaser, Datenraum nach NDA", "Aufrufe, Merker und NDA-Anfragen live", `Provision ${PROVISION.verkaeufer.text}`],
  unternehmen: ["Reststrom-Pool, Solarcarport, Speicher", "Angebote und Unterlagen an einem Ort", "Status jederzeit einsehbar"],
  mitglied: ["Genossenschaft und Energiegemeinschaften", "Beteiligung und Status einsehen", "Nachrichten an einem Ort"],
  kommune: ["Projekte im Gemeindegebiet ab Planung", "Beteiligungsmodelle und § 6 EEG im Überblick", "Fester Ansprechpartner für Verwaltung und Gemeinderat"],
};

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
      <div className="ov-container relative grid gap-8 py-10 md:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <div className="min-w-0 rounded-[2rem] bg-white p-6 shadow-[0_30px_80px_-50px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 sm:p-8 md:p-10">
          {eyebrow && <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-700">{eyebrow}</p>}
          <h1 className="mt-2 font-display text-[28px] font-extrabold leading-tight tracking-tight text-ink-900 md:text-[34px]">{titel}</h1>
          {text && <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">{text}</p>}
          <div className="mt-8">{children}</div>
        </div>

        <aside className="ov-noise relative min-w-0 overflow-hidden rounded-[2rem] bg-navy-950 p-7 text-white sm:p-10 lg:sticky lg:top-28 lg:self-start lg:p-12">
          <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
          <div aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-ov-500/35 blur-[110px]" />
          <div aria-hidden="true" className="absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-navy-400/25 blur-[110px]" />
          <div className="relative flex h-full flex-col">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300">{r ? `Portal für ${r.label}` : "Ein Login für alles"}</p>
            <p className="mt-4 font-display text-[26px] font-extrabold leading-tight tracking-tight md:text-[32px]">
              Flächen. Projekte. Kapital. Strom. <span className="text-ov-300">An einem Ort.</span>
            </p>
            <ul className="mt-8 space-y-4">
              {punkte.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[15.5px] leading-relaxed text-white/85">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-500/20 text-ov-300">
                    <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span className="min-w-0">{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:mt-auto lg:pt-10">
              {[
                { icon: BadgeCheck, t: "ÖKOVOLT Gruppe", s: "seit 2010" },
                { icon: FileLock2, t: "Vertraulich", s: "Datenraum nach NDA" },
                { icon: MessagesSquare, t: "Direkter Draht", s: "Nachrichten im Portal" },
              ].map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.t} className="ov-glass rounded-2xl p-4">
                    <Icon aria-hidden="true" className="h-5 w-5 text-ov-300" />
                    <p className="mt-2 text-[14px] font-semibold">{k.t}</p>
                    <p className="text-[12.5px] text-white/60">{k.s}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-6 flex items-center gap-2 text-[12.5px] text-white/50">
              <Clock aria-hidden="true" className="h-3.5 w-3.5" /> Antwort in der Regel innerhalb von zwei Werktagen
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
