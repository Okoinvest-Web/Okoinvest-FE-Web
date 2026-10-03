// Netzanschluss: Prinzip Überbauung (Skizze), BGH-Hinweis und sechs Stellschrauben
import { Building2, Cable, Clock, Gavel, MapPinned, Plug, Zap } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import Kopf from "@/components/Energie/Seite/Kopf";

const PUNKTE = [
  { icon: Plug, title: "Überbauung nutzen", text: "Solarpark und Speicher teilen sich einen Anschluss: Die Summe der Leistungen darf größer sein als die Anschlussleistung, gesteuert über ein Energiemanagement." },
  { icon: Cable, title: "Baukostenzuschuss", text: "Seit dem BGH-Beschluss vom 15.07.2025 zulässig auch für Speicher. Höhe je nach Netzebene und Netzbetreiber – früh anfragen und einpreisen." },
  { icon: Clock, title: "Reifegrad zählt", text: "Netzbetreiber priorisieren zunehmend Projekte mit gesicherter Fläche, Planung und Finanzierung. Spekulative Anfragen verlieren an Bedeutung." },
  { icon: Zap, title: "Flexible Anschlüsse", text: "Flexible Netzanschlussvereinbarungen erlauben einen schnelleren Anschluss gegen zeitweise begrenzte Einspeisung oder Bezug." },
  { icon: MapPinned, title: "Standort", text: "Nähe zu Umspannwerk oder Solarpark, Zuwegung für Schwerlast, Abstand zu Wohnbebauung, Lärm und Brandschutz." },
  { icon: Building2, title: "Genehmigung", text: "Je nach Standort Bauantrag im Außenbereich oder B-Plan. Die Gemeinde früh einbinden – auch zu Brandschutz und Feuerwehr." },
];

