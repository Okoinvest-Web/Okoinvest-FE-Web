// Prüfung am Kartentisch, Weg bis zur ersten Pacht, Anfrage (dunkle Bühne) – /flaeche-verpachten
import Link from "@/components/Land/Link";
import {
  ArrowRight, ClipboardCheck, FileSignature, HandCoins, LayoutDashboard, PlugZap, ShieldCheck, Wheat,
} from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { Haken } from "@/components/Flaeche/Seite/teile";
import Aufbau, { aufbau } from "@/components/Flaeche/Seite/Aufbau";
import { PACHT, PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";

/* ------------------------------------------------------------------ */
/* Was wir prüfen – Ebenen am Kartentisch                              */
/* ------------------------------------------------------------------ */

// Länderinhalt (src/lib/land/inhalte.js): Österreich – Widmung/Zonen statt Flächennutzungsplan,
// EAG statt EEG-Kulisse, Grundstücksnummer/Katastralgemeinde statt Flurstück/Gemarkung.
const PRUEFPUNKTE_GEMEINSAM = [
  { t: "Planungsrecht", x: "Lage im Regional- und Flächennutzungsplan, Haltung der Gemeinde" },
  { t: "Schutzgebiete", x: "Schutzgebiete, Biotope, Wasserschutz, Überschwemmungsgebiete" },
  { t: "Förderkulisse", x: "EEG-Flächenkulisse bzw. Förderung in AT und CH" },
  { t: "Netz", x: "Netzverknüpfungspunkt, freie Kapazität, Trassenverlauf" },
  { t: "Sonne & Gelände", x: "Einstrahlung, Verschattung, Hangneigung und Zuschnitt" },
  { t: "Zufahrt & Boden", x: "Zufahrt, Baugrund, Leitungen und Altlasten" },
  { t: "Eigentum", x: "Eigentumsverhältnisse, Grundbuch, bestehende Pachtverträge" },
];

const PRUEFPUNKTE_AT = PRUEFPUNKTE_GEMEINSAM.map((p) =>
  ({
    Planungsrecht: { ...p, x: "Flächenwidmung, PV-Zonen bzw. Eignungszonen des Bundeslandes, Haltung der Gemeinde" },
    Förderkulisse: { ...p, x: "EAG-Marktprämie oder Investitionszuschuss, Abschlag nach § 33 EAG für Agrar- und Grünland" },
    Eigentum: { ...p, x: "Eigentumsverhältnisse, Grundbuch, Grundverkehr, bestehende Pachtverträge" },
  })[p.t] || p
);

// Englisch: Prüfpunkte (gemeinsam und AT), nur Texte je Index
const PRUEFPUNKTE_EN = [
  { t: "Planning law", x: "Position in the regional and land use plan, the municipality’s stance" },
  { t: "Protected areas", x: "Protected areas, biotopes, water protection, floodplains" },
  { t: "Funding categories", x: "EEG land categories or funding in AT and CH" },
  { t: "Grid", x: "Grid connection point, free capacity, cable route" },
  { t: "Sun & terrain", x: "Irradiation, shading, slope and plot shape" },
  { t: "Access & soil", x: "Access, subsoil, pipelines and contaminated sites" },
  { t: "Ownership", x: "Ownership, land register, existing lease agreements" },
];
const PRUEFPUNKTE_AT_EN = PRUEFPUNKTE_EN.map((p, i) =>
  ({
    0: { ...p, x: "Zoning (Flächenwidmung), PV zones or suitability zones of the federal state, the municipality’s stance" },
    2: { ...p, x: "EAG market premium or investment grant, reduction under § 33 EAG for farmland and grassland" },
    6: { ...p, x: "Ownership, land register, land transfer approval (Grundverkehr), existing lease agreements" },
  })[i] || p
);

const pruefpunkte = (land, sprache) =>
  inhaltFuerSprache({ de: { gemeinsam: PRUEFPUNKTE_GEMEINSAM, AT: PRUEFPUNKTE_AT }, en: { gemeinsam: PRUEFPUNKTE_EN, AT: PRUEFPUNKTE_AT_EN } }, land, sprache);

const EBENEN_FARBEN = ["#ffffff", "#e9f3dc", "#d4e8bb", "#fff1c7", "#dbe7f5", "#e9f3dc", "#f2efe4"];

/** Gestapelte Kartenebenen (isometrisch) – oben die Flurkarte mit Ihrer Fläche */
function Kartenstapel({ className }) {
  const cx = 210;
  const hw = 165;
  const hh = 66;
  const abstand = 30;
  const y0 = 84;
  const raute = (y) => `${cx - hw},${y} ${cx},${y - hh} ${cx + hw},${y} ${cx},${y + hh}`;
  const ebenen = PRUEFPUNKTE_GEMEINSAM.map((_, i) => i);
  return (
    <svg viewBox="0 0 440 340" className={className} aria-hidden="true">
      <defs>
        <clipPath id="vp-stapel-oben">
          <polygon points={raute(y0)} />
        </clipPath>
      </defs>
      {/* Schatten */}
      <ellipse cx={cx} cy={y0 + abstand * 6 + hh + 8} rx={hw * 0.9} ry="16" fill="#03122b" fillOpacity="0.08" />
      {[...ebenen].reverse().map((i) => {
        const y = y0 + i * abstand;
        return (
          <g key={i} className={aufbau.fallen} style={{ "--i": PRUEFPUNKTE_GEMEINSAM.length - 1 - i }}>
            <polygon points={raute(y + 5)} fill="#03122b" fillOpacity="0.06" />
            <polygon points={raute(y)} fill={EBENEN_FARBEN[i]} stroke="#558227" strokeOpacity={i === 0 ? 0.5 : 0.25} />
          </g>
        );
      })}
      {/* Oberste Ebene: Flurkarte */}
      <g clipPath="url(#vp-stapel-oben)" className={aufbau.ein} style={{ "--ein-start": "720ms" }}>
        {[-120, -60, 0, 60, 120].map((d) => (
          <line key={`a${d}`} x1={cx - hw + d} y1={y0 - hh} x2={cx + d + 40} y2={y0 + hh} stroke="#a3abba" strokeOpacity="0.45" />
        ))}
        {[-40, 0, 40].map((d) => (
          <line key={`b${d}`} x1={cx - hw} y1={y0 + d} x2={cx + hw} y2={y0 + d - 50} stroke="#a3abba" strokeOpacity="0.45" />
        ))}
        <polygon points={`${cx - 40},${y0 - 8} ${cx + 38},${y0 - 34} ${cx + 70},${y0 + 4} ${cx - 6},${y0 + 32}`} fill="#8cba58" fillOpacity="0.35" stroke="#436621" strokeWidth="1.6" />
        {[0, 1, 2, 3, 4].map((k) => (
          <line key={k} x1={cx - 30 + k * 9} y1={y0 - 2 + k * 6} x2={cx + 44 + k * 4} y2={y0 - 26 + k * 7} stroke="#436621" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
        ))}
        <path d={`M${cx + 70} ${y0 + 2} C ${cx + 100} ${y0 + 10}, ${cx + 120} ${y0 - 10}, ${cx + 132} ${y0 - 22}`} stroke="#f5a70f" strokeWidth="2" strokeDasharray="4 4" fill="none" />
        <circle cx={cx + 134} cy={y0 - 24} r="5" fill="#f5a70f" />
      </g>
      {/* Nummern an der rechten Kante */}
      {ebenen.map((i) => {
        const y = y0 + i * abstand;
        return (
          <g key={`n${i}`} className={aufbau.pop} style={{ "--i": i }}>
            <line x1={cx + hw} y1={y} x2={cx + hw + 20} y2={y} stroke="#558227" strokeOpacity="0.4" />
            <circle cx={cx + hw + 32} cy={y} r="12" fill={i === 0 ? "#558227" : "#ffffff"} stroke="#558227" strokeOpacity="0.5" />
            <text x={cx + hw + 32} y={y + 4.5} textAnchor="middle" fontSize="12.5" fontWeight="800" fill={i === 0 ? "#ffffff" : "#436621"}>{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

const W_PRUEFUNG = {
  de: {
    eyebrow: "Was wir prüfen",
    titel: "Bevor wir Ihnen ein Angebot machen.",
    lead: "Kein Pachtangebot ins Blaue: Wir prüfen Ihre Fläche erst am Kartentisch und sagen Ihnen offen, wenn sie nicht passt – auch das ist eine Antwort, die Zeit spart.",
    unterschrift: "Sieben Ebenen, eine Fläche: Wir legen alles übereinander, bevor wir ein Angebot schreiben.",
  },
  en: {
    eyebrow: "What we check",
    titel: "Before we make you an offer.",
    lead: "No lease offer out of the blue: we first check your land at our desk and tell you openly if it is not suitable – that, too, is an answer that saves time.",
    unterschrift: "Seven layers, one site: we overlay everything before we write an offer.",
  },
};

export function Pruefung() {
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W_PRUEFUNG, sprache);
  const PRUEFPUNKTE = pruefpunkte(landDerAnfrage(), sprache);
  return (
    <Section tone="green" space="lg" className="overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(60%_60%_at_80%_50%,#000,transparent)]" />
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <SectionHeading
            eyebrow={w.eyebrow}
            title={w.titel}
            lead={w.lead}
          />
          <ol className="mt-8 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {PRUEFPUNKTE.map((p, i) => (
              <Reveal as="li" key={i} delay={i * 40} className="flex gap-3 border-t border-ov-200/70 py-3.5">
                <span aria-hidden="true" className={cn("ov-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-extrabold", i === 0 ? "bg-ov-600 text-white" : "bg-white text-ov-700 ring-1 ring-ov-300")}>{i + 1}</span>
                <span className="min-w-0">
                  <span className="block font-display text-[15.5px] font-bold text-ink-900">{p.t}</span>
                  <span className="mt-0.5 block text-[14px] leading-snug text-ink-600">{p.x}</span>
                </span>
              </Reveal>
            ))}
          </ol>
        </div>
        <Reveal dir="scale" className="relative mx-auto w-full max-w-[520px]">
          <div aria-hidden="true" className="absolute inset-8 rounded-full bg-white/70 blur-3xl" />
          <Aufbau schritt={90} style={{ "--pop-start": "760ms", "--pop-schritt": "70ms" }} className="relative">
            <Kartenstapel className="h-auto w-full" />
          </Aufbau>
          <p className="relative mt-2 text-center text-[13px] text-ink-600">{w.unterschrift}</p>
        </Reveal>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Weg bis zur ersten Pachtzahlung                                     */
/* ------------------------------------------------------------------ */

const SCHRITTE_GEMEINSAM = [
  { icon: ClipboardCheck, title: "Flächencheck", text: "Sie nennen Flurstücke oder zeichnen die Fläche ein. Wir prüfen kostenfrei am Kartentisch – Rückmeldung in der Regel innerhalb weniger Wochen.", phase: 0 },
  { icon: HandCoins, title: "Pachtangebot", text: "Sie erhalten ein schriftliches Angebot mit Pachtmodell und Vertragsentwurf – und so viel Zeit, wie Sie für die Prüfung brauchen.", phase: 0 },
  { icon: FileSignature, title: "Vertrag & Grundbuch", text: "Unterschrift, notarielle Dienstbarkeit. Ab jetzt läuft die Reservierungsprämie, Sie bewirtschaften weiter.", phase: 1 },
  { icon: PlugZap, title: "Netz & Baurecht", text: "Wir sichern den Netzanschluss und führen das Verfahren mit der Gemeinde. Jeder Meilenstein erscheint im Portal.", phase: 1 },
  { icon: ShieldCheck, title: "Bürgschaft & Bau", text: "Vor Baubeginn wird die Rückbaubürgschaft hinterlegt. Der Bau selbst dauert meist nur wenige Monate.", phase: 1 },
  { icon: Wheat, title: "Erste Pachtzahlung", text: "Mit Bau- bzw. Betriebsbeginn fließt die volle Pacht – für 30 Jahre und mehr.", phase: 2 },
];

const SCHRITTE_AT = SCHRITTE_GEMEINSAM.map((s) =>
  ({
    Flächencheck: { ...s, text: "Sie nennen Katastralgemeinde und Grundstücksnummern oder zeichnen die Fläche ein. Wir prüfen kostenfrei am Kartentisch – Rückmeldung in der Regel innerhalb weniger Wochen." },
    "Netz & Baurecht": { ...s, text: "Wir sichern den Netzanschluss und begleiten Widmung und Bewilligungen mit Gemeinde und Land. Jeder Meilenstein erscheint im Portal." },
  })[s.title] || s
);

const PHASEN_GEMEINSAM = [
  { t: "Kostenfrei für Sie", x: "Prüfung und Angebot", c: "bg-white text-ink-700 ring-1 ring-ink-200", span: "lg:col-span-2" },
  { t: "Reservierungsprämie", x: `${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €/ha·a · Sie bewirtschaften weiter`, c: "bg-sun-100 text-sun-700 ring-1 ring-sun-200", span: "lg:col-span-3" },
  { t: "Volle Pacht", x: `${PACHT.laufzeit} Jahre und mehr`, c: "bg-gradient-to-r from-ov-600 to-ov-500 text-white", span: "lg:col-span-1" },
];

// Österreich: Pachtwerte noch nicht an der Quelle geprüft → Höhe der Reservierungsprämie ohne Euro-Wert
const PHASEN_AT = PHASEN_GEMEINSAM.map((p) => (p.t === "Reservierungsprämie" ? { ...p, x: "Höhe nach Prüfung · Sie bewirtschaften weiter" } : p));

// Englisch: Schritte und Phasen (gemeinsam und AT), nur Texte je Index
const SCHRITTE_EN = [
  { title: "Land check", text: "You give us the plot numbers or draw the land on the map. We check it at our desk free of charge – usually with feedback within a few weeks." },
  { title: "Lease offer", text: "You receive a written offer with a lease model and a draft contract – and as much time as you need to review it." },
  { title: "Contract & land register", text: "Signature and notarised easement. From now on the reservation fee is paid, and you keep farming." },
  { title: "Grid & building rights", text: "We secure the grid connection and run the procedure with the municipality. Every milestone appears in the portal." },
  { title: "Guarantee & construction", text: "The decommissioning guarantee is deposited before construction starts. Construction itself usually takes only a few months." },
  { title: "First lease payment", text: "From the start of construction or operation, the full lease is paid – for 30 years and more." },
];
const SCHRITTE_AT_EN = SCHRITTE_EN.map((s, i) =>
  ({
    0: { ...s, text: "You give us the cadastral municipality (Katastralgemeinde) and plot numbers or draw the land on the map. We check it at our desk free of charge – usually with feedback within a few weeks." },
    2: { ...s, text: "Signature and easement in the land register. From now on the reservation fee is paid, and you keep farming." },
    3: { ...s, text: "We secure the grid connection and support zoning and permits with the municipality and the federal state. Every milestone appears in the portal." },
  })[i] || s
);
const PHASEN_EN = [
  { t: "Free of charge for you", x: "Assessment and offer" },
  { t: "Reservation fee", x: `€${fmtZahl(PACHT.reservierungProHa.min, 0, "en")}–${fmtZahl(PACHT.reservierungProHa.max, 0, "en")}/ha·yr · you keep farming` },
  { t: "Full lease", x: `${PACHT.laufzeit} years and more` },
];
const PHASEN_AT_EN = PHASEN_EN.map((p, i) => (i === 1 ? { ...p, x: "Amount after assessment · you keep farming" } : p));

const W_WEG = {
  de: {
    eyebrow: "Schritt für Schritt",
    titel: "Der Weg bis zur ersten Pachtzahlung",
    lead: "Sechs Schritte, drei Phasen – und in keiner davon zahlen Sie etwas drauf. Realistisch vergehen von der Unterschrift bis zum Bau meist 2 bis 4 Jahre.",
    schritt: (n) => `Schritt ${n}: `,
  },
  en: {
    eyebrow: "Step by step",
    titel: "The path to the first lease payment",
    lead: "Six steps, three phases – and in none of them do you pay anything. Realistically, it usually takes 2 to 4 years from signing to construction.",
    schritt: (n) => `Step ${n}: `,
  },
};

export function Weg() {
  const land = landDerAnfrage();
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W_WEG, sprache);
  const SCHRITTE = inhaltFuerSprache({ de: { gemeinsam: SCHRITTE_GEMEINSAM, AT: SCHRITTE_AT }, en: { gemeinsam: SCHRITTE_EN, AT: SCHRITTE_AT_EN } }, land, sprache);
  // Schweiz: Reservierungsprämie ebenfalls nicht geprüft → ohne Euro-Wert wie in Österreich (QM, Entscheidung 5)
  const PHASEN = inhaltFuerSprache({ de: { gemeinsam: PHASEN_GEMEINSAM, AT: PHASEN_AT, CH: PHASEN_AT }, en: { gemeinsam: PHASEN_EN, AT: PHASEN_AT_EN, CH: PHASEN_AT_EN } }, land, sprache);
  return (
    <Section tone="white" space="lg">
      <SectionHeading
        eyebrow={w.eyebrow}
        title={w.titel}
        lead={w.lead}
        align="center"
        className="mb-14"
      />

      {/* Phasenband (ab lg über den Schritten) */}
      <Aufbau schritt={160} className="mb-8 hidden gap-3 lg:grid lg:grid-cols-6">
        {PHASEN.map((p, i) => (
          <div key={i} className={cn("rounded-2xl px-4 py-3", aufbau.heben, p.c, p.span)} style={{ "--i": i }}>
            <span className="block font-display text-[15px] font-bold leading-tight">{p.t}</span>
            <span className="mt-0.5 block text-[12.5px] font-medium leading-snug opacity-90">{p.x}</span>
          </div>
        ))}
      </Aufbau>

      <Aufbau as="ol" verzoegerung={150} className="relative grid gap-0 lg:grid-cols-6 lg:gap-5">
        <span aria-hidden="true" style={{ "--dauer": "1600ms" }} className={"absolute hidden lg:block lg:left-6 lg:right-[calc((100%-100px)/6-24px)] lg:top-6 lg:h-px lg:w-auto bg-gradient-to-r from-ink-200 via-sun-300 to-ov-500 " + aufbau.wachsen} />
        {SCHRITTE.map((s, i) => {
          const phase = PHASEN[s.phase];
          const erster = i === 0 || SCHRITTE[i - 1].phase !== s.phase;
          return (
            <Reveal as="li" key={i} delay={i * 70} className="relative flex gap-5 pb-8 last:pb-0 lg:block lg:pb-0">
              {i < SCHRITTE.length - 1 && (
                <span aria-hidden="true" className={cn("absolute bottom-0 left-[23px] top-12 w-px lg:hidden", s.phase === 0 ? "bg-ink-200" : "bg-sun-300")} />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-e2 ring-1",
                  s.phase === 2 ? "bg-ov-600 text-white ring-ov-600" : s.phase === 1 ? "bg-white text-sun-600 ring-sun-200" : "bg-white text-ov-600 ring-ink-200"
                )}
              >
                <s.icon className="h-5 w-5" />
                <span className="ov-num absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-navy-950 text-[11px] font-bold text-white">{i + 1}</span>
              </span>
              <div className="min-w-0 pt-1 lg:pt-5">
                {erster && (
                  <p className={cn("mb-2 inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-bold lg:hidden", phase.c)}>{phase.t}</p>
                )}
                <h3 className="font-display text-[17px] font-bold leading-snug text-ink-900">
                  <span className="sr-only">{w.schritt(i + 1)}</span>
                  {s.title}
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{s.text}</p>
              </div>
            </Reveal>
          );
        })}
      </Aufbau>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Anfrage                                                             */
/* ------------------------------------------------------------------ */

const NACH_DEM_ABSENDEN = [
  { t: "Vorgangsnummer sofort", x: "Direkt nach dem Absenden – mit derselben E-Mail sehen Sie den Vorgang später im Portal." },
  { t: "Prüfung am Kartentisch", x: "Planungsrecht, Schutzgebiete, Netz, Kulisse und Eigentum – kostenfrei." },
  { t: "Ehrliche Antwort", x: "Passt die Fläche, erhalten Sie ein schriftliches Angebot. Passt sie nicht, sagen wir es offen." },
];

const ANFRAGE_TEXTE = {
  gemeinsam: {
    lead: "Nennen Sie uns Ort, Größe und wenn möglich die Flurstücke. Wir prüfen und melden uns persönlich.",
    kurz: "Dauert etwa zwei Minuten. Flurstücke sind hilfreich, aber kein Muss.",
    hinweis: "Bitte in der Nachricht ungefähre Größe, aktuelle Nutzung und – falls zur Hand – Gemarkung und Flurstücke angeben.",
  },
  AT: {
    lead: "Nennen Sie uns Ort, Größe und wenn möglich die Grundstücksnummern. Wir prüfen und melden uns persönlich.",
    kurz: "Dauert etwa zwei Minuten. Grundstücksnummern sind hilfreich, aber kein Muss.",
    hinweis: "Bitte in der Nachricht ungefähre Größe, aktuelle Nutzung und – falls zur Hand – Katastralgemeinde und Grundstücksnummern angeben.",
  },
};

// Englisch: Anfrage-Abschnitt (gemeinsam und AT)
const ANFRAGE_TEXTE_EN = {
  gemeinsam: {
    lead: "Tell us the location, size and, if possible, the plot numbers. We will check and get back to you personally.",
    kurz: "Takes about two minutes. Plot numbers are helpful but not a must.",
    hinweis: "Please state the approximate size, current use and – if to hand – the cadastral district (Gemarkung) and plot numbers in your message.",
  },
  AT: {
    lead: "Tell us the location, size and, if possible, the plot numbers (Grundstücksnummern). We will check and get back to you personally.",
    kurz: "Takes about two minutes. Plot numbers are helpful but not a must.",
    hinweis: "Please state the approximate size, current use and – if to hand – the cadastral municipality (Katastralgemeinde) and plot numbers in your message.",
  },
};

const W_ANFRAGE = {
  de: {
    nachDemAbsenden: NACH_DEM_ABSENDEN,
    eyebrow: "Kostenlos & unverbindlich",
    titelA: "Fläche melden – ",
    titelB: "wir melden uns.",
    chips: [`${PROVISION.flaeche.text[0].toUpperCase()}${PROVISION.flaeche.text.slice(1)}`, "Keine Verpflichtung"],
    nachTitel: "Was nach dem Absenden passiert",
    portalTitel: "Status Ihrer Fläche jederzeit im Portal",
    portalText: "Prüfergebnis, Angebot, Vertragsentwürfe, Meilensteine von Netzanfrage bis Satzungsbeschluss und Nachrichten an Ihren Ansprechpartner – alles an einem Ort. Registrieren Sie sich mit derselben E-Mail, dann erscheint Ihre Anfrage automatisch.",
    portalLink: "Zugang zum Portal anlegen",
    formTitel: "Ihre Fläche melden",
    feldTitel: "Ihre Fläche",
    button: "Fläche melden",
  },
  en: {
    nachDemAbsenden: [
      { t: "Case number straight away", x: "Immediately after submitting – with the same email address you will later see the case in the portal." },
      { t: "Desk review", x: "Planning law, protected areas, grid, land categories and ownership – free of charge." },
      { t: "An honest answer", x: "If the land is suitable, you receive a written offer. If it is not, we say so openly." },
    ],
    eyebrow: "Free of charge & without obligation",
    titelA: "Register your land – ",
    titelB: "we will get back to you.",
    chips: ["Always free of charge for landowners", "No obligation"],
    nachTitel: "What happens after you submit",
    portalTitel: "The status of your land in the portal at any time",
    portalText: "Assessment result, offer, draft contracts, milestones from grid request to adoption of the development plan, and messages to your contact person – all in one place. Register with the same email address and your enquiry will appear automatically.",
    portalLink: "Create portal access",
    formTitel: "Register your land",
    feldTitel: "Your land",
    button: "Register land",
  },
};

export function Anfrage() {
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W_ANFRAGE, sprache);
  const t = inhaltFuerSprache({ de: ANFRAGE_TEXTE, en: ANFRAGE_TEXTE_EN }, landDerAnfrage(), sprache);
  const NACH = w.nachDemAbsenden;
  return (
    <Section tone="navy" space="lg" id="anfrage" bare aria-labelledby="anfrage-titel" className="ov-verlauf-nacht ov-noise scroll-mt-24 overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_20%_30%,#000,transparent)]" />
      <div className="ov-container relative grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal className="lg:self-start lg:pt-4">
          <Eyebrow dark className="mb-4">{w.eyebrow}</Eyebrow>
          <h2 id="anfrage-titel" className="ov-h2 text-white">
            {w.titelA}<span className="ov-text-gradient-light">{w.titelB}</span>
          </h2>
          <p className="ov-lead mt-5 max-w-xl text-white/75">
            {t.lead}
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {w.chips.map((t) => (
              <li key={t} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/[0.07] px-3.5 py-2 text-[14px] font-medium text-white/90 ring-1 ring-white/15">
                <Haken dunkel className="mt-0" />
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-12 hidden border-t border-white/10 pt-10 lg:block">
            <h3 className="text-ov-300"><span className="ov-overline block font-sans">{w.nachTitel}</span></h3>
            <ol className="mt-6">
              {NACH.map((s, i) => (
                <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
                  {i < NACH.length - 1 && <span aria-hidden="true" className="absolute bottom-1 left-[17px] top-10 w-px bg-gradient-to-b from-ov-400/60 to-white/10" />}
                  <span aria-hidden="true" className="ov-num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-[13px] font-bold text-ov-300 ring-1 ring-white/15">{i + 1}</span>
                  <div className="min-w-0 pt-1">
                    <p className="font-display text-[16.5px] font-bold text-white">{s.t}</p>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-white/70">{s.x}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Portal */}
          <div className="mt-10 flex gap-4 rounded-3xl bg-white/[0.05] p-5 ring-1 ring-white/10 md:p-6">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-400/15 text-ov-300 ring-1 ring-ov-300/30">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[17px] font-bold text-white">{w.portalTitel}</p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/70">{w.portalText}</p>
              <Link href="/registrieren?rolle=flaeche" className="mt-3 inline-flex items-center gap-2 rounded text-[15px] font-semibold text-ov-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
                {w.portalLink} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal dir="scale" className="relative">
          <div aria-hidden="true" className="absolute -inset-6 rounded-[2.75rem] bg-ov-500/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] bg-white text-ink-900 shadow-e4 ring-1 ring-white/20">
            <div className="border-b border-ink-200/70 bg-gradient-to-r from-ov-50 to-white px-6 py-5 sm:px-8 md:px-10">
              <p className="font-display text-[20px] font-bold leading-tight text-ink-900">{w.formTitel}</p>
              <p className="mt-1 text-[14px] text-ink-600">{t.kurz}</p>
            </div>
            <div className="p-6 sm:p-8 md:p-10">
              <AnfrageFormular
                typ="flaeche"
                daten={{ quelle: "flaeche-verpachten" }}
                felder={["telefon", "plz", "ort", "land", "nachricht"]}
                titel={w.feldTitel}
                text={t.hinweis}
                button={w.button}
              />
            </div>
          </div>
        </Reveal>

        {/* mobil: Ablauf nach dem Formular */}
        <div className="lg:hidden">
          <h3 className="text-ov-300"><span className="ov-overline block font-sans">{w.nachTitel}</span></h3>
          <ol className="mt-5 space-y-5">
            {NACH.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span aria-hidden="true" className="ov-num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-[13px] font-bold text-ov-300 ring-1 ring-white/15">{i + 1}</span>
                <div className="min-w-0 pt-1">
                  <p className="font-display text-[16.5px] font-bold text-white">{s.t}</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-white/70">{s.x}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
