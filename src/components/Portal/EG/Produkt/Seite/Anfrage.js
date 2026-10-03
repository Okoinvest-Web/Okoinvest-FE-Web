// Anfrage über POST /api/anfrage – Höhepunkt der Seite: dunkle Bühne, helle Formularkarte.
// Reihenfolge mobil: Kopf → Formular → Ablauf (das Formular rutscht nicht unter die Falz-Liste).
import { ClipboardList, FileSearch, Handshake, ShieldCheck, KeyRound, Scale, MonitorPlay } from "lucide-react";
import Section from "@/components/ui/Section";
import { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import AnfrageMitDaten from "@/components/Gemeinschaft/AnfrageMitDaten";

// Schritt 2 beschreibt, was das Formular nach dem Absenden tatsächlich anzeigt (Vorgangsnummer, Status im Portal).
const ABLAUF = [
  { icon: ClipboardList, titel: "Sie schildern kurz Ihre Lage", text: "Modell, ungefähre Zählpunkte und Leistung genügen." },
  { icon: FileSearch, titel: "Sie erhalten eine Vorgangsnummer", text: "Direkt nach dem Absenden. Mit einer Registrierung verfolgen Sie den Stand im Portal." },
  { icon: Handshake, titel: "Wir melden uns mit einem Vorschlag", text: "Passendes Paket und ein konkretes Angebot, offen kalkuliert." },
  { icon: MonitorPlay, titel: "Sie entscheiden", text: "Auf Wunsch zeigen wir die Plattform an Ihren eigenen Zahlen." },
];
const ZUSAGEN = [
  { icon: ShieldCheck, text: "Unverbindlich anfragen" },
  { icon: KeyRound, text: "Die Marktpartner-ID bleibt bei Ihrer Gemeinschaft" },
  { icon: Scale, text: "Auftragsverarbeitung nach Art. 28 DSGVO" },
];

// Dekor: Gemeinschaft als Netz – Knoten (Mitglieder) um einen Erzeuger, leise im Hintergrund.
function NetzDekor({ className }) {
  const knoten = [
    [60, 70], [190, 40], [300, 110], [90, 210], [250, 230], [340, 260], [150, 320], [30, 330],
  ];
  return (
    <svg aria-hidden="true" viewBox="0 0 380 380" fill="none" className={className}>
      {knoten.map(([x, y], i) => (
        <line key={`l${i}`} x1="190" y1="180" x2={x} y2={y} stroke="currentColor" strokeOpacity="0.18" strokeDasharray="3 6" />
      ))}
      <circle cx="190" cy="180" r="74" stroke="currentColor" strokeOpacity="0.1" />
      <circle cx="190" cy="180" r="140" stroke="currentColor" strokeOpacity="0.06" />
      {knoten.map(([x, y], i) => (
        <circle key={`k${i}`} cx={x} cy={y} r={i % 3 === 0 ? 5 : 3.5} fill="currentColor" fillOpacity="0.35" />
      ))}
      <circle cx="190" cy="180" r="16" fill="#f5a70f" fillOpacity="0.85" />
      <circle cx="190" cy="180" r="28" stroke="#f5a70f" strokeOpacity="0.35" />
    </svg>
  );
}

// Zeitstrahl „Was nach dem Absenden passiert“. Wird für Desktop (Seitenspalte) und mobil (nach dem Formular)
// gerendert; die jeweils andere Fassung ist per display:none auch für Screenreader ausgeblendet.
function Ablauf({ className }) {
  return (
    <div className={className}>
      <h3 className="text-ov-300"><span className="ov-overline block font-sans">Was nach dem Absenden passiert</span></h3>
      <ol className="mt-6">
        {ABLAUF.map(({ icon: Icon, titel, text }, i) => (
          <li key={titel} className="relative flex gap-4 pb-7 last:pb-0">
            {i < ABLAUF.length - 1 && (
              <span aria-hidden="true" className="absolute bottom-1 left-[21px] top-12 w-px bg-gradient-to-b from-ov-400/60 to-white/10" />
            )}
            <span aria-hidden="true" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-ov-300 ring-1 ring-white/15">
              <Icon className="h-5 w-5" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sun-400 text-[11px] font-bold text-navy-950">{i + 1}</span>
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-display text-[17px] font-bold leading-snug text-white">
                <span className="sr-only">Schritt {i + 1}: </span>
                {titel}
              </p>
              <p className="mt-1 text-[15px] leading-relaxed text-white/70">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Anfrage() {
  return (
    <Section
      data-abschnitt="anfrage"
      tone="navy"
      space="lg"
      id="anfrage"
      bare
      aria-labelledby="anfrage-titel"
      className="ov-verlauf-nacht ov-noise scroll-mt-24 overflow-hidden"
    >
      <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_20%_30%,#000,transparent)]" />
      <NetzDekor className="pointer-events-none absolute -bottom-28 -left-28 hidden h-[460px] w-[460px] text-ov-300 opacity-50 lg:block" />

      <div className="ov-container relative grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        {/* Kopf */}
        <Reveal className="lg:self-start lg:pt-4">
          <Eyebrow dark className="mb-4">Anfrage</Eyebrow>
          <h2 id="anfrage-titel" className="ov-h2 text-white">
            Gründen, wechseln oder <span className="ov-text-gradient-light">betreiben lassen</span>
          </h2>
          <p className="ov-lead mt-5 max-w-xl text-white/75">Erzählen Sie uns kurz, wo Ihre Gemeinschaft steht. Wir melden uns mit einem konkreten Vorschlag und Angebot.</p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {ZUSAGEN.map(({ icon: Icon, text }) => (
              <li key={text} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/[0.07] px-3.5 py-2 text-[14px] font-medium text-white/90 ring-1 ring-white/15">
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-300" />
                {text}
              </li>
            ))}
          </ul>
          <Ablauf className="mt-12 hidden border-t border-white/10 pt-10 lg:block" />
        </Reveal>

        {/* Formular */}
        <Reveal dir="scale" className="relative">
          <div aria-hidden="true" className="absolute -inset-6 rounded-[2.75rem] bg-ov-500/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] bg-white text-ink-900 shadow-e4 ring-1 ring-white/20">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-ink-200/70 bg-gradient-to-r from-ov-50 to-white px-6 py-5 sm:px-8 md:px-10">
              <div className="min-w-0">
                <p className="font-display text-[20px] font-bold leading-tight text-ink-900">Ihre Anfrage</p>
                <p className="mt-1 text-[14px] text-ink-600">Pflicht sind nur Name, E-Mail und Ihre Einwilligung.</p>
              </div>
            </div>
            <div className="p-6 sm:p-8 md:p-10">
              <AnfrageMitDaten
                legende="Ihre Gemeinschaft oder Ihr Vorhaben"
                festeDaten={{ quelle: "energiegemeinschaften-software", land: "AT" }}
                zusatz={[
                  { name: "anliegen", label: "Worum geht es?", art: "chips", optionen: [{ id: "software", label: "Software nutzen" }, { id: "betrieb", label: "Betrieb abgeben" }, { id: "gruendung", label: "Gemeinschaft gründen" }, { id: "wechsel", label: "Anbieter wechseln" }] },
                  { name: "modell", label: "Modell", art: "select", optionen: [{ id: "offen", label: "Noch offen" }, { id: "eeg_lokal", label: "EEG lokal" }, { id: "eeg_regional", label: "EEG regional" }, { id: "beg", label: "BEG" }, { id: "gea", label: "GEA" }] },
                  { name: "zaehlpunkte", label: "Wie viele Zählpunkte? (Schätzung genügt)", art: "zahl", platzhalter: "z. B. 60" },
                  { name: "erzeugungKw", label: "Erzeugungsleistung in kW (Schätzung genügt)", art: "zahl", platzhalter: "z. B. 120" },
                ]}
                formular={{ typ: "energiegemeinschaft", felder: ["firma", "telefon", "plz", "nachricht"], button: "Unverbindlich anfragen" }}
              />
            </div>
          </div>
        </Reveal>

        {/* Ablauf mobil: nach dem Formular */}
        <Ablauf className="lg:hidden" />
      </div>
    </Section>
  );
}
