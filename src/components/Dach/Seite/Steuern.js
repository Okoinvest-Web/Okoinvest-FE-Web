// Recht & Steuern je Land – Inhalte unverändert, als Länderkarten mit Kennung
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";

const LAENDER = [
  {
    land: "Deutschland",
    kz: "DE",
    punkte: [
      ["Einkommensteuer", "Dachpacht aus dem Privatvermögen sind in der Regel Einkünfte aus Vermietung und Verpachtung (§ 21 EStG); gehört das Gebäude zum Betriebsvermögen, sind es betriebliche Einnahmen."],
      ["Gewerbliche Infizierung", "Reine Dachvermietung ist keine gewerbliche Tätigkeit. Betreibt aber eine vermögensverwaltende Personengesellschaft selbst eine PV-Anlage, können nach § 15 Abs. 3 Nr. 1 EStG alle Einkünfte gewerblich werden – kleine, nach § 3 Nr. 72 EStG steuerfreie Anlagen sind davon ausgenommen. Deshalb häufig: Verpachten statt selbst betreiben."],
      ["Gewerbesteuer-Kürzung", "Wohnungs- und Grundstücksunternehmen mit erweiterter Kürzung (§ 9 Nr. 1 GewStG) sollten eigene Stromlieferungen vorab prüfen lassen – Einnahmen daraus sind nur in engen Grenzen unschädlich. Die bloße Dachvermietung ist nach aktuellem Stand unkritisch."],
      ["Grundsteuer", "Die PV-Anlage gilt in der Regel als Betriebsvorrichtung und gehört nicht zum Grundvermögen – die Grundsteuer des Gebäudes ändert sich durch die Dachpacht im Normalfall nicht."],
      ["Umsatzsteuer", "Dachvermietung ist grundsätzlich umsatzsteuerfrei (§ 4 Nr. 12 UStG), eine Option zur Steuerpflicht ist möglich. Wird eine Dachsanierung als Gegenleistung erbracht, liegt ein tauschähnlicher Umsatz vor – Rechnungen sauber gestalten."],
    ],
  },
  {
    land: "Österreich",
    kz: "AT",
    punkte: [
      ["Einkommensteuer", "Dachpacht zählt bei Privatpersonen meist zu den Einkünften aus Vermietung und Verpachtung, im Betrieb zu den betrieblichen Einkünften."],
      ["Umsatzsteuer", "Die Vermietung von Grundstücksteilen ist grundsätzlich unecht steuerbefreit; eine Option zur Steuerpflicht ist unter Voraussetzungen möglich."],
      ["Sicherung & Genehmigung", "Absicherung über eine im Grundbuch eingetragene Dienstbarkeit. Bau- bzw. Anzeigepflichten regeln die Bauordnungen der Länder; Förderung (etwa EAG-Investitionszuschuss) beantragt der Betreiber."],
    ],
  },
  {
    land: "Schweiz",
    kz: "CH",
    punkte: [
      ["Vertrag & Sicherung", "Üblich sind Dachmietverträge oder eine Dienstbarkeit (etwa ein Baurecht bzw. Personaldienstbarkeit im Grundbuch), damit die Anlage vom Gebäude getrennt bleibt."],
      ["Steuern", "Mietentgelte sind als Einkommen steuerbar; Behandlung und Abzüge richten sich nach kantonalem Recht. Frühzeitig mit der Treuhand klären."],
      ["Bewilligung & Förderung", "Genügend angepasste Solaranlagen auf Dächern sind nach Art. 18a RPG in vielen Fällen nur meldepflichtig. Die Einmalvergütung beantragt der Betreiber; Eigenverbrauch lässt sich über ZEV bzw. vZEV organisieren."],
    ],
  },
];

export default function Steuern({ stand }) {
  return (
    <section data-abschnitt="steuern" aria-labelledby="steuern-titel" className="bg-white py-20 md:py-28">
      <div className="ov-container">
        <SectionHeading
          eyebrow="Recht & Steuern"
          title={<span id="steuern-titel">Vor der Unterschrift zur Steuerberatung.</span>}
          lead="Die Dachpacht ist einfach – steuerlich kommt es darauf an, wem das Gebäude gehört und ob Sie selbst Strom erzeugen oder liefern. Die Punkte sind eine Orientierung nach aktuellem Stand, keine Rechts- oder Steuerberatung."
        />
        <div className="mt-10 grid items-start gap-4 md:mt-12 lg:grid-cols-[1.2fr_1fr_1fr]">
          {LAENDER.map((l, i) => (
            <Reveal key={l.land} delay={i * 80} className="overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70">
              <div className={cn("flex items-center gap-3 border-b border-ink-100 px-6 py-4 md:px-7", i === 0 ? "bg-ov-50/70" : "bg-sand-50")}>
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-950 font-display text-[12.5px] font-extrabold tracking-[0.04em] text-white">{l.kz}</span>
                <h3 className="font-display text-[19px] font-bold text-ink-900">{l.land}</h3>
                <span className="ml-auto text-[12.5px] text-ink-500">{l.punkte.length} Punkte</span>
              </div>
              <dl className="divide-y divide-ink-100 px-6 md:px-7">
                {l.punkte.map(([k, v]) => (
                  <div key={k} className="py-4">
                    <dt className="text-[14.5px] font-semibold text-ink-900">{k}</dt>
                    <dd className="mt-1 text-[14px] leading-relaxed text-ink-600">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 max-w-4xl text-[13.5px] leading-relaxed text-ink-500">
          Stand {stand}. Steuerrecht und Förderbedingungen ändern sich; einzelne Punkte hängen stark von Rechtsform, Gebäudenutzung und Größe der Anlage ab. Bitte lassen Sie Ihren Fall vor Vertragsschluss von Ihrer Steuerberatung bzw. Treuhand prüfen.
        </p>
      </div>
    </section>
  );
}
