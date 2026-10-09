// Split-Screen für Login, Registrierung, Passwort und Einladungen: links das Formular auf ruhigem Weiß,
// rechts die Markenfläche (Navy-Verlauf) mit einer Portal-Vorschau (Beispielansicht ohne Zahlen),
// Nutzenversprechen je Rolle und Vertrauenspunkten. Auf dem Handy steht das Formular zuerst, die
// Markenfläche folgt kompakt darunter (ohne Vorschau).
// Server-Komponente; wird innerhalb des normalen Seitenkopfs/-fußes gerendert.
// Schnittstelle: { eyebrow, titel, text, rolle, children } – neu optional nutzenOben (Registrierung: Nutzen mobil über dem Formular).

import Link from "@/components/Land/Link";
import { BadgeCheck, Check, CheckCircle2, Clock, FileLock2, FileText, LifeBuoy, LockKeyhole, MessagesSquare, ShieldCheck } from "lucide-react";
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

const VERTRAUEN = [
  { icon: BadgeCheck, t: "ÖKOVOLT Gruppe", s: "seit 2010" },
  { icon: FileLock2, t: "Vertraulich", s: "Datenraum nach NDA" },
  { icon: MessagesSquare, t: "Direkter Draht", s: "Nachrichten im Portal" },
];

/* Schritte der Beispielansicht – bewusst ohne Zahlen, Namen oder Daten */
const SCHRITTE = [
  { t: "Anfrage eingegangen", z: "fertig" },
  { t: "Prüfung durch ÖkoInvest", z: "fertig" },
  { t: "Angebot im Portal", z: "aktiv" },
  { t: "Vertrag und Umsetzung", z: "offen" },
];

