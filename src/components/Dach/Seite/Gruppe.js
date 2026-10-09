// „Warum mit uns“ und Ablauf – dunkler Abschnitt mit Zusagen, danach Zeitleiste
import { Banknote, Building2, Check, ClipboardCheck, HandCoins, PlugZap, Wrench } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Zeitleiste from "./Zeitleiste";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

const ZUSAGEN = [
  "Die ÖKOVOLT Gruppe plant und baut seit 2010 PV-Anlagen und Speicher, auch auf Gewerbedächern",
  "Statik, Brandschutz und Netzanfrage aus einem Team, bevor Sie etwas unterschreiben",
  "Offene Konditionen: Pachtspannen und Rechenweg stehen auf dieser Seite und im Rechner",
  "Dachstrom für Sie oder Ihre Mieter – und den Reststrom gebündelt über unseren Strompool",
  "Betrieb, Wartung und Versicherung über die gesamte Laufzeit durch den Betreiber – nicht durch einen Vermittler",
  "Jeder Schritt – Prüfung, Angebot, Vertrag, Netz, Bau – im Portal sichtbar",
];

/** Sprachmodell: Texte (en nur Texte, Listen je Index). */
const W_GRUPPE = {
  de: {
    zusagen: ZUSAGEN,
    eyebrow: "Warum mit uns",
    titel: "Wer Ihr Dach pachtet, sollte es auch bauen können.",
    lead: "Viele Angebote für Dachpacht kommen von reinen Vermittlern – gebaut wird später von jemand anderem, wenn überhaupt. Bei uns liegen Entwicklung, Bau und Betrieb in einer Gruppe.",
  },
  en: {
    zusagen: [
      "The ÖKOVOLT Group has been planning and building PV installations and storage since 2010, including on commercial roofs",
      "Structural engineering, fire protection and grid request from one team, before you sign anything",
      "Open terms: lease ranges and the calculation method are on this page and in the calculator",
      "Rooftop power for you or your tenants – and the residual power pooled through our power pool",
      "Operation, maintenance and insurance over the entire term by the operator – not by an intermediary",
      "Every step – assessment, offer, contract, grid, construction – visible in the portal",
    ],
    eyebrow: "Why us",
    titel: "Whoever leases your roof should also be able to build on it.",
    lead: "Many roof lease offers come from pure intermediaries – the construction is done later by someone else, if at all. With us, development, construction and operation lie within one group.",
  },
};

export function Gruppe() {
  const w = uebersetze(W_GRUPPE, spracheDerAnfrage());
  return (
    <section data-abschnitt="gruppe" aria-labelledby="gruppe-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden py-20 text-white md:py-28">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-40" />
      <div className="ov-container">
        <SectionHeading
          dark
          eyebrow={w.eyebrow}
          title={<span id="gruppe-titel">{w.titel}</span>}
          lead={w.lead}
        />
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
          {w.zusagen.map((t, i) => (
            <Reveal as="li" key={t} delay={i * 50} className="flex items-start gap-3.5 rounded-2xl bg-white/[0.05] p-5 text-[15px] leading-relaxed text-white/85 ring-1 ring-inset ring-white/10">
              <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-400/20 ring-1 ring-inset ring-ov-300/50">
                <Check className="h-3 w-3 text-ov-300" strokeWidth={3.5} />
              </span>
              {t}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

const SCHRITTE = [
  { icon: ClipboardCheck, title: "Dachcheck", text: "Sie nennen Adresse, Dachart und Größe. Wir prüfen Luftbild, Verschattung, Netz und Eckdaten – Rückmeldung in der Regel innerhalb weniger Wochen." },
  { icon: Building2, title: "Begehung & Statik", text: "Vor-Ort-Termin, Zustand der Dachhaut, Brandschutz, Zugang. Das Statikgutachten beauftragen wir, wenn es weitergeht." },
  { icon: HandCoins, title: "Angebot & Vertrag", text: "Schriftliches Angebot mit Modell (Pacht, Einmalbetrag, Dachstrom, Sanierung) und Vertragsentwurf – mit Zeit für Ihre Prüfung." },
  { icon: PlugZap, title: "Netz & Genehmigung", text: "Netzanfrage, ggf. Ausschreibung oder Förderantrag, Abstimmung mit Versicherer und Feuerwehr. Jeder Meilenstein im Portal." },
  { icon: Wrench, title: "Bau", text: "Montage durch die Gruppe, meist in wenigen Wochen und abgestimmt auf Ihren Betrieb. Danach Abnahme und Dokumentation." },
  { icon: Banknote, title: "Pacht & Betrieb", text: "Ab Inbetriebnahme fließt die Pacht bzw. der Dachstrom. Wartung, Monitoring und Versicherung übernimmt der Betreiber." },
];

const SCHRITTE_EN = [
  { title: "Roof check", text: "You tell us the address, roof type and size. We check aerial imagery, shading, grid and key data – usually with feedback within a few weeks." },
  { title: "Site visit & structural check", text: "On-site appointment, condition of the roof membrane, fire protection, access. We commission the structural report if the project goes ahead." },
  { title: "Offer & contract", text: "A written offer with a model (lease, lump sum, rooftop power, renovation) and a draft contract – with time for your review." },
  { title: "Grid & permit", text: "Grid request, tender or funding application where applicable, coordination with the insurer and fire brigade. Every milestone in the portal." },
  { title: "Construction", text: "Installation by the group, usually within a few weeks and coordinated with your operations. Followed by acceptance and documentation." },
  { title: "Lease & operation", text: "From commissioning, the lease or rooftop power flows. The operator takes care of maintenance, monitoring and insurance." },
];

export function Ablauf() {
  const en = spracheDerAnfrage() === "en";
  return (
    <Zeitleiste
      titelId="ablauf-titel"
      eyebrow={en ? "Step by step" : "Schritt für Schritt"}
      titel={en ? "From roof check to the first lease payment" : "Vom Dachcheck bis zur ersten Pacht"}
      schritte={uebersetze({ de: SCHRITTE, en: SCHRITTE_EN }, en ? "en" : "de")}
    />
  );
}
