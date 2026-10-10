// Netzanschluss: Prinzip Überbauung (Skizze), BGH-Hinweis und sechs Stellschrauben
import { Building2, Cable, Clock, Gavel, MapPinned, Plug, Zap } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import Kopf from "@/components/Energie/Seite/Kopf";
import Link from "@/components/Land/Link";
import { GiltFuer } from "@/components/Land/LandHinweis";
import { listeFuerLand } from "@/components/Land/Laenderteile";
import { LAENDER, landCode, landHinweisText, landHinweisTextEn } from "@/lib/land";
import { spracheDerAnfrage, landDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

const PUNKTE = [
  { icon: Plug, title: "Überbauung nutzen", text: "Solarpark und Speicher teilen sich einen Anschluss: Die Summe der Leistungen darf größer sein als die Anschlussleistung, gesteuert über ein Energiemanagement." },
  { icon: Cable, title: "Baukostenzuschuss", text: "Seit dem BGH-Beschluss vom 15.07.2025 zulässig auch für Speicher. Höhe je nach Netzebene und Netzbetreiber – früh anfragen und einpreisen.", nurDE: "Anschlusskosten" },
  { icon: Clock, title: "Reifegrad zählt", text: "Netzbetreiber priorisieren zunehmend Projekte mit gesicherter Fläche, Planung und Finanzierung. Spekulative Anfragen verlieren an Bedeutung." },
  { icon: Zap, title: "Flexible Anschlüsse", text: "Flexible Netzanschlussvereinbarungen erlauben einen schnelleren Anschluss gegen zeitweise begrenzte Einspeisung oder Bezug." },
  { icon: MapPinned, title: "Standort", text: "Nähe zu Umspannwerk oder Solarpark, Zuwegung für Schwerlast, Abstand zu Wohnbebauung, Lärm und Brandschutz." },
  {
    icon: Building2,
    title: "Genehmigung",
    text: "Je nach Standort Bauantrag im Außenbereich oder B-Plan. Die Gemeinde früh einbinden – auch zu Brandschutz und Feuerwehr.",
    nurDE: "Genehmigung",
    AT: { text: "Bau- und Raumordnungsrecht regeln in Österreich die Bundesländer. Die Gemeinde früh einbinden – auch zu Brandschutz und Feuerwehr." },
    CH: { text: "Bau- und Planungsrecht regeln in der Schweiz die Kantone. Die Gemeinde früh einbinden – auch zu Brandschutz und Feuerwehr." },
  },
];

/** Englisch (Sprachmodell): Punkte je Index wie PUNKTE (nurDE-Thema und AT/CH-Texte englisch). */
const PUNKTE_EN = [
  { title: "Use overbuilding", text: "Solar park and storage share one connection: the total capacity may exceed the connection capacity, controlled by an energy management system." },
  { title: "Grid connection contribution", text: "Since the Federal Court of Justice (BGH) ruling of 15 July 2025, also permissible for storage. The amount depends on the grid level and grid operator – ask early and price it in.", nurDE: "Connection costs" },
  { title: "Maturity counts", text: "Grid operators increasingly prioritise projects with secured land, planning and financing. Speculative requests are losing importance." },
  { title: "Flexible connections", text: "Flexible grid connection agreements allow faster connection in return for temporarily limited feed-in or offtake." },
  { title: "Site", text: "Proximity to a substation or solar park, access for heavy transport, distance from housing, noise and fire protection." },
  {
    title: "Permitting",
    text: "Depending on the site, a building application in the outer zone or a development plan. Involve the municipality early – including on fire protection and the fire brigade.",
    nurDE: "Permitting",
    AT: { text: "In Austria, building and spatial planning law is regulated by the federal states. Involve the municipality early – including on fire protection and the fire brigade." },
    CH: { text: "In Switzerland, building and planning law is regulated by the cantons. Involve the municipality early – including on fire protection and the fire brigade." },
  },
];

/** Sprachmodell: feste Texte des Abschnitts. */
const W = {
  de: {
    skizzeLabel: "Prinzip Überbauung: Die Solarspitze über der Anschlussleistung lädt den Speicher, abends speist der Speicher über denselben Anschluss ein.",
    anschluss: "Anschlussleistung",
    speicher: "→ Speicher",
    abends: "abends",
    einspeisen: "einspeisen",
    hinweis: (l, thema) => `${landHinweisText(l, thema)}.`,
    eyebrow: "Netzanschluss",
    titel: "Der Engpass heißt Netz – nicht Batterie.",
    leadDe: "Bei Netzbetreibern liegen Anschlussanfragen für Speicher in einem Vielfachen der tatsächlich möglichen Leistung. Wer Speicher entwickeln will, braucht eine Strategie für den Anschluss.",
    leadLand: "Wer Speicher entwickeln will, braucht eine Strategie für den Anschluss.",
    prinzip: "Prinzip Überbauung",
    schematisch: "schematisch",
    legende: ["Solarerzeugung", "lädt Speicher", "Speicher speist ein"],
    bgh: "BGH, 15. Juli 2025 · EnVR 1/24",
    bghTitel: "Baukostenzuschuss auch für Batteriespeicher",
    bghText: "Netzbetreiber dürfen von Speichern einen Baukostenzuschuss nach dem Leistungspreismodell verlangen. Bei Co-Location am bestehenden Anschluss eines Solarparks fällt er für die gemeinsam genutzte Leistung in der Regel nicht erneut an – das ist im Einzelfall mit dem Netzbetreiber zu klären.",
    landKopf: (l) => `Netzanschluss ${LAENDER[l].inLand}`,
    landTitel: "Anschlusskosten für Batteriespeicher",
    landText: (l) => `${landHinweisText(l, "Regeln zu Anschlusskosten und Netzentgelten")}.`,
    anfragen: "Persönlich anfragen",
  },
  en: {
    skizzeLabel: "Overbuilding principle: the solar peak above the connection capacity charges the storage; in the evening, the storage feeds in via the same connection.",
    anschluss: "Connection limit",
    speicher: "→ storage",
    abends: "evening",
    einspeisen: "feed-in",
    hinweis: (l, thema) => `${landHinweisTextEn(l, thema)}.`,
    eyebrow: "Grid connection",
    titel: "The bottleneck is the grid – not the battery.",
    leadDe: "Grid operators are receiving connection requests for storage amounting to many times the capacity that is actually possible. Anyone who wants to develop storage needs a strategy for the connection.",
    leadLand: "Anyone who wants to develop storage needs a strategy for the connection.",
    prinzip: "Overbuilding principle",
    schematisch: "schematic",
    legende: ["Solar generation", "charges storage", "storage feeds in"],
    bgh: "BGH (Federal Court of Justice), 15 July 2025 · EnVR 1/24",
    bghTitel: "Grid connection contribution for battery storage too",
    bghText: "Grid operators may charge storage systems a grid connection contribution (Baukostenzuschuss) based on the capacity price model. With co-location at an existing solar park connection, it is generally not charged again for the shared capacity – this needs to be clarified with the grid operator in each case.",
    landKopf: (l) => `Grid connection ${LAENDER[l].en.inLand}`,
    landTitel: "Connection costs for battery storage",
    landText: (l) => `${landHinweisTextEn(l, "Rules on connection costs and grid fees")}.`,
    anfragen: "Ask us directly",
  },
};

/** Prinzip Überbauung: Solar über den Tag, Speicher kappt die Spitze, Linie = Anschlussleistung (qualitativ, ohne Werte) */
function SkizzeUeberbauung({ w }) {
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
  return chBaum(
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={w.skizzeLabel}>
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
      <text x="94" y={grenze - 16} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">{w.anschluss}</text>
      <line x1="14" x2={W - 14} y1={basis} y2={basis} stroke="#c9d1dc" />
      <text x={(x(11) + x(15)) / 2} y={grenze + 20} textAnchor="middle" fontSize="14" fontWeight="700" fill="#03285a">{w.speicher}</text>
      <text x={x(19.5)} y={grenze + 50} textAnchor="middle" fontSize="13" fontWeight="700" fill="#37521e">{w.abends}</text>
      <text x={x(19.5)} y={grenze + 66} textAnchor="middle" fontSize="13" fontWeight="700" fill="#37521e">{w.einspeisen}</text>
      {[6, 12, 18].map((h) => (
        <text key={h} x={x(h)} y={basis + 22} textAnchor="middle" fontSize="13" fill="#6b7587">{`${h}:00`}</text>
      ))}
    </svg>
  );
}

export default function Netz({ land = null }) {
  const l = landCode(land);
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W, sprache);
  /** Kosten-Punkt in AT/CH: ohne deutsche Rechtsprechung, mit LandHinweis */
  const ersatz = (p, lc, thema) => ({ ...p, text: w.hinweis(lc, thema) });
  const basis = uebersetze({ de: PUNKTE, en: PUNKTE_EN }, sprache); // Schweiz: ohne „ß“
  const punkte = listeFuerLand(basis, l, ersatz, (p) => ({ ...p, text: <>{p.text} <GiltFuer /></> }));
  const nurDe = !l || l === "DE";
  return chBaum(
    <Section tone="white" space="lg" id="netz" data-abschnitt="netz" aria-labelledby="netz-titel" className="scroll-mt-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Kopf
            id="netz-titel"
            eyebrow={w.eyebrow}
            titel={w.titel}
            lead={nurDe ? w.leadDe : w.leadLand}
          />
          <Reveal className="mt-10 rounded-[2rem] bg-sand-50 p-5 ring-1 ring-ink-200/70 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="ov-overline text-ov-700">{w.prinzip}</p>
              <span className="text-[12px] text-ink-500">{w.schematisch}</span>
            </div>
            <div className="mt-4">
              <SkizzeUeberbauung w={w} />
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-600">
              <li className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-[3px] w-5 rounded-full bg-sun-500" /> {w.legende[0]}
              </li>
              <li className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-navy-400/60 ring-1 ring-navy-500" /> {w.legende[1]}
              </li>
              <li className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-3 rounded-[3px] bg-ov-400/70 ring-1 ring-ov-600" /> {w.legende[2]}
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
                {nurDe ? (
                  <>
                    <p className="ov-overline text-sun-300">{w.bgh}</p>
                    <h3 className="mt-2 font-display text-[20px] font-bold leading-snug md:text-[22px]">{w.bghTitel}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-white/75">
                      {w.bghText}{!l && (
                        <>
                          {" "}
                          <GiltFuer dunkel />
                        </>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="ov-overline text-sun-300">{w.landKopf(l)}</p>
                    <h3 className="mt-2 font-display text-[20px] font-bold leading-snug md:text-[22px]">{w.landTitel}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-white/75">
                      {w.landText(l)}{" "}
                      <Link href="/kontakt" className="font-semibold text-sun-300 underline underline-offset-2 hover:text-white">
                        {w.anfragen}
                      </Link>
                    </p>
                  </>
                )}
              </div>
            </div>
          </Reveal>

          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {punkte.map((p, i) => (
              <Reveal as="li" key={i} delay={(i % 2) * 60} className="ov-card-hover rounded-3xl bg-white p-6 ring-1 ring-ink-200/70">
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
