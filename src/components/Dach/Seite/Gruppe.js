// „Warum mit uns“ und Ablauf – dunkler Abschnitt mit Zusagen, danach Zeitleiste
import { Banknote, Building2, Check, ClipboardCheck, HandCoins, PlugZap, Wrench } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Zeitleiste from "./Zeitleiste";

const ZUSAGEN = [
  "Die ÖKOVOLT Gruppe plant und baut seit 2010 PV-Anlagen und Speicher, auch auf Gewerbedächern",
  "Statik, Brandschutz und Netzanfrage aus einem Team, bevor Sie etwas unterschreiben",
  "Offene Konditionen: Pachtspannen und Rechenweg stehen auf dieser Seite und im Rechner",
  "Dachstrom für Sie oder Ihre Mieter – und den Reststrom gebündelt über unseren Strompool",
  "Betrieb, Wartung und Versicherung über die gesamte Laufzeit durch den Betreiber – nicht durch einen Vermittler",
  "Jeder Schritt – Prüfung, Angebot, Vertrag, Netz, Bau – im Portal sichtbar",
];

export function Gruppe() {
  return (
    <section data-abschnitt="gruppe" aria-labelledby="gruppe-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden py-20 text-white md:py-28">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-40" />
      <div className="ov-container">
        <SectionHeading
          dark
          eyebrow="Warum mit uns"
          title={<span id="gruppe-titel">Wer Ihr Dach pachtet, sollte es auch bauen können.</span>}
          lead="Viele Angebote für Dachpacht kommen von reinen Vermittlern – gebaut wird später von jemand anderem, wenn überhaupt. Bei uns liegen Entwicklung, Bau und Betrieb in einer Gruppe."
        />
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
          {ZUSAGEN.map((t, i) => (
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

export function Ablauf() {
  return <Zeitleiste titelId="ablauf-titel" eyebrow="Schritt für Schritt" titel="Vom Dachcheck bis zur ersten Pacht" schritte={SCHRITTE} />;
}