/** Prinzip Überbauung: Solar über den Tag, Speicher kappt die Spitze, Linie = Anschlussleistung (qualitativ, ohne Werte) */
function SkizzeUeberbauung() {
  const W = 520;
  const H = 260;
  const x = (h) => 20 + ((h - 4) / 18) * (W - 40);
  const basis = 210;
  const grenze = 112;
  const solar = (h) => (h < 6 || h > 20 ? 0 : Math.pow(Math.sin(((h - 6) / 14) * Math.PI), 1.4));
  const y = (v) => basis - v * 160;
  const pkt = Array.from({ length: 73 }, (_, i) => 4 + i * 0.25);
  const kurve = pkt.map((h, i) => `${i ? "L" : "M"}${x(h).toFixed(1)},${y(solar(h)).toFixed(1)}`).join(" ");
  const gekappt = pkt.map((h, i) => `${i ? "L" : "M"}${x(h).toFixed(1)},${Math.max(y(solar(h)), grenze).toFixed(1)}`).join(" ");
  // Fläche oberhalb der Grenze = geht in den Speicher
  const ueber = pkt.filter((h) => y(solar(h)) < grenze);
  const flaeche = `M${x(ueber[0]).toFixed(1)},${grenze} ` + ueber.map((h) => `L${x(h).toFixed(1)},${y(solar(h)).toFixed(1)}`).join(" ") + ` L${x(ueber[ueber.length - 1]).toFixed(1)},${grenze} Z`;
  // abends: Speicher speist ein
  const abend = `M${x(18)},${basis} L${x(18)},${grenze + 26} Q${x(19.5)},${grenze + 14} ${x(21)},${grenze + 26} L${x(21)},${basis} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Prinzip Überbauung: Die Solarspitze über der Anschlussleistung lädt den Speicher, abends speist der Speicher über denselben Anschluss ein.">
      <defs>
        <linearGradient id="gs-ue-solar" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffd873" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffd873" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={`${gekappt} L${x(22)},${basis} L${x(4)},${basis} Z`} fill="url(#gs-ue-solar)" />
      <path d={flaeche} fill="#4a7cbd" fillOpacity="0.35" stroke="#1f5aa1" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={abend} fill="#8cba58" fillOpacity="0.45" stroke="#558227" strokeWidth="1.5" />
      <path d={kurve} fill="none" stroke="#f5a70f" strokeWidth="2.5" strokeDasharray="1 0" />
      <line x1="14" x2={W - 14} y1={grenze} y2={grenze} stroke="#03285a" strokeWidth="2" strokeDasharray="7 5" />
      <rect x="14" y={grenze - 34} width="160" height="26" rx="13" fill="#03285a" />
      <text x="94" y={grenze - 16} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">Anschlussleistung</text>
      <line x1="14" x2={W - 14} y1={basis} y2={basis} stroke="#c9d1dc" />
      <text x={(x(11) + x(15)) / 2} y={grenze + 20} textAnchor="middle" fontSize="14" fontWeight="700" fill="#03285a">→ Speicher</text>
      <text x={x(19.5)} y={grenze + 50} textAnchor="middle" fontSize="13" fontWeight="700" fill="#37521e">abends</text>
      <text x={x(19.5)} y={grenze + 66} textAnchor="middle" fontSize="13" fontWeight="700" fill="#37521e">einspeisen</text>
      {[6, 12, 18].map((h) => (
        <text key={h} x={x(h)} y={basis + 22} textAnchor="middle" fontSize="13" fill="#6b7587">{`${h}:00`}</text>
      ))}
    </svg>
  );
}

export default function Netz() {
  return (
    <Section tone="white" space="lg" id="netz" data-abschnitt="netz" aria-labelledby="netz-titel" className="scroll-mt-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Kopf
            id="netz-titel"
            eyebrow="Netzanschluss"
            titel="Der Engpass heißt Netz – nicht Batterie."
            lead="Bei Netzbetreibern liegen Anschlussanfragen für Speicher in einem Vielfachen der tatsächlich möglichen Leistung. Wer Speicher entwickeln will, braucht eine Strategie für den Anschluss."
          />
          <Reveal className="mt-10 rounded-[2rem] bg-sand-50 p-5 ring-1 ring-ink-200/70 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="ov-overline text-ov-700">Prinzip Überbauung</p>
              <span className="text-[12px] text-ink-500">schematisch</span>
            </div>
            <div className="mt-4">
              <SkizzeUeberbauung />
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-600">
              <li className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-[3px] w-5 rounded-full bg-sun-500" /> Solarerzeugung
              </li>
              <li className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-navy-400/60 ring-1 ring-navy-500" /> lädt Speicher
              </li>
              <li className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-ov-400/70 ring-1 ring-ov-600" /> Speicher speist ein
              </li>
            </ul>
          </Reveal>
        </div>

        <div className="min-w-0">
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-navy-950 p-6 text-white shadow-e4 sm:p-8">
            <div aria-hidden="true" className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sun-400/15 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-400/15 text-sun-300 ring-1 ring-sun-400/30">
                <Gavel className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="ov-overline text-sun-300">BGH, 15. Juli 2025 · EnVR 1/24</p>
                <h3 className="mt-2 font-display text-[20px] font-bold leading-snug md:text-[22px]">Baukostenzuschuss auch für Batteriespeicher</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/75">
                  Netzbetreiber dürfen von Speichern einen Baukostenzuschuss nach dem Leistungspreismodell verlangen. Bei Co-Location am bestehenden Anschluss eines Solarparks fällt er für die
                  gemeinsam genutzte Leistung in der Regel nicht erneut an – das ist im Einzelfall mit dem Netzbetreiber zu klären.
                </p>
              </div>
            </div>
          </Reveal>

          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {PUNKTE.map((p, i) => (
              <Reveal as="li" key={p.title} delay={(i % 2) * 60} className="ov-card-hover rounded-3xl bg-white p-6 ring-1 ring-ink-200/70">
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
                  <p.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-[18px] font-bold text-ink-900">{p.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{p.text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