/** Portal-Vorschau: Statuskarte mit Fortschritt, Dokument- und Nachrichten-Chip */
function PortalVorschau() {
  return (
    <figure className="relative mx-auto w-full max-w-[25rem] pb-8 pt-2">
      <div aria-hidden="true" className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.26),transparent_70%)] blur-2xl" />
      <div aria-hidden="true">
        {/* Hauptkarte */}
        <div className="ov-ein ov-glass relative rounded-[1.4rem] p-5 shadow-e5" style={{ "--ov-delay": "120ms" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ov-300/15 ring-1 ring-inset ring-ov-300/35">
                <FileText className="h-4 w-4 text-ov-300" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-white">Ihr Vorgang</p>
                <p className="text-[11.5px] text-white/60">Status im Portal</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ov-300/15 px-2.5 py-1 text-[11px] font-semibold text-ov-200 ring-1 ring-inset ring-ov-300/30">
              <span className="h-1.5 w-1.5 rounded-full bg-ov-300" /> In Bearbeitung
            </span>
          </div>
          <ol className="relative mt-5 space-y-3.5">
            <span className="absolute bottom-2 left-[9px] top-2 w-px bg-white/15" />
            {SCHRITTE.map((s) => (
              <li key={s.t} className="relative flex items-center gap-3">
                {s.z === "fertig" && (
                  <span className="relative flex h-[19px] w-[19px] items-center justify-center rounded-full bg-ov-400 text-navy-950">
                    <Check className="h-3 w-3" strokeWidth={3.5} />
                  </span>
                )}
                {s.z === "aktiv" && (
                  <span className="relative flex h-[19px] w-[19px] items-center justify-center rounded-full bg-navy-950 ring-2 ring-ov-300">
                    <span className="h-2 w-2 rounded-full bg-ov-300" />
                  </span>
                )}
                {s.z === "offen" && <span className="relative h-[19px] w-[19px] rounded-full bg-navy-900 ring-1 ring-inset ring-white/25" />}
                <span className={`text-[13px] ${s.z === "offen" ? "text-white/55" : s.z === "aktiv" ? "font-semibold text-white" : "text-white/80"}`}>{s.t}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-ov-500 to-ov-300" />
          </div>
        </div>

        {/* Chip: Dokument */}
        <div className="ov-ein absolute -left-3 bottom-0 flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-ink-900 shadow-e4 sm:-left-6" style={{ "--ov-delay": "300ms" }}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ov-50 text-ov-700">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold leading-tight">Dokumente</p>
            <p className="text-[11px] leading-tight text-ink-600">sicher an einem Ort</p>
          </div>
        </div>

        {/* Chip: Nachricht */}
        <div className="ov-ein absolute -right-2 -top-3 flex items-center gap-2 rounded-2xl bg-navy-950/90 px-3 py-2 shadow-e4 ring-1 ring-white/15 backdrop-blur sm:-right-5" style={{ "--ov-delay": "420ms" }}>
          <MessagesSquare className="h-4 w-4 text-sun-300" />
          <p className="text-[12px] font-semibold text-white">Neue Nachricht</p>
        </div>
      </div>
      <figcaption className="sr-only">Beispielansicht des Portals: Status eines Vorgangs, Dokumente und Nachrichten</figcaption>
    </figure>
  );
}

export default function AuthRahmen({ eyebrow, titel, text, rolle, nutzenOben = false, children }) {
  const r = ROLLEN.find((x) => x.id === rolle);
  const punkte = NUTZEN[rolle] || [
    "Status aller Anfragen, Flächen und Projekte",
    "Dokumente und Nachrichten sicher an einem Ort",
    "Für Flächeneigentümer und Investoren kostenfrei",
  ];
  return (
    <section className="relative isolate overflow-hidden bg-sand-50">
      <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-0 -z-10 h-[420px] w-[420px] rounded-full bg-ov-300/20 blur-[120px]" />
      <div className="ov-container relative py-5 sm:py-10 md:py-14">
        <div className="grid overflow-hidden rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 sm:rounded-[2rem] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          {/* Formularseite */}
          <div className="relative min-w-0 px-5 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-16 xl:px-20">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ov-500 via-ov-300 to-sun-300 lg:hidden" />
            <div className="ov-ein mx-auto flex h-full w-full max-w-[30rem] flex-col">
              <div>
                {eyebrow && (
                  <p className="inline-flex items-center gap-2 rounded-full bg-ov-50 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-800 ring-1 ring-inset ring-ov-200/80">
                    <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
                    {eyebrow}
                  </p>
                )}
                <h1 className="mt-4 text-balance font-display text-[30px] font-extrabold leading-[1.08] tracking-tight text-ink-900 md:text-[40px]">{titel}</h1>
                {text && <p className="mt-3 text-pretty text-[15.5px] leading-relaxed text-ink-600 md:text-[16px]">{text}</p>}
                {/* Unterhalb lg: Nutzen kompakt ÜBER dem Formular (die Markenfläche folgt erst darunter) */}
                {nutzenOben && (
                  <ul className="mt-5 space-y-2 rounded-2xl bg-ov-50/70 p-4 ring-1 ring-inset ring-ov-200/80 lg:hidden" aria-label="Ihre Vorteile">
                    {punkte.map((p, i) => (
                      <li key={p} className="ov-ein flex items-start gap-2.5 text-[14px] leading-snug text-ink-800" style={{ "--ov-delay": `${120 + i * 60}ms` }}>
                        <CheckCircle2 aria-hidden="true" className="mt-px h-4 w-4 shrink-0 text-ov-600" />
                        <span className="min-w-0">{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-8">{children}</div>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-100 pt-5 text-[13px] text-ink-600 lg:mt-auto lg:pt-6">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 text-ov-600" />
                  <Link href="/datenschutz" className="rounded underline-offset-4 hover:text-ink-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">Datenschutz</Link>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText aria-hidden="true" className="h-4 w-4 text-ov-600" />
                  <Link href="/nutzungsbedingungen" className="rounded underline-offset-4 hover:text-ink-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">Nutzungsbedingungen</Link>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LifeBuoy aria-hidden="true" className="h-4 w-4 text-ov-600" />
                  <Link href="/kontakt" className="rounded underline-offset-4 hover:text-ink-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">Hilfe und Kontakt</Link>
                </span>
              </div>
            </div>
          </div>

          {/* Markenseite */}
          <aside aria-label="Ihre Vorteile im Portal" className="ov-verlauf-nacht ov-noise relative isolate min-w-0 overflow-hidden px-6 py-9 text-white sm:px-10 sm:py-12 lg:px-12 lg:py-14 xl:px-14">
            <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 -z-10 h-[420px] w-[420px] rounded-full bg-ov-500/20 blur-[110px]" />
            <div className="flex h-full flex-col">
              <div className="hidden sm:block">
                <PortalVorschau />
              </div>
              <p className="ov-overline text-ov-300 sm:mt-8">{r ? `Portal für ${r.label}` : "Ein Login für alles"}</p>
              <p className="mt-3 text-balance font-display text-[24px] font-extrabold leading-tight tracking-tight md:text-[30px]">
                Flächen. Projekte. Kapital. Strom. <span className="ov-text-gradient-light">An einem Ort.</span>
              </p>
              <ul className={nutzenOben ? "mt-6 hidden space-y-3 lg:block" : "mt-6 space-y-3"}>
                {punkte.map((p, i) => (
                  <li key={p} className="ov-ein flex items-start gap-3 text-[15px] leading-relaxed text-white/85" style={{ "--ov-delay": `${160 + i * 70}ms` }}>
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-300" />
                    <span className="min-w-0">{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 grid grid-cols-3 gap-2 lg:mt-auto lg:pt-10">
                {VERTRAUEN.map((k) => {
                  const Icon = k.icon;
                  return (
                    <div key={k.t} className="rounded-2xl bg-white/[0.05] p-3 ring-1 ring-inset ring-white/10 sm:p-3.5">
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] text-ov-300" />
                      <p className="mt-2 text-[13px] font-semibold leading-tight sm:text-[14px]">{k.t}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-white/70 sm:text-[12.5px]">{k.s}</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 flex items-center gap-2 text-[13px] text-white/75">
                <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> Persönliche Antwort durch unser Team
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
